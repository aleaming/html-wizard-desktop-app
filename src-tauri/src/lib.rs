pub mod commands;
pub mod models;
pub mod security;
pub mod plugins;

use std::collections::HashMap;
use std::sync::Mutex;
use crate::security::path_validator::PathValidator;

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

pub struct AppState {
    pub path_validator: Mutex<Option<PathValidator>>,
    pub project_root: Mutex<Option<String>>,
    // Level 3 additions:
    pub rate_limiter: Mutex<HashMap<String, RateLimiterState>>,
    pub provider_health: Mutex<HashMap<String, ProviderHealth>>,
}

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
