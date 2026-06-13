// Asset index and library management helpers — structs used by future installer logic
#![allow(dead_code)]
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct VersionManifest {
    pub id: String,
    pub r#type: String,
    pub url: String,
    pub sha1: String,
}

#[derive(Debug, Deserialize)]
pub struct VersionManifestList {
    pub latest: LatestVersions,
    pub versions: Vec<VersionManifest>,
}

#[derive(Debug, Deserialize)]
pub struct LatestVersions {
    pub release: String,
    pub snapshot: String,
}

#[derive(Debug, Deserialize)]
pub struct VersionProfile {
    pub id: String,
    #[serde(rename = "assetIndex")]
    pub asset_index: AssetIndex,
    pub assets: String,
    pub libraries: Vec<Library>,
    #[serde(rename = "mainClass")]
    pub main_class: String,
    #[serde(rename = "minecraftArguments")]
    pub minecraft_arguments: Option<String>,
    pub arguments: Option<Arguments>,
}

#[derive(Debug, Deserialize)]
pub struct AssetIndex {
    pub id: String,
    pub sha1: String,
    pub size: u64,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct Library {
    pub name: String,
    pub downloads: Option<LibraryDownloads>,
    pub rules: Option<Vec<LibraryRule>>,
}

#[derive(Debug, Deserialize)]
pub struct LibraryDownloads {
    pub artifact: Option<LibraryArtifact>,
}

#[derive(Debug, Deserialize)]
pub struct LibraryArtifact {
    pub path: String,
    pub sha1: String,
    pub size: u64,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct LibraryRule {
    pub action: String,
    pub os: Option<OsRule>,
}

#[derive(Debug, Deserialize)]
pub struct OsRule {
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Arguments {
    pub game: Option<Vec<serde_json::Value>>,
    pub jvm: Option<Vec<serde_json::Value>>,
}

pub fn should_include_library(library: &Library) -> bool {
    if let Some(rules) = &library.rules {
        let current_os = current_os_name();
        let mut allow = false;
        for rule in rules {
            let os_matches = rule
                .os
                .as_ref()
                .map(|os| os.name.as_deref() == Some(current_os))
                .unwrap_or(true);
            if os_matches {
                allow = rule.action == "allow";
            }
        }
        return allow;
    }
    true
}

fn current_os_name() -> &'static str {
    #[cfg(target_os = "windows")]
    return "windows";
    #[cfg(target_os = "linux")]
    return "linux";
    #[cfg(target_os = "macos")]
    return "osx";
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return "unknown";
}
