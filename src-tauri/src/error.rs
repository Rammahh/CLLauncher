use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Hash mismatch: expected {expected}, got {got}")]
    HashMismatch { expected: String, got: String },
    #[error("Path traversal detected: {0}")]
    PathTraversal(String),
    #[error("Java not found: {0}")]
    JavaNotFound(String),
    #[error("Launch error: {0}")]
    Launch(String),
    #[error("Auth error: {0}")]
    Auth(String),
    #[error("Serialization error: {0}")]
    Serde(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Cancelled")]
    Cancelled,
    #[error("Unknown error: {0}")]
    Unknown(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Serde(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Network(e.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError::Unknown(e.to_string())
    }
}

impl From<zip::result::ZipError> for AppError {
    fn from(e: zip::result::ZipError) -> Self {
        AppError::Io(e.to_string())
    }
}
