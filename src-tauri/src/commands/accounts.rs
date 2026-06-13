use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use crate::error::{AppError, AppResult};
use crate::accounts::{
    microsoft::{MicrosoftAuthFlow, DeviceCodeResponse},
    storage::{load_accounts as storage_load, save_account as storage_save,
               delete_account as storage_delete, load_account_with_tokens},
};

fn get_data_dir(app: &AppHandle) -> AppResult<PathBuf> {
    app.path()
        .app_data_dir()
        .map_err(|e| AppError::Io(e.to_string()))
}

#[tauri::command]
pub async fn load_accounts(app: AppHandle) -> AppResult<Vec<serde_json::Value>> {
    let data_dir = get_data_dir(&app)?;
    storage_load(&data_dir)
}

#[tauri::command]
pub async fn save_account(
    app: AppHandle,
    account_id: String,
    account: serde_json::Value,
) -> AppResult<()> {
    let data_dir = get_data_dir(&app)?;
    storage_save(&data_dir, &account_id, &account)
}

#[tauri::command]
pub async fn delete_account(app: AppHandle, account_id: String) -> AppResult<()> {
    let data_dir = get_data_dir(&app)?;
    storage_delete(&data_dir, &account_id)
}

#[tauri::command]
pub async fn start_microsoft_auth() -> AppResult<DeviceCodeResponse> {
    let flow = MicrosoftAuthFlow::new();
    flow.start_device_code_flow().await
}

#[tauri::command]
pub async fn start_microsoft_auth_browser(app: AppHandle) -> AppResult<serde_json::Value> {
    let flow = MicrosoftAuthFlow::new();
    let auth_url = MicrosoftAuthFlow::build_live_client_auth_url();

    // Channel: WebView on_navigation closure → this async fn
    let (code_tx, code_rx) =
        tokio::sync::oneshot::channel::<Result<String, String>>();
    let code_tx = std::sync::Arc::new(std::sync::Mutex::new(Some(code_tx)));
    let code_tx_nav = code_tx.clone();

    // Embedded sign-in window — intercepts the desktop redirect URI internally
    let auth_window = tauri::WebviewWindowBuilder::new(
        &app,
        "ms-auth",
        tauri::WebviewUrl::External(
            auth_url.parse().map_err(|_| AppError::Auth("Invalid auth URL".into()))?,
        ),
    )
    .title("Sign in with Microsoft")
    .inner_size(500.0, 720.0)
    .center()
    .focused(true)
    .on_navigation(move |url| {
        if url.as_str().starts_with("http://localhost:14321/callback") {
            let result = url
                .query_pairs()
                .find(|(k, _)| k == "code")
                .map(|(_, v)| Ok(v.into_owned()))
                .unwrap_or_else(|| {
                    let desc = url
                        .query_pairs()
                        .find(|(k, _)| k == "error_description")
                        .map(|(_, v)| v.into_owned())
                        .unwrap_or_else(|| "Authentication was cancelled".to_string());
                    Err(desc)
                });
            if let Ok(mut guard) = code_tx_nav.lock() {
                if let Some(sender) = guard.take() {
                    let _ = sender.send(result);
                }
            }
            return false; // block — don't actually navigate there
        }
        true
    })
    .build()
    .map_err(|e| AppError::Auth(format!("Cannot open sign-in window: {e}")))?;

    // Wait up to 5 minutes for the user to sign in
    let code = tokio::time::timeout(
        tokio::time::Duration::from_secs(300),
        code_rx,
    )
    .await
    .map_err(|_| AppError::Auth("Authentication timed out".to_string()))?
    .map_err(|_| AppError::Auth("Sign-in window was closed".to_string()))?
    .map_err(AppError::Auth)?;

    auth_window.close().ok();

    // Exchange code → MS tokens → Xbox → XSTS → Minecraft
    let ms_tokens = flow.exchange_live_desktop_code(&code).await?;
    let profile = flow.full_auth_flow(&ms_tokens).await?;

    Ok(serde_json::json!({
        "username": profile.username,
        "uuid": profile.uuid,
        "access_token": profile.access_token,
        "refresh_token": ms_tokens.refresh_token,
        "ms_access_token": ms_tokens.access_token,
        "expires_at": ms_tokens.expires_at,
    }))
}

#[tauri::command]
pub async fn poll_microsoft_token(device_code: String) -> AppResult<Option<serde_json::Value>> {
    let flow = MicrosoftAuthFlow::new();
    let ms_tokens_opt = flow.poll_device_code_token(&device_code).await?;
    let ms_tokens = match ms_tokens_opt {
        Some(t) => t,
        None => return Ok(None),
    };

    let profile = flow.full_auth_flow(&ms_tokens).await?;

    Ok(Some(serde_json::json!({
        "username": profile.username,
        "uuid": profile.uuid,
        "access_token": profile.access_token,
        "refresh_token": ms_tokens.refresh_token,
        "ms_access_token": ms_tokens.access_token,
        "expires_at": ms_tokens.expires_at,
    })))
}

#[tauri::command]
pub async fn refresh_microsoft_token(
    app: AppHandle,
    account_id: String,
) -> AppResult<serde_json::Value> {
    let data_dir = get_data_dir(&app)?;
    let mut account = load_account_with_tokens(&data_dir, &account_id)?;

    let refresh_token = account["refresh_token"].as_str()
        .ok_or_else(|| AppError::Auth("No refresh token stored".to_string()))?
        .to_string();

    let flow = MicrosoftAuthFlow::new();
    let ms_tokens = flow.refresh_token(&refresh_token).await?;
    let profile = flow.full_auth_flow(&ms_tokens).await?;

    if let Some(obj) = account.as_object_mut() {
        obj.insert("username".to_string(), serde_json::Value::String(profile.username.clone()));
        obj.insert("uuid".to_string(), serde_json::Value::String(profile.uuid.clone()));
        obj.insert("access_token".to_string(), serde_json::Value::String(profile.access_token.clone()));
        obj.insert("refresh_token".to_string(), serde_json::Value::String(ms_tokens.refresh_token.clone()));
        obj.insert("ms_access_token".to_string(), serde_json::Value::String(ms_tokens.access_token.clone()));
        obj.insert("expires_at".to_string(), serde_json::Value::Number(ms_tokens.expires_at.into()));
    }

    storage_save(&data_dir, &account_id, &account)?;

    let mut masked = account.clone();
    if let Some(obj) = masked.as_object_mut() {
        obj.remove("access_token");
        obj.remove("refresh_token");
        obj.remove("ms_access_token");
    }
    Ok(masked)
}

#[tauri::command]
pub async fn load_account_with_tokens_cmd(
    app: AppHandle,
    account_id: String,
) -> AppResult<serde_json::Value> {
    let data_dir = get_data_dir(&app)?;
    load_account_with_tokens(&data_dir, &account_id)
}
