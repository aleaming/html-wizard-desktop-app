/// HTML/JS sanitization for AI-generated code
/// Strips dangerous elements before injection into the preview iframe

const DANGEROUS_TAGS: &[&str] = &["script", "iframe", "object", "embed", "form"];
const DANGEROUS_ATTRS: &[&str] = &["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"];

pub fn sanitize_html(html: &str) -> String {
    let mut result = html.to_string();

    // Remove dangerous tags and their contents
    for tag in DANGEROUS_TAGS {
        let open_pattern = format!("<{}", tag);
        let close_pattern = format!("</{}>", tag);

        while let Some(start) = result.to_lowercase().find(&open_pattern) {
            if let Some(end) = result.to_lowercase()[start..].find(&close_pattern) {
                result = format!(
                    "{}{}",
                    &result[..start],
                    &result[start + end + close_pattern.len()..]
                );
            } else if let Some(end) = result[start..].find('>') {
                result = format!("{}{}", &result[..start], &result[start + end + 1..]);
            } else {
                break;
            }
        }
    }

    // Remove dangerous event handler attributes
    for attr in DANGEROUS_ATTRS {
        let pattern = format!("{}=", attr);
        while let Some(pos) = result.to_lowercase().find(&pattern) {
            // Find the end of the attribute value
            let after_eq = pos + pattern.len();
            if let Some(rest) = result.get(after_eq..) {
                let end = if rest.starts_with('"') {
                    rest[1..].find('"').map(|p| after_eq + p + 2)
                } else if rest.starts_with('\'') {
                    rest[1..].find('\'').map(|p| after_eq + p + 2)
                } else {
                    rest.find(' ').or_else(|| rest.find('>')).map(|p| after_eq + p)
                };

                if let Some(end) = end {
                    result = format!("{}{}", &result[..pos], &result[end..]);
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    }

    result
}

/// Extract all fenced code blocks from AI-generated markdown.
/// Returns a Vec of (language, code) tuples.
/// Example: ```html\n<div>...\n``` → ("html", "<div>...")
pub fn extract_code_blocks(markdown: &str) -> Vec<(String, String)> {
    let mut blocks = Vec::new();
    let mut in_block = false;
    let mut lang = String::new();
    let mut current_block = Vec::new();

    for line in markdown.lines() {
        if !in_block {
            if line.starts_with("```") {
                lang = line[3..].trim().to_lowercase();
                in_block = true;
                current_block.clear();
            }
        } else if line.starts_with("```") {
            blocks.push((lang.clone(), current_block.join("\n")));
            in_block = false;
            lang.clear();
            current_block.clear();
        } else {
            current_block.push(line);
        }
    }

    blocks
}

/// Validate that a CSS property value doesn't contain dangerous content.
/// Returns true if the value is safe to apply.
pub fn is_safe_css_value(property: &str, value: &str) -> bool {
    // Block url() references to external resources (potential data exfil)
    if value.contains("url(") && !value.contains("data:image/") {
        return false;
    }
    // Block expression() — old IE attack vector
    if value.to_lowercase().contains("expression(") {
        return false;
    }
    // Block javascript: in any CSS value
    if value.to_lowercase().contains("javascript:") {
        return false;
    }
    // Block -moz-binding (Firefox-specific XSS)
    if property.to_lowercase() == "-moz-binding" {
        return false;
    }
    true
}

/// Sanitize a CSS block string — removes any rules with dangerous values.
/// Input: raw CSS text. Output: sanitized CSS text.
pub fn sanitize_css(css: &str) -> String {
    let mut output_lines = Vec::new();

    for line in css.lines() {
        // Check if this is a property: value; line
        if let Some(colon_pos) = line.find(':') {
            let property = line[..colon_pos].trim();
            let value = line[colon_pos + 1..].trim().trim_end_matches(';').trim();
            if is_safe_css_value(property, value) {
                output_lines.push(line);
            } else {
                tracing::warn!(property, value, "Blocked unsafe CSS value from AI output");
            }
        } else {
            output_lines.push(line);
        }
    }

    output_lines.join("\n")
}

/// Process AI-generated markdown: extract code blocks and sanitize each one.
/// Returns sanitized HTML or CSS blocks ready to apply to the preview.
pub fn process_ai_code_output(markdown: &str) -> Vec<(String, String)> {
    extract_code_blocks(markdown)
        .into_iter()
        .map(|(lang, code)| {
            let sanitized = match lang.as_str() {
                "html" | "htm" => sanitize_html(&code),
                "css" => sanitize_css(&code),
                _ => code, // Pass through JS, JSON, etc. unchanged
            };
            (lang, sanitized)
        })
        .collect()
}
