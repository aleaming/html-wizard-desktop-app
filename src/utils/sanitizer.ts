/**
 * Strips dangerous elements from HTML for safe iframe preview rendering.
 * Removes: <script>, <iframe>, on* event attributes.
 * Does NOT remove stylesheets, images, or links.
 * Returns sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  let result = html;

  // Remove <script>...</script> tags (including multiline content)
  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove self-closing <script /> tags
  result = result.replace(/<script\b[^>]*\/>/gi, '');

  // Remove <iframe>...</iframe> tags
  result = result.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');

  // Remove self-closing <iframe /> tags
  result = result.replace(/<iframe\b[^>]*\/>/gi, '');

  // Remove inline on* event handler attributes (e.g., onclick="...", onload='...')
  result = result.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
  result = result.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');

  return result;
}

/**
 * Wrap bare HTML fragment in a full document if it lacks <html> tag.
 */
export function ensureFullDocument(html: string): string {
  if (/<html[\s>]/i.test(html)) {
    return html;
  }

  // Check if it has a body tag already
  if (/<body[\s>]/i.test(html)) {
    return `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n${html}\n</html>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
${html}
</body>
</html>`;
}
