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
