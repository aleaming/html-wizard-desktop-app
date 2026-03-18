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
