use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PathValidationError {
    #[error("Path is outside the permitted project scope")]
    OutsideScope,
    #[error("Path is invalid or does not exist: {0}")]
    InvalidPath(String),
    #[error("Path contains invalid characters")]
    InvalidCharacters,
}

// Implement Serialize for Tauri command error handling
impl serde::Serialize for PathValidationError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}

pub struct PathValidator {
    allowed_root: PathBuf,
}

impl PathValidator {
    pub fn new(root: PathBuf) -> Result<Self, PathValidationError> {
        let canonical = root.canonicalize()
            .map_err(|e| PathValidationError::InvalidPath(e.to_string()))?;
        Ok(Self { allowed_root: canonical })
    }

    pub fn validate(&self, path: &Path) -> Result<PathBuf, PathValidationError> {
        // Resolve the path
        let resolved = if path.is_absolute() {
            path.to_path_buf()
        } else {
            self.allowed_root.join(path)
        };

        // Canonicalize to resolve symlinks and ..
        let canonical = resolved.canonicalize()
            .map_err(|e| PathValidationError::InvalidPath(e.to_string()))?;

        // Check that the canonical path starts with the allowed root
        if canonical.starts_with(&self.allowed_root) {
            Ok(canonical)
        } else {
            tracing::warn!(
                path = %path.display(),
                resolved = %canonical.display(),
                root = %self.allowed_root.display(),
                "Path validation failed: outside project scope"
            );
            Err(PathValidationError::OutsideScope)
        }
    }

    pub fn validate_new_path(&self, path: &Path) -> Result<PathBuf, PathValidationError> {
        // For paths that don't exist yet (create operations)
        // Validate the parent directory exists and is within scope
        let resolved = if path.is_absolute() {
            path.to_path_buf()
        } else {
            self.allowed_root.join(path)
        };

        if let Some(parent) = resolved.parent() {
            let canonical_parent = parent.canonicalize()
                .map_err(|e| PathValidationError::InvalidPath(e.to_string()))?;
            if canonical_parent.starts_with(&self.allowed_root) {
                Ok(resolved)
            } else {
                Err(PathValidationError::OutsideScope)
            }
        } else {
            Err(PathValidationError::InvalidPath("No parent directory".to_string()))
        }
    }

    pub fn root(&self) -> &Path {
        &self.allowed_root
    }
}
