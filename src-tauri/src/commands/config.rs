use std::path::PathBuf;
use serde::Serialize;
use tauri::{AppHandle, Manager};
use crate::error::{AppError, AppResult};

fn get_data_dir(app: &AppHandle) -> AppResult<PathBuf> {
    app.path()
        .app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))
}

#[tauri::command]
pub async fn get_app_data_dir(app: AppHandle) -> AppResult<String> {
    let dir = get_data_dir(&app)?;
    Ok(dir.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn read_launcher_config(app: AppHandle) -> AppResult<serde_json::Value> {
    let dir = get_data_dir(&app)?;
    let config_path = dir.join("config.json");

    if !config_path.exists() {
        return Ok(serde_json::Value::Object(Default::default()));
    }

    let content = std::fs::read_to_string(&config_path)?;
    let value: serde_json::Value = serde_json::from_str(&content)?;
    Ok(value)
}

#[tauri::command]
pub async fn write_launcher_config(app: AppHandle, config: serde_json::Value) -> AppResult<()> {
    let dir = get_data_dir(&app)?;
    std::fs::create_dir_all(&dir)?;
    let config_path = dir.join("config.json");
    let content = serde_json::to_string_pretty(&config)?;
    std::fs::write(config_path, content)?;
    Ok(())
}

#[tauri::command]
pub async fn read_instance_config(app: AppHandle, instance_id: String) -> AppResult<serde_json::Value> {
    let dir = get_data_dir(&app)?;
    let instance_path = dir.join("instances").join(&instance_id).join("instance.json");

    if !instance_path.exists() {
        return Err(AppError::NotFound(format!("Instance '{}' not found", instance_id)));
    }

    let content = std::fs::read_to_string(&instance_path)?;
    let value: serde_json::Value = serde_json::from_str(&content)?;
    Ok(value)
}

#[tauri::command]
pub async fn write_instance_config(
    app: AppHandle,
    instance_id: String,
    config: serde_json::Value,
) -> AppResult<()> {
    let dir = get_data_dir(&app)?;
    let instance_dir = dir.join("instances").join(&instance_id);
    std::fs::create_dir_all(&instance_dir)?;
    let config_path = instance_dir.join("instance.json");
    let content = serde_json::to_string_pretty(&config)?;
    std::fs::write(config_path, content)?;
    Ok(())
}

#[derive(Serialize)]
pub struct InstanceEntry {
    pub id: String,
    pub path: String,
    pub config: serde_json::Value,
}

#[tauri::command]
pub async fn list_instances(app: AppHandle) -> AppResult<Vec<InstanceEntry>> {
    let dir = get_data_dir(&app)?;
    let instances_dir = dir.join("instances");

    if !instances_dir.exists() {
        return Ok(vec![]);
    }

    let mut instances = vec![];

    for entry in std::fs::read_dir(&instances_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            let instance_json = path.join("instance.json");
            if instance_json.exists() {
                let content = std::fs::read_to_string(&instance_json)?;
                let config: serde_json::Value = serde_json::from_str(&content)?;
                let id = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned();
                instances.push(InstanceEntry {
                    id,
                    path: path.to_string_lossy().into_owned(),
                    config,
                });
            }
        }
    }

    Ok(instances)
}

#[tauri::command]
pub async fn delete_instance(app: AppHandle, instance_id: String) -> AppResult<()> {
    let dir = get_data_dir(&app)?;
    let instance_dir = dir.join("instances").join(&instance_id);

    if !instance_dir.exists() {
        return Err(AppError::NotFound(format!("Instance '{}' not found", instance_id)));
    }

    std::fs::remove_dir_all(&instance_dir)?;
    Ok(())
}

#[tauri::command]
pub async fn get_instance_size(app: AppHandle, instance_id: String) -> AppResult<u64> {
    let dir = get_data_dir(&app)?;
    let instance_dir = dir.join("instances").join(&instance_id);

    if !instance_dir.exists() {
        return Ok(0);
    }

    let mut total: u64 = 0;
    for entry in walkdir::WalkDir::new(&instance_dir) {
        if let Ok(e) = entry {
            if e.file_type().is_file() {
                if let Ok(meta) = e.metadata() {
                    total += meta.len();
                }
            }
        }
    }
    Ok(total)
}

#[tauri::command]
pub async fn open_instance_folder(app: AppHandle, instance_id: String) -> AppResult<()> {
    let dir = get_data_dir(&app)?;
    let instance_dir = dir
        .join("instances")
        .join(&instance_id)
        .join(".minecraft");

    let open_dir = if instance_dir.exists() {
        instance_dir
    } else {
        dir.join("instances").join(&instance_id)
    };

    std::fs::create_dir_all(&open_dir)?;
    // Open the folder using system default file manager
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&open_dir).spawn()
        .map_err(|e| AppError::Io(e.to_string()))?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&open_dir).spawn()
        .map_err(|e| AppError::Io(e.to_string()))?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&open_dir).spawn()
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}
