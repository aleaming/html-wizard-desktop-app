use crate::models::ai::*;
use async_trait::async_trait;
use keyring::Entry;

const SERVICE_NAME: &str = "html-wizard";

#[async_trait]
pub trait AIProvider: Send + Sync {
    async fn generate_response(&self, request: &AIRequest) -> Result<AIResponse, String>;
    fn provider_name(&self) -> &str;
    fn supports_streaming(&self) -> bool;
    fn supports_image_generation(&self) -> bool;
}

// --- Claude Adapter ---
pub struct ClaudeProvider;

#[async_trait]
impl AIProvider for ClaudeProvider {
    async fn generate_response(&self, request: &AIRequest) -> Result<AIResponse, String> {
        let api_key = Entry::new(SERVICE_NAME, "claude")
            .map_err(|e| e.to_string())?
            .get_password()
            .map_err(|e| format!("Claude API key not found: {}", e))?;

        let max_tokens = request.max_tokens.unwrap_or(8096);
        let mut body = serde_json::json!({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": request.prompt}]
        });
        if let Some(temp) = request.temperature {
            body["temperature"] = serde_json::json!(temp);
        }

        let client = reqwest::Client::new();
        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Claude connection error: {}", e))?;

        let status = response.status();
        if !status.is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return match status.as_u16() {
                401 => Err("Claude API key is invalid or expired".to_string()),
                429 => Err("Claude rate limit exceeded".to_string()),
                _ => Err(format!("Claude API error {}: {}", status, error_body)),
            };
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Claude response parse error: {}", e))?;

        let content = response_json["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let prompt_tokens = response_json["usage"]["input_tokens"]
            .as_u64()
            .unwrap_or(0) as u32;
        let completion_tokens = response_json["usage"]["output_tokens"]
            .as_u64()
            .unwrap_or(0) as u32;
        let finish_reason = response_json["stop_reason"]
            .as_str()
            .unwrap_or("end_turn")
            .to_string();

        Ok(AIResponse {
            content,
            provider: AIProviderType::Claude,
            token_usage: TokenUsage {
                prompt_tokens,
                completion_tokens,
                total_tokens: prompt_tokens + completion_tokens,
            },
            finish_reason,
        })
    }
    fn provider_name(&self) -> &str { "claude" }
    fn supports_streaming(&self) -> bool { true }
    fn supports_image_generation(&self) -> bool { false }
}

// --- Gemini Adapter ---
pub struct GeminiProvider;

#[async_trait]
impl AIProvider for GeminiProvider {
    async fn generate_response(&self, request: &AIRequest) -> Result<AIResponse, String> {
        let api_key = Entry::new(SERVICE_NAME, "gemini")
            .map_err(|e| e.to_string())?
            .get_password()
            .map_err(|e| format!("Gemini API key not found: {}", e))?;

        let max_tokens = request.max_tokens.unwrap_or(8096);
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={}",
            api_key
        );

        let body = serde_json::json!({
            "contents": [{"parts": [{"text": request.prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens
            }
        });

        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Gemini connection error: {}", e))?;

        let status = response.status();
        if !status.is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return match status.as_u16() {
                400 => Err("Gemini: Bad request — check your prompt or API key".to_string()),
                429 => Err("Gemini rate limit exceeded".to_string()),
                _ => Err(format!("Gemini API error {}: {}", status, error_body)),
            };
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Gemini response parse error: {}", e))?;

        let content = response_json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let prompt_tokens = response_json["usageMetadata"]["promptTokenCount"]
            .as_u64()
            .unwrap_or(0) as u32;
        let completion_tokens = response_json["usageMetadata"]["candidatesTokenCount"]
            .as_u64()
            .unwrap_or(0) as u32;
        let finish_reason = response_json["candidates"][0]["finishReason"]
            .as_str()
            .unwrap_or("STOP")
            .to_string();

        Ok(AIResponse {
            content,
            provider: AIProviderType::Gemini,
            token_usage: TokenUsage {
                prompt_tokens,
                completion_tokens,
                total_tokens: prompt_tokens + completion_tokens,
            },
            finish_reason,
        })
    }
    fn provider_name(&self) -> &str { "gemini" }
    fn supports_streaming(&self) -> bool { true }
    fn supports_image_generation(&self) -> bool { true }
}

// --- OpenAI Adapter ---
pub struct OpenAIProvider;

#[async_trait]
impl AIProvider for OpenAIProvider {
    async fn generate_response(&self, request: &AIRequest) -> Result<AIResponse, String> {
        let api_key = Entry::new(SERVICE_NAME, "openai")
            .map_err(|e| e.to_string())?
            .get_password()
            .map_err(|e| format!("OpenAI API key not found: {}", e))?;

        let max_tokens = request.max_tokens.unwrap_or(8096);
        let mut body = serde_json::json!({
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": request.prompt}],
            "max_tokens": max_tokens
        });
        if let Some(temp) = request.temperature {
            body["temperature"] = serde_json::json!(temp);
        }

        let client = reqwest::Client::new();
        let response = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("OpenAI connection error: {}", e))?;

        let status = response.status();
        if !status.is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return match status.as_u16() {
                401 => Err("OpenAI API key is invalid or expired".to_string()),
                429 => Err("OpenAI rate limit exceeded".to_string()),
                _ => Err(format!("OpenAI API error {}: {}", status, error_body)),
            };
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("OpenAI response parse error: {}", e))?;

        let content = response_json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let prompt_tokens = response_json["usage"]["prompt_tokens"]
            .as_u64()
            .unwrap_or(0) as u32;
        let completion_tokens = response_json["usage"]["completion_tokens"]
            .as_u64()
            .unwrap_or(0) as u32;
        let total_tokens = response_json["usage"]["total_tokens"]
            .as_u64()
            .unwrap_or((prompt_tokens + completion_tokens) as u64) as u32;
        let finish_reason = response_json["choices"][0]["finish_reason"]
            .as_str()
            .unwrap_or("stop")
            .to_string();

        Ok(AIResponse {
            content,
            provider: AIProviderType::OpenAI,
            token_usage: TokenUsage {
                prompt_tokens,
                completion_tokens,
                total_tokens,
            },
            finish_reason,
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
