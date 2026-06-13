// Minecraft version installer + launch resolver.
//
// Installs the vanilla client (jar + libraries + assets), runs the official
// NeoForge/Forge installer headlessly when a loader is required, merges the
// resulting version profiles, and builds the final JVM command (module path,
// classpath, placeholder-substituted arguments).

use std::path::{Path, PathBuf};
use serde_json::Value;
use sha1::{Sha1, Digest as Sha1Digest};
use tauri::{AppHandle, Emitter};
use crate::error::{AppError, AppResult};
use crate::commands::launch::GameLogEvent;
use super::launch::LaunchProfile;
use super::loaders::LoaderType;

const VERSION_MANIFEST: &str =
    "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const RESOURCES_BASE: &str = "https://resources.download.minecraft.net";
const NEOFORGE_MAVEN: &str = "https://maven.neoforged.net/releases";
const FORGE_MAVEN: &str = "https://maven.minecraftforge.net";

pub struct ResolvedLaunch {
    pub main_class: String,
    pub jvm_args: Vec<String>,
    pub game_args: Vec<String>,
}

struct Paths {
    root: PathBuf,
    libraries: PathBuf,
    assets: PathBuf,
    versions: PathBuf,
}

fn log(app: &AppHandle, instance_id: &str, msg: impl Into<String>) {
    let _ = app.emit(
        "game-log",
        GameLogEvent {
            instance_id: instance_id.to_string(),
            line: msg.into(),
            stream: "launcher".to_string(),
        },
    );
}

fn sep() -> &'static str {
    if cfg!(target_os = "windows") { ";" } else { ":" }
}

fn current_os() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "osx"
    } else {
        "linux"
    }
}

async fn file_sha1(path: &Path) -> Option<String> {
    let data = tokio::fs::read(path).await.ok()?;
    let mut hasher = Sha1::new();
    hasher.update(&data);
    Some(format!("{:x}", hasher.finalize()))
}

/// Downloads `url` to `dest` unless it already exists with the expected sha1.
async fn download(
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    sha1_hex: Option<&str>,
) -> AppResult<()> {
    if dest.exists() {
        match sha1_hex {
            Some(expected) if !expected.is_empty() => {
                if file_sha1(dest).await.as_deref() == Some(expected) {
                    return Ok(());
                }
            }
            _ => return Ok(()),
        }
    }

    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;
    if !resp.status().is_success() {
        return Err(AppError::Network(format!("HTTP {} for {}", resp.status(), url)));
    }
    let bytes = resp.bytes().await.map_err(|e| AppError::Network(e.to_string()))?;

    if let Some(expected) = sha1_hex {
        if !expected.is_empty() {
            let mut hasher = Sha1::new();
            hasher.update(&bytes);
            let actual = format!("{:x}", hasher.finalize());
            if actual != expected {
                return Err(AppError::HashMismatch {
                    expected: expected.to_string(),
                    got: actual,
                });
            }
        }
    }

    let tmp = dest.with_extension("cll_dl");
    tokio::fs::write(&tmp, &bytes).await?;
    if dest.exists() {
        tokio::fs::remove_file(dest).await.ok();
    }
    tokio::fs::rename(&tmp, dest).await?;
    Ok(())
}

async fn fetch_json(client: &reqwest::Client, url: &str) -> AppResult<Value> {
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;
    if !resp.status().is_success() {
        return Err(AppError::Network(format!("HTTP {} for {}", resp.status(), url)));
    }
    let text = resp.text().await.map_err(|e| AppError::Network(e.to_string()))?;
    serde_json::from_str(&text).map_err(|e| AppError::Serde(e.to_string()))
}

// ─── Maven coordinate → relative path ────────────────────────────────────────

fn maven_to_path(name: &str) -> Option<String> {
    // group:artifact:version[:classifier][@ext]
    let mut parts = name.splitn(4, ':');
    let group = parts.next()?;
    let artifact = parts.next()?;
    let version_raw = parts.next()?;
    let classifier_raw = parts.next();

    let (version, mut ext) = match version_raw.split_once('@') {
        Some((v, e)) => (v, e.to_string()),
        None => (version_raw, "jar".to_string()),
    };

    let classifier = match classifier_raw {
        Some(c) => match c.split_once('@') {
            Some((cc, e)) => {
                ext = e.to_string();
                Some(cc.to_string())
            }
            None => Some(c.to_string()),
        },
        None => None,
    };

    let group_path = group.replace('.', "/");
    let file = match &classifier {
        Some(c) => format!("{artifact}-{version}-{c}.{ext}"),
        None => format!("{artifact}-{version}.{ext}"),
    };
    Some(format!("{group_path}/{artifact}/{version}/{file}"))
}

// ─── Library rule evaluation ─────────────────────────────────────────────────

fn rules_allow(rules: &Value, custom_resolution: bool) -> bool {
    let arr = match rules.as_array() {
        Some(a) if !a.is_empty() => a,
        _ => return true, // no rules → allowed
    };

    let mut allowed = false;
    for rule in arr {
        let action = rule.get("action").and_then(|v| v.as_str()).unwrap_or("allow");
        let mut matches = true;

        if let Some(os) = rule.get("os") {
            if let Some(name) = os.get("name").and_then(|v| v.as_str()) {
                if name != current_os() {
                    matches = false;
                }
            }
            if let Some(arch) = os.get("arch").and_then(|v| v.as_str()) {
                let cur = if cfg!(target_arch = "x86") { "x86" } else { "x64" };
                if arch != cur {
                    matches = false;
                }
            }
        }

        if let Some(features) = rule.get("features").and_then(|v| v.as_object()) {
            for (key, want) in features {
                let want = want.as_bool().unwrap_or(false);
                let have = match key.as_str() {
                    "has_custom_resolution" => custom_resolution,
                    // Unsupported features are treated as absent
                    _ => false,
                };
                if want != have {
                    matches = false;
                }
            }
        }

        if matches {
            allowed = action == "allow";
        }
    }
    allowed
}

// ─── Vanilla install ─────────────────────────────────────────────────────────

async fn install_vanilla(
    app: &AppHandle,
    instance_id: &str,
    paths: &Paths,
    mc_version: &str,
    client: &reqwest::Client,
) -> AppResult<Value> {
    // 1. Resolve the version JSON via the manifest
    let version_json_path = paths
        .versions
        .join(mc_version)
        .join(format!("{mc_version}.json"));

    let profile: Value = if version_json_path.exists() {
        let text = tokio::fs::read_to_string(&version_json_path).await?;
        serde_json::from_str(&text).map_err(|e| AppError::Serde(e.to_string()))?
    } else {
        log(app, instance_id, format!("Fetching version manifest for {mc_version}…"));
        let manifest = fetch_json(client, VERSION_MANIFEST).await?;
        let entry = manifest
            .get("versions")
            .and_then(|v| v.as_array())
            .and_then(|arr| {
                arr.iter()
                    .find(|e| e.get("id").and_then(|i| i.as_str()) == Some(mc_version))
            })
            .ok_or_else(|| {
                AppError::NotFound(format!("Minecraft version {mc_version} not found in manifest"))
            })?;
        let url = entry
            .get("url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Unknown("Version entry missing url".into()))?;
        let profile = fetch_json(client, url).await?;
        if let Some(parent) = version_json_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(
            &version_json_path,
            serde_json::to_string(&profile).map_err(|e| AppError::Serde(e.to_string()))?,
        )
        .await?;
        profile
    };

    // 2. Client jar
    if let Some(client_dl) = profile.pointer("/downloads/client") {
        let url = client_dl.get("url").and_then(|v| v.as_str()).unwrap_or_default();
        let sha1 = client_dl.get("sha1").and_then(|v| v.as_str());
        let jar = paths
            .versions
            .join(mc_version)
            .join(format!("{mc_version}.jar"));
        log(app, instance_id, "Downloading Minecraft client…");
        download(client, url, &jar, sha1).await?;
    }

    // 3. Libraries
    if let Some(libs) = profile.get("libraries").and_then(|v| v.as_array()) {
        log(app, instance_id, format!("Downloading {} libraries…", libs.len()));
        for lib in libs {
            install_library(paths, lib, client).await?;
        }
    }

    // 4. Assets
    install_assets(app, instance_id, paths, &profile, client).await?;

    Ok(profile)
}

async fn install_library(
    paths: &Paths,
    lib: &Value,
    client: &reqwest::Client,
) -> AppResult<()> {
    if let Some(rules) = lib.get("rules") {
        if !rules_allow(rules, false) {
            return Ok(());
        }
    }

    // Preferred: explicit artifact download info
    if let Some(artifact) = lib.pointer("/downloads/artifact") {
        let path = artifact.get("path").and_then(|v| v.as_str());
        let url = artifact.get("url").and_then(|v| v.as_str());
        let sha1 = artifact.get("sha1").and_then(|v| v.as_str());
        if let (Some(path), Some(url)) = (path, url) {
            if !url.is_empty() {
                let dest = paths.libraries.join(path);
                download(client, url, &dest, sha1).await?;
            }
            return Ok(());
        }
    }

    // Fallback: maven name (+ optional maven base url)
    if let Some(name) = lib.get("name").and_then(|v| v.as_str()) {
        if let Some(rel) = maven_to_path(name) {
            let dest = paths.libraries.join(&rel);
            if dest.exists() {
                return Ok(());
            }
            if let Some(base) = lib.get("url").and_then(|v| v.as_str()) {
                let base = base.trim_end_matches('/');
                let url = format!("{base}/{rel}");
                // NeoForge marker libs may legitimately 404 — ignore failures here,
                // the installer should already have placed real jars on disk.
                let _ = download(client, &url, &dest, None).await;
            }
        }
    }
    Ok(())
}

async fn install_assets(
    app: &AppHandle,
    instance_id: &str,
    paths: &Paths,
    profile: &Value,
    client: &reqwest::Client,
) -> AppResult<()> {
    let asset_index = match profile.get("assetIndex") {
        Some(a) => a,
        None => return Ok(()),
    };
    let index_id = asset_index.get("id").and_then(|v| v.as_str()).unwrap_or("legacy");
    let index_url = asset_index.get("url").and_then(|v| v.as_str()).unwrap_or_default();
    let index_sha1 = asset_index.get("sha1").and_then(|v| v.as_str());

    let index_path = paths.assets.join("indexes").join(format!("{index_id}.json"));
    log(app, instance_id, "Downloading asset index…");
    download(client, index_url, &index_path, index_sha1).await?;

    let index_text = tokio::fs::read_to_string(&index_path).await?;
    let index: Value = serde_json::from_str(&index_text).map_err(|e| AppError::Serde(e.to_string()))?;

    let objects = match index.get("objects").and_then(|v| v.as_object()) {
        Some(o) => o,
        None => return Ok(()),
    };

    let hashes: Vec<String> = objects
        .values()
        .filter_map(|o| o.get("hash").and_then(|h| h.as_str()).map(|s| s.to_string()))
        .collect();

    let total = hashes.len();
    log(app, instance_id, format!("Downloading {total} assets…"));
    let objects_dir = paths.assets.join("objects");

    let mut done = 0usize;
    for chunk in hashes.chunks(16) {
        let futures = chunk.iter().map(|hash| {
            let hash = hash.clone();
            let client = client.clone();
            let objects_dir = objects_dir.clone();
            async move {
                let sub = &hash[0..2];
                let dest = objects_dir.join(sub).join(&hash);
                let url = format!("{RESOURCES_BASE}/{sub}/{hash}");
                download(&client, &url, &dest, Some(&hash)).await
            }
        });
        let results = futures::future::join_all(futures).await;
        for r in results {
            r?;
        }
        done += chunk.len();
        if done % 256 == 0 || done == total {
            log(app, instance_id, format!("Assets: {done}/{total}"));
        }
    }

    Ok(())
}

// ─── NeoForge / Forge install (headless) ─────────────────────────────────────

async fn install_loader(
    app: &AppHandle,
    instance_id: &str,
    paths: &Paths,
    profile: &LaunchProfile,
    loader_version: &str,
) -> AppResult<Value> {
    let id = format!("neoforge-{loader_version}");
    let loader_json = paths.versions.join(&id).join(format!("{id}.json"));

    // Cached?
    if loader_json.exists() {
        let text = tokio::fs::read_to_string(&loader_json).await?;
        if let Ok(v) = serde_json::from_str::<Value>(&text) {
            return Ok(v);
        }
    }

    // Ensure the installer's required launcher_profiles.json exists
    let lp = paths.root.join("launcher_profiles.json");
    if !lp.exists() {
        tokio::fs::write(&lp, r#"{"profiles":{},"settings":{},"version":3}"#).await?;
    }

    // Download the installer jar
    let (installer_url, installer_name) = match profile.loader {
        LoaderType::NeoForge => (
            format!(
                "{NEOFORGE_MAVEN}/net/neoforged/neoforge/{loader_version}/neoforge-{loader_version}-installer.jar"
            ),
            format!("neoforge-{loader_version}-installer.jar"),
        ),
        LoaderType::Forge => (
            format!(
                "{FORGE_MAVEN}/net/minecraftforge/forge/{mc}-{loader_version}/forge-{mc}-{loader_version}-installer.jar",
                mc = profile.mc_version
            ),
            format!("forge-{loader_version}-installer.jar"),
        ),
        _ => return Err(AppError::Launch("Unsupported loader for installer".into())),
    };

    let installer_path = std::env::temp_dir().join(&installer_name);
    log(app, instance_id, format!("Downloading {installer_name}…"));
    download(client_ref(), &installer_url, &installer_path, None).await?;

    // Run the installer headlessly
    log(app, instance_id, "Running loader installer (this can take a minute)…");
    run_installer(app, instance_id, &profile.java_path, &installer_path, &paths.root).await?;
    tokio::fs::remove_file(&installer_path).await.ok();

    // Locate the produced profile JSON
    let produced = if loader_json.exists() {
        loader_json.clone()
    } else {
        find_loader_profile(&paths.versions, loader_version)
            .ok_or_else(|| AppError::Launch(
                "Loader installer finished but no version profile was produced".into(),
            ))?
    };

    let text = tokio::fs::read_to_string(&produced).await?;
    serde_json::from_str(&text).map_err(|e| AppError::Serde(e.to_string()))
}

// A throwaway client for the installer download (separate from the main one
// is fine; reqwest clients are cheap and pool internally).
fn client_ref() -> &'static reqwest::Client {
    use once_cell::sync::Lazy;
    static C: Lazy<reqwest::Client> = Lazy::new(reqwest::Client::new);
    &C
}

fn find_loader_profile(versions_dir: &Path, loader_version: &str) -> Option<PathBuf> {
    let entries = std::fs::read_dir(versions_dir).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if (name.contains("neoforge") || name.contains("forge")) && name.contains(loader_version) {
            let json = entry.path().join(format!("{}.json", entry.file_name().to_string_lossy()));
            if json.exists() {
                return Some(json);
            }
            // Otherwise take any .json inside
            if let Ok(inner) = std::fs::read_dir(entry.path()) {
                for f in inner.flatten() {
                    if f.path().extension().and_then(|e| e.to_str()) == Some("json") {
                        return Some(f.path());
                    }
                }
            }
        }
    }
    None
}

async fn run_installer(
    app: &AppHandle,
    instance_id: &str,
    java_path: &str,
    installer: &Path,
    mc_root: &Path,
) -> AppResult<()> {
    use std::process::Stdio;
    use tokio::io::{AsyncBufReadExt, BufReader};

    let mut child = tokio::process::Command::new(java_path)
        .arg("-Djava.awt.headless=true")
        .arg("-jar")
        .arg(installer)
        .arg("--install-client")
        .arg(mc_root)
        .current_dir(mc_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| AppError::Launch(format!("Failed to start installer: {e}")))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    if let Some(out) = stdout {
        let app = app.clone();
        let id = instance_id.to_string();
        tokio::spawn(async move {
            let mut lines = BufReader::new(out).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                log(&app, &id, format!("[installer] {line}"));
            }
        });
    }
    if let Some(err) = stderr {
        let app = app.clone();
        let id = instance_id.to_string();
        tokio::spawn(async move {
            let mut lines = BufReader::new(err).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                log(&app, &id, format!("[installer] {line}"));
            }
        });
    }

    let status = child
        .wait()
        .await
        .map_err(|e| AppError::Launch(format!("Installer error: {e}")))?;
    if !status.success() {
        return Err(AppError::Launch(format!(
            "Loader installer exited with status {status}"
        )));
    }
    Ok(())
}

// ─── Profile merge + argument resolution ─────────────────────────────────────

fn collect_args(profile: &Value, key: &str, custom_resolution: bool, out: &mut Vec<String>) {
    // Modern format: arguments.{jvm,game} = array of (string | {rules, value})
    if let Some(arr) = profile.pointer(&format!("/arguments/{key}")).and_then(|v| v.as_array()) {
        for item in arr {
            match item {
                Value::String(s) => out.push(s.clone()),
                Value::Object(_) => {
                    let allowed = match item.get("rules") {
                        Some(rules) => rules_allow(rules, custom_resolution),
                        None => true,
                    };
                    if !allowed {
                        continue;
                    }
                    match item.get("value") {
                        Some(Value::String(s)) => out.push(s.clone()),
                        Some(Value::Array(vals)) => {
                            for v in vals {
                                if let Some(s) = v.as_str() {
                                    out.push(s.to_string());
                                }
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        }
    } else if key == "game" {
        // Legacy format: minecraftArguments is a single space-joined string
        if let Some(s) = profile.get("minecraftArguments").and_then(|v| v.as_str()) {
            for tok in s.split_whitespace() {
                out.push(tok.to_string());
            }
        }
    }
}

fn build_classpath(paths: &Paths, profiles: &[&Value], client_jar: &Path) -> Vec<String> {
    use std::collections::HashSet;
    let mut seen: HashSet<String> = HashSet::new();
    let mut cp: Vec<String> = Vec::new();

    for profile in profiles {
        if let Some(libs) = profile.get("libraries").and_then(|v| v.as_array()) {
            for lib in libs {
                if let Some(rules) = lib.get("rules") {
                    if !rules_allow(rules, false) {
                        continue;
                    }
                }
                // Skip libs that are purely natives extraction (no artifact/name path)
                let rel = lib
                    .pointer("/downloads/artifact/path")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .or_else(|| lib.get("name").and_then(|v| v.as_str()).and_then(maven_to_path));

                if let Some(rel) = rel {
                    // Dedupe by group:artifact (ignore version) so loader libs win
                    let coord_key = lib
                        .get("name")
                        .and_then(|v| v.as_str())
                        .map(|n| {
                            let mut it = n.splitn(3, ':');
                            format!(
                                "{}:{}",
                                it.next().unwrap_or(""),
                                it.next().unwrap_or("")
                            )
                        })
                        .unwrap_or_else(|| rel.clone());

                    if seen.insert(coord_key) {
                        let full = paths.libraries.join(&rel);
                        cp.push(full.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    cp.push(client_jar.to_string_lossy().to_string());
    cp
}

fn substitute(
    args: &[String],
    vars: &std::collections::HashMap<&str, String>,
) -> Vec<String> {
    args.iter()
        .map(|arg| {
            let mut s = arg.clone();
            for (k, v) in vars {
                let token = format!("${{{k}}}");
                if s.contains(token.as_str()) {
                    s = s.replace(token.as_str(), v.as_str());
                }
            }
            s
        })
        .collect()
}

// ─── Public entry point ──────────────────────────────────────────────────────

pub async fn prepare(
    app: &AppHandle,
    instance_id: &str,
    profile: &LaunchProfile,
) -> AppResult<ResolvedLaunch> {
    let libraries = PathBuf::from(&profile.libraries_dir);
    let root = libraries
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| libraries.clone());
    let paths = Paths {
        root: root.clone(),
        libraries,
        assets: PathBuf::from(&profile.assets_dir),
        versions: root.join("versions"),
    };

    let client = reqwest::Client::new();

    // 1. Vanilla
    let vanilla = install_vanilla(app, instance_id, &paths, &profile.mc_version, &client).await?;

    // 2. Loader (if any)
    let loader_profile: Option<Value> = match profile.loader {
        LoaderType::Vanilla => None,
        LoaderType::NeoForge | LoaderType::Forge => {
            let lv = profile
                .loader_version
                .clone()
                .ok_or_else(|| AppError::Launch("Loader version missing".into()))?;
            let lp = install_loader(app, instance_id, &paths, profile, &lv).await?;
            // The loader profile lists extra libraries — fetch any that the
            // installer did not already place (e.g. plain maven entries).
            if let Some(libs) = lp.get("libraries").and_then(|v| v.as_array()) {
                for lib in libs {
                    install_library(&paths, lib, &client).await?;
                }
            }
            Some(lp)
        }
        LoaderType::Fabric | LoaderType::Quilt => {
            return Err(AppError::Launch(
                "Fabric/Quilt launching is not implemented yet".into(),
            ));
        }
    };

    log(app, instance_id, "Building launch command…");

    // Effective profile data
    let custom_resolution =
        profile.resolution_width.is_some() && profile.resolution_height.is_some();

    let main_class = loader_profile
        .as_ref()
        .and_then(|p| p.get("mainClass"))
        .and_then(|v| v.as_str())
        .or_else(|| vanilla.get("mainClass").and_then(|v| v.as_str()))
        .unwrap_or("net.minecraft.client.main.Main")
        .to_string();

    let version_name = loader_profile
        .as_ref()
        .and_then(|p| p.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or(&profile.mc_version)
        .to_string();

    let asset_index_id = vanilla
        .pointer("/assetIndex/id")
        .and_then(|v| v.as_str())
        .unwrap_or(&profile.assets_index)
        .to_string();

    // Classpath (loader libs first so they win dedupe)
    let client_jar = paths
        .versions
        .join(&profile.mc_version)
        .join(format!("{}.jar", profile.mc_version));
    let order: Vec<&Value> = match &loader_profile {
        Some(lp) => vec![lp, &vanilla],
        None => vec![&vanilla],
    };
    let classpath = build_classpath(&paths, &order, &client_jar);
    let classpath_str = classpath.join(sep());

    let natives_dir = paths
        .versions
        .join(&profile.mc_version)
        .join("natives");
    tokio::fs::create_dir_all(&natives_dir).await.ok();

    // Substitution variables
    let mut vars: std::collections::HashMap<&str, String> = std::collections::HashMap::new();
    vars.insert("auth_player_name", profile.username.clone());
    vars.insert("version_name", version_name.clone());
    vars.insert("game_directory", profile.game_dir.clone());
    vars.insert("assets_root", profile.assets_dir.clone());
    vars.insert("game_assets", profile.assets_dir.clone());
    vars.insert("assets_index_name", asset_index_id);
    vars.insert("auth_uuid", profile.uuid.clone());
    vars.insert("auth_access_token", profile.access_token.clone());
    vars.insert("auth_session", format!("token:{}:{}", profile.access_token, profile.uuid));
    vars.insert("clientid", profile.client_id.clone());
    vars.insert("auth_xuid", String::new());
    vars.insert("user_type", profile.user_type.clone());
    vars.insert("version_type", "release".to_string());
    vars.insert("natives_directory", natives_dir.to_string_lossy().to_string());
    vars.insert("launcher_name", "CLLauncher".to_string());
    vars.insert("launcher_version", "2.0.0".to_string());
    vars.insert("classpath", classpath_str.clone());
    vars.insert("classpath_separator", sep().to_string());
    vars.insert("library_directory", paths.libraries.to_string_lossy().to_string());
    if let (Some(w), Some(h)) = (profile.resolution_width, profile.resolution_height) {
        vars.insert("resolution_width", w.to_string());
        vars.insert("resolution_height", h.to_string());
    }

    // JVM args: vanilla then loader
    let mut raw_jvm: Vec<String> = Vec::new();
    collect_args(&vanilla, "jvm", custom_resolution, &mut raw_jvm);
    if let Some(lp) = &loader_profile {
        collect_args(lp, "jvm", custom_resolution, &mut raw_jvm);
    }
    // Older vanilla profiles have no arguments.jvm — provide the essentials.
    if raw_jvm.is_empty() {
        raw_jvm.push("-Djava.library.path=${natives_directory}".to_string());
        raw_jvm.push("-cp".to_string());
        raw_jvm.push("${classpath}".to_string());
    }

    // Game args: vanilla then loader
    let mut raw_game: Vec<String> = Vec::new();
    collect_args(&vanilla, "game", custom_resolution, &mut raw_game);
    if let Some(lp) = &loader_profile {
        collect_args(lp, "game", custom_resolution, &mut raw_game);
    }

    let jvm_args = substitute(&raw_jvm, &vars);
    let game_args = substitute(&raw_game, &vars);

    Ok(ResolvedLaunch {
        main_class,
        jvm_args,
        game_args,
    })
}

/// Assembles the final process argv from the resolved launch data.
pub fn build_command(profile: &LaunchProfile, resolved: &ResolvedLaunch) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    args.push(profile.java_path.clone());

    // Memory + GC defaults
    args.push(format!("-Xms{}m", profile.min_ram_mb));
    args.push(format!("-Xmx{}m", profile.max_ram_mb));
    args.push("-XX:+UnlockExperimentalVMOptions".to_string());
    args.push("-XX:+UseG1GC".to_string());
    args.push("-XX:G1NewSizePercent=20".to_string());
    args.push("-XX:G1ReservePercent=20".to_string());
    args.push("-XX:MaxGCPauseMillis=50".to_string());
    args.push("-XX:G1HeapRegionSize=32M".to_string());
    args.push("-Dfile.encoding=UTF-8".to_string());

    for arg in &profile.extra_jvm_args {
        args.push(arg.clone());
    }

    // Version/loader JVM args (module path, classpath, etc.)
    for arg in &resolved.jvm_args {
        args.push(arg.clone());
    }

    args.push(resolved.main_class.clone());

    for arg in &resolved.game_args {
        args.push(arg.clone());
    }

    for arg in &profile.extra_game_args {
        args.push(arg.clone());
    }

    args
}
