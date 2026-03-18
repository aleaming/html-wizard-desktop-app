use crate::AppState;

/// Check whether the given provider is currently within its rate limit.
/// Returns true if requests are allowed (not limited), false if the limit is reached.
/// Resets the window if more than 60 seconds have elapsed since it started.
#[tauri::command]
pub async fn check_rate_limit(
    provider: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    // Use a scope block so the MutexGuard is dropped before any potential .await
    let allowed = {
        let mut rate_limiter = state.rate_limiter.lock().map_err(|e| e.to_string())?;
        let limiter = rate_limiter
            .entry(provider.clone())
            .or_insert_with(crate::RateLimiterState::default);

        // Reset window if more than 60 seconds have passed
        let elapsed = limiter.window_start.elapsed().as_secs();
        if elapsed >= 60 {
            limiter.request_count = 0;
            limiter.window_start = std::time::Instant::now();
        }

        limiter.request_count < limiter.max_requests_per_minute
    }; // MutexGuard dropped here

    tracing::debug!(provider = %provider, allowed, "Rate limit checked");
    Ok(allowed)
}

/// Get health status for all known providers, serialized as a JSON object
/// keyed by provider name. Each value contains is_healthy, last_error,
/// average_latency_ms, success_count, error_count, and last_checked_secs_ago.
#[tauri::command]
pub async fn get_provider_health(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    // Use a scope block so the MutexGuard is dropped before any potential .await
    let snapshot = {
        let health_map = state.provider_health.lock().map_err(|e| e.to_string())?;

        let map: serde_json::Map<String, serde_json::Value> = health_map
            .iter()
            .map(|(name, h)| {
                let last_checked_secs_ago =
                    h.last_checked.map(|t| t.elapsed().as_secs());
                let value = serde_json::json!({
                    "is_healthy": h.is_healthy,
                    "last_error": h.last_error,
                    "average_latency_ms": h.average_latency_ms,
                    "success_count": h.success_count,
                    "error_count": h.error_count,
                    "last_checked_secs_ago": last_checked_secs_ago,
                });
                (name.clone(), value)
            })
            .collect();

        serde_json::Value::Object(map)
    }; // MutexGuard dropped here

    Ok(snapshot)
}

/// Check basic network connectivity by sending a HEAD request to the
/// Anthropic API with a 5-second timeout.
/// Returns true if reachable, false otherwise.
#[tauri::command]
pub async fn check_connectivity() -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let reachable = client
        .head("https://api.anthropic.com")
        .send()
        .await
        .is_ok();

    tracing::debug!(reachable, "Connectivity check to api.anthropic.com");
    Ok(reachable)
}

/// Placeholder usage stats — returns an empty JSON object.
/// Future: aggregate token usage from ProviderHealth state.
#[tauri::command]
pub async fn get_usage_stats() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({}))
}
