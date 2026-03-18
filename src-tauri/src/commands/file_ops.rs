use crate::AppState;
use std::path::{Path, PathBuf};
use tauri::State;

/// Validate path against project scope. Drops MutexGuard before returning.
fn validate_path(state: &State<'_, AppState>, path: &str) -> Result<PathBuf, String> {
    let guard = state.path_validator.lock().map_err(|e| e.to_string())?;
    let validator = guard.as_ref().ok_or("No project open")?;
    validator.validate(Path::new(path)).map_err(|e| e.to_string())
}

fn validate_new_path(state: &State<'_, AppState>, path: &str) -> Result<PathBuf, String> {
    let guard = state.path_validator.lock().map_err(|e| e.to_string())?;
    let validator = guard.as_ref().ok_or("No project open")?;
    validator.validate_new_path(Path::new(path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let valid_path = validate_path(&state, &path)?;
    let content = tokio::fs::read_to_string(&valid_path).await.map_err(|e| e.to_string())?;
    tracing::info!(path = %valid_path.display(), "File read successfully");
    Ok(content)
}

#[tauri::command]
pub async fn write_file(path: String, content: String, state: State<'_, AppState>) -> Result<(), String> {
    let valid_path = validate_path(&state, &path)?;

    // Create backup
    let backup_path = valid_path.with_extension(
        format!("{}.bak", valid_path.extension().unwrap_or_default().to_string_lossy())
    );
    if valid_path.exists() {
        tokio::fs::copy(&valid_path, &backup_path).await.map_err(|e| e.to_string())?;
    }

    // Atomic write: write to temp, then rename
    let temp_path = valid_path.with_extension("tmp");
    tokio::fs::write(&temp_path, &content).await.map_err(|e: std::io::Error| {
        tracing::error!(path = %valid_path.display(), error = %e, "Failed to write temp file");
        e.to_string()
    })?;
    tokio::fs::rename(&temp_path, &valid_path).await.map_err(|e: std::io::Error| {
        let _ = std::fs::remove_file(&temp_path);
        tracing::error!(path = %valid_path.display(), error = %e, "Failed to rename temp file");
        e.to_string()
    })?;

    tracing::info!(path = %valid_path.display(), "File written successfully (atomic)");
    Ok(())
}

#[tauri::command]
pub async fn create_file(path: String, content: String, state: State<'_, AppState>) -> Result<(), String> {
    let valid_path = validate_new_path(&state, &path)?;

    if let Some(parent) = valid_path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }

    tokio::fs::write(&valid_path, &content).await.map_err(|e| e.to_string())?;
    tracing::info!(path = %valid_path.display(), "File created successfully");
    Ok(())
}

#[tauri::command]
pub async fn delete_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let valid_path = validate_path(&state, &path)?;

    let backup_path = valid_path.with_extension(
        format!("{}.bak", valid_path.extension().unwrap_or_default().to_string_lossy())
    );
    tokio::fs::copy(&valid_path, &backup_path).await.map_err(|e| e.to_string())?;
    tokio::fs::remove_file(&valid_path).await.map_err(|e| e.to_string())?;
    tracing::info!(path = %valid_path.display(), "File deleted (backup created)");
    Ok(())
}

#[tauri::command]
pub async fn list_directory(path: String, state: State<'_, AppState>) -> Result<Vec<crate::models::project::FileEntry>, String> {
    let valid_path = validate_path(&state, &path)?;

    let mut entries = Vec::new();
    let mut dir = tokio::fs::read_dir(&valid_path).await.map_err(|e| e.to_string())?;

    while let Some(entry) = dir.next_entry().await.map_err(|e| e.to_string())? {
        let metadata = entry.metadata().await.map_err(|e| e.to_string())?;
        entries.push(crate::models::project::FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }

    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

#[tauri::command]
pub async fn log_from_frontend(entry: serde_json::Value) -> Result<(), String> {
    let level = entry.get("level").and_then(|l| l.as_str()).unwrap_or("info");
    let module = entry.get("module").and_then(|m| m.as_str()).unwrap_or("frontend");
    let message = entry.get("message").and_then(|m| m.as_str()).unwrap_or("");

    match level {
        "error" => tracing::error!(module = module, "[Frontend] {}", message),
        "warn" => tracing::warn!(module = module, "[Frontend] {}", message),
        "info" => tracing::info!(module = module, "[Frontend] {}", message),
        _ => tracing::debug!(module = module, "[Frontend] {}", message),
    }
    Ok(())
}
