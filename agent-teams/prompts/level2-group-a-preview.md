# Level 2 — Group A: Preview Iframe + PostMessage Bridge

You are Builder Agent A for the HTML Wizard Level 2 Visual Editor build.

## Your Mission

Build the sandboxed preview iframe with a full PostMessage bridge that lets the parent React app receive hover, click, double-click, and right-click events from inside the iframe — including element selector paths, bounding rects, computed styles, and outerHTML.

---

## File Ownership

**CREATE (new files — do not exist yet):**
- `src/components/editor/PreviewFrame.tsx`
- `src/utils/sanitizer.ts`
- `src/utils/debounce.ts`

**APPEND (add new types at the bottom of this existing file):**
- `src/types/index.ts`

**DO NOT TOUCH** any layout components, store slices, hooks, or any file not listed above. If a file you need already exists and is not in your ownership list, import from it but do not modify it.

---

## Context: Existing Codebase

### Store shape (read-only, import don't modify)
The Zustand store is at `src/store/index.ts`:
```typescript
import { useAppStore } from '../../store';
// Available from store:
// viewport: ViewportSize  (from uiSlice)
// setViewport: (viewport: ViewportSize) => void
```

### Existing types you must import (from `src/types/index.ts`)
```typescript
import { ViewportSize, VIEWPORT_PRESETS, CssVariable } from '../../types';
```

### Type definitions you MUST APPEND to `src/types/index.ts`
Add these exactly at the end of the file (after the last export):

```typescript
// ===== Visual Editor Types (Level 2 — Group A) =====

export interface ElementOverlayData {
  selector: string;
  tagName: string;
  id: string;
  classes: string[];
  rect: { top: number; left: number; width: number; height: number };
  scale: number;
}

export interface ElementSelectionData extends ElementOverlayData {
  computedStyles: Record<string, string>;
  attributes: Record<string, string>;
  innerHTML: string;
  outerHTML: string;
  cssVariables: CssVariable[];
}

export interface ContextMenuData {
  selector: string;
  position: { x: number; y: number };
  elementType: string;
}
```

---

## Task A1: PreviewFrame Component (`src/components/editor/PreviewFrame.tsx`)

Build a sandboxed iframe React component with these exact behaviors:

### Props Interface
```typescript
export interface PreviewFrameCallbacks {
  onElementHover?: (data: ElementOverlayData | null) => void;
  onElementClick?: (data: ElementSelectionData) => void;
  onElementDblClick?: (data: ElementSelectionData) => void;
  onContextMenu?: (data: ContextMenuData) => void;
}

export interface PreviewFrameProps extends PreviewFrameCallbacks {
  html: string;       // The full HTML document to render
  scale: number;      // 0..1 (e.g. 0.75 means 75%)
  viewport: ViewportSize;
  className?: string;
}
```

### Imperative Handle (forwardRef)
```typescript
export interface PreviewFrameHandle {
  reload: (html: string) => void;
}
```

Use `React.forwardRef<PreviewFrameHandle, PreviewFrameProps>` and `useImperativeHandle` so callers can call `ref.current.reload(newHtml)`.

### Iframe Attributes
```tsx
<iframe
  ref={iframeRef}
  sandbox="allow-scripts allow-same-origin"
  title="HTML Preview"
  srcDoc={injectedHtml}
  style={{
    width: viewport.width,
    height: viewport.height,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    border: 'none',
    display: 'block',
    background: 'white',
  }}
/>
```

Wrap it in a `div` with:
```tsx
<div
  style={{
    width: viewport.width * scale,
    height: viewport.height * scale,
    overflow: 'hidden',
    position: 'relative',
  }}
  className={className}
/>
```

### HTML Injection

Before setting `srcDoc`, inject the bridge script into the HTML. Use a function `injectBridgeScript(html: string, originToken: string): string` that:
1. Sanitizes the HTML first using your `sanitizer.ts` utility.
2. Finds `</body>` (case-insensitive) or appends before end.
3. Inserts `<script>` tag containing the bridge script string (from Task A2) just before `</body>`.
4. If there is no `<body>` tag, wraps the HTML in a full document first.

Use a stable `originToken` — generate it once with `useRef(crypto.randomUUID())`.

---

## Task A2: Bridge Injection Script (string inside PreviewFrame.tsx)

Define a function `buildBridgeScript(originToken: string): string` that returns a string of JavaScript to be injected into the iframe's srcdoc. The script must:

### CSS Selector Path Builder
```javascript
function getCssSelector(el) {
  const parts = [];
  let current = el;
  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += '#' + current.id;
      parts.unshift(part);
      break;
    }
    const siblings = Array.from(current.parentElement?.children || [])
      .filter(c => c.tagName === current.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      part += ':nth-of-type(' + index + ')';
    }
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(' > ') || el.tagName.toLowerCase();
}
```

### Computed Styles Extraction
Collect only a useful subset of computed styles (not all ~300):
```javascript
const STYLE_PROPS = [
  'color','background-color','background','font-family','font-size',
  'font-weight','font-style','line-height','letter-spacing',
  'text-align','text-decoration','margin','margin-top','margin-right',
  'margin-bottom','margin-left','padding','padding-top','padding-right',
  'padding-bottom','padding-left','border','border-radius','width',
  'height','display','flex-direction','align-items','justify-content',
  'position','top','left','right','bottom','z-index','opacity',
  'box-shadow','transform','transition','cursor','overflow',
  'grid-template-columns','grid-template-rows','gap'
];
```

### CSS Variable Extraction
```javascript
function getCssVariables(el) {
  const vars = [];
  const sheets = Array.from(document.styleSheets);
  const seen = new Set();
  for (const sheet of sheets) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      for (const rule of rules) {
        if (rule.stype === CSSRule.STYLE_RULE && rule.style) {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop.startsWith('--') && !seen.has(prop)) {
              seen.add(prop);
              vars.push({
                name: prop,
                value: rule.style.getPropertyValue(prop).trim(),
                scope: rule.selectorText || ':root'
              });
            }
          }
        }
      }
    } catch (e) { /* cross-origin sheets */ }
  }
  return vars;
}
```

### Event Listeners
Attach to `document` using event delegation. For each event type:
- `mouseover`: post `{ type: 'hover', ... }` with selector, tagName, id, classes, rect
- `mouseout` on body: post `{ type: 'hover-end' }`
- `click`: post `{ type: 'click', ... }` with full SelectionData (including computedStyles, attributes, innerHTML, outerHTML, cssVariables)
- `dblclick`: post `{ type: 'dblclick', ... }` with same SelectionData
- `contextmenu`: `e.preventDefault()`, post `{ type: 'contextmenu', ... }` with selector, position (clientX, clientY), elementType

### postMessage Format
Every message must include the `originToken`:
```javascript
window.parent.postMessage({
  source: 'html-wizard-bridge',
  token: '${originToken}',  // template literal with actual token
  type: 'hover' | 'hover-end' | 'click' | 'dblclick' | 'contextmenu',
  payload: { /* data */ }
}, '*');
```

---

## Task A3: PostMessage Listener (inside PreviewFrame.tsx)

Add a `useEffect` that:
1. Attaches `window.addEventListener('message', handleMessage)`.
2. Validates `event.data.source === 'html-wizard-bridge'` and `event.data.token === originToken.current`.
3. Translates iframe-relative rect coordinates to parent-frame coordinates, accounting for scale:
   ```typescript
   const iframeRect = iframeRef.current.getBoundingClientRect();
   const parentRect = {
     top: iframeRect.top + payload.rect.top * scale,
     left: iframeRect.left + payload.rect.left * scale,
     width: payload.rect.width * scale,
     height: payload.rect.height * scale,
   };
   ```
4. Dispatches to the appropriate callback prop:
   - `hover` → calls `onElementHover` with translated `ElementOverlayData`
   - `hover-end` → calls `onElementHover(null)`
   - `click` → calls `onElementClick` with `ElementSelectionData`
   - `dblclick` → calls `onElementDblClick`
   - `contextmenu` → calls `onContextMenu`
5. Returns cleanup: `window.removeEventListener('message', handleMessage)`.

---

## Task A4: Utility Files

### `src/utils/sanitizer.ts`

Export:
```typescript
/**
 * Strips dangerous elements from HTML for safe iframe preview rendering.
 * Removes: <script>, <iframe>, on* event attributes.
 * Does NOT remove stylesheets, images, or links.
 * Returns sanitized HTML string.
 */
export function sanitizeHtml(html: string): string
```

Implementation approach — use regex transformations:
1. Remove `<script[^>]*>[\s\S]*?<\/script>` tags (but NOT the bridge script — add a marker comment around bridge script injection so it is not stripped, OR run sanitizer BEFORE injection).
2. Remove `<iframe[^>]*>[\s\S]*?<\/iframe>` tags.
3. Remove inline `on\w+\s*=\s*["'][^"']*["']` event handler attributes.
4. Note: `sanitizeHtml` is called BEFORE bridge injection so it never strips the bridge.

Also export:
```typescript
/**
 * Wrap bare HTML fragment in a full document if it lacks <html> tag.
 */
export function ensureFullDocument(html: string): string
```

### `src/utils/debounce.ts`

Export a generic typed debounce:
```typescript
/**
 * Returns a debounced version of fn that delays invocation by `delay` ms.
 * Cancels the previous pending call when called again within the delay window.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void

/**
 * Same as debounce but also exposes a .cancel() method.
 */
export function debouncedWithCancel<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): { fn: (...args: Parameters<T>) => void; cancel: () => void }
```

---

## Import Paths Reference

Use these exact import paths in your files:
```typescript
// In src/components/editor/PreviewFrame.tsx:
import React, { useRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { useAppStore } from '../../store';
import { ViewportSize, ElementOverlayData, ElementSelectionData, ContextMenuData } from '../../types';
import { sanitizeHtml, ensureFullDocument } from '../../utils/sanitizer';

// In src/utils/sanitizer.ts and src/utils/debounce.ts:
// No imports needed — pure utility functions
```

---

## Dark Theme Requirement

The wrapper div around the iframe should use Tailwind classes where possible. The component itself renders inside the parent's dark layout (bg-gray-900). Do not add a background color to the iframe itself — it renders the user's HTML which has its own background.

---

## Verification Checklist

Before finishing, confirm:
- [ ] `src/types/index.ts` has the 3 new interfaces appended at the bottom
- [ ] `src/components/editor/PreviewFrame.tsx` exports `PreviewFrame` as default AND `PreviewFrameHandle` and `PreviewFrameCallbacks` as named exports
- [ ] `src/utils/sanitizer.ts` exports `sanitizeHtml` and `ensureFullDocument`
- [ ] `src/utils/debounce.ts` exports `debounce` and `debouncedWithCancel`
- [ ] No files outside your ownership list were modified
- [ ] All imports resolve to real files in the project
