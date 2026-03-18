# Agent Group B: Rust Backend — File Operations & Security

You are a builder agent responsible for the Rust backend core: entry point, file operations, project scanning, path validation, and sanitization. You produce complete, compilable Rust code — no pseudocode or skeletons.

## File Ownership (ONLY touch these files)
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/commands/file_ops.rs`
- `src-tauri/src/commands/project.rs`
- `src-tauri/src/models/mod.rs`
- `src-tauri/src/models/project.rs`
- `src-tauri/src/security/mod.rs`
- `src-tauri/src/security/path_validator.rs`
- `src-tauri/src/security/sanitizer.rs`

## DO NOT touch any files outside this list. Other agents own other files.

## Important: Create all necessary directory structures:
```
src-tauri/src/commands/
src-tauri/src/models/
src-tauri/src/security/
```

---

## Task B-1: Create Tauri Entry Point and Module Structure

### `src-tauri/src/lib.rs`
```rust
pub mod commands;
pub mod models;
pub mod security;
pub mod plugins;
```

### `src-tauri/src/main.rs`
- Use Tauri 2.0 builder pattern
- Register plugins: `tauri_plugin_fs`, `tauri_plugin_http`
- Register ALL command handlers in `generate_handler![]`
- Initialize tracing subscriber with `tracing_subscriber::fmt().with_env_filter("html_wizard=debug").json().init()`
- Create and manage AppState:
```rust
use std::sync::Mutex;
use crate::security::path_validator::PathValidator;

pub struct AppState {
    pub path_validator: Mutex<Option<PathValidator>>,
    pub project_root: Mutex<Option<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            path_validator: Mutex::new(None),
            project_root: Mutex::new(None),
        }
    }
}
```
- The command handlers to register (names only — implementations in other files):
  - `read_file`, `write_file`, `create_file`, `delete_file`, `list_directory`
  - `open_project`, `scan_directory`
  - `store_api_key`, `get_api_key`, `delete_api_key`, `test_api_key`
  - `send_ai_request`, `list_providers`
  - `upload_image`, `link_image_url`, `generate_image`
  - `log_from_frontend`

### `src-tauri/src/commands/mod.rs`
```rust
pub mod file_ops;
pub mod project;
pub mod credentials;
pub mod ai_provider;
pub mod image;
```

### `src-tauri/src/models/mod.rs`
```rust
pub mod project;
pub mod ai;
```

### `src-tauri/src/security/mod.rs`
```rust
pub mod path_validator;
pub mod sanitizer;
```

---

## Task B-2: Implement Path Validator

### `src-tauri/src/security/path_validator.rs`

```rust
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PathValidationError {
    #[error("Path is outside the permitted project scope")]
    OutsideScope,
    #[error("Path is invalid or does not exist: {0}")]
    InvalidPath(String),
    #[error("Path contains invalid characters")]
    InvalidCharacters,
}

// Implement Serialize for Tauri command error handling
impl serde::Serialize for PathValidationError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}

pub struct PathValidator {
    allowed_root: PathBuf,
}

impl PathValidator {
    pub fn new(root: PathBuf) -> Result<Self, PathValidationError> {
        let canonical = root.canonicalize()
            .map_err(|e| PathValidationError::InvalidPath(e.to_string()))?;
        Ok(Self { allowed_root: canonical })
    }

    pub fn validate(&self, path: &Path) -> Result<PathBuf, PathValidationError> {
        // Resolve the path
        let resolved = if path.is_absolute() {
            path.to_path_buf()
        } else {
            self.allowed_root.join(path)
        };

        // Canonicalize to resolve symlinks and ..
        let canonical = resolved.canonicalize()
            .map_err(|e| PathValidationError::InvalidPath(e.to_string()))?;

        // Check that the canonical path starts with the allowed root
        if canonical.starts_with(&self.allowed_root) {
            Ok(canonical)
        } else {
            tracing::warn!(
                path = %path.display(),
                resolved = %canonical.display(),
                root = %self.allowed_root.display(),
                "Path validation failed: outside project scope"
            );
            Err(PathValidationError::OutsideScope)
        }
    }

    pub fn validate_new_path(&self, path: &Path) -> Result<PathBuf, PathValidationError> {
        // For paths that don't exist yet (create operations)
        // Validate the parent directory exists and is within scope
        let resolved = if path.is_absolute() {
            path.to_path_buf()
        } else {
            self.allowed_root.join(path)
        };

        if let Some(parent) = resolved.parent() {
            let canonical_parent = parent.canonicalize()
                .map_err(|e| PathValidationError::InvalidPath(e.to_string()))?;
            if canonical_parent.starts_with(&self.allowed_root) {
                Ok(resolved)
            } else {
                Err(PathValidationError::OutsideScope)
            }
        } else {
            Err(PathValidationError::InvalidPath("No parent directory".to_string()))
        }
    }

    pub fn root(&self) -> &Path {
        &self.allowed_root
    }
}
```

**Test cases to verify:**
- Path within project root → Ok
- `../../etc/passwd` → Err(OutsideScope)
- Symlink pointing outside → Err(OutsideScope)
- New file path in valid directory → Ok via validate_new_path

---

## Task B-3: Implement File Operations Commands

### `src-tauri/src/commands/file_ops.rs`

All operations:
1. Acquire AppState
2. Validate path via PathValidator
3. Perform async I/O via tokio::fs
4. Log operation via tracing
5. Return Result<T, String>

```rust
use crate::AppState;
use std::path::Path;
use tauri::State;

#[tauri::command]
pub async fn read_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let validator = state.path_validator.lock().map_err(|e| e.to_string())?;
    let validator = validator.as_ref().ok_or("No project open")?;
    let valid_path = validator.validate(Path::new(&path)).map_err(|e| e.to_string())?;

    let content = tokio::fs::read_to_string(&valid_path).await.map_err(|e| e.to_string())?;
    tracing::info!(path = %valid_path.display(), "File read successfully");
    Ok(content)
}

#[tauri::command]
pub async fn write_file(path: String, content: String, state: State<'_, AppState>) -> Result<(), String> {
    let validator = state.path_validator.lock().map_err(|e| e.to_string())?;
    let validator = validator.as_ref().ok_or("No project open")?;
    let valid_path = validator.validate(Path::new(&path)).map_err(|e| e.to_string())?;

    // Create backup
    let backup_path = valid_path.with_extension(
        format!("{}.bak", valid_path.extension().unwrap_or_default().to_string_lossy())
    );
    if valid_path.exists() {
        tokio::fs::copy(&valid_path, &backup_path).await.map_err(|e| e.to_string())?;
    }

    // Atomic write: write to temp, then rename
    let temp_path = valid_path.with_extension("tmp");
    tokio::fs::write(&temp_path, &content).await.map_err(|e| {
        tracing::error!(path = %valid_path.display(), error = %e, "Failed to write temp file");
        e.to_string()
    })?;
    tokio::fs::rename(&temp_path, &valid_path).await.map_err(|e| {
        // Clean up temp file on rename failure
        let _ = std::fs::remove_file(&temp_path);
        tracing::error!(path = %valid_path.display(), error = %e, "Failed to rename temp file");
        e.to_string()
    })?;

    tracing::info!(path = %valid_path.display(), "File written successfully (atomic)");
    Ok(())
}

#[tauri::command]
pub async fn create_file(path: String, content: String, state: State<'_, AppState>) -> Result<(), String> {
    let validator = state.path_validator.lock().map_err(|e| e.to_string())?;
    let validator = validator.as_ref().ok_or("No project open")?;
    let valid_path = validator.validate_new_path(Path::new(&path)).map_err(|e| e.to_string())?;

    // Ensure parent directory exists
    if let Some(parent) = valid_path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }

    tokio::fs::write(&valid_path, &content).await.map_err(|e| e.to_string())?;
    tracing::info!(path = %valid_path.display(), "File created successfully");
    Ok(())
}

#[tauri::command]
pub async fn delete_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let validator = state.path_validator.lock().map_err(|e| e.to_string())?;
    let validator = validator.as_ref().ok_or("No project open")?;
    let valid_path = validator.validate(Path::new(&path)).map_err(|e| e.to_string())?;

    // Create backup before deletion
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
    let validator = state.path_validator.lock().map_err(|e| e.to_string())?;
    let validator = validator.as_ref().ok_or("No project open")?;
    let valid_path = validator.validate(Path::new(&path)).map_err(|e| e.to_string())?;

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
```

---

## Task B-4: Implement Project Scanner

### `src-tauri/src/commands/project.rs`

```rust
use crate::models::project::{ProjectInfo, FileNode, FileType};
use crate::security::path_validator::PathValidator;
use crate::AppState;
use std::path::Path;
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

    // Initialize path validator for this project
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

    // Count files (non-recursive quick count)
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
    let validator = state.path_validator.lock().map_err(|e| e.to_string())?;
    let validator = validator.as_ref().ok_or("No project open")?;
    let valid_path = validator.validate(Path::new(&path)).map_err(|e| e.to_string())?;

    let nodes = scan_dir_recursive(&valid_path, 0).await.map_err(|e| e.to_string())?;
    Ok(nodes)
}

async fn scan_dir_recursive(dir: &Path, depth: usize) -> Result<Vec<FileNode>, std::io::Error> {
    if depth > MAX_DEPTH {
        return Ok(Vec::new());
    }

    let mut nodes = Vec::new();
    let mut entries = tokio::fs::read_dir(dir).await?;

    while let Some(entry) = entries.next_entry().await? {
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and excluded directories
        if name.starts_with('.') && name != ".gitignore" {
            continue;
        }

        let metadata = entry.metadata().await?;
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
            Some(scan_dir_recursive(&entry.path(), depth + 1).await?)
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

    // Sort: directories first, then alphabetical
    nodes.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(nodes)
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
        return 0; // Quick count, don't go too deep
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
```

---

## Task B-5: Define Project and File Models

### `src-tauri/src/models/project.rs`

```rust
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub root: String,
    pub name: String,
    pub is_git: bool,
    pub file_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    Html,
    Css,
    Js,
    Image,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub file_type: FileType,
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeEntry {
    pub file_path: String,
    pub original: Option<String>,
    pub modified: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChangeBuffer {
    pub entries: Vec<ChangeEntry>,
}

impl ChangeBuffer {
    pub fn add_change(&mut self, entry: ChangeEntry) {
        // Replace existing entry for the same file, or add new
        if let Some(existing) = self.entries.iter_mut().find(|e| e.file_path == entry.file_path) {
            *existing = entry;
        } else {
            self.entries.push(entry);
        }
    }

    pub fn discard_all(&mut self) {
        self.entries.clear();
    }

    pub fn has_changes(&self) -> bool {
        !self.entries.is_empty()
    }
}
```

### `src-tauri/src/security/sanitizer.rs`

```rust
/// HTML/JS sanitization for AI-generated code
/// Strips dangerous elements before injection into the preview iframe

const DANGEROUS_TAGS: &[&str] = &["script", "iframe", "object", "embed", "form"];
const DANGEROUS_ATTRS: &[&str] = &["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"];

pub fn sanitize_html(html: &str) -> String {
    let mut result = html.to_string();

    // Remove dangerous tags and their contents
    for tag in DANGEROUS_TAGS {
        let open_pattern = format!("<{}", tag);
        let close_pattern = format!("</{}>", tag);

        while let Some(start) = result.to_lowercase().find(&open_pattern) {
            if let Some(end) = result.to_lowercase()[start..].find(&close_pattern) {
                result = format!(
                    "{}{}",
                    &result[..start],
                    &result[start + end + close_pattern.len()..]
                );
            } else if let Some(end) = result[start..].find('>') {
                result = format!("{}{}", &result[..start], &result[start + end + 1..]);
            } else {
                break;
            }
        }
    }

    // Remove dangerous event handler attributes
    for attr in DANGEROUS_ATTRS {
        let pattern = format!("{}=", attr);
        while let Some(pos) = result.to_lowercase().find(&pattern) {
            // Find the end of the attribute value
            let after_eq = pos + pattern.len();
            if let Some(rest) = result.get(after_eq..) {
                let end = if rest.starts_with('"') {
                    rest[1..].find('"').map(|p| after_eq + p + 2)
                } else if rest.starts_with('\'') {
                    rest[1..].find('\'').map(|p| after_eq + p + 2)
                } else {
                    rest.find(' ').or_else(|| rest.find('>')).map(|p| after_eq + p)
                };

                if let Some(end) = end {
                    result = format!("{}{}", &result[..pos], &result[end..]);
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    }

    result
}
```
