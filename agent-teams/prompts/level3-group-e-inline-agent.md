# Agent Group E (Level 3): Frontend Inline Agent & Element Context

You are a builder agent responsible for the inline AI agent popover, element context extraction, and editor slice extension. You produce complete, production-ready React/TypeScript — no pseudocode, no placeholders.

## Context

Level 2 created the visual editor with element selection (stored in `editorSlice.selectedElement`). Your job is to build an inline AI agent popover that appears near a selected element and allows targeted prompts. The element context hook extracts the element's HTML, styles, and CSS variables from the preview iframe.

## File Ownership (ONLY touch these files)
- `src/components/ai/InlineAgent.tsx` (CREATE)
- `src/hooks/useElementContext.ts` (CREATE)
- `src/store/slices/editorSlice.ts` (MODIFY — add inline agent state fields only)

## CRITICAL: Do NOT touch RightSidebar.tsx or CenterPanel.tsx.
Group F handles wiring InlineAgent into those components. You only create the standalone component and hook.

---

## CRITICAL: Read Before Writing

Read these files before making any changes:
- `src/store/slices/editorSlice.ts` — preserve all existing fields and actions
- `src/store/index.ts` — understand AppStore shape (do not modify)
- `src/types/index.ts` — understand ElementContext type

---

## Task E1: Create useElementContext.ts

CREATE `src/hooks/useElementContext.ts`.

This hook extracts context about the currently selected element from the preview iframe. It reads the element's outerHTML, computed styles, CSS variables, and parent context.

### Signature:
```typescript
export function useElementContext(
  iframeRef: React.RefObject<HTMLIFrameElement>,
  selector: string | null
): ElementContext | null
```

### Implementation:

```typescript
import { useState, useEffect } from 'react';
import { ElementContext, CssVariable } from '../types';

export function useElementContext(
  iframeRef: React.RefObject<HTMLIFrameElement>,
  selector: string | null
): ElementContext | null {
  const [context, setContext] = useState<ElementContext | null>(null);

  useEffect(() => {
    if (!selector || !iframeRef.current) {
      setContext(null);
      return;
    }

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      setContext(null);
      return;
    }

    try {
      const element = doc.querySelector(selector) as HTMLElement | null;
      if (!element) {
        setContext(null);
        return;
      }

      // Get outerHTML
      const html = element.outerHTML;

      // Get parent HTML (one level up, capped at 500 chars for context window efficiency)
      const parentEl = element.parentElement;
      const parentHtml = parentEl
        ? parentEl.outerHTML.slice(0, 500)
        : undefined;

      // Collect applied CSS rules from all stylesheets
      const cssRules: string[] = [];
      try {
        const sheets = Array.from(doc.styleSheets);
        for (const sheet of sheets) {
          try {
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
              if (rule instanceof CSSStyleRule) {
                try {
                  if (element.matches(rule.selectorText)) {
                    cssRules.push(rule.cssText);
                  }
                } catch {
                  // Selector may not be valid in this context
                }
              }
            }
          } catch {
            // Cross-origin stylesheet — skip
          }
        }
      } catch {
        // Stylesheet access denied
      }

      // Extract CSS variables from :root and element's own computed style
      const cssVariables: CssVariable[] = [];
      const computedStyle = doc.defaultView?.getComputedStyle(element);
      const rootComputedStyle = doc.defaultView?.getComputedStyle(doc.documentElement);

      if (rootComputedStyle) {
        // Extract --variables from :root computed style
        const allProps = Array.from(rootComputedStyle);
        for (const prop of allProps) {
          if (prop.startsWith('--')) {
            const value = rootComputedStyle.getPropertyValue(prop).trim();
            if (value) {
              cssVariables.push({ name: prop, value, scope: ':root' });
            }
          }
        }
      }

      if (computedStyle) {
        // Extract --variables declared on the element itself
        const allProps = Array.from(computedStyle);
        for (const prop of allProps) {
          if (prop.startsWith('--')) {
            const value = computedStyle.getPropertyValue(prop).trim();
            const alreadyExists = cssVariables.some(v => v.name === prop && v.scope === ':root');
            if (value && !alreadyExists) {
              cssVariables.push({ name: prop, value, scope: selector });
            }
          }
        }
      }

      // Get the current file path from the iframe src
      const filePath = iframe.src || '';

      setContext({
        html,
        css: cssRules,
        parentHtml,
        cssVariables,
        filePath,
      });
    } catch (err) {
      console.warn('useElementContext: failed to extract context', err);
      setContext(null);
    }
  }, [selector, iframeRef]);

  return context;
}
```

---

## Task E2: Create InlineAgent.tsx

CREATE `src/components/ai/InlineAgent.tsx`.

This is a popover component that appears near a selected element in the preview canvas. It provides a focused input for element-specific AI prompts, shows a DiffPreview for the suggested change, and allows accept/reject/iterate.

### Props interface:
```typescript
interface InlineAgentProps {
  position: { x: number; y: number };      // px position in viewport
  targetSelector: string;
  elementContext: ElementContext | null;
  onClose: () => void;
  onAcceptChange: (code: string, language: string) => void;
}
```

### State the component manages internally:
- `inputValue: string` — the user's prompt
- `isLoading: boolean` — waiting for AI response
- `proposedChange: { code: string; language: string } | null` — the parsed AI suggestion
- `error: string | null`

### Implementation requirements:

1. **Layout**: Absolute positioned card `w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50`. Clamp position so it stays within the viewport (check `window.innerWidth`, `window.innerHeight`; subtract 320px width and 300px estimated height from right/bottom bounds).

2. **Header**: Shows "AI: Edit Element" title and an X close button. Small truncated display of `targetSelector` in gray below the title.

3. **Input area**: A textarea with placeholder "Describe the change you want..." Auto-resize up to 80px. A Send button.

4. **Quick prompts**: Three small clickable chips below the input:
   - "Make it more prominent"
   - "Fix the spacing"
   - "Make it responsive"
   Clicking a chip sets `inputValue` to that text.

5. **Loading state**: While `isLoading`, show spinner dots and disable input/button.

6. **DiffPreview**: When `proposedChange` is set, render `<DiffPreview original={elementContext?.html ?? ''} proposed={proposedChange.code} ... />`.

7. **onAccept handler**: Calls `onAcceptChange(proposed.code, proposed.language)` then clears `proposedChange` and calls `onClose()`.

8. **onReject handler**: Clears `proposedChange` only.

9. **onIterate handler**: Takes feedback string, prepends it to a new prompt ("Iterate on the previous suggestion: {feedback}"), and re-sends via `sendMessage`.

10. **Sending logic**: Call `useAI().sendMessage(prompt, elementContext ?? undefined)`. Parse the response: use `extractCodeBlock` (regex for first triple-backtick block) to get the code. If no code block found, use the entire response as proposed code with language "html".

11. **Click outside to close**: `useEffect` that adds a `mousedown` listener on `document`; calls `onClose` if the click is outside the component ref.

12. **Error display**: If `error`, show it in a red text box below the input.

```typescript
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ElementContext } from '../../types';
import { useAI } from '../../hooks/useAI';
import DiffPreview from './DiffPreview';

// Utility: extract first code block from markdown
function extractCodeBlock(text: string): { code: string; language: string } | null {
  const match = text.match(/```(\w*)\n?([\s\S]*?)```/);
  if (match) {
    return { language: match[1] || 'html', code: match[2] };
  }
  return null;
}

// ... (implement per the requirements above)
```

Write the full implementation following all requirements above. Keep the component self-contained.

---

## Task E3: Extend editorSlice.ts

MODIFY `src/store/slices/editorSlice.ts`. Read the existing file first. Preserve all existing fields and actions. Add ONLY the inline agent state fields.

### Add these new fields to the `EditorSlice` interface:

```typescript
  // Level 3: Inline Agent
  inlineAgentVisible: boolean;
  inlineAgentPosition: { x: number; y: number };
  inlineAgentTargetSelector: string | null;
```

### Add these new actions to the `EditorSlice` interface:

```typescript
  showInlineAgent: (position: { x: number; y: number }, selector: string) => void;
  hideInlineAgent: () => void;
  setInlineAgentPosition: (position: { x: number; y: number }) => void;
```

### Add initial values in `createEditorSlice`:

```typescript
  inlineAgentVisible: false,
  inlineAgentPosition: { x: 0, y: 0 },
  inlineAgentTargetSelector: null,
```

### Add action implementations in `createEditorSlice`:

```typescript
  showInlineAgent: (position, selector) => set({
    inlineAgentVisible: true,
    inlineAgentPosition: position,
    inlineAgentTargetSelector: selector,
  }),

  hideInlineAgent: () => set({
    inlineAgentVisible: false,
    inlineAgentTargetSelector: null,
  }),

  setInlineAgentPosition: (position) => set({ inlineAgentPosition: position }),
```

---

## Task E4: Barrel Export Update

Add `InlineAgent` to `src/components/ai/index.ts`. Read the current file (created by Group D) and append:

```typescript
export { default as InlineAgent } from './InlineAgent';
```

If the file does not yet exist (Group D may not have run yet), create it with all four exports:
```typescript
export { default as ChatPanel } from './ChatPanel';
export { default as ProviderSelector } from './ProviderSelector';
export { default as DiffPreview } from './DiffPreview';
export { default as InlineAgent } from './InlineAgent';
```

---

## Acceptance Criteria

- `tsc --noEmit` passes with no errors
- `src/hooks/useElementContext.ts` exports `useElementContext(iframeRef, selector)` returning `ElementContext | null`
- `src/components/ai/InlineAgent.tsx` is a fully functional popover with prompt input, quick chips, DiffPreview integration, and click-outside-to-close
- `src/store/slices/editorSlice.ts` has `inlineAgentVisible`, `inlineAgentPosition`, `inlineAgentTargetSelector` + `showInlineAgent`, `hideInlineAgent`, `setInlineAgentPosition`; all existing fields and actions preserved
- `src/components/ai/index.ts` exports InlineAgent (and preserves other exports)
- No modifications to RightSidebar.tsx, CenterPanel.tsx, or any Rust files
