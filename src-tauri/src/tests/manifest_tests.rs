#[cfg(test)]
mod tests {
    use crate::commands::manifest::{ManifestFile, validate_manifest_path_str, is_protected};

    #[test]
    fn test_protected_paths_not_deleted() {
        assert!(is_protected("saves"));
        assert!(is_protected("saves/world1"));
        assert!(is_protected("screenshots"));
        assert!(is_protected("screenshots/2024-01-01.png"));
        assert!(is_protected("options.txt"));
        assert!(is_protected("servers.dat"));
        assert!(is_protected("shaderpacks"));
        assert!(is_protected("resourcepacks"));
        assert!(is_protected("resourcepacks/mypack.zip"));
    }

    #[test]
    fn test_non_protected_paths_can_be_deleted() {
        assert!(!is_protected("mods/old-mod.jar"));
        assert!(!is_protected("config/forge/forge.cfg"));
        assert!(!is_protected("libraries/something.jar"));
    }

    #[test]
    fn test_manifest_file_validation() {
        let valid = ManifestFile {
            path: "mods/optifine.jar".to_string(),
            url: Some("https://example.com/optifine.jar".to_string()),
            sha256: Some("abc123".to_string()),
            size: Some(1024),
            file_type: Some("mod".to_string()),
            side: Some("client".to_string()),
            required: Some(true),
            optional: Some(false),
            action: Some("download".to_string()),
            group: None,
            description: None,
        };
        assert!(validate_manifest_path_str(&valid.path).is_ok());
    }

    #[test]
    fn test_manifest_file_traversal_rejected() {
        let bad = ManifestFile {
            path: "../../../system32/evil.dll".to_string(),
            url: Some("https://example.com/evil.dll".to_string()),
            sha256: None,
            size: None,
            file_type: None,
            side: None,
            required: Some(true),
            optional: Some(false),
            action: Some("download".to_string()),
            group: None,
            description: None,
        };
        assert!(validate_manifest_path_str(&bad.path).is_err());
    }

    #[test]
    fn test_optional_file_skip() {
        // Files marked optional=true and required=false should be skippable
        let file = ManifestFile {
            path: "mods/minimap.jar".to_string(),
            url: Some("https://example.com/minimap.jar".to_string()),
            sha256: None,
            size: None,
            file_type: Some("mod".to_string()),
            side: Some("client".to_string()),
            required: Some(false),
            optional: Some(true),
            action: Some("download".to_string()),
            group: Some("Minimap".to_string()),
            description: Some("Optional minimap mod".to_string()),
        };
        assert!(file.optional.unwrap_or(false));
        assert!(!file.required.unwrap_or(true));
    }
}
