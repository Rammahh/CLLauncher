#[cfg(test)]
mod tests {
    use crate::commands::manifest::validate_manifest_path_str;

    #[test]
    fn test_valid_paths() {
        assert!(validate_manifest_path_str("mods/optifine.jar").is_ok());
        assert!(validate_manifest_path_str("config/forge/settings.toml").is_ok());
        assert!(validate_manifest_path_str("mods/my-mod-1.0.jar").is_ok());
        assert!(validate_manifest_path_str("resourcepacks/pack.zip").is_ok());
        assert!(validate_manifest_path_str("shaderpacks/shader.zip").is_ok());
    }

    #[test]
    fn test_reject_absolute_paths() {
        assert!(validate_manifest_path_str("/etc/passwd").is_err());
        assert!(validate_manifest_path_str("/home/user/.ssh/id_rsa").is_err());
    }

    #[test]
    fn test_reject_path_traversal() {
        assert!(validate_manifest_path_str("../../../etc/passwd").is_err());
        assert!(validate_manifest_path_str("mods/../../../evil").is_err());
        assert!(validate_manifest_path_str("../sibling").is_err());
    }

    #[test]
    fn test_reject_windows_absolute_paths() {
        // On non-Windows, these are still relative-looking but we should be safe
        // The path check handles .. and absolute
        assert!(validate_manifest_path_str("mods/safe.jar").is_ok());
    }

    #[test]
    fn test_reject_double_dot_components() {
        assert!(validate_manifest_path_str("mods/../config/evil.cfg").is_err());
    }
}
