# Agent Group A (Level 3): Rust AI Provider Implementations

You are a builder agent responsible for replacing stub AI provider implementations with real HTTP calls. You produce complete, production-ready Rust code — no pseudocode, no placeholders.

## Context

Level 1 created stub providers in `src-tauri/src/commands/ai_provider.rs` that return hardcoded strings. Level 2 has been integrated. Your job is to replace those stubs with real API calls using `reqwest` and add streaming infrastructure.

## File Ownership (ONLY touch these files)
- `src-tauri/src/commands/ai_provider.rs` (MODIFY — preserve AIProvider trait, replace stubs)
- `src-tauri/src/models/ai.rs` (MODIFY — add new types)
- `src-tauri/src/commands/streaming.rs` (CREATE)

## DO NOT touch any files outside this list. Group F owns mod.rs and main.rs.

---

## CRITICAL: Read Before Writing

Before modifying `ai_provider.rs`, read the current file to understand:
- The `AIProvider` trait signature (preserve it exactly)
- The `send_ai_request` command signature (preserve it exactly)
- The `list_providers` command (preserve it)
- The `ClaudeProvider`, `GeminiProvider`, `OpenAIProvider` structs

Read `src-tauri/src/models/ai.rs` to understand existing types before adding new ones.

---

## Task A1: Implement ClaudeProvider

Replace the stub `generate_response` for `ClaudeProvider` with a real HTTP call.

**Endpoint:** `POST https://api.anthropic.com/v1/messages`

**Required Headers:**
```
x-api-key: {api_key}
anthropic-version: 2023-06-01
content-type: application/json
```

**Request Body (serialize to JSON):**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 8096,
  "messages": [
    {
      "role": "user",
      "content": "{prompt}"
    }
  ]
}
```

**Response JSON structure to parse:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "the assistant response text"
    }
  ],
  "usage": {
    "input_tokens": 42,
    "output_tokens": 100
  },
  "stop_reason": "end_turn"
}
```

**Implementation:**
1. Retrieve API key: `keyring::Entry::new("html-wizard", "claude").map_err(|e| e.to_string())?.get_password().map_err(|e| format!("Claude API key not found: {}", e))?`
2. Build request body as `serde_json::json!({...})`
3. Use `reqwest::Client::new()` — create client inside the method (no shared state needed for Level 3)
4. Parse `response_json["content"][0]["text"]` as the content string
5. Parse `response_json["usage"]["input_tokens"]` as `prompt_tokens` (u32)
6. Parse `response_json["usage"]["output_tokens"]` as `completion_tokens` (u32)
7. Parse `response_json["stop_reason"]` as `finish_reason`
8. Map HTTP errors: if status is 401, return `Err("Claude API key is invalid or expired".to_string())`; if status is 429, return `Err("Claude rate limit exceeded".to_string())`; other non-2xx: return `Err(format!("Claude API error {}: {}", status, body))`

**Use the model from ProviderConfig::claude() → "claude-sonnet-4-20250514"**

Honor `request.max_tokens` if `Some`, otherwise default to 8096. Honor `request.temperature` if `Some`, otherwise omit from request body.

---

## Task A2: Implement GeminiProvider

Replace the stub `generate_response` for `GeminiProvider` with a real HTTP call.

**Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}`

Use model `"gemini-2.5-pro"` (matching `ProviderConfig::gemini()`).

**No special headers required beyond `content-type: application/json`.**

**Request Body:**
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "{prompt}"
        }
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 8096
  }
}
```

**Response JSON structure to parse:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "the assistant response text"
          }
        ]
      },
      "finishReason": "STOP"
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 42,
    "candidatesTokenCount": 100,
    "totalTokenCount": 142
  }
}
```

**Implementation:**
1. Retrieve API key: `keyring::Entry::new("html-wizard", "gemini").map_err(|e| e.to_string())?.get_password().map_err(|e| format!("Gemini API key not found: {}", e))?`
2. Build URL with the key in query param: `format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={}", api_key)`
3. Parse `candidates[0].content.parts[0].text`
4. Parse `usageMetadata.promptTokenCount` and `usageMetadata.candidatesTokenCount`
5. Parse `candidates[0].finishReason`
6. Honor `request.max_tokens` in `generationConfig.maxOutputTokens` if `Some`, default 8096
7. Map 400 to `Err("Gemini: Bad request — check your prompt or API key".to_string())`, 429 to rate limit error

---

## Task A3: Implement OpenAIProvider

Replace the stub `generate_response` for `OpenAIProvider` with a real HTTP call.

**Endpoint:** `POST https://api.openai.com/v1/chat/completions`

**Required Headers:**
```
Authorization: Bearer {api_key}
content-type: application/json
```

**Request Body:**
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "{prompt}"
    }
  ],
  "max_tokens": 8096
}
```

**Response JSON structure to parse:**
```json
{
  "choices": [
    {
      "message": {
        "content": "the assistant response text"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 100,
    "total_tokens": 142
  }
}
```

**Implementation:**
1. Retrieve API key: `keyring::Entry::new("html-wizard", "openai").map_err(|e| e.to_string())?.get_password().map_err(|e| format!("OpenAI API key not found: {}", e))?`
2. Parse `choices[0].message.content`
3. Parse `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`
4. Parse `choices[0].finish_reason`
5. Honor `request.max_tokens` and `request.temperature`
6. Map 401 to invalid key error, 429 to rate limit error

---

## Task A4: Add New Types to models/ai.rs

MODIFY `src-tauri/src/models/ai.rs` — add these structs BELOW the existing content (do not remove existing types):

```rust
/// Payload emitted per streaming chunk via Tauri event "ai-stream-chunk"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunkEvent {
    pub conversation_id: String,
    pub chunk: String,
    pub is_final: bool,
    pub token_usage: Option<TokenUsage>,
    pub finish_reason: Option<String>,
}

/// A single message in a persisted conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    pub id: String,
    pub role: String, // "user" | "assistant"
    pub content: String,
    pub timestamp: u64,
    pub token_usage: Option<TokenUsage>,
}

/// Per-provider cost estimate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostEstimate {
    pub provider: AIProviderType,
    pub estimated_input_tokens: u32,
    pub estimated_output_tokens: u32,
    pub estimated_cost_usd: f64,
}

/// Global orchestration config (passed from frontend when initiating requests)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIOrchestrationConfig {
    pub primary_provider: AIProviderType,
    pub fallback_provider: Option<AIProviderType>,
    pub max_retries: u32,
    pub timeout_seconds: u64,
    pub enable_streaming: bool,
}
```

---

## Task A5: Create streaming.rs

CREATE `src-tauri/src/commands/streaming.rs` with the following command. This enables token-by-token streaming by:
1. Making the API call with streaming support
2. Emitting each chunk as a Tauri event `"ai-stream-chunk"` with `StreamChunkEvent` payload
3. Returning a final `AIResponse` when done

```rust
use crate::models::ai::*;
use keyring::Entry;
use tauri::AppHandle;

const SERVICE_NAME: &str = "html-wizard";

/// Streaming AI request — emits "ai-stream-chunk" events then returns final AIResponse.
/// The frontend listens with: listen("ai-stream-chunk", handler)
/// Each event payload is StreamChunkEvent (JSON).
///
/// Provider fallback: if primary provider fails to connect, tries fallback_provider if set.
#[tauri::command]
pub async fn send_ai_request_stream(
    app: AppHandle,
    request: AIRequest,
    config: AIOrchestrationConfig,
) -> Result<AIResponse, String> {
    let conversation_id = request
        .conversation_id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // Try primary provider, then fallback
    let providers_to_try: Vec<AIProviderType> = {
        let mut v = vec![config.primary_provider.clone()];
        if let Some(fallback) = &config.fallback_provider {
            v.push(fallback.clone());
        }
        v
    };

    let mut last_error = String::new();

    for provider_type in providers_to_try {
        let mut req = request.clone();
        req.provider = provider_type.clone();

        match stream_from_provider(&app, &req, &conversation_id).await {
            Ok(response) => return Ok(response),
            Err(e) => {
                tracing::warn!(
                    provider = %provider_type,
                    error = %e,
                    "Provider failed, trying fallback"
                );
                last_error = e;
                // Emit a chunk indicating provider switch
                let switch_event = StreamChunkEvent {
                    conversation_id: conversation_id.clone(),
                    chunk: String::new(),
                    is_final: false,
                    token_usage: None,
                    finish_reason: None,
                };
                let _ = app.emit("ai-stream-chunk", &switch_event);
            }
        }
    }

    Err(last_error)
}

async fn stream_from_provider(
    app: &AppHandle,
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
/// Each SSE data line is: data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
async fn stream_claude(
    app: &AppHandle,
    request: &AIRequest,
    conversation_id: &str,
) -> Result<AIResponse, String> {
    use futures_util::StreamExt;

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
        let body = response.text().await.unwrap_or_default();
        return match status.as_u16() {
            401 => Err("Claude API key is invalid or expired".to_string()),
            429 => Err("Claude rate limit exceeded".to_string()),
            _ => Err(format!("Claude API error {}: {}", status, body)),
        };
    }

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();
    let mut input_tokens: u32 = 0;
    let mut output_tokens: u32 = 0;
    let mut finish_reason = "end_turn".to_string();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Stream read error: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);

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
                            let chunk_event = StreamChunkEvent {
                                conversation_id: conversation_id.to_string(),
                                chunk: text_chunk.to_string(),
                                is_final: false,
                                token_usage: None,
                                finish_reason: None,
                            };
                            let _ = app.emit("ai-stream-chunk", &chunk_event);
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
                    "message_start" => {
                        if let Some(usage) = json["message"].get("usage") {
                            input_tokens = usage["input_tokens"].as_u64().unwrap_or(0) as u32;
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
        token_usage: Some(TokenUsage {
            prompt_tokens: input_tokens,
            completion_tokens: output_tokens,
            total_tokens: input_tokens + output_tokens,
        }),
        finish_reason: Some(finish_reason.clone()),
    };
    let _ = app.emit("ai-stream-chunk", &final_event);

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
/// Each SSE line: data: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}
async fn stream_gemini(
    app: &AppHandle,
    request: &AIRequest,
    conversation_id: &str,
) -> Result<AIResponse, String> {
    use futures_util::StreamExt;

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
        let body = response.text().await.unwrap_or_default();
        return match status.as_u16() {
            400 => Err("Gemini: Bad request — check your prompt or API key".to_string()),
            429 => Err("Gemini rate limit exceeded".to_string()),
            _ => Err(format!("Gemini API error {}: {}", status, body)),
        };
    }

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();
    let mut input_tokens: u32 = 0;
    let mut output_tokens: u32 = 0;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Stream read error: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);

        for line in text.lines() {
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line["data: ".len()..];
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(text_chunk) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                    full_content.push_str(text_chunk);
                    let chunk_event = StreamChunkEvent {
                        conversation_id: conversation_id.to_string(),
                        chunk: text_chunk.to_string(),
                        is_final: false,
                        token_usage: None,
                        finish_reason: None,
                    };
                    let _ = app.emit("ai-stream-chunk", &chunk_event);
                }
                if let Some(usage) = json.get("usageMetadata") {
                    input_tokens = usage["promptTokenCount"].as_u64().unwrap_or(0) as u32;
                    output_tokens = usage["candidatesTokenCount"].as_u64().unwrap_or(0) as u32;
                }
            }
        }
    }

    let final_event = StreamChunkEvent {
        conversation_id: conversation_id.to_string(),
        chunk: String::new(),
        is_final: true,
        token_usage: Some(TokenUsage {
            prompt_tokens: input_tokens,
            completion_tokens: output_tokens,
            total_tokens: input_tokens + output_tokens,
        }),
        finish_reason: Some("STOP".to_string()),
    };
    let _ = app.emit("ai-stream-chunk", &final_event);

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
/// Each SSE line: data: {"choices":[{"delta":{"content":"..."}}]}
async fn stream_openai(
    app: &AppHandle,
    request: &AIRequest,
    conversation_id: &str,
) -> Result<AIResponse, String> {
    use futures_util::StreamExt;

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
        let body = response.text().await.unwrap_or_default();
        return match status.as_u16() {
            401 => Err("OpenAI API key is invalid or expired".to_string()),
            429 => Err("OpenAI rate limit exceeded".to_string()),
            _ => Err(format!("OpenAI API error {}: {}", status, body)),
        };
    }

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();
    let mut finish_reason = "stop".to_string();
    // OpenAI doesn't provide token counts in stream chunks; estimated at end
    let estimated_input = (request.prompt.len() / 4) as u32;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Stream read error: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);

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
                    let chunk_event = StreamChunkEvent {
                        conversation_id: conversation_id.to_string(),
                        chunk: content.to_string(),
                        is_final: false,
                        token_usage: None,
                        finish_reason: None,
                    };
                    let _ = app.emit("ai-stream-chunk", &chunk_event);
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
    let final_event = StreamChunkEvent {
        conversation_id: conversation_id.to_string(),
        chunk: String::new(),
        is_final: true,
        token_usage: Some(TokenUsage {
            prompt_tokens: estimated_input,
            completion_tokens: estimated_output,
            total_tokens: estimated_input + estimated_output,
        }),
        finish_reason: Some(finish_reason.clone()),
    };
    let _ = app.emit("ai-stream-chunk", &final_event);

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
```

### Cargo.toml dependency requirement

The streaming functions use `futures_util::StreamExt`. Verify `futures-util` is in `Cargo.toml`. If it is not present, add:
```toml
futures-util = "0.3"
```

---

## Acceptance Criteria

- `cargo check` in `src-tauri/` passes with no errors
- All three provider `generate_response` methods make real HTTP calls (not returning hardcoded strings)
- `src-tauri/src/commands/streaming.rs` exists with `send_ai_request_stream` as a `#[tauri::command]`
- `src-tauri/src/models/ai.rs` contains `StreamChunkEvent`, `ConversationMessage`, `CostEstimate`, `AIOrchestrationConfig`
- Existing `AIProvider` trait signature is unchanged
- Existing `send_ai_request` and `list_providers` commands still exist and compile
