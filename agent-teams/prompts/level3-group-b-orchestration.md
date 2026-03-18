# Agent Group B (Level 3): Rust Credentials Validation & Orchestration

You are a builder agent responsible for real API key validation, AppState extension, orchestration commands, and AI code sanitization. You produce complete, production-ready Rust code — no pseudocode, no placeholders.

## Context

Level 1 created stub validation in `src-tauri/src/commands/credentials.rs` (checks key format only). Level 2 added visual editor state. Your job is to add real lightweight API validation, extend `AppState` with rate limiting and health tracking, and create the orchestration command module.

## File Ownership (ONLY touch these files)
- `src-tauri/src/commands/credentials.rs` (MODIFY — keep existing commands, add test_api_key_with_info)
- `src-tauri/src/lib.rs` (MODIFY — extend AppState)
- `src-tauri/src/commands/orchestration.rs` (CREATE)
- `src-tauri/src/security/sanitizer.rs` (MODIFY — add AI code extraction helpers)

## DO NOT touch commands/mod.rs or main.rs — Group F owns those files.

---

## CRITICAL: Read Before Writing

Before modifying any file, read it to understand existing content. Preserve all existing functions and structs; only add new ones.

Read these files first:
- `src-tauri/src/commands/credentials.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/security/sanitizer.rs`
- `src-tauri/src/models/ai.rs` (for ProviderHealth type you'll add)

---

## Task B1: Real API Key Validation

### Add to `src-tauri/src/models/ai.rs`

Wait — you do NOT own models/ai.rs. Instead, define `ProviderHealth` and `ValidationResult` directly at the top of `credentials.rs` with a `use` import for serialization only. Like this:

```rust
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub provider: String,
    pub error: Option<String>,
    pub latency_ms: u64,
}
```

### Add new command `test_api_key_with_info` to `credentials.rs`

This replaces the format-only check with a real lightweight HTTP request to each provider. Keep the existing `test_api_key` command unchanged (it is registered in main.rs — changing it would break things).

```rust
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
```

### Claude validation — send minimal message, expect success or 401

```rust
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
```

### Gemini validation — use models list endpoint (no tokens consumed)

```rust
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
```

### OpenAI validation — use models list endpoint (no tokens consumed)

```rust
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
```

**Add `use reqwest;` and `use serde_json;` imports at the top of credentials.rs.**

---

## Task B2: Extend AppState in lib.rs

Read the existing `src-tauri/src/lib.rs` and EXTEND `AppState` and its `Default` impl. Do not remove existing fields.

Add these imports at the top of lib.rs:
```rust
use std::collections::HashMap;
```

Add these structs above `AppState`:
```rust
#[derive(Debug, Clone)]
pub struct RateLimiterState {
    pub request_count: u32,
    pub window_start: std::time::Instant,
    pub max_requests_per_minute: u32,
}

impl Default for RateLimiterState {
    fn default() -> Self {
        Self {
            request_count: 0,
            window_start: std::time::Instant::now(),
            max_requests_per_minute: 60,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ProviderHealth {
    pub is_healthy: bool,
    pub last_checked: Option<std::time::Instant>,
    pub last_error: Option<String>,
    pub average_latency_ms: u64,
    pub success_count: u32,
    pub error_count: u32,
}

impl Default for ProviderHealth {
    fn default() -> Self {
        Self {
            is_healthy: true, // Optimistic default
            last_checked: None,
            last_error: None,
            average_latency_ms: 0,
            success_count: 0,
            error_count: 0,
        }
    }
}
```

Extend `AppState` with new fields:
```rust
pub struct AppState {
    pub path_validator: Mutex<Option<PathValidator>>,
    pub project_root: Mutex<Option<String>>,
    // Level 3 additions:
    pub rate_limiter: Mutex<HashMap<String, RateLimiterState>>,
    pub provider_health: Mutex<HashMap<String, ProviderHealth>>,
}
```

Update `Default for AppState`:
```rust
impl Default for AppState {
    fn default() -> Self {
        let mut health = HashMap::new();
        health.insert("claude".to_string(), ProviderHealth::default());
        health.insert("gemini".to_string(), ProviderHealth::default());
        health.insert("openai".to_string(), ProviderHealth::default());

        Self {
            path_validator: Mutex::new(None),
            project_root: Mutex::new(None),
            rate_limiter: Mutex::new(HashMap::new()),
            provider_health: Mutex::new(health),
        }
    }
}
```

---

## Task B3: Create orchestration.rs

CREATE `src-tauri/src/commands/orchestration.rs` with these commands:

```rust
use crate::AppState;
use crate::{ProviderHealth, RateLimiterState};
use serde::{Serialize, Deserialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct RateLimitStatus {
    pub provider: String,
    pub requests_this_minute: u32,
    pub max_requests_per_minute: u32,
    pub is_limited: bool,
    pub reset_in_seconds: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderHealthStatus {
    pub provider: String,
    pub is_healthy: bool,
    pub last_error: Option<String>,
    pub average_latency_ms: u64,
    pub success_count: u32,
    pub error_count: u32,
    pub last_checked_seconds_ago: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UsageStats {
    pub provider: String,
    pub total_requests: u32,
    pub successful_requests: u32,
    pub failed_requests: u32,
    pub total_tokens_used: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectivityStatus {
    pub online: bool,
    pub providers_reachable: Vec<String>,
    pub providers_unreachable: Vec<String>,
}

/// Check rate limit status for a provider.
/// Updates the rate limiter window if more than 60s have passed.
#[tauri::command]
pub async fn check_rate_limit(
    provider: String,
    state: State<'_, AppState>,
) -> Result<RateLimitStatus, String> {
    let mut rate_limiter = state.rate_limiter.lock().map_err(|e| e.to_string())?;
    let limiter = rate_limiter
        .entry(provider.clone())
        .or_insert_with(RateLimiterState::default);

    // Reset window if more than 60 seconds have passed
    let elapsed = limiter.window_start.elapsed().as_secs();
    if elapsed >= 60 {
        limiter.request_count = 0;
        limiter.window_start = std::time::Instant::now();
    }

    let is_limited = limiter.request_count >= limiter.max_requests_per_minute;
    let reset_in_seconds = if elapsed >= 60 { 0 } else { 60 - elapsed };

    Ok(RateLimitStatus {
        provider,
        requests_this_minute: limiter.request_count,
        max_requests_per_minute: limiter.max_requests_per_minute,
        is_limited,
        reset_in_seconds,
    })
}

/// Get health status for a specific provider.
#[tauri::command]
pub async fn get_provider_health(
    provider: String,
    state: State<'_, AppState>,
) -> Result<ProviderHealthStatus, String> {
    let health_map = state.provider_health.lock().map_err(|e| e.to_string())?;
    let health = health_map
        .get(&provider)
        .cloned()
        .unwrap_or_default();

    let last_checked_seconds_ago = health.last_checked.map(|t| t.elapsed().as_secs());

    Ok(ProviderHealthStatus {
        provider,
        is_healthy: health.is_healthy,
        last_error: health.last_error,
        average_latency_ms: health.average_latency_ms,
        success_count: health.success_count,
        error_count: health.error_count,
        last_checked_seconds_ago,
    })
}

/// Check basic network connectivity by hitting a lightweight endpoint.
/// Does not require API keys — just checks TCP reachability.
#[tauri::command]
pub async fn check_connectivity() -> Result<ConnectivityStatus, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let checks: Vec<(&str, &str)> = vec![
        ("claude", "https://api.anthropic.com"),
        ("gemini", "https://generativelanguage.googleapis.com"),
        ("openai", "https://api.openai.com"),
    ];

    let mut reachable = Vec::new();
    let mut unreachable = Vec::new();
    let mut any_online = false;

    for (name, url) in checks {
        match client.get(url).send().await {
            Ok(_) => {
                reachable.push(name.to_string());
                any_online = true;
            }
            Err(_) => {
                unreachable.push(name.to_string());
            }
        }
    }

    Ok(ConnectivityStatus {
        online: any_online,
        providers_reachable: reachable,
        providers_unreachable: unreachable,
    })
}

/// Get aggregated usage statistics from provider health state.
#[tauri::command]
pub async fn get_usage_stats(
    state: State<'_, AppState>,
) -> Result<Vec<UsageStats>, String> {
    let health_map = state.provider_health.lock().map_err(|e| e.to_string())?;

    let stats: Vec<UsageStats> = health_map
        .iter()
        .map(|(provider, health)| UsageStats {
            provider: provider.clone(),
            total_requests: health.success_count + health.error_count,
            successful_requests: health.success_count,
            failed_requests: health.error_count,
            total_tokens_used: 0, // Future: track in ProviderHealth
        })
        .collect();

    Ok(stats)
}
```

Add this import at the top of orchestration.rs:
```rust
use reqwest;
```

---

## Task B4: Enhance sanitizer.rs for AI Code Output

MODIFY `src-tauri/src/security/sanitizer.rs` — add these functions BELOW the existing `sanitize_html` function. Do NOT remove or modify the existing `sanitize_html` function.

```rust
/// Extract all fenced code blocks from AI-generated markdown.
/// Returns a Vec of (language, code) tuples.
/// Example: ```html\n<div>...\n``` → ("html", "<div>...")
pub fn extract_code_blocks(markdown: &str) -> Vec<(String, String)> {
    let mut blocks = Vec::new();
    let mut in_block = false;
    let mut lang = String::new();
    let mut current_block = Vec::new();

    for line in markdown.lines() {
        if !in_block {
            if line.starts_with("```") {
                lang = line[3..].trim().to_lowercase();
                in_block = true;
                current_block.clear();
            }
        } else if line.starts_with("```") {
            blocks.push((lang.clone(), current_block.join("\n")));
            in_block = false;
            lang.clear();
            current_block.clear();
        } else {
            current_block.push(line);
        }
    }

    blocks
}

/// Validate that a CSS property value doesn't contain dangerous content.
/// Returns true if the value is safe to apply.
pub fn is_safe_css_value(property: &str, value: &str) -> bool {
    // Block url() references to external resources (potential data exfil)
    if value.contains("url(") && !value.contains("data:image/") {
        return false;
    }
    // Block expression() — old IE attack vector
    if value.to_lowercase().contains("expression(") {
        return false;
    }
    // Block javascript: in any CSS value
    if value.to_lowercase().contains("javascript:") {
        return false;
    }
    // Block -moz-binding (Firefox-specific XSS)
    if property.to_lowercase() == "-moz-binding" {
        return false;
    }
    true
}

/// Sanitize a CSS block string — removes any rules with dangerous values.
/// Input: raw CSS text. Output: sanitized CSS text.
pub fn sanitize_css(css: &str) -> String {
    let mut output_lines = Vec::new();

    for line in css.lines() {
        // Check if this is a property: value; line
        if let Some(colon_pos) = line.find(':') {
            let property = line[..colon_pos].trim();
            let value = line[colon_pos + 1..].trim().trim_end_matches(';').trim();
            if is_safe_css_value(property, value) {
                output_lines.push(line);
            } else {
                tracing::warn!(property, value, "Blocked unsafe CSS value from AI output");
            }
        } else {
            output_lines.push(line);
        }
    }

    output_lines.join("\n")
}

/// Process AI-generated markdown: extract code blocks and sanitize each one.
/// Returns sanitized HTML or CSS blocks ready to apply to the preview.
pub fn process_ai_code_output(markdown: &str) -> Vec<(String, String)> {
    extract_code_blocks(markdown)
        .into_iter()
        .map(|(lang, code)| {
            let sanitized = match lang.as_str() {
                "html" | "htm" => sanitize_html(&code),
                "css" => sanitize_css(&code),
                _ => code, // Pass through JS, JSON, etc. unchanged
            };
            (lang, sanitized)
        })
        .collect()
}
```

---

## Task B5: Constraint Reminder

Do NOT touch:
- `src-tauri/src/commands/mod.rs` — Group F owns this
- `src-tauri/src/main.rs` — Group F owns this
- Any files in `src/` (frontend) — Groups C/D/E own those

---

## Acceptance Criteria

- `cargo check` in `src-tauri/` passes with no errors
- `credentials.rs` has `test_api_key_with_info` command that makes real HTTP validation calls
- `lib.rs` `AppState` has `rate_limiter` and `provider_health` fields, `Default` initializes them
- `orchestration.rs` exists with `check_rate_limit`, `get_provider_health`, `check_connectivity`, `get_usage_stats` commands
- `sanitizer.rs` has `extract_code_blocks`, `is_safe_css_value`, `sanitize_css`, `process_ai_code_output` functions
- All existing functions in each file are preserved
