use crate::models::ai::{AIRequest, AIOrchestrationConfig, AIResponse, AIProviderType, TokenUsage};
use futures_util::StreamExt;
use keyring::Entry;
use serde::Serialize;
use tauri::Emitter;

const SERVICE_NAME: &str = "html-wizard";

/// Payload emitted per streaming chunk via Tauri event "ai-stream-chunk".
/// Field names serialise to camelCase to match the TypeScript StreamChunkEvent type.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamChunkEvent {
    pub conversation_id: String,
    pub chunk: String,
    pub is_final: bool,
    pub token_usage: Option<TokenUsageEvent>,
    pub finish_reason: Option<String>,
}

/// Token usage payload inside a StreamChunkEvent.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenUsageEvent {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

impl From<TokenUsage> for TokenUsageEvent {
    fn from(u: TokenUsage) -> Self {
        Self {
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
        }
    }
}

/// Stream an AI request, emitting "ai-stream-chunk" Tauri events for each token.
/// Supports provider fallback via AIOrchestrationConfig.
/// Returns a final AIResponse once the stream completes.
#[tauri::command]
pub async fn send_ai_request_stream(
    app: tauri::AppHandle,
    request: AIRequest,
    config: Option<AIOrchestrationConfig>,
) -> Result<AIResponse, String> {
    let conversation_id = request
        .conversation_id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // Build provider fallback list
    let providers_to_try: Vec<AIProviderType> = if let Some(ref cfg) = config {
        let mut v = vec![cfg.primary_provider.clone()];
        if let Some(fallback) = &cfg.fallback_provider {
            v.push(fallback.clone());
        }
        v
    } else {
        vec![request.provider.clone()]
    };

    let mut last_error = String::from("No providers configured");

    for provider_type in providers_to_try {
        let mut req = request.clone();
        req.provider = provider_type.clone();

        tracing::info!(provider = %provider_type, "Streaming AI request started");

        match stream_from_provider(&app, &req, &conversation_id).await {
            Ok(response) => return Ok(response),
            Err(e) => {
                tracing::warn!(
                    provider = %provider_type,
                    error = %e,
                    "Provider streaming failed, trying fallback"
                );
                last_error = e;
            }
        }
    }

    Err(last_error)
}

/// Estimate token count and cost for a given prompt and provider.
/// Approximation: 1 token ≈ 4 characters.
#[tauri::command]
pub async fn estimate_cost(
    prompt: String,
    provider: String,
) -> Result<serde_json::Value, String> {
    let estimated_input_tokens = (prompt.len() as f64 / 4.0).ceil() as u64;
    // Assume output is roughly 1× input for pre-send estimation
    let estimated_output_tokens = estimated_input_tokens;

    // Per-million-token pricing (input / output) as of early 2026
    let (input_per_m, output_per_m) = match provider.to_lowercase().as_str() {
        "claude" => (3.00_f64, 15.00_f64),
        "gemini" => (1.25_f64, 10.00_f64),
        "openai" => (2.50_f64, 10.00_f64),
        _ => (3.00_f64, 15.00_f64),
    };

    let input_cost = (estimated_input_tokens as f64 / 1_000_000.0) * input_per_m;
    let output_cost = (estimated_output_tokens as f64 / 1_000_000.0) * output_per_m;
    let total_cost = input_cost + output_cost;

    tracing::debug!(
        provider = %provider,
        estimated_input_tokens,
        estimated_output_tokens,
        "Cost estimate computed"
    );

    Ok(serde_json::json!({
        "provider": provider,
        "estimatedInputTokens": estimated_input_tokens,
        "estimatedOutputTokens": estimated_output_tokens,
        "estimatedCostUsd": (total_cost * 1_000_000.0).round() / 1_000_000.0,
    }))
}

// ---------------------------------------------------------------------------
// Private streaming helpers
// ---------------------------------------------------------------------------

async fn stream_from_provider(
    app: &tauri::AppHandle,
    request: &AIRequest,
    conversation_id: &str,
) -> Result<AIResponse, String> {
    match &request.provider {
        AIProviderType::Claude => stream_claude(app, request, conversation_id).await,
        AIProviderType::Gemini => stream_gemini(app, request, conversation_id).await,
        AIProviderType::OpenAI => stream_openai(app, request, conversation_id).await,
        AIProviderType::Plugin(name) => {
            Err(format!("Streaming not supported for plugin provider: {}", name))
        }
    }
}

/// Claude streaming via server-sent events (SSE).
/// Each SSE data line: data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
async fn stream_claude(
    app: &tauri::AppHandle,
    request: &AIRequest,
    conversation_id: &str,
) -> Result<AIResponse, String> {
    let api_key = Entry::new(SERVICE_NAME, "claude")
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|e| format!("Claude API key not found: {}", e))?;

    let max_tokens = request.max_tokens.unwrap_or(8096);
    let mut body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": max_tokens,
        "stream": true,
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
        let err_body = response.text().await.unwrap_or_default();
        return match status.as_u16() {
            401 => Err("Claude API key is invalid or expired".to_string()),
            429 => Err("Claude rate limit exceeded".to_string()),
            _ => Err(format!("Claude API error {}: {}", status, err_body)),
        };
    }

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();
    let mut input_tokens: u32 = 0;
    let mut output_tokens: u32 = 0;
    let mut finish_reason = "end_turn".to_string();

    while let Some(item) = stream.next().await {
        let bytes = item.map_err(|e| format!("Stream read error: {}", e))?;
        let text = String::from_utf8_lossy(&bytes);

        for line in text.lines() {
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line["data: ".len()..];
            if data == "[DONE]" {
                break;
            }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                let event_type = json["type"].as_str().unwrap_or("");
                match event_type {
                    "content_block_delta" => {
                        if let Some(text_chunk) = json["delta"]["text"].as_str() {
                            full_content.push_str(text_chunk);
                            let event = StreamChunkEvent {
                                conversation_id: conversation_id.to_string(),
                                chunk: text_chunk.to_string(),
                                is_final: false,
                                token_usage: None,
                                finish_reason: None,
                            };
                            let _ = app.emit("ai-stream-chunk", &event);
                        }
                    }
                    "message_start" => {
                        if let Some(usage) = json["message"].get("usage") {
                            input_tokens = usage["input_tokens"].as_u64().unwrap_or(0) as u32;
                        }
                    }
                    "message_delta" => {
                        if let Some(reason) = json["delta"]["stop_reason"].as_str() {
                            finish_reason = reason.to_string();
                        }
                        if let Some(usage) = json.get("usage") {
                            output_tokens = usage["output_tokens"].as_u64().unwrap_or(0) as u32;
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    // Emit final chunk
    let final_event = StreamChunkEvent {
        conversation_id: conversation_id.to_string(),
        chunk: String::new(),
        is_final: true,
        token_usage: Some(TokenUsageEvent {
            prompt_tokens: input_tokens,
            completion_tokens: output_tokens,
            total_tokens: input_tokens + output_tokens,
        }),
        finish_reason: Some(finish_reason.clone()),
    };
    let _ = app.emit("ai-stream-chunk", &final_event);

    tracing::info!(
        provider = "claude",
        input_tokens,
        output_tokens,
        "Claude stream complete"
    );

    Ok(AIResponse {
        content: full_content,
        provider: AIProviderType::Claude,
        token_usage: TokenUsage {
            prompt_tokens: input_tokens,
            completion_tokens: output_tokens,
            total_tokens: input_tokens + output_tokens,
        },
        finish_reason,
    })
}

/// Gemini streaming via server-sent events.
/// Each SSE data line: data: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}
async fn stream_gemini(
    app: &tauri::AppHandle,
    request: &AIRequest,
    conversation_id: &str,
) -> Result<AIResponse, String> {
    let api_key = Entry::new(SERVICE_NAME, "gemini")
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|e| format!("Gemini API key not found: {}", e))?;

    let max_tokens = request.max_tokens.unwrap_or(8096);
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key={}",
        api_key
    );

    let body = serde_json::json!({
        "contents": [{"parts": [{"text": request.prompt}]}],
        "generationConfig": { "maxOutputTokens": max_tokens }
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
        let err_body = response.text().await.unwrap_or_default();
        return match status.as_u16() {
            400 => Err("Gemini: Bad request — check your prompt or API key".to_string()),
            429 => Err("Gemini rate limit exceeded".to_string()),
            _ => Err(format!("Gemini API error {}: {}", status, err_body)),
        };
    }

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();
    let mut input_tokens: u32 = 0;
    let mut output_tokens: u32 = 0;

    while let Some(item) = stream.next().await {
        let bytes = item.map_err(|e| format!("Stream read error: {}", e))?;
        let text = String::from_utf8_lossy(&bytes);

        for line in text.lines() {
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line["data: ".len()..];
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(text_chunk) =
                    json["candidates"][0]["content"]["parts"][0]["text"].as_str()
                {
                    full_content.push_str(text_chunk);
                    let event = StreamChunkEvent {
                        conversation_id: conversation_id.to_string(),
                        chunk: text_chunk.to_string(),
                        is_final: false,
                        token_usage: None,
                        finish_reason: None,
                    };
                    let _ = app.emit("ai-stream-chunk", &event);
                }
                if let Some(usage) = json.get("usageMetadata") {
                    input_tokens = usage["promptTokenCount"].as_u64().unwrap_or(0) as u32;
                    output_tokens = usage["candidatesTokenCount"].as_u64().unwrap_or(0) as u32;
                }
            }
        }
    }

    // Emit final chunk
    let final_event = StreamChunkEvent {
        conversation_id: conversation_id.to_string(),
        chunk: String::new(),
        is_final: true,
        token_usage: Some(TokenUsageEvent {
            prompt_tokens: input_tokens,
            completion_tokens: output_tokens,
            total_tokens: input_tokens + output_tokens,
        }),
        finish_reason: Some("STOP".to_string()),
    };
    let _ = app.emit("ai-stream-chunk", &final_event);

    tracing::info!(
        provider = "gemini",
        input_tokens,
        output_tokens,
        "Gemini stream complete"
    );

    Ok(AIResponse {
        content: full_content,
        provider: AIProviderType::Gemini,
        token_usage: TokenUsage {
            prompt_tokens: input_tokens,
            completion_tokens: output_tokens,
            total_tokens: input_tokens + output_tokens,
        },
        finish_reason: "STOP".to_string(),
    })
}

/// OpenAI streaming via server-sent events.
/// Each SSE data line: data: {"choices":[{"delta":{"content":"..."}}]}
async fn stream_openai(
    app: &tauri::AppHandle,
    request: &AIRequest,
    conversation_id: &str,
) -> Result<AIResponse, String> {
    let api_key = Entry::new(SERVICE_NAME, "openai")
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|e| format!("OpenAI API key not found: {}", e))?;

    let max_tokens = request.max_tokens.unwrap_or(8096);
    let mut body = serde_json::json!({
        "model": "gpt-4o",
        "stream": true,
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
        let err_body = response.text().await.unwrap_or_default();
        return match status.as_u16() {
            401 => Err("OpenAI API key is invalid or expired".to_string()),
            429 => Err("OpenAI rate limit exceeded".to_string()),
            _ => Err(format!("OpenAI API error {}: {}", status, err_body)),
        };
    }

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();
    let mut finish_reason = "stop".to_string();
    // OpenAI stream doesn't include token counts per chunk; estimate from char length
    let estimated_input = (request.prompt.len() / 4) as u32;

    while let Some(item) = stream.next().await {
        let bytes = item.map_err(|e| format!("Stream read error: {}", e))?;
        let text = String::from_utf8_lossy(&bytes);

        for line in text.lines() {
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line["data: ".len()..];
            if data == "[DONE]" {
                break;
            }
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                    full_content.push_str(content);
                    let event = StreamChunkEvent {
                        conversation_id: conversation_id.to_string(),
                        chunk: content.to_string(),
                        is_final: false,
                        token_usage: None,
                        finish_reason: None,
                    };
                    let _ = app.emit("ai-stream-chunk", &event);
                }
                if let Some(reason) = json["choices"][0]["finish_reason"].as_str() {
                    if reason != "null" {
                        finish_reason = reason.to_string();
                    }
                }
            }
        }
    }

    let estimated_output = (full_content.len() / 4) as u32;

    // Emit final chunk
    let final_event = StreamChunkEvent {
        conversation_id: conversation_id.to_string(),
        chunk: String::new(),
        is_final: true,
        token_usage: Some(TokenUsageEvent {
            prompt_tokens: estimated_input,
            completion_tokens: estimated_output,
            total_tokens: estimated_input + estimated_output,
        }),
        finish_reason: Some(finish_reason.clone()),
    };
    let _ = app.emit("ai-stream-chunk", &final_event);

    tracing::info!(
        provider = "openai",
        estimated_input,
        estimated_output,
        "OpenAI stream complete"
    );

    Ok(AIResponse {
        content: full_content,
        provider: AIProviderType::OpenAI,
        token_usage: TokenUsage {
            prompt_tokens: estimated_input,
            completion_tokens: estimated_output,
            total_tokens: estimated_input + estimated_output,
        },
        finish_reason,
    })
}
