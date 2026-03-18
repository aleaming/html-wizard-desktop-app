use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub capabilities: Vec<PluginCapability>,
    pub entry_point: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PluginCapability {
    AIProvider,
    EditingTool,
    ExportFormat,
}
