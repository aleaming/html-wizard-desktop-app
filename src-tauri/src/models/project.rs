use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub root: String,
    pub name: String,
    pub is_git: bool,
    pub file_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    Html,
    Css,
    Js,
    Image,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub file_type: FileType,
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeEntry {
    pub file_path: String,
    pub original: Option<String>,
    pub modified: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ChangeBuffer {
    pub entries: Vec<ChangeEntry>,
}

impl ChangeBuffer {
    pub fn add_change(&mut self, entry: ChangeEntry) {
        // Replace existing entry for the same file, or add new
        if let Some(existing) = self.entries.iter_mut().find(|e| e.file_path == entry.file_path) {
            *existing = entry;
        } else {
            self.entries.push(entry);
        }
    }

    pub fn discard_all(&mut self) {
        self.entries.clear();
    }

    pub fn has_changes(&self) -> bool {
        !self.entries.is_empty()
    }
}
