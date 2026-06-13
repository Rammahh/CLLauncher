use serde::{Deserialize, Serialize};
use crate::error::AppResult;
use super::loaders::LoaderType;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchProfile {
    pub java_path: String,
    pub mc_version: String,
    pub loader: LoaderType,
    pub loader_version: Option<String>,
    pub instance_dir: String,
    pub game_dir: String,
    pub libraries_dir: String,
    pub assets_dir: String,
    pub assets_index: String,
    pub min_ram_mb: u32,
    pub max_ram_mb: u32,
    pub extra_jvm_args: Vec<String>,
    pub extra_game_args: Vec<String>,
    pub username: String,
    pub uuid: String,
    pub access_token: String,
    pub client_id: String,
    pub user_type: String,
    pub resolution_width: Option<u32>,
    pub resolution_height: Option<u32>,
    pub fullscreen: bool,
    pub main_class: Option<String>,
    pub classpath: Vec<String>,
}

pub fn build_launch_command(profile: &LaunchProfile) -> AppResult<Vec<String>> {
    let mut args: Vec<String> = vec![];

    // Java executable
    args.push(profile.java_path.clone());

    // Memory
    args.push(format!("-Xms{}m", profile.min_ram_mb));
    args.push(format!("-Xmx{}m", profile.max_ram_mb));

    // Default JVM args
    args.push("-XX:+UnlockExperimentalVMOptions".to_string());
    args.push("-XX:+UseG1GC".to_string());
    args.push("-XX:G1NewSizePercent=20".to_string());
    args.push("-XX:G1ReservePercent=20".to_string());
    args.push("-XX:MaxGCPauseMillis=50".to_string());
    args.push("-XX:G1HeapRegionSize=32M".to_string());
    args.push("-Dfile.encoding=UTF-8".to_string());

    // Extra JVM args
    for arg in &profile.extra_jvm_args {
        args.push(arg.clone());
    }

    // Classpath
    if !profile.classpath.is_empty() {
        args.push("-cp".to_string());
        #[cfg(target_os = "windows")]
        let sep = ";";
        #[cfg(not(target_os = "windows"))]
        let sep = ":";
        args.push(profile.classpath.join(sep));
    }

    // Main class
    let main_class = profile
        .main_class
        .clone()
        .unwrap_or_else(|| profile.loader.main_class(&profile.mc_version));
    args.push(main_class);

    // Game directory
    args.push("--gameDir".to_string());
    args.push(profile.game_dir.clone());

    // Assets
    args.push("--assetsDir".to_string());
    args.push(profile.assets_dir.clone());

    args.push("--assetIndex".to_string());
    args.push(profile.assets_index.clone());

    // Version
    args.push("--version".to_string());
    args.push(profile.mc_version.clone());

    // Auth
    args.push("--username".to_string());
    args.push(profile.username.clone());

    args.push("--uuid".to_string());
    args.push(profile.uuid.clone());

    args.push("--accessToken".to_string());
    args.push(profile.access_token.clone());

    args.push("--userType".to_string());
    args.push(profile.user_type.clone());

    // Resolution
    if let (Some(w), Some(h)) = (profile.resolution_width, profile.resolution_height) {
        args.push("--width".to_string());
        args.push(w.to_string());
        args.push("--height".to_string());
        args.push(h.to_string());
    }

    if profile.fullscreen {
        args.push("--fullscreen".to_string());
    }

    // Extra game args
    for arg in &profile.extra_game_args {
        args.push(arg.clone());
    }

    Ok(args)
}

pub fn mask_tokens(cmd: &[String]) -> Vec<String> {
    let mut masked = cmd.to_vec();
    for i in 0..masked.len() {
        if masked[i] == "--accessToken" && i + 1 < masked.len() {
            masked[i + 1] = "***MASKED***".to_string();
        }
    }
    masked
}
