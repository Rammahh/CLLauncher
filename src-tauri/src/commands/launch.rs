use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::process::Stdio;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use crate::error::{AppError, AppResult};
use crate::minecraft::launch::{LaunchProfile, mask_tokens};
use crate::minecraft::installer;

static MINECRAFT_PIDS: once_cell::sync::Lazy<Arc<Mutex<HashMap<String, u32>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameLogEvent {
    pub instance_id: String,
    pub line: String,
    pub stream: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameStatusEvent {
    pub instance_id: String,
    pub status: String,
    pub exit_code: Option<i32>,
}

#[tauri::command]
pub async fn launch_minecraft(
    app: AppHandle,
    instance_id: String,
    profile: LaunchProfile,
) -> AppResult<()> {
    // Ensure the vanilla client + loader are installed, then resolve the
    // real launch command (module path, classpath, substituted arguments).
    let resolved = match installer::prepare(&app, &instance_id, &profile).await {
        Ok(r) => r,
        Err(e) => {
            let _ = app.emit(
                "game-status",
                GameStatusEvent {
                    instance_id: instance_id.clone(),
                    status: "error".to_string(),
                    exit_code: Some(1),
                },
            );
            return Err(e);
        }
    };
    let cmd_args = installer::build_command(&profile, &resolved);

    // Log masked command
    let masked = mask_tokens(&cmd_args);
    let _ = app.emit(
        "game-log",
        GameLogEvent {
            instance_id: instance_id.clone(),
            line: format!("Launch command: {}", masked.join(" ")),
            stream: "launcher".to_string(),
        },
    );

    let java = cmd_args[0].clone();
    let args: Vec<String> = cmd_args[1..].to_vec();

    let mut child = tokio::process::Command::new(&java)
        .args(&args)
        .current_dir(&profile.game_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| AppError::Launch(format!("Failed to start Minecraft: {}", e)))?;

    let pid = child.id().unwrap_or(0);
    {
        let mut pids = MINECRAFT_PIDS.lock().unwrap();
        pids.insert(instance_id.clone(), pid);
    }

    let _ = app.emit(
        "game-status",
        GameStatusEvent {
            instance_id: instance_id.clone(),
            status: "running".to_string(),
            exit_code: None,
        },
    );

    let stdout = child.stdout.take().expect("stdout");
    let stderr = child.stderr.take().expect("stderr");

    let app_stdout = app.clone();
    let id_stdout = instance_id.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_stdout.emit(
                "game-log",
                GameLogEvent {
                    instance_id: id_stdout.clone(),
                    line,
                    stream: "stdout".to_string(),
                },
            );
        }
    });

    let app_stderr = app.clone();
    let id_stderr = instance_id.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_stderr.emit(
                "game-log",
                GameLogEvent {
                    instance_id: id_stderr.clone(),
                    line,
                    stream: "stderr".to_string(),
                },
            );
        }
    });

    let app_wait = app.clone();
    let id_wait = instance_id.clone();
    tokio::spawn(async move {
        let status = child.wait().await;
        let exit_code = match status {
            Ok(s) => s.code(),
            Err(_) => None,
        };

        {
            let mut pids = MINECRAFT_PIDS.lock().unwrap();
            pids.remove(&id_wait);
        }

        let status_str = match exit_code {
            Some(0) => "exited".to_string(),
            Some(code) => format!("crashed (exit code {})", code),
            None => "killed".to_string(),
        };

        let _ = app_wait.emit(
            "game-status",
            GameStatusEvent {
                instance_id: id_wait,
                status: status_str,
                exit_code,
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub async fn kill_minecraft(instance_id: String) -> AppResult<()> {
    let pid = {
        let pids = MINECRAFT_PIDS.lock().unwrap();
        pids.get(&instance_id).copied()
    };

    if let Some(pid) = pid {
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }
    }

    Ok(())
}

#[derive(Serialize)]
pub struct MinecraftStatus {
    pub running: bool,
    pub pid: Option<u32>,
}

#[tauri::command]
pub async fn get_minecraft_status(instance_id: String) -> AppResult<MinecraftStatus> {
    let pid = {
        let pids = MINECRAFT_PIDS.lock().unwrap();
        pids.get(&instance_id).copied()
    };
    Ok(MinecraftStatus {
        running: pid.is_some(),
        pid,
    })
}
