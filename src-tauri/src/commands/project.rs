use crate::models::project::{ProjectInfo, FileNode, FileType};
use crate::security::path_validator::PathValidator;
use crate::AppState;
use std::path::{Path, PathBuf};
use tauri::State;

const SKIP_DIRS: &[&str] = &["node_modules", ".git", "dist", "target", ".next", "__pycache__", ".vscode"];
const MAX_DEPTH: usize = 10;

#[tauri::command]
pub async fn open_project(path: String, state: State<'_, AppState>) -> Result<ProjectInfo, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err("Selected path is not a directory".to_string());
    }

    let canonical = root.canonicalize().map_err(|e| e.to_string())?;

    // Initialize path validator — scoped block drops MutexGuard before .await
    let validator = PathValidator::new(canonical.clone()).map_err(|e| e.to_string())?;
    {
        let mut pv = state.path_validator.lock().map_err(|e| e.to_string())?;
        *pv = Some(validator);
    }
    {
        let mut pr = state.project_root.lock().map_err(|e| e.to_string())?;
        *pr = Some(canonical.to_string_lossy().to_string());
    }

    let name = canonical.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled Project".to_string());

    let is_git = canonical.join(".git").exists();
    let file_count = count_files(&canonical, 0).await;

    tracing::info!(
        project = %name,
        path = %canonical.display(),
        is_git = is_git,
        file_count = file_count,
        "Project opened"
    );

    Ok(ProjectInfo {
        root: canonical.to_string_lossy().to_string(),
        name,
        is_git,
        file_count,
    })
}

#[tauri::command]
pub async fn scan_directory(path: String, state: State<'_, AppState>) -> Result<Vec<FileNode>, String> {
    // Validate path and drop MutexGuard before .await
    let valid_path: PathBuf = {
        let guard = state.path_validator.lock().map_err(|e| e.to_string())?;
        let validator = guard.as_ref().ok_or("No project open")?;
        validator.validate(Path::new(&path)).map_err(|e| e.to_string())?
    };

    let nodes = scan_dir_recursive(&valid_path, 0).await.map_err(|e| e.to_string())?;
    Ok(nodes)
}

fn scan_dir_recursive_sync(dir: &Path, depth: usize) -> Result<Vec<FileNode>, std::io::Error> {
    if depth > MAX_DEPTH {
        return Ok(Vec::new());
    }

    let mut nodes = Vec::new();
    let entries = std::fs::read_dir(dir)?;

    for entry in entries {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') && name != ".gitignore" {
            continue;
        }

        let metadata = entry.metadata()?;
        let is_dir = metadata.is_dir();

        if is_dir && SKIP_DIRS.contains(&name.as_str()) {
            continue;
        }

        let file_type = if is_dir {
            FileType::Other
        } else {
            classify_file(&name)
        };

        let children = if is_dir {
            Some(scan_dir_recursive_sync(&entry.path(), depth + 1)?)
        } else {
            None
        };

        nodes.push(FileNode {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
            file_type,
            children,
        });
    }

    nodes.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(nodes)
}

async fn scan_dir_recursive(dir: &Path, depth: usize) -> Result<Vec<FileNode>, std::io::Error> {
    let dir = dir.to_path_buf();
    tokio::task::spawn_blocking(move || scan_dir_recursive_sync(&dir, depth))
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?
}

fn classify_file(name: &str) -> FileType {
    match name.rsplit('.').next() {
        Some("html" | "htm") => FileType::Html,
        Some("css" | "scss" | "sass" | "less") => FileType::Css,
        Some("js" | "jsx" | "ts" | "tsx" | "mjs") => FileType::Js,
        Some("png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" | "ico") => FileType::Image,
        _ => FileType::Other,
    }
}

async fn count_files(dir: &Path, depth: usize) -> usize {
    if depth > 3 {
        return 0;
    }
    let mut count = 0;
    if let Ok(mut entries) = tokio::fs::read_dir(dir).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let name = entry.file_name().to_string_lossy().to_string();
            if SKIP_DIRS.contains(&name.as_str()) || name.starts_with('.') {
                continue;
            }
            count += 1;
            if let Ok(metadata) = entry.metadata().await {
                if metadata.is_dir() {
                    count += Box::pin(count_files(&entry.path(), depth + 1)).await;
                }
            }
        }
    }
    count
}
