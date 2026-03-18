use keyring::Entry;
use serde::{Serialize, Deserialize};

const SERVICE_NAME: &str = "html-wizard";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub provider: String,
    pub error: Option<String>,
    pub latency_ms: u64,
}

#[tauri::command]
pub async fn store_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())?;
    tracing::info!(provider = %provider, "API key stored in system keychain");
    Ok(())
}

#[tauri::command]
pub async fn get_api_key(provider: String) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn delete_api_key(provider: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => {
            tracing::info!(provider = %provider, "API key deleted from keychain");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => Ok(()), // Already gone, that's fine
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn test_api_key(provider: String, key: String) -> Result<bool, String> {
    // Minimal validation: check key format per provider
    let valid = match provider.as_str() {
        "claude" => key.starts_with("sk-ant-"),
        "openai" => key.starts_with("sk-"),
        "gemini" => key.len() > 20,  // Google API keys are long alphanumeric strings
        _ => key.len() > 10, // Plugin providers: basic length check
    };

    if valid {
        tracing::info!(provider = %provider, "API key format validation passed");
    } else {
        tracing::warn!(provider = %provider, "API key format validation failed");
    }

    Ok(valid)
}

/// Validates an API key by making a real lightweight request to the provider.
/// Returns validation result with latency and error details.
#[tauri::command]
pub async fn test_api_key_with_info(provider: String, key: String) -> Result<ValidationResult, String> {
    let start = std::time::Instant::now();

    let result = match provider.as_str() {
        "claude" => validate_claude_key(&key).await,
        "gemini" => validate_gemini_key(&key).await,
        "openai" => validate_openai_key(&key).await,
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    let latency_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(()) => {
            tracing::info!(provider = %provider, latency_ms, "API key validated successfully");
            Ok(ValidationResult {
                valid: true,
                provider: provider.clone(),
                error: None,
                latency_ms,
            })
        }
        Err(e) => {
            tracing::warn!(provider = %provider, error = %e, "API key validation failed");
            Ok(ValidationResult {
                valid: false,
                provider: provider.clone(),
                error: Some(e),
                latency_ms,
            })
        }
    }
}

async fn validate_claude_key(key: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1,
        "messages": [{"role": "user", "content": "hi"}]
    });
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    match response.status().as_u16() {
        200 | 201 => Ok(()),
        401 => Err("Invalid API key".to_string()),
        403 => Err("API key lacks required permissions".to_string()),
        429 => Ok(()), // Rate limited means the key IS valid
        s => Err(format!("Unexpected response: {}", s)),
    }
}

async fn validate_gemini_key(key: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        key
    );
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    match response.status().as_u16() {
        200 => Ok(()),
        400 => Err("Invalid API key format".to_string()),
        403 => Err("API key invalid or not authorized".to_string()),
        429 => Ok(()), // Rate limited means key is valid
        s => Err(format!("Unexpected response: {}", s)),
    }
}

async fn validate_openai_key(key: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    match response.status().as_u16() {
        200 => Ok(()),
        401 => Err("Invalid API key".to_string()),
        403 => Err("API key lacks required permissions".to_string()),
        429 => Ok(()), // Rate limited means key is valid
        s => Err(format!("Unexpected response: {}", s)),
    }
}
