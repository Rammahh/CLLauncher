#![allow(dead_code, unused_variables)]
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use sha2::{Sha256, Digest};
use rand::RngCore;

// Custom Azure app — used for PKCE flow (kept for reference).
const CLIENT_ID: &str = "6e0c96c9-03f9-4574-aa23-9a9f0685f041";
const SCOPE: &str = "XboxLive.signin offline_access";
const REDIRECT_PORT: u16 = 14321;
const REDIRECT_URI: &str = "http://localhost:14321/callback";

// Well-known Xbox/Live client used by community Minecraft launchers.
// Registered by Microsoft with api.minecraftservices.com access.
const LIVE_CLIENT_ID: &str = "000000004C17A0D8";
const LIVE_REDIRECT_URI: &str = "https://login.live.com/oauth20_desktop.srf";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MicrosoftTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinecraftProfile {
    pub uuid: String,
    pub username: String,
    pub access_token: String,
}

pub struct MicrosoftAuthFlow {
    client: reqwest::Client,
}

impl MicrosoftAuthFlow {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    /// Generates PKCE challenge and returns (auth_url, code_verifier).
    /// Uses login.live.com (MSA-native OAuth) so the token is accepted by
    /// api.minecraftservices.com. Scope uses live.com naming (Xboxlive.*).
    pub fn build_auth_url() -> (String, String) {
        let mut bytes = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut bytes);
        let verifier = URL_SAFE_NO_PAD.encode(bytes);

        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let challenge = URL_SAFE_NO_PAD.encode(hasher.finalize());

        let url = format!(
            "https://login.live.com/oauth20_authorize.srf\
            ?client_id={CLIENT_ID}\
            &response_type=code\
            &redirect_uri=http%3A%2F%2Flocalhost%3A14321%2Fcallback\
            &scope=Xboxlive.signin%20Xboxlive.offline_access\
            &code_challenge={challenge}\
            &code_challenge_method=S256\
            &approval_prompt=auto"
        );

        (url, verifier)
    }

    /// Starts a local HTTP listener on REDIRECT_PORT and waits for the OAuth redirect.
    pub async fn wait_for_redirect_code() -> AppResult<String> {
        use tokio::net::TcpListener;
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let listener = TcpListener::bind(format!("127.0.0.1:{REDIRECT_PORT}"))
            .await
            .map_err(|e| AppError::Auth(format!("Cannot bind localhost:{REDIRECT_PORT} — {e}")))?;

        let (mut stream, _) = tokio::time::timeout(
            tokio::time::Duration::from_secs(300),
            listener.accept(),
        )
        .await
        .map_err(|_| AppError::Auth("Authentication timed out (5 minutes)".to_string()))?
        .map_err(|e| AppError::Auth(e.to_string()))?;

        let mut buf = vec![0u8; 8192];
        let n = stream.read(&mut buf).await.map_err(|e| AppError::Auth(e.to_string()))?;
        let request = String::from_utf8_lossy(&buf[..n]).to_string();

        let html = r#"<!DOCTYPE html><html><head><title>CLLauncher</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;
height:100vh;margin:0;background:#0f0f0f}.card{background:#1a1a1a;color:#e0e0e0;padding:2rem;
border-radius:12px;text-align:center}h1{color:#4ade80}p{color:#9ca3af}</style></head>
<body><div class="card"><h1>&#10003; Signed in to CLLauncher</h1>
<p>You can close this window.</p></div></body></html>"#;
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            html.len(), html
        );
        stream.write_all(response.as_bytes()).await.ok();
        drop(stream);

        // Parse: "GET /callback?code=XXX&... HTTP/1.1"
        let path = request.lines().next().unwrap_or_default()
            .split_whitespace().nth(1).unwrap_or_default();
        let query = path.splitn(2, '?').nth(1).unwrap_or_default();

        let code = query.split('&')
            .find(|p| p.starts_with("code="))
            .map(|p| percent_decode(&p[5..]))
            .ok_or_else(|| {
                let error_desc = query.split('&')
                    .find(|p| p.starts_with("error_description="))
                    .map(|p| percent_decode(&p[18..]))
                    .unwrap_or_else(|| "no authorization code received".to_string());
                AppError::Auth(format!("Auth cancelled or failed: {error_desc}"))
            })?;

        Ok(code)
    }

    /// Exchanges the authorization code for Microsoft tokens using PKCE.
    pub async fn exchange_code_for_tokens(
        &self,
        code: &str,
        code_verifier: &str,
    ) -> AppResult<MicrosoftTokens> {
        let params = [
            ("client_id", CLIENT_ID),
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", REDIRECT_URI),
            ("code_verifier", code_verifier),
            ("scope", "Xboxlive.signin Xboxlive.offline_access"),
        ];

        let resp = self.client
            .post("https://login.live.com/oauth20_token.srf")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        let text = resp.text().await.unwrap_or_default();
        let json: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| AppError::Auth(format!("JSON parse error: {e}")))?;

        if let Some(err) = json.get("error").and_then(|e| e.as_str()) {
            return Err(AppError::Auth(format!(
                "Token exchange failed: {} — {}",
                err,
                json.get("error_description").and_then(|d| d.as_str()).unwrap_or("")
            )));
        }

        let access_token = json["access_token"].as_str()
            .ok_or_else(|| AppError::Auth("No access_token in response".to_string()))?
            .to_string();
        let refresh_token = json["refresh_token"].as_str()
            .ok_or_else(|| AppError::Auth("No refresh_token in response".to_string()))?
            .to_string();
        let expires_in = json["expires_in"].as_i64().unwrap_or(3600);
        let expires_at = chrono::Utc::now().timestamp() + expires_in;

        Ok(MicrosoftTokens { access_token, refresh_token, expires_at })
    }

    /// Auth URL using our own Azure App with live.com endpoint + loopback redirect.
    pub fn build_live_client_auth_url() -> String {
        format!(
            "https://login.live.com/oauth20_authorize.srf\
            ?client_id={CLIENT_ID}\
            &response_type=code\
            &redirect_uri=http%3A%2F%2Flocalhost%3A{REDIRECT_PORT}%2Fcallback\
            &scope=XboxLive.signin%20offline_access"
        )
    }

    /// Token exchange using our own Azure App with loopback redirect.
    pub async fn exchange_live_desktop_code(&self, code: &str) -> AppResult<MicrosoftTokens> {
        let params = [
            ("client_id", CLIENT_ID),
            ("code", code),
            ("grant_type", "authorization_code"),
            ("redirect_uri", REDIRECT_URI),
            ("scope", "XboxLive.signin offline_access"),
        ];

        let resp = self.client
            .post("https://login.live.com/oauth20_token.srf")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        let text = resp.text().await.unwrap_or_default();
        let json: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| AppError::Auth(format!("JSON parse: {e}")))?;

        if let Some(err) = json.get("error").and_then(|e| e.as_str()) {
            return Err(AppError::Auth(format!(
                "Token exchange failed: {} — {}",
                err,
                json.get("error_description").and_then(|d| d.as_str()).unwrap_or("")
            )));
        }

        let access_token = json["access_token"].as_str()
            .ok_or_else(|| AppError::Auth("No access_token".to_string()))?.to_string();
        let refresh_token = json["refresh_token"].as_str()
            .ok_or_else(|| AppError::Auth("No refresh_token".to_string()))?.to_string();
        let expires_in = json["expires_in"].as_i64().unwrap_or(3600);
        let expires_at = chrono::Utc::now().timestamp() + expires_in;

        Ok(MicrosoftTokens { access_token, refresh_token, expires_at })
    }

    pub fn get_device_code_url() -> String {
        format!(
            "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode"
        )
    }

    pub async fn start_device_code_flow(&self) -> AppResult<DeviceCodeResponse> {
        let params = [
            ("client_id", CLIENT_ID),
            ("scope", SCOPE),
        ];

        let resp = self.client
            .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::Auth(format!("Device code request failed: {}", text)));
        }

        resp.json::<DeviceCodeResponse>()
            .await
            .map_err(|e| AppError::Auth(format!("Failed to parse device code response: {}", e)))
    }

    pub async fn poll_device_code_token(&self, device_code: &str) -> AppResult<Option<MicrosoftTokens>> {
        let params = [
            ("client_id", CLIENT_ID),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("device_code", device_code),
        ];

        let resp = self.client
            .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let json: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| AppError::Auth(format!("JSON parse error: {}", e)))?;

        if let Some(err) = json.get("error").and_then(|e| e.as_str()) {
            if err == "authorization_pending" || err == "slow_down" {
                return Ok(None);
            }
            return Err(AppError::Auth(format!(
                "Token error: {} - {}",
                err,
                json.get("error_description").and_then(|d| d.as_str()).unwrap_or("")
            )));
        }

        let access_token = json["access_token"].as_str()
            .ok_or_else(|| AppError::Auth("No access_token".to_string()))?
            .to_string();
        let refresh_token = json["refresh_token"].as_str()
            .ok_or_else(|| AppError::Auth("No refresh_token".to_string()))?
            .to_string();
        let expires_in = json["expires_in"].as_i64().unwrap_or(3600);
        let expires_at = chrono::Utc::now().timestamp() + expires_in;

        Ok(Some(MicrosoftTokens {
            access_token,
            refresh_token,
            expires_at,
        }))
    }

    pub async fn refresh_token(&self, refresh_token: &str) -> AppResult<MicrosoftTokens> {
        let params = [
            ("client_id", CLIENT_ID),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            ("scope", SCOPE),
        ];

        let resp = self.client
            .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        let text = resp.text().await.unwrap_or_default();
        let json: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| AppError::Auth(e.to_string()))?;

        if let Some(err) = json.get("error").and_then(|e| e.as_str()) {
            return Err(AppError::Auth(format!("Refresh failed: {} - {}",
                err,
                json.get("error_description").and_then(|d| d.as_str()).unwrap_or("")
            )));
        }

        let access_token = json["access_token"].as_str()
            .ok_or_else(|| AppError::Auth("No access_token in refresh".to_string()))?
            .to_string();
        let new_refresh = json["refresh_token"].as_str()
            .unwrap_or(refresh_token)
            .to_string();
        let expires_in = json["expires_in"].as_i64().unwrap_or(3600);
        let expires_at = chrono::Utc::now().timestamp() + expires_in;

        Ok(MicrosoftTokens {
            access_token,
            refresh_token: new_refresh,
            expires_at,
        })
    }

    pub async fn authenticate_xbox(&self, ms_access_token: &str) -> AppResult<String> {
        let body = serde_json::json!({
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": format!("d={}", ms_access_token)
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT"
        });

        let resp = self.client
            .post("https://user.auth.xboxlive.com/user/authenticate")
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        let status = resp.status();
        let json: serde_json::Value = resp.json().await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        if !status.is_success() {
            return Err(AppError::Auth(format!("Xbox Live auth failed ({status}): {json}")));
        }

        let xbl_token = json["Token"].as_str()
            .ok_or_else(|| AppError::Auth(format!("No XBL token in response: {json}")))?
            .to_string();

        Ok(xbl_token)
    }

    pub async fn authenticate_xsts(&self, xbl_token: &str) -> AppResult<(String, String)> {
        let body = serde_json::json!({
            "Properties": {
                "SandboxId": "RETAIL",
                "UserTokens": [xbl_token]
            },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT"
        });

        let resp = self.client
            .post("https://xsts.auth.xboxlive.com/xsts/authorize")
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        let status = resp.status();
        let json: serde_json::Value = resp.json().await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        if !status.is_success() {
            let xerr = json["XErr"].as_u64().unwrap_or(0);
            let msg = match xerr {
                2148916233 => "Xbox account required. Please create one.",
                2148916235 => "Xbox Live is not available in your region.",
                2148916238 => "Child accounts cannot use Xbox Live without parental consent.",
                _ => "XSTS authentication failed.",
            };
            return Err(AppError::Auth(msg.to_string()));
        }

        let xsts_token = json["Token"].as_str()
            .ok_or_else(|| AppError::Auth("No XSTS token".to_string()))?
            .to_string();
        let userhash = json["DisplayClaims"]["xui"][0]["uhs"].as_str()
            .ok_or_else(|| AppError::Auth("No userhash".to_string()))?
            .to_string();

        Ok((xsts_token, userhash))
    }

    pub async fn get_minecraft_token(&self, xsts_token: &str, userhash: &str) -> AppResult<String> {
        let body = serde_json::json!({
            "identityToken": format!("XBL3.0 x={};{}", userhash, xsts_token)
        });

        let resp = self.client
            .post("https://api.minecraftservices.com/authentication/login_with_xbox")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        let status = resp.status();
        let json: serde_json::Value = resp.json().await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        if !status.is_success() {
            let err = json["error"].as_str().unwrap_or("unknown");
            let msg = json["errorMessage"].as_str()
                .or_else(|| json["message"].as_str())
                .unwrap_or("no details");
            return Err(AppError::Auth(format!("Minecraft login failed ({status}): {err} — {msg}")));
        }

        let mc_token = json["access_token"].as_str()
            .ok_or_else(|| AppError::Auth(format!("No access_token in Minecraft response: {json}")))?
            .to_string();

        Ok(mc_token)
    }

    pub async fn get_profile(&self, mc_token: &str) -> AppResult<MinecraftProfile> {
        let resp = self.client
            .get("https://api.minecraftservices.com/minecraft/profile")
            .header("Authorization", format!("Bearer {}", mc_token))
            .send()
            .await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        if !resp.status().is_success() {
            return Err(AppError::Auth("Minecraft profile not found. Do you own Minecraft?".to_string()));
        }

        let json: serde_json::Value = resp.json().await
            .map_err(|e| AppError::Auth(e.to_string()))?;

        let uuid = json["id"].as_str()
            .ok_or_else(|| AppError::Auth("No UUID in profile".to_string()))?
            .to_string();
        let username = json["name"].as_str()
            .ok_or_else(|| AppError::Auth("No name in profile".to_string()))?
            .to_string();

        Ok(MinecraftProfile {
            uuid,
            username,
            access_token: mc_token.to_string(),
        })
    }

    pub async fn full_auth_flow(&self, ms_tokens: &MicrosoftTokens) -> AppResult<MinecraftProfile> {
        let xbl_token = self.authenticate_xbox(&ms_tokens.access_token).await?;
        let (xsts_token, userhash) = self.authenticate_xsts(&xbl_token).await?;
        let mc_token = self.get_minecraft_token(&xsts_token, &userhash).await?;
        self.get_profile(&mc_token).await
    }
}

fn percent_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(n) = u8::from_str_radix(std::str::from_utf8(&bytes[i+1..i+3]).unwrap_or(""), 16) {
                out.push(n as char);
                i += 3;
                continue;
            }
        } else if bytes[i] == b'+' {
            out.push(' ');
            i += 1;
            continue;
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
    pub message: String,
}
