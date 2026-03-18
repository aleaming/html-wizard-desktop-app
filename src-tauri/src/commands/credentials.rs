use keyring::Entry;

const SERVICE_NAME: &str = "html-wizard";

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
