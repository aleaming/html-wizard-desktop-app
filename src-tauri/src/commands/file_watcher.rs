use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event};
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

/// Payload emitted to the frontend when a file changes.
#[derive(Clone, serde::Serialize)]
pub struct FileChangedPayload {
    pub path: String,
    pub kind: String, // "modified" | "created" | "removed"
}

/// Global watcher registry — one watcher per watched path.
static WATCHERS: Mutex<Option<HashMap<String, RecommendedWatcher>>> =
    Mutex::new(None);

/// Start watching a file path. Emits "file-changed" events to the frontend.
#[tauri::command]
pub async fn watch_file(app: AppHandle, path: String) -> Result<(), String> {
    let (tx, mut rx) = mpsc::channel::<Result<Event, notify::Error>>(64);

    let mut watcher = RecommendedWatcher::new(
        move |res| {
            let _ = tx.blocking_send(res);
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(std::path::Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Store watcher to keep it alive
    {
        let mut guard = WATCHERS.lock().map_err(|e| e.to_string())?;
        if guard.is_none() {
            *guard = Some(HashMap::new());
        }
        guard.as_mut().unwrap().insert(path.clone(), watcher);
    }

    let app_clone = app.clone();
    let watched_path = path.clone();

    tokio::spawn(async move {
        while let Some(event_result) = rx.recv().await {
            match event_result {
                Ok(event) => {
                    let kind_str = match event.kind {
                        notify::EventKind::Modify(_) => "modified",
                        notify::EventKind::Create(_) => "created",
                        notify::EventKind::Remove(_) => "removed",
                        _ => continue,
                    };
                    let payload = FileChangedPayload {
                        path: watched_path.clone(),
                        kind: kind_str.to_string(),
                    };
                    let _ = app_clone.emit("file-changed", payload);
                }
                Err(e) => {
                    tracing::error!(error = %e, "File watcher error");
                }
            }
        }
    });

    tracing::info!(path = %path, "File watcher started");
    Ok(())
}

/// Stop watching a file path.
#[tauri::command]
pub async fn unwatch_file(path: String) -> Result<(), String> {
    let mut guard = WATCHERS.lock().map_err(|e| e.to_string())?;
    if let Some(watchers) = guard.as_mut() {
        watchers.remove(&path);
        tracing::info!(path = %path, "File watcher stopped");
    }
    Ok(())
}
