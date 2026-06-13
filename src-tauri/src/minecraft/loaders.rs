use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LoaderType {
    Vanilla,
    Forge,
    NeoForge,
    Fabric,
    Quilt,
}

impl std::fmt::Display for LoaderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LoaderType::Vanilla => write!(f, "vanilla"),
            LoaderType::Forge => write!(f, "forge"),
            LoaderType::NeoForge => write!(f, "neoforge"),
            LoaderType::Fabric => write!(f, "fabric"),
            LoaderType::Quilt => write!(f, "quilt"),
        }
    }
}

impl LoaderType {
    pub fn main_class(&self, _mc_version: &str) -> String {
        match self {
            LoaderType::Vanilla => "net.minecraft.client.main.Main".to_string(),
            LoaderType::Forge => "cpw.mods.bootstraplauncher.BootstrapLauncher".to_string(),
            LoaderType::NeoForge => "cpw.mods.bootstraplauncher.BootstrapLauncher".to_string(),
            LoaderType::Fabric => "net.fabricmc.loader.impl.launch.knot.KnotClient".to_string(),
            LoaderType::Quilt => "org.quiltmc.loader.impl.launch.knot.KnotClient".to_string(),
        }
    }

    #[allow(dead_code)]
    pub fn launcher_meta_url(&self, mc_version: &str, loader_version: &str) -> Option<String> {
        match self {
            LoaderType::Fabric => Some(format!(
                "https://meta.fabricmc.net/v2/versions/loader/{}/{}/profile/json",
                mc_version, loader_version
            )),
            LoaderType::Quilt => Some(format!(
                "https://meta.quiltmc.org/v3/versions/loader/{}/{}/profile/json",
                mc_version, loader_version
            )),
            _ => None,
        }
    }
}
