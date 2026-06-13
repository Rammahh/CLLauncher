use crate::java::{self, JavaInstallation};
use crate::error::AppResult;

#[tauri::command]
pub async fn detect_java_installations() -> AppResult<Vec<JavaInstallation>> {
    Ok(java::detect_java_installations())
}

#[tauri::command]
pub async fn get_java_version(java_path: String) -> AppResult<JavaInstallation> {
    java::get_java_version(&java_path)
}

#[tauri::command]
pub async fn find_best_java(
    mc_version: String,
    required_java: Option<u32>,
) -> AppResult<Option<JavaInstallation>> {
    let installations = java::detect_java_installations();
    Ok(java::find_best_java_for_mc(&installations, &mc_version, required_java))
}
