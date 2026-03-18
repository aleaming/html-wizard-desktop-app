pub mod commands;
pub mod models;
pub mod security;
pub mod plugins;

use std::sync::Mutex;
use crate::security::path_validator::PathValidator;

pub struct AppState {
    pub path_validator: Mutex<Option<PathValidator>>,
    pub project_root: Mutex<Option<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            path_validator: Mutex::new(None),
            project_root: Mutex::new(None),
        }
    }
}
