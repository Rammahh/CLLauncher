#[cfg(test)]
mod tests {
    use sha2::{Sha256, Digest};
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn sha256_of(data: &[u8]) -> String {
        let mut h = Sha256::new();
        h.update(data);
        format!("{:x}", h.finalize())
    }

    #[test]
    fn test_hash_computation() {
        let data = b"hello world";
        let hash = sha256_of(data);
        // Known SHA256 of "hello world"
        assert_eq!(hash, "b94d27b9934d3e08a52e52d7da7dabfac484efe04294e576f6adddfc86b6b3e5");
    }

    #[test]
    fn test_hash_empty() {
        let data = b"";
        let hash = sha256_of(data);
        assert_eq!(hash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }

    #[test]
    fn test_hash_mismatch_detection() {
        let data = b"test data";
        let actual = sha256_of(data);
        let wrong = "0000000000000000000000000000000000000000000000000000000000000000";
        assert_ne!(actual, wrong);
    }

    #[test]
    fn test_file_hash_verification() {
        let mut tmp = NamedTempFile::new().unwrap();
        let content = b"modpack content here";
        tmp.write_all(content).unwrap();

        let data = std::fs::read(tmp.path()).unwrap();
        let actual_hash = sha256_of(&data);
        let expected_hash = sha256_of(content);
        assert_eq!(actual_hash, expected_hash);
    }
}
