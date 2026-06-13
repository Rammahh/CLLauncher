#[cfg(test)]
mod tests {
    use crate::java::{parse_major_version, java_for_mc_version};

    #[test]
    fn test_parse_java_8_legacy() {
        assert_eq!(parse_major_version("1.8.0_392"), 8);
        assert_eq!(parse_major_version("1.8.0_181"), 8);
    }

    #[test]
    fn test_parse_java_modern() {
        assert_eq!(parse_major_version("11.0.21"), 11);
        assert_eq!(parse_major_version("17.0.9"), 17);
        assert_eq!(parse_major_version("21.0.1"), 21);
        assert_eq!(parse_major_version("21"), 21);
    }

    #[test]
    fn test_minecraft_java_requirements() {
        assert_eq!(java_for_mc_version("1.8.9"), 8);
        assert_eq!(java_for_mc_version("1.12.2"), 8);
        assert_eq!(java_for_mc_version("1.16.5"), 8);
        assert_eq!(java_for_mc_version("1.17"), 16);
        assert_eq!(java_for_mc_version("1.18.1"), 17);
        assert_eq!(java_for_mc_version("1.19.4"), 17);
        assert_eq!(java_for_mc_version("1.20.4"), 17);
        assert_eq!(java_for_mc_version("1.20.5"), 21);
        assert_eq!(java_for_mc_version("1.20.6"), 21);
        assert_eq!(java_for_mc_version("1.21"), 21);
        assert_eq!(java_for_mc_version("1.21.1"), 21);
    }
}
