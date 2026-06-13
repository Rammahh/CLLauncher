#![allow(dead_code)]
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineAccount {
    pub id: String,
    pub username: String,
    pub uuid: String,
    pub account_type: String,
}

pub fn create_offline_account(username: &str) -> OfflineAccount {
    // Generate a consistent UUID from the username (v3/v5 based)
    let namespace = Uuid::NAMESPACE_DNS;
    let uuid = Uuid::new_v5(&namespace, username.as_bytes());
    let id = Uuid::new_v4().to_string();

    OfflineAccount {
        id,
        username: username.to_string(),
        uuid: uuid.simple().to_string(),
        account_type: "offline".to_string(),
    }
}
