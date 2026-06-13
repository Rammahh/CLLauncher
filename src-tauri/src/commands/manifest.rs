use std::collections::HashSet;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use sha2::{Sha256, Digest};
use crate::error::{AppError, AppResult};

// Files that are protected from deletion by default
const PROTECTED_PATHS: &[&str] = &[
    "saves",
    "screenshots",
    "shaderpacks",
    "resourcepacks",
    "options.txt",
    "servers.dat",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestFile {
    pub path: String,
    pub url: Option<String>,
    pub sha256: Option<String>,
    pub size: Option<u64>,
    #[serde(rename = "type")]
    pub file_type: Option<String>,
    pub side: Option<String>,
    pub required: Option<bool>,
    pub optional: Option<bool>,
    pub action: Option<String>,
    pub group: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    pub instance_id: String,
    pub files: Vec<ManifestFile>,
    pub enabled_optional: Vec<String>,
    pub game_dir: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallProgress {
    pub instance_id: String,
    pub status: String,
    pub current_file: String,
    pub files_done: u32,
    pub files_total: u32,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub speed_bps: f64,
    pub eta_secs: f64,
    pub error: Option<String>,
}

pub fn validate_manifest_path_str(path: &str) -> AppResult<()> {
    // Reject absolute paths
    if Path::new(path).is_absolute() {
        return Err(AppError::PathTraversal(format!(
            "Absolute path rejected: {}",
            path
        )));
    }
    // Reject path traversal
    let normalized = PathBuf::from(path);
    for component in normalized.components() {
        match component {
            std::path::Component::ParentDir => {
                return Err(AppError::PathTraversal(format!(
                    "Path traversal (..) rejected: {}",
                    path
                )));
            }
            std::path::Component::Prefix(_) => {
                return Err(AppError::PathTraversal(format!(
                    "Drive prefix rejected: {}",
                    path
                )));
            }
            _ => {}
        }
    }
    Ok(())
}

pub fn is_protected(path: &str) -> bool {
    let normalized = path.replace('\\', "/");
    for protected in PROTECTED_PATHS {
        if normalized == *protected
            || normalized.starts_with(&format!("{}/", protected))
            || normalized.starts_with(&format!("{}\\", protected))
        {
            return true;
        }
    }
    false
}

async fn hash_file(path: &Path) -> Option<String> {
    let data = tokio::fs::read(path).await.ok()?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    Some(format!("{:x}", hasher.finalize()))
}

#[tauri::command]
pub async fn validate_manifest_path(path: String) -> AppResult<bool> {
    validate_manifest_path_str(&path)?;
    Ok(true)
}

#[tauri::command]
pub async fn install_modpack(
    app: AppHandle,
    request: InstallRequest,
) -> AppResult<()> {
    let game_dir = PathBuf::from(&request.game_dir);
    let enabled_optional: HashSet<String> = request.enabled_optional.into_iter().collect();
    let total_files = request.files.len() as u32;
    let total_bytes: u64 = request.files.iter().filter_map(|f| f.size).sum();

    let mut files_done: u32 = 0;
    let mut bytes_done: u64 = 0;
    let start = std::time::Instant::now();
    let client = reqwest::Client::new();

    for file in &request.files {
        // Validate path safety
        validate_manifest_path_str(&file.path)?;

        let action = file.action.as_deref().unwrap_or("download");
        let is_optional = file.optional.unwrap_or(false);
        let is_required = file.required.unwrap_or(true);

        // Skip optional files not enabled
        if is_optional && !is_required {
            let group = file.group.clone().unwrap_or_default();
            let path_key = file.path.clone();
            if !enabled_optional.contains(&path_key) && !enabled_optional.contains(&group) {
                files_done += 1;
                continue;
            }
        }

        let dest_path = game_dir.join(file.path.replace('/', std::path::MAIN_SEPARATOR_STR));

        // Handle delete action
        if action == "delete" {
            if !is_protected(&file.path) && dest_path.exists() {
                tokio::fs::remove_file(&dest_path).await.ok();
            }
            files_done += 1;
            continue;
        }

        // Check if we need to download
        let needs_download = if let Some(expected_hash) = &file.sha256 {
            if dest_path.exists() {
                match hash_file(&dest_path).await {
                    Some(actual) => actual != *expected_hash,
                    None => true,
                }
            } else {
                true
            }
        } else {
            !dest_path.exists()
        };

        if !needs_download {
            files_done += 1;
            bytes_done += file.size.unwrap_or(0);
            continue;
        }

        // Download the file
        let url = match &file.url {
            Some(u) => u.clone(),
            None => {
                files_done += 1;
                continue;
            }
        };

        let file_name = dest_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();

        let _ = app.emit("install-progress", InstallProgress {
            instance_id: request.instance_id.clone(),
            status: "downloading".to_string(),
            current_file: file_name.clone(),
            files_done,
            files_total: total_files,
            bytes_downloaded: bytes_done,
            total_bytes,
            speed_bps: 0.0,
            eta_secs: 0.0,
            error: None,
        });

        // Create parent dir
        if let Some(parent) = dest_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Io(e.to_string()))?;
        }

        // Retry logic (up to 3 attempts)
        let mut last_error = None;
        for attempt in 0..3 {
            match download_to_path(&client, &url, &dest_path, file.sha256.as_deref()).await {
                Ok(downloaded_bytes) => {
                    bytes_done += downloaded_bytes;
                    last_error = None;
                    break;
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < 2 {
                        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    }
                }
            }
        }

        if let Some(err) = last_error {
            let _ = app.emit("install-progress", InstallProgress {
                instance_id: request.instance_id.clone(),
                status: "error".to_string(),
                current_file: file_name.clone(),
                files_done,
                files_total: total_files,
                bytes_downloaded: bytes_done,
                total_bytes,
                speed_bps: 0.0,
                eta_secs: 0.0,
                error: Some(err.to_string()),
            });
            return Err(err);
        }

        files_done += 1;

        let elapsed = start.elapsed().as_secs_f64().max(0.001);
        let speed_bps = bytes_done as f64 / elapsed;
        let remaining_bytes = total_bytes.saturating_sub(bytes_done);
        let eta_secs = if speed_bps > 0.0 { remaining_bytes as f64 / speed_bps } else { 0.0 };

        let _ = app.emit("install-progress", InstallProgress {
            instance_id: request.instance_id.clone(),
            status: "downloading".to_string(),
            current_file: file_name,
            files_done,
            files_total: total_files,
            bytes_downloaded: bytes_done,
            total_bytes,
            speed_bps,
            eta_secs,
            error: None,
        });
    }

    let _ = app.emit("install-progress", InstallProgress {
        instance_id: request.instance_id.clone(),
        status: "complete".to_string(),
        current_file: String::new(),
        files_done: total_files,
        files_total: total_files,
        bytes_downloaded: bytes_done,
        total_bytes,
        speed_bps: 0.0,
        eta_secs: 0.0,
        error: None,
    });

    Ok(())
}

async fn download_to_path(
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    expected_hash: Option<&str>,
) -> AppResult<u64> {
    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    if !resp.status().is_success() {
        return Err(AppError::Network(format!("HTTP {}", resp.status())));
    }

    let tmp_path = dest.with_extension("tmp");
    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;

    let mut hasher = Sha256::new();
    let mut total: u64 = 0;
    let mut stream = resp.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Network(e.to_string()))?;
        hasher.update(&chunk);
        file.write_all(&chunk).await.map_err(|e| AppError::Io(e.to_string()))?;
        total += chunk.len() as u64;
    }
    file.flush().await.map_err(|e| AppError::Io(e.to_string()))?;
    drop(file);

    if let Some(expected) = expected_hash {
        let actual = format!("{:x}", hasher.finalize());
        if actual != expected.to_lowercase() {
            tokio::fs::remove_file(&tmp_path).await.ok();
            return Err(AppError::HashMismatch { expected: expected.to_string(), got: actual });
        }
    }

    if dest.exists() {
        tokio::fs::remove_file(dest).await.ok();
    }
    tokio::fs::rename(&tmp_path, dest)
        .await
        .map_err(|e| AppError::Io(e.to_string()))?;

    Ok(total)
}

#[tauri::command]
pub async fn repair_modpack(
    app: AppHandle,
    request: InstallRequest,
) -> AppResult<()> {
    // Repair uses the same logic as install — it re-verifies and re-downloads as needed
    install_modpack(app, request).await
}

// ─── Archive (ZIP) install ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveInstallRequest {
    pub instance_id: String,
    pub archive_url: String,
    pub game_dir: String,
    pub files: Vec<ManifestFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallState {
    pub pack_id: String,
    pub version_id: String,
    pub manifest_hash: Option<String>,
    pub installed_at: String,
    pub install_mode: String,
}

fn emit_progress(
    app: &AppHandle,
    instance_id: &str,
    status: &str,
    current_file: &str,
    files_done: u32,
    files_total: u32,
    bytes_downloaded: u64,
    total_bytes: u64,
    speed_bps: f64,
    eta_secs: f64,
) {
    let _ = app.emit("install-progress", InstallProgress {
        instance_id: instance_id.to_string(),
        status: status.to_string(),
        current_file: current_file.to_string(),
        files_done,
        files_total,
        bytes_downloaded,
        total_bytes,
        speed_bps,
        eta_secs,
        error: None,
    });
}

#[tauri::command]
pub async fn install_modpack_archive(
    app: AppHandle,
    request: ArchiveInstallRequest,
) -> AppResult<()> {
    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    let game_dir = PathBuf::from(&request.game_dir);
    tokio::fs::create_dir_all(&game_dir).await?;

    // 1. Stream the archive to a temp file
    emit_progress(&app, &request.instance_id, "downloading", "Downloading archive…", 0, 0, 0, 0, 0.0, 0.0);

    let client = reqwest::Client::new();
    let resp = client
        .get(&request.archive_url)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;
    if !resp.status().is_success() {
        return Err(AppError::Network(format!("Archive download failed: HTTP {}", resp.status())));
    }
    let total_bytes = resp.content_length().unwrap_or(0);

    let tmp_path = std::env::temp_dir().join(format!("cll-archive-{}.zip", uuid::Uuid::new_v4()));
    let mut out = tokio::fs::File::create(&tmp_path).await?;
    let mut downloaded: u64 = 0;
    let start = std::time::Instant::now();
    let mut last_emit = std::time::Instant::now();
    let mut stream = resp.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Network(e.to_string()))?;
        out.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;
        if last_emit.elapsed().as_millis() > 120 {
            let secs = start.elapsed().as_secs_f64().max(0.001);
            let speed = downloaded as f64 / secs;
            let eta = if total_bytes > downloaded && speed > 0.0 {
                (total_bytes - downloaded) as f64 / speed
            } else {
                0.0
            };
            emit_progress(
                &app, &request.instance_id, "downloading", "Downloading archive…",
                0, 0, downloaded, total_bytes, speed, eta,
            );
            last_emit = std::time::Instant::now();
        }
    }
    out.flush().await?;
    drop(out);

    // 2. Extract (blocking) into the game dir, guarding against path traversal
    let extract_dir = game_dir.clone();
    let extract_src = tmp_path.clone();
    let app_extract = app.clone();
    let inst_id = request.instance_id.clone();
    let extract_result = tokio::task::spawn_blocking(move || {
        extract_zip_safely(&extract_src, &extract_dir, &app_extract, &inst_id)
    })
    .await
    .map_err(|e| AppError::Unknown(e.to_string()))?;

    tokio::fs::remove_file(&tmp_path).await.ok();
    extract_result?;

    // 3. Verify against the manifest, re-downloading any missing/corrupt files
    emit_progress(
        &app, &request.instance_id, "verifying", "Verifying files…",
        0, request.files.len() as u32, downloaded, total_bytes, 0.0, 0.0,
    );
    verify_and_fix_files(&app, &request.instance_id, &game_dir, &request.files, &client).await?;

    // 4. Done
    emit_progress(
        &app, &request.instance_id, "complete", "",
        request.files.len() as u32, request.files.len() as u32,
        downloaded, total_bytes, 0.0, 0.0,
    );
    Ok(())
}

fn extract_zip_safely(
    zip_path: &Path,
    dest: &Path,
    app: &AppHandle,
    instance_id: &str,
) -> AppResult<()> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    let total = archive.len() as u32;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;

        // Sanitize the entry path: reject anything that escapes `dest`
        let rel: PathBuf = match entry.enclosed_name() {
            Some(p) => p.to_path_buf(),
            None => {
                return Err(AppError::PathTraversal(format!(
                    "Unsafe archive entry: {}",
                    entry.name()
                )))
            }
        };
        if rel.is_absolute() {
            return Err(AppError::PathTraversal(format!("Absolute path in archive: {}", entry.name())));
        }
        for component in rel.components() {
            if matches!(
                component,
                std::path::Component::ParentDir | std::path::Component::Prefix(_)
            ) {
                return Err(AppError::PathTraversal(format!("Path traversal in archive: {}", entry.name())));
            }
        }

        let out_path = dest.join(&rel);
        if !out_path.starts_with(dest) {
            return Err(AppError::PathTraversal(format!("Entry escapes target dir: {}", entry.name())));
        }

        if entry.is_dir() {
            std::fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut out_file = std::fs::File::create(&out_path)?;
            std::io::copy(&mut entry, &mut out_file)?;
        }

        if i % 25 == 0 || i as u32 + 1 == total {
            emit_progress(
                app, instance_id, "extracting",
                &rel.to_string_lossy(),
                i as u32 + 1, total, 0, 0, 0.0, 0.0,
            );
        }
    }

    Ok(())
}

async fn verify_and_fix_files(
    app: &AppHandle,
    instance_id: &str,
    game_dir: &Path,
    files: &[ManifestFile],
    client: &reqwest::Client,
) -> AppResult<()> {
    let total = files.len() as u32;
    let mut done: u32 = 0;

    for file in files {
        validate_manifest_path_str(&file.path)?;

        let action = file.action.as_deref().unwrap_or("download");
        if action == "delete" {
            done += 1;
            continue;
        }

        // Opt-in optional files aren't part of the "full" archive — leave them
        // to the user's toggle/repair rather than pulling them in here.
        let is_optional = file.optional.unwrap_or(false);
        let is_required = file.required.unwrap_or(true);
        if is_optional && !is_required {
            done += 1;
            continue;
        }

        let dest_path = game_dir.join(file.path.replace('/', std::path::MAIN_SEPARATOR_STR));

        let needs_download = if let Some(expected_hash) = &file.sha256 {
            if dest_path.exists() {
                match hash_file(&dest_path).await {
                    Some(actual) => actual != *expected_hash,
                    None => true,
                }
            } else {
                true
            }
        } else {
            !dest_path.exists()
        };

        if needs_download {
            if let Some(url) = &file.url {
                if let Some(parent) = dest_path.parent() {
                    tokio::fs::create_dir_all(parent).await?;
                }
                download_to_path(client, url, &dest_path, file.sha256.as_deref()).await?;
            }
        }

        done += 1;
        if done % 50 == 0 || done == total {
            emit_progress(
                app, instance_id, "verifying",
                &file.path, done, total, 0, 0, 0.0, 0.0,
            );
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn read_install_state(instance_dir: String) -> AppResult<Option<InstallState>> {
    let path = PathBuf::from(&instance_dir)
        .join(".cllauncher")
        .join("install-state.json");
    if !path.exists() {
        return Ok(None);
    }
    let content = tokio::fs::read_to_string(&path).await?;
    Ok(serde_json::from_str::<InstallState>(&content).ok())
}

#[tauri::command]
pub async fn write_install_state(instance_dir: String, state: InstallState) -> AppResult<()> {
    let dir = PathBuf::from(&instance_dir).join(".cllauncher");
    tokio::fs::create_dir_all(&dir).await?;
    let content = serde_json::to_string_pretty(&state)?;
    tokio::fs::write(dir.join("install-state.json"), content).await?;
    Ok(())
}
