use std::path::Path;

#[tauri::command]
pub async fn upload_image(source_path: String, project_path: String) -> Result<String, String> {
    let source = Path::new(&source_path);

    // Validate it's an image file
    let ext = source.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let valid_extensions = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"];
    if !valid_extensions.contains(&ext.as_str()) {
        return Err(format!("Unsupported image format: .{}", ext));
    }

    // Create assets directory if needed
    let assets_dir = Path::new(&project_path).join("assets").join("images");
    tokio::fs::create_dir_all(&assets_dir).await.map_err(|e| e.to_string())?;

    // Copy file to project assets
    let filename = source.file_name()
        .ok_or("Invalid source filename")?
        .to_string_lossy()
        .to_string();
    let dest = assets_dir.join(&filename);

    tokio::fs::copy(source, &dest).await.map_err(|e| e.to_string())?;

    let relative_path = format!("assets/images/{}", filename);
    tracing::info!(path = %relative_path, "Image uploaded to project");
    Ok(relative_path)
}

#[tauri::command]
pub async fn link_image_url(url: String) -> Result<String, String> {
    // Basic URL validation
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL must start with http:// or https://".to_string());
    }
    // Full validation (reachability check, content-type) is Level 2
    Ok(url)
}

#[tauri::command]
pub async fn generate_image(_prompt: String) -> Result<String, String> {
    Err("AI image generation is not yet available. This feature will be implemented in a future update.".to_string())
}
