use std::process::Command;
use std::path::Path;

#[derive(serde::Serialize, Debug)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
}

#[tauri::command]
pub async fn git_status(project_root: String) -> Result<Vec<GitFileStatus>, String> {
    let root = Path::new(&project_root);
    if !root.is_dir() {
        return Err(format!("Project root does not exist: {}", project_root));
    }

    let output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&project_root)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git status failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut statuses = Vec::new();

    for line in stdout.lines() {
        if line.len() < 3 {
            continue;
        }
        let xy = &line[0..2];
        let path = line[3..].trim().to_string();

        let status = match xy.trim() {
            "M" | "MM" => "modified",
            "A" => "staged",
            "AM" => "staged",
            "??" => "untracked",
            "D" => "deleted",
            "R" => "renamed",
            s if s.starts_with('M') => "modified",
            s if s.starts_with('A') => "staged",
            _ => "modified",
        }
        .to_string();

        statuses.push(GitFileStatus { path, status });
    }

    Ok(statuses)
}

#[tauri::command]
pub async fn git_commit(project_root: String, message: String) -> Result<String, String> {
    let root = Path::new(&project_root);
    if !root.is_dir() {
        return Err(format!("Project root does not exist: {}", project_root));
    }

    // Stage all changes
    let add_output = Command::new("git")
        .args(["add", "-A"])
        .current_dir(&project_root)
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !add_output.status.success() {
        let stderr = String::from_utf8_lossy(&add_output.stderr);
        return Err(format!("git add failed: {}", stderr));
    }

    // Commit with message
    let commit_output = Command::new("git")
        .args(["commit", "-m", &message])
        .current_dir(&project_root)
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    if !commit_output.status.success() {
        let stderr = String::from_utf8_lossy(&commit_output.stderr);
        return Err(format!("git commit failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&commit_output.stdout);
    tracing::info!(
        project_root = %project_root,
        message = %message,
        "Git commit created"
    );
    Ok(stdout.trim().to_string())
}

#[tauri::command]
pub async fn git_snapshot(project_root: String) -> Result<String, String> {
    let root = Path::new(&project_root);
    if !root.is_dir() {
        return Err(format!("Project root does not exist: {}", project_root));
    }

    // Stage all changes
    let add_output = Command::new("git")
        .args(["add", "-A"])
        .current_dir(&project_root)
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !add_output.status.success() {
        let stderr = String::from_utf8_lossy(&add_output.stderr);
        return Err(format!("git add failed: {}", stderr));
    }

    // Create snapshot commit
    let commit_output = Command::new("git")
        .args(["commit", "-m", "HTML Wizard snapshot"])
        .current_dir(&project_root)
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    if !commit_output.status.success() {
        let stderr = String::from_utf8_lossy(&commit_output.stderr);
        // If "nothing to commit" that's acceptable
        if stderr.contains("nothing to commit") || stderr.contains("nothing added to commit") {
            return Ok("Nothing to snapshot — working tree clean".to_string());
        }
        return Err(format!("git commit failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&commit_output.stdout);
    tracing::info!(
        project_root = %project_root,
        "Git snapshot created"
    );
    Ok(stdout.trim().to_string())
}
