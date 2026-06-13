use std::path::PathBuf;
use crate::error::{AppError, AppResult};

#[allow(dead_code)]
const SERVICE_NAME: &str = "CLLauncher";

pub fn get_accounts_dir(data_dir: &PathBuf) -> PathBuf {
    data_dir.join("accounts")
}

pub fn load_accounts(data_dir: &PathBuf) -> AppResult<Vec<serde_json::Value>> {
    let accounts_dir = get_accounts_dir(data_dir);
    if !accounts_dir.exists() {
        return Ok(vec![]);
    }

    let mut accounts = vec![];
    for entry in std::fs::read_dir(&accounts_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().map(|e| e == "json").unwrap_or(false) {
            let content = std::fs::read_to_string(&path)?;
            if let Ok(mut account) = serde_json::from_str::<serde_json::Value>(&content) {
                // Mask sensitive tokens from the returned object
                if let Some(obj) = account.as_object_mut() {
                    obj.remove("access_token");
                    obj.remove("refresh_token");
                    obj.remove("ms_access_token");
                }
                accounts.push(account);
            }
        }
    }
    Ok(accounts)
}

pub fn save_account(data_dir: &PathBuf, account_id: &str, account: &serde_json::Value) -> AppResult<()> {
    let accounts_dir = get_accounts_dir(data_dir);
    std::fs::create_dir_all(&accounts_dir)?;
    let path = accounts_dir.join(format!("{}.json", account_id));
    let content = serde_json::to_string_pretty(account)?;
    std::fs::write(path, content)?;
    Ok(())
}

pub fn delete_account(data_dir: &PathBuf, account_id: &str) -> AppResult<()> {
    let accounts_dir = get_accounts_dir(data_dir);
    let path = accounts_dir.join(format!("{}.json", account_id));
    if path.exists() {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

pub fn load_account_with_tokens(data_dir: &PathBuf, account_id: &str) -> AppResult<serde_json::Value> {
    let accounts_dir = get_accounts_dir(data_dir);
    let path = accounts_dir.join(format!("{}.json", account_id));
    if !path.exists() {
        return Err(AppError::NotFound(format!("Account {} not found", account_id)));
    }
    let content = std::fs::read_to_string(&path)?;
    let account: serde_json::Value = serde_json::from_str(&content)?;
    Ok(account)
}
