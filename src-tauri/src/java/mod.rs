use std::path::Path;
use std::process::Command;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JavaInstallation {
    pub path: String,
    pub version: String,
    pub major_version: u32,
    pub vendor: String,
    pub arch: String,
}

pub fn get_java_version(java_path: &str) -> AppResult<JavaInstallation> {
    let output = Command::new(java_path)
        .args(["-XshowSettings:all", "-version"])
        .output()
        .map_err(|e| AppError::JavaNotFound(format!("Cannot run {}: {}", java_path, e)))?;

    let version_output = String::from_utf8_lossy(&output.stderr).to_string()
        + &String::from_utf8_lossy(&output.stdout);

    parse_java_version(java_path, &version_output)
}

fn parse_java_version(java_path: &str, output: &str) -> AppResult<JavaInstallation> {
    // Match "version \"X.Y.Z\"" or "version \"X\""
    let version_re = regex::Regex::new(r#"version "([^"]+)""#).unwrap();
    let vendor_re = regex::Regex::new(r"java\.vendor\s*=\s*(.+)").unwrap();
    let arch_re = regex::Regex::new(r"os\.arch\s*=\s*(\S+)").unwrap();

    let version = version_re
        .captures(output)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let major_version = parse_major_version(&version);

    let vendor = vendor_re
        .captures(output)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let arch = arch_re
        .captures(output)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    Ok(JavaInstallation {
        path: java_path.to_string(),
        version,
        major_version,
        vendor,
        arch,
    })
}

pub fn parse_major_version(version: &str) -> u32 {
    // Handle "1.8.0_xxx" -> 8, "11.0.x" -> 11, "21" -> 21
    if version.starts_with("1.") {
        let parts: Vec<&str> = version.split('.').collect();
        if parts.len() >= 2 {
            return parts[1].parse().unwrap_or(0);
        }
    } else {
        let first_part = version.split('.').next().unwrap_or("0");
        return first_part.parse().unwrap_or(0);
    }
    0
}

pub fn detect_java_installations() -> Vec<JavaInstallation> {
    let mut candidates: Vec<String> = vec![];
    let mut found = vec![];

    // Add from PATH
    if let Ok(path_env) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_env) {
            let java_path = dir.join(java_binary());
            if java_path.exists() {
                candidates.push(java_path.to_string_lossy().into_owned());
            }
        }
    }

    // JAVA_HOME
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let bin_path = Path::new(&java_home).join("bin").join(java_binary());
        if bin_path.exists() {
            candidates.push(bin_path.to_string_lossy().into_owned());
        }
    }

    #[cfg(target_os = "windows")]
    {
        let search_dirs = vec![
            r"C:\Program Files\Java",
            r"C:\Program Files\Eclipse Adoptium",
            r"C:\Program Files\Microsoft",
            r"C:\Program Files\Zulu",
            r"C:\Program Files (x86)\Java",
        ];
        for dir in &search_dirs {
            scan_java_dir(dir, &mut candidates);
        }
        // Also check HKLM registry paths via filesystem
        if let Ok(entries) = std::fs::read_dir(r"C:\Program Files") {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    scan_java_dir(&path.to_string_lossy(), &mut candidates);
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let search_dirs = vec![
            "/usr/lib/jvm",
            "/usr/java",
            "/opt/java",
            "/opt/jdk",
        ];
        for dir in &search_dirs {
            scan_java_dir(dir, &mut candidates);
        }
    }

    #[cfg(target_os = "macos")]
    {
        let search_dirs = vec![
            "/Library/Java/JavaVirtualMachines",
            "/System/Library/Java/JavaVirtualMachines",
        ];
        for dir in &search_dirs {
            scan_java_mac(dir, &mut candidates);
        }
        // Try /usr/libexec/java_home
        if let Ok(output) = Command::new("/usr/libexec/java_home")
            .args(["-V"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stderr);
            for line in text.lines() {
                if line.contains("/Contents/Home") {
                    let home = line.trim().split_whitespace().last().unwrap_or("");
                    let bin = Path::new(home).join("bin").join("java");
                    if bin.exists() {
                        candidates.push(bin.to_string_lossy().into_owned());
                    }
                }
            }
        }
    }

    // Deduplicate and verify
    let mut seen = std::collections::HashSet::new();
    for candidate in candidates {
        if seen.contains(&candidate) {
            continue;
        }
        seen.insert(candidate.clone());
        if let Ok(info) = get_java_version(&candidate) {
            found.push(info);
        }
    }

    // Sort by major version descending
    found.sort_by(|a, b| b.major_version.cmp(&a.major_version));
    found
}

fn java_binary() -> &'static str {
    #[cfg(target_os = "windows")]
    return "java.exe";
    #[cfg(not(target_os = "windows"))]
    return "java";
}

fn scan_java_dir(base: &str, candidates: &mut Vec<String>) {
    let base_path = Path::new(base);
    if !base_path.is_dir() {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(base_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let java = path.join("bin").join(java_binary());
                if java.exists() {
                    candidates.push(java.to_string_lossy().into_owned());
                }
                // Also check jre subfolder
                let jre = path.join("jre").join("bin").join(java_binary());
                if jre.exists() {
                    candidates.push(jre.to_string_lossy().into_owned());
                }
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn scan_java_mac(base: &str, candidates: &mut Vec<String>) {
    let base_path = Path::new(base);
    if !base_path.is_dir() {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(base_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let java = path.join("Contents").join("Home").join("bin").join("java");
            if java.exists() {
                candidates.push(java.to_string_lossy().into_owned());
            }
        }
    }
}

pub fn find_best_java_for_mc(
    installations: &[JavaInstallation],
    mc_version: &str,
    required_java: Option<u32>,
) -> Option<JavaInstallation> {
    let needed = required_java.unwrap_or_else(|| java_for_mc_version(mc_version));
    installations
        .iter()
        .find(|j| j.major_version == needed)
        .or_else(|| installations.iter().find(|j| j.major_version >= needed))
        .cloned()
}

pub fn java_for_mc_version(mc_version: &str) -> u32 {
    let parts: Vec<u32> = mc_version
        .split('.')
        .filter_map(|p| p.parse().ok())
        .collect();
    let minor = parts.get(1).copied().unwrap_or(0);
    let patch = parts.get(2).copied().unwrap_or(0);

    match minor {
        0..=16 => 8,
        17 => 16,
        18 | 19 | 20 if patch < 5 => 17,
        20 if patch >= 5 => 21,
        21.. => 21,
        _ => 17,
    }
}
