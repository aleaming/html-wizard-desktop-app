# Agent Group C: Rust Backend — Credentials, AI Infrastructure & Plugins

You are a builder agent responsible for the credential management, AI provider infrastructure, image commands, and plugin system. You produce complete, compilable Rust code — no pseudocode or skeletons.

## File Ownership (ONLY touch these files)
- `src-tauri/src/commands/credentials.rs`
- `src-tauri/src/commands/ai_provider.rs`
- `src-tauri/src/commands/image.rs`
- `src-tauri/src/models/ai.rs`
- `src-tauri/src/plugins/mod.rs`
- `src-tauri/src/plugins/plugin_manifest.rs`

## DO NOT touch any files outside this list. Other agents own other files.

## Important: Create directory:
```
src-tauri/src/plugins/
```

---

## Task C-1: Implement System Keychain Credential Storage

### `src-tauri/src/commands/credentials.rs`

API keys are NEVER stored in plaintext. Use the `keyring` crate which maps to:
- macOS: Keychain
- Windows: Credential Manager
- Linux: Secret Service (via D-Bus)

Service name: `html-wizard`

```rust
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
```

**CRITICAL: Never log the key value itself. Only log the provider name and operation outcome.**

---

## Task C-2: Define AI Model Types

### `src-tauri/src/models/ai.rs`

```rust
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AIProviderType {
    Claude,
    Gemini,
    OpenAI,
    Plugin(String),
}

impl std::fmt::Display for AIProviderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIProviderType::Claude => write!(f, "claude"),
            AIProviderType::Gemini => write!(f, "gemini"),
            AIProviderType::OpenAI => write!(f, "openai"),
            AIProviderType::Plugin(name) => write!(f, "plugin:{}", name),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequest {
    pub provider: AIProviderType,
    pub prompt: String,
    pub context: Option<ElementContext>,
    pub conversation_id: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub provider: AIProviderType,
    pub token_usage: TokenUsage,
    pub finish_reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementContext {
    pub html: String,
    pub css: Vec<String>,
    pub parent_html: Option<String>,
    pub css_variables: Vec<CssVariable>,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CssVariable {
    pub name: String,
    pub value: String,
    pub scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

impl Default for TokenUsage {
    fn default() -> Self {
        Self { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider_type: AIProviderType,
    pub model: String,
    pub base_url: Option<String>,
    pub supports_streaming: bool,
    pub supports_images: bool,
}

impl ProviderConfig {
    pub fn claude() -> Self {
        Self {
            provider_type: AIProviderType::Claude,
            model: "claude-sonnet-4-20250514".to_string(),
            base_url: Some("https://api.anthropic.com".to_string()),
            supports_streaming: true,
            supports_images: false,
        }
    }

    pub fn gemini() -> Self {
        Self {
            provider_type: AIProviderType::Gemini,
            model: "gemini-2.5-pro".to_string(),
            base_url: Some("https://generativelanguage.googleapis.com".to_string()),
            supports_streaming: true,
            supports_images: true,
        }
    }

    pub fn openai() -> Self {
        Self {
            provider_type: AIProviderType::OpenAI,
            model: "gpt-4o".to_string(),
            base_url: Some("https://api.openai.com".to_string()),
            supports_streaming: true,
            supports_images: true,
        }
    }
}
```

---

## Task C-3: Create AI Provider Trait and Stub Adapters

### `src-tauri/src/commands/ai_provider.rs`

Level 1 Foundation: Define the trait and create stub adapters that compile. Full API integration is Level 3.

```rust
use crate::models::ai::*;
use async_trait::async_trait;

#[async_trait]
pub trait AIProvider: Send + Sync {
    async fn generate_response(&self, request: &AIRequest) -> Result<AIResponse, String>;
    fn provider_name(&self) -> &str;
    fn supports_streaming(&self) -> bool;
    fn supports_image_generation(&self) -> bool;
}

// --- Claude Adapter (Stub) ---
pub struct ClaudeProvider;

#[async_trait]
impl AIProvider for ClaudeProvider {
    async fn generate_response(&self, _request: &AIRequest) -> Result<AIResponse, String> {
        // Stub — full implementation in Level 3
        Ok(AIResponse {
            content: "Claude provider not yet connected. Configure your API key in Settings.".to_string(),
            provider: AIProviderType::Claude,
            token_usage: TokenUsage::default(),
            finish_reason: "stub".to_string(),
        })
    }
    fn provider_name(&self) -> &str { "claude" }
    fn supports_streaming(&self) -> bool { true }
    fn supports_image_generation(&self) -> bool { false }
}

// --- Gemini Adapter (Stub) ---
pub struct GeminiProvider;

#[async_trait]
impl AIProvider for GeminiProvider {
    async fn generate_response(&self, _request: &AIRequest) -> Result<AIResponse, String> {
        Ok(AIResponse {
            content: "Gemini provider not yet connected. Configure your API key in Settings.".to_string(),
            provider: AIProviderType::Gemini,
            token_usage: TokenUsage::default(),
            finish_reason: "stub".to_string(),
        })
    }
    fn provider_name(&self) -> &str { "gemini" }
    fn supports_streaming(&self) -> bool { true }
    fn supports_image_generation(&self) -> bool { true }
}

// --- OpenAI Adapter (Stub) ---
pub struct OpenAIProvider;

#[async_trait]
impl AIProvider for OpenAIProvider {
    async fn generate_response(&self, _request: &AIRequest) -> Result<AIResponse, String> {
        Ok(AIResponse {
            content: "OpenAI provider not yet connected. Configure your API key in Settings.".to_string(),
            provider: AIProviderType::OpenAI,
            token_usage: TokenUsage::default(),
            finish_reason: "stub".to_string(),
        })
    }
    fn provider_name(&self) -> &str { "openai" }
    fn supports_streaming(&self) -> bool { true }
    fn supports_image_generation(&self) -> bool { true }
}

// --- Tauri Commands ---

#[tauri::command]
pub async fn send_ai_request(request: AIRequest) -> Result<AIResponse, String> {
    let provider: Box<dyn AIProvider> = match &request.provider {
        AIProviderType::Claude => Box::new(ClaudeProvider),
        AIProviderType::Gemini => Box::new(GeminiProvider),
        AIProviderType::OpenAI => Box::new(OpenAIProvider),
        AIProviderType::Plugin(name) => {
            return Err(format!("Plugin provider '{}' not loaded", name));
        }
    };

    tracing::info!(
        provider = provider.provider_name(),
        "AI request dispatched"
    );

    provider.generate_response(&request).await
}

#[tauri::command]
pub async fn list_providers() -> Result<Vec<ProviderConfig>, String> {
    Ok(vec![
        ProviderConfig::claude(),
        ProviderConfig::gemini(),
        ProviderConfig::openai(),
    ])
}
```

---

## Task C-4: Create Image Command Stubs

### `src-tauri/src/commands/image.rs`

```rust
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
```

---

## Task C-5: Create Plugin System Foundation

### `src-tauri/src/plugins/mod.rs`

```rust
pub mod plugin_manifest;

use plugin_manifest::{PluginManifest, PluginCapability};
use std::path::PathBuf;

pub struct LoadedPlugin {
    pub manifest: PluginManifest,
    pub enabled: bool,
}

pub struct PluginRegistry {
    plugins: Vec<LoadedPlugin>,
    plugins_dir: Option<PathBuf>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        Self {
            plugins: Vec::new(),
            plugins_dir: None,
        }
    }

    pub fn with_directory(dir: PathBuf) -> Self {
        let mut registry = Self::new();
        registry.plugins_dir = Some(dir);
        registry
    }

    pub fn scan_and_load(&mut self) {
        let dir = match &self.plugins_dir {
            Some(d) => d.clone(),
            None => {
                tracing::debug!("No plugins directory configured");
                return;
            }
        };

        if !dir.exists() {
            tracing::debug!(path = %dir.display(), "Plugins directory does not exist");
            return;
        }

        match std::fs::read_dir(&dir) {
            Ok(entries) => {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let manifest_path = path.join("plugin.json");
                        if manifest_path.exists() {
                            match self.load_manifest(&manifest_path) {
                                Ok(manifest) => {
                                    tracing::info!(
                                        plugin = %manifest.name,
                                        version = %manifest.version,
                                        "Plugin loaded"
                                    );
                                    self.plugins.push(LoadedPlugin {
                                        manifest,
                                        enabled: true,
                                    });
                                }
                                Err(e) => {
                                    tracing::warn!(
                                        path = %manifest_path.display(),
                                        error = %e,
                                        "Failed to load plugin manifest"
                                    );
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                tracing::warn!(
                    path = %dir.display(),
                    error = %e,
                    "Failed to read plugins directory"
                );
            }
        }

        tracing::info!(count = self.plugins.len(), "Plugin scan complete");
    }

    fn load_manifest(&self, path: &PathBuf) -> Result<PluginManifest, String> {
        let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
        let manifest: PluginManifest = serde_json::from_str(&content).map_err(|e| e.to_string())?;

        // Validate required fields
        if manifest.name.is_empty() {
            return Err("Plugin name is required".to_string());
        }
        if manifest.version.is_empty() {
            return Err("Plugin version is required".to_string());
        }

        Ok(manifest)
    }

    pub fn list_plugins(&self) -> &[LoadedPlugin] {
        &self.plugins
    }

    pub fn get_ai_providers(&self) -> Vec<&PluginManifest> {
        self.plugins.iter()
            .filter(|p| p.enabled && p.manifest.capabilities.contains(&PluginCapability::AIProvider))
            .map(|p| &p.manifest)
            .collect()
    }

    pub fn set_enabled(&mut self, name: &str, enabled: bool) -> bool {
        if let Some(plugin) = self.plugins.iter_mut().find(|p| p.manifest.name == name) {
            plugin.enabled = enabled;
            tracing::info!(plugin = name, enabled = enabled, "Plugin status changed");
            true
        } else {
            false
        }
    }
}

impl Default for PluginRegistry {
    fn default() -> Self {
        Self::new()
    }
}
```

### `src-tauri/src/plugins/plugin_manifest.rs`

```rust
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub capabilities: Vec<PluginCapability>,
    pub entry_point: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PluginCapability {
    AIProvider,
    EditingTool,
    ExportFormat,
}
```
