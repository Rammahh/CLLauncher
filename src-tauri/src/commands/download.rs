use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::path::Path;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;
use crate::error::{AppError, AppResult};

static CANCEL_FLAGS: once_cell::sync::Lazy<Arc<Mutex<HashMap<String, bool>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

#[derive(Serialize, Clone, Debug)]
pub struct DownloadProgress {
    pub task_id: String,
    pub file_name: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub speed_bps: f64,
    pub eta_secs: f64,
    pub status: String,
}

#[derive(Deserialize)]
pub struct DownloadRequest {
    pub task_id: String,
    pub url: String,
    pub dest_path: String,
    pub expected_sha256: Option<String>,
    pub expected_size: Option<u64>,
}

#[tauri::command]
pub async fn download_file(
    app: AppHandle,
    request: DownloadRequest,
) -> AppResult<String> {
    let dest_path = Path::new(&request.dest_path);

    // Create parent dirs
    if let Some(parent) = dest_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| AppError::Io(e.to_string()))?;
    }

    let file_name = dest_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    // Register cancel flag
    {
        let mut flags = CANCEL_FLAGS.lock().unwrap();
        flags.insert(request.task_id.clone(), false);
    }

    let client = reqwest::Client::new();
    let resp = client
        .get(&request.url)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !resp.status().is_success() {
        return Err(AppError::Network(format!(
            "HTTP {} for {}",
            resp.status(),
            request.url
        )));
    }

    let total_bytes = request
        .expected_size
        .or_else(|| resp.content_length())
        .unwrap_or(0);

    let tmp_path = format!("{}.tmp", request.dest_path);
    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;

    let mut hasher = Sha256::new();
    let mut bytes_downloaded: u64 = 0;
    let start = std::time::Instant::now();
    let mut stream = resp.bytes_stream();

    while let Some(chunk) = stream.next().await {
        // Check cancel
        let cancelled = {
            let flags = CANCEL_FLAGS.lock().unwrap();
            flags.get(&request.task_id).copied().unwrap_or(false)
        };
        if cancelled {
            drop(file);
            let _ = tokio::fs::remove_file(&tmp_path).await;
            return Err(AppError::Cancelled);
        }

        let chunk = chunk.map_err(|e| AppError::Network(e.to_string()))?;
        hasher.update(&chunk);
        file.write_all(&chunk)
            .await
            .map_err(|e| AppError::Io(e.to_string()))?;
        bytes_downloaded += chunk.len() as u64;

        let elapsed = start.elapsed().as_secs_f64().max(0.001);
        let speed_bps = bytes_downloaded as f64 / elapsed;
        let remaining = if total_bytes > bytes_downloaded {
            total_bytes - bytes_downloaded
        } else {
            0
        };
        let eta_secs = if speed_bps > 0.0 {
            remaining as f64 / speed_bps
        } else {
            0.0
        };

        let _ = app.emit(
            "download-progress",
            DownloadProgress {
                task_id: request.task_id.clone(),
                file_name: file_name.clone(),
                bytes_downloaded,
                total_bytes,
                speed_bps,
                eta_secs,
                status: "downloading".to_string(),
            },
        );
    }

    file.flush().await.map_err(|e| AppError::Io(e.to_string()))?;
    drop(file);

    // Verify hash
    let actual_hash = format!("{:x}", hasher.finalize());
    if let Some(expected) = &request.expected_sha256 {
        if !expected.is_empty() && *expected != actual_hash {
            let _ = tokio::fs::remove_file(&tmp_path).await;
            return Err(AppError::HashMismatch {
                expected: expected.clone(),
                got: actual_hash,
            });
        }
    }

    // Move tmp to final path
    if dest_path.exists() {
        tokio::fs::remove_file(dest_path)
            .await
            .map_err(|e| AppError::Io(e.to_string()))?;
    }
    tokio::fs::rename(&tmp_path, dest_path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;

    // Cleanup cancel flag
    {
        let mut flags = CANCEL_FLAGS.lock().unwrap();
        flags.remove(&request.task_id);
    }

    Ok(actual_hash)
}

#[tauri::command]
pub async fn verify_sha256(file_path: String, expected: String) -> AppResult<bool> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Ok(false);
    }

    let data = tokio::fs::read(path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let actual = format!("{:x}", hasher.finalize());
    Ok(actual == expected.to_lowercase())
}

#[tauri::command]
pub async fn cancel_download(task_id: String) -> AppResult<()> {
    let mut flags = CANCEL_FLAGS.lock().unwrap();
    if let Some(flag) = flags.get_mut(&task_id) {
        *flag = true;
    }
    Ok(())
}
