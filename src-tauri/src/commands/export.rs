use std::path::{Path, PathBuf};
use std::fs;

#[derive(serde::Deserialize)]
pub struct ExportOptions {
    pub project_root: String,
    pub destination: String,
    pub minify_html: bool,
    pub minify_css: bool,
    pub minify_js: bool,
    pub inline_css: bool,
}

const SKIP_DIRS: &[&str] = &["node_modules", ".git", "target", "dist", ".next", "__pycache__"];

#[tauri::command]
pub async fn export_project(options: ExportOptions) -> Result<String, String> {
    let root = Path::new(&options.project_root);
    if !root.is_dir() {
        return Err(format!("Project root does not exist: {}", options.project_root));
    }

    let dest = Path::new(&options.destination);
    fs::create_dir_all(dest).map_err(|e| format!("Failed to create destination: {}", e))?;

    // Collect all files to export
    let files = collect_files(root, root).map_err(|e| e.to_string())?;

    // If inline_css is enabled, collect CSS content keyed by filename
    let css_map = if options.inline_css {
        build_css_map(&files, root)?
    } else {
        std::collections::HashMap::new()
    };

    for rel_path in &files {
        let src_path = root.join(rel_path);
        let dst_path = dest.join(rel_path);

        // Create parent directories
        if let Some(parent) = dst_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
        }

        let content = fs::read_to_string(&src_path);
        match content {
            Ok(text) => {
                let ext = src_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();

                let processed = match ext.as_str() {
                    "html" | "htm" => {
                        let mut html = text.clone();
                        if options.inline_css {
                            html = inline_css_into_html(html, &css_map);
                        }
                        if options.minify_html {
                            html = minify_html(&html);
                        }
                        html
                    }
                    "css" => {
                        if options.minify_css {
                            minify_css(&text)
                        } else {
                            text
                        }
                    }
                    "js" => {
                        if options.minify_js {
                            minify_js(&text)
                        } else {
                            text
                        }
                    }
                    _ => text,
                };

                fs::write(&dst_path, processed)
                    .map_err(|e| format!("Failed to write {}: {}", dst_path.display(), e))?;
            }
            Err(_) => {
                // Binary file — copy as-is
                fs::copy(&src_path, &dst_path)
                    .map_err(|e| format!("Failed to copy {}: {}", src_path.display(), e))?;
            }
        }
    }

    tracing::info!(
        destination = %options.destination,
        file_count = files.len(),
        "Export complete"
    );

    Ok(options.destination.clone())
}

fn collect_files(dir: &Path, root: &Path) -> Result<Vec<PathBuf>, std::io::Error> {
    let mut result = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs (except .gitignore) and known build artifacts
        if name.starts_with('.') && name != ".gitignore" {
            continue;
        }
        if SKIP_DIRS.contains(&name.as_str()) {
            continue;
        }

        let path = entry.path();
        let metadata = entry.metadata()?;

        if metadata.is_dir() {
            let sub = collect_files(&path, root)?;
            result.extend(sub);
        } else {
            let rel = path.strip_prefix(root).unwrap_or(&path).to_path_buf();
            result.push(rel);
        }
    }
    Ok(result)
}

fn build_css_map(
    files: &[PathBuf],
    root: &Path,
) -> Result<std::collections::HashMap<String, String>, String> {
    let mut map = std::collections::HashMap::new();
    for rel in files {
        let ext = rel
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        if ext == "css" {
            let src = root.join(rel);
            let content = fs::read_to_string(&src)
                .map_err(|e| format!("Failed to read CSS {}: {}", src.display(), e))?;
            let filename = rel
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            map.insert(filename, content);
        }
    }
    Ok(map)
}

/// Inject CSS files referenced via <link> tags as inline <style> blocks.
fn inline_css_into_html(
    html: String,
    css_map: &std::collections::HashMap<String, String>,
) -> String {
    let mut result = html;
    for (filename, css_content) in css_map {
        // Match <link rel="stylesheet" href="...filename..."> (order-insensitive attributes)
        let pattern = format!("href=\"{}", filename);
        if result.contains(&pattern) {
            // Remove the <link> tag line
            let lines: Vec<&str> = result.lines().collect();
            let filtered: Vec<&str> = lines
                .iter()
                .filter(|line| {
                    !(line.contains("<link") && line.contains(&pattern))
                })
                .copied()
                .collect();
            result = filtered.join("\n");
            // Inject <style> before </head>
            let style_tag = format!("<style>\n{}\n</style>", css_content);
            result = result.replacen("</head>", &format!("{}\n</head>", style_tag), 1);
        }
    }
    result
}

/// Basic HTML minification: collapse whitespace between tags, strip leading whitespace per line.
fn minify_html(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut in_pre = false;

    for line in html.lines() {
        let lower = line.to_lowercase();
        if lower.contains("<pre") {
            in_pre = true;
        }
        if in_pre {
            out.push_str(line);
            out.push('\n');
            if lower.contains("</pre>") {
                in_pre = false;
            }
            continue;
        }
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            out.push_str(trimmed);
        }
    }
    out
}

/// Basic CSS minification: remove comments and collapse whitespace.
fn minify_css(css: &str) -> String {
    // Remove /* ... */ comments
    let mut result = String::with_capacity(css.len());
    let mut chars = css.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '/' && chars.peek() == Some(&'*') {
            chars.next(); // consume '*'
            // Scan until */
            loop {
                match chars.next() {
                    Some('*') => {
                        if chars.peek() == Some(&'/') {
                            chars.next();
                            break;
                        }
                    }
                    None => break,
                    _ => {}
                }
            }
        } else {
            result.push(c);
        }
    }

    // Collapse whitespace
    let mut out = String::with_capacity(result.len());
    let mut last_was_space = false;
    for c in result.chars() {
        if c.is_whitespace() {
            if !last_was_space {
                out.push(' ');
            }
            last_was_space = true;
        } else {
            out.push(c);
            last_was_space = false;
        }
    }

    // Remove spaces around certain CSS characters
    let out = out
        .replace(" { ", "{")
        .replace(" {", "{")
        .replace("{ ", "{")
        .replace(" } ", "}")
        .replace(" }", "}")
        .replace("} ", "}")
        .replace(" : ", ":")
        .replace(": ", ":")
        .replace(" :", ":")
        .replace(" ; ", ";")
        .replace("; ", ";")
        .replace(" ;", ";")
        .replace(" , ", ",")
        .replace(", ", ",")
        .replace(" ,", ",");

    out.trim().to_string()
}

/// Basic JS minification: remove single-line comments, collapse whitespace.
fn minify_js(js: &str) -> String {
    let mut out = String::with_capacity(js.len());

    for line in js.lines() {
        let trimmed = line.trim();
        // Remove single-line comments (simple heuristic; skips lines starting with //)
        if trimmed.starts_with("//") {
            continue;
        }
        // Strip inline // comment (very naive — doesn't handle strings with //)
        let code = if let Some(idx) = trimmed.find("//") {
            trimmed[..idx].trim_end()
        } else {
            trimmed
        };
        if !code.is_empty() {
            out.push_str(code);
            out.push(' ');
        }
    }

    // Remove /* ... */ block comments
    let mut result = String::with_capacity(out.len());
    let mut chars = out.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '/' && chars.peek() == Some(&'*') {
            chars.next();
            loop {
                match chars.next() {
                    Some('*') => {
                        if chars.peek() == Some(&'/') {
                            chars.next();
                            break;
                        }
                    }
                    None => break,
                    _ => {}
                }
            }
        } else {
            result.push(c);
        }
    }

    result.trim().to_string()
}
