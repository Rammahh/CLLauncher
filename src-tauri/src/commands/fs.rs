use std::path::Path;
use serde::Serialize;
use crate::error::{AppError, AppResult};

#[tauri::command]
pub async fn read_file_text(file_path: String) -> AppResult<String> {
    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(content)
}

#[tauri::command]
pub async fn write_file_text(file_path: String, content: String) -> AppResult<()> {
    if let Some(parent) = Path::new(&file_path).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| AppError::Io(e.to_string()))?;
    }
    tokio::fs::write(&file_path, content)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn file_exists(file_path: String) -> bool {
    Path::new(&file_path).exists()
}

#[tauri::command]
pub async fn delete_file(file_path: String) -> AppResult<()> {
    let path = Path::new(&file_path);
    if path.is_dir() {
        tokio::fs::remove_dir_all(path)
            .await
            .map_err(|e| AppError::Io(e.to_string()))?;
    } else if path.exists() {
        tokio::fs::remove_file(path)
            .await
            .map_err(|e| AppError::Io(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn create_dir_all(dir_path: String) -> AppResult<()> {
    tokio::fs::create_dir_all(&dir_path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))
}

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
pub async fn list_dir(dir_path: String) -> AppResult<Vec<DirEntry>> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Ok(vec![]);
    }

    let mut entries = vec![];
    let mut read_dir = tokio::fs::read_dir(path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;

    while let Ok(Some(entry)) = read_dir.next_entry().await {
        let meta = entry.metadata().await.ok();
        let is_dir = meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
        entries.push(DirEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: entry.path().to_string_lossy().into_owned(),
            is_dir,
            size,
        });
    }
    Ok(entries)
}

#[tauri::command]
pub async fn copy_file(src: String, dest: String) -> AppResult<()> {
    if let Some(parent) = Path::new(&dest).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| AppError::Io(e.to_string()))?;
    }
    tokio::fs::copy(&src, &dest)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn move_file(src: String, dest: String) -> AppResult<()> {
    if let Some(parent) = Path::new(&dest).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| AppError::Io(e.to_string()))?;
    }
    tokio::fs::rename(&src, &dest)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}
