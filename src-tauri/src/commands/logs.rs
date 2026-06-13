use std::path::PathBuf;
use serde::Serialize;
use tauri::{AppHandle, Manager};
use crate::error::{AppError, AppResult};

fn logs_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app.path().app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(dir.join("logs"))
}

#[derive(Serialize)]
pub struct LogFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: i64,
}

#[tauri::command]
pub async fn get_log_files(app: AppHandle) -> AppResult<Vec<LogFile>> {
    let dir = logs_dir(&app)?;
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut files = vec![];
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            let meta = entry.metadata()?;
            let modified = meta.modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            files.push(LogFile {
                name: entry.file_name().to_string_lossy().into_owned(),
                path: path.to_string_lossy().into_owned(),
                size: meta.len(),
                modified,
            });
        }
    }
    files.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(files)
}

#[tauri::command]
pub async fn read_log_file(file_path: String, max_lines: Option<usize>) -> AppResult<String> {
    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;

    if let Some(max) = max_lines {
        let lines: Vec<&str> = content.lines().collect();
        let start = if lines.len() > max { lines.len() - max } else { 0 };
        Ok(lines[start..].join("\n"))
    } else {
        Ok(content)
    }
}

#[tauri::command]
pub async fn clear_log(file_path: String) -> AppResult<()> {
    tokio::fs::write(&file_path, "")
        .await
        .map_err(|e| AppError::Io(e.to_string()))
}

#[tauri::command]
pub async fn export_logs_zip(app: AppHandle, dest_path: String) -> AppResult<()> {
    let dir = logs_dir(&app)?;
    let file = std::fs::File::create(&dest_path)?;
    let mut zip = zip::ZipWriter::new(file);

    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    if dir.exists() {
        for entry in walkdir::WalkDir::new(&dir) {
            let entry = entry.map_err(|e| AppError::Io(e.to_string()))?;
            let path = entry.path();
            if path.is_file() {
                let name = path.strip_prefix(&dir)
                    .unwrap_or(path)
                    .to_string_lossy()
                    .into_owned();
                zip.start_file(name, options)
                    .map_err(|e| AppError::Io(e.to_string()))?;
                let data = std::fs::read(path)?;
                use std::io::Write;
                zip.write_all(&data).map_err(|e| AppError::Io(e.to_string()))?;
            }
        }
    }

    zip.finish().map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn open_logs_folder(app: AppHandle) -> AppResult<()> {
    let dir = logs_dir(&app)?;
    std::fs::create_dir_all(&dir)?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&dir).spawn()
        .map_err(|e| AppError::Io(e.to_string()))?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&dir).spawn()
        .map_err(|e| AppError::Io(e.to_string()))?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&dir).spawn()
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}
