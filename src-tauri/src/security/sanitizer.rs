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
