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
