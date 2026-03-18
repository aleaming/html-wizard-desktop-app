// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use html_wizard::AppState;
use tracing_subscriber::EnvFilter;

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::new("html_wizard=debug"))
        .json()
        .init();

    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // File operations
            html_wizard::commands::file_ops::read_file,
            html_wizard::commands::file_ops::write_file,
            html_wizard::commands::file_ops::create_file,
            html_wizard::commands::file_ops::delete_file,
            html_wizard::commands::file_ops::list_directory,
            html_wizard::commands::file_ops::log_from_frontend,
            html_wizard::commands::project::open_project,
            html_wizard::commands::project::scan_directory,
            html_wizard::commands::credentials::store_api_key,
            html_wizard::commands::credentials::get_api_key,
            html_wizard::commands::credentials::delete_api_key,
            html_wizard::commands::credentials::test_api_key,
            html_wizard::commands::ai_provider::send_ai_request,
            html_wizard::commands::ai_provider::list_providers,
            html_wizard::commands::image::upload_image,
            html_wizard::commands::image::link_image_url,
            html_wizard::commands::image::generate_image,
            html_wizard::commands::file_watcher::watch_file,
            html_wizard::commands::file_watcher::unwatch_file,
            // Streaming AI
            html_wizard::commands::streaming::send_ai_request_stream,
            html_wizard::commands::streaming::estimate_cost,
            // Orchestration
            html_wizard::commands::orchestration::check_rate_limit,
            html_wizard::commands::orchestration::get_provider_health,
            html_wizard::commands::orchestration::check_connectivity,
            html_wizard::commands::orchestration::get_usage_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
