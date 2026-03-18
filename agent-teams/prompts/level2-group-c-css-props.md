# Level 2 — Group C: CSS Variable Detection + Color Picker + Property Inspector Wiring

You are Builder Agent C for the HTML Wizard Level 2 Visual Editor build.

## Your Mission

Build the CSS variable parsing utilities, element context builder, a reusable ColorPicker component, and wire the RightSidebar to display real property data from the selected element.

---

## File Ownership

**CREATE (new files — do not exist yet):**
- `src/utils/css-variables.ts`
- `src/components/editor/ColorPicker.tsx`
- `src/utils/context-builder.ts`

**MODIFY (extend existing files — READ them first, make targeted edits only):**
- `src/components/layout/RightSidebar.tsx`

**DO NOT TOUCH** store slices, types/index.ts, PreviewFrame.tsx, ElementOverlay.tsx, hooks, or any file not in your ownership list.

---

## Context: Existing Codebase

### READ This First: `src/components/layout/RightSidebar.tsx`

The existing file has:
- Tab bar with tabs: `'Styles' | 'Attributes' | 'Computed' | 'AI'`
- Empty tab content area (just placeholder text)
- A collapsible "CSS Variables" section at the bottom
- `interface RightSidebarProps { width: number }`

**Keep** the tab bar, the width prop, the border styling, and the CSS Variables accordion. Replace only the tab content area.

### Store shape (read-only, import do not modify)
```typescript
import { useAppStore } from '../../store';

// From editorSlice (after Group B runs):
const { selectedElementData } = useAppStore();
// selectedElementData: ElementSelectionData | null
// which has: selector, tagName, id, classes, rect, scale,
//            computedStyles, attributes, innerHTML, outerHTML, cssVariables

// From projectSlice:
const { activeFile } = useAppStore();
```

### Types to import
```typescript
import {
  ElementSelectionData,
  ElementContext,
  CssVariable,
} from '../../types';
// ElementContext is already in src/types/index.ts:
// { html: string; css: string[]; parentHtml?: string; cssVariables: CssVariable[]; filePath: string; }
// CssVariable: { name: string; value: string; scope: string; }
```

---

## Task C1: CSS Variable Parser (`src/utils/css-variables.ts`)

Export the following functions:

### parseCssVariables(cssText: string): CssVariable[]

Parses raw CSS text and extracts all custom properties (--name: value).

```typescript
import { CssVariable } from '../types';

export function parseCssVariables(cssText: string): CssVariable[] {
  const vars: CssVariable[] = [];
  const blockRegex = /([^{]+)\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(cssText)) !== null) {
    const selector = match[1].trim();
    const body = match[2];
    const varRegex = /(--[\w-]+)\s*:\s*([^;]+)/g;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varRegex.exec(body)) !== null) {
      vars.push({
        name: varMatch[1].trim(),
        value: varMatch[2].trim(),
        scope: selector,
      });
    }
  }
  return vars;
}
```

### resolveVarReferences(value: string, allVars: CssVariable[]): string

Resolves var(--name) and var(--name, fallback) references in a CSS value string.

```typescript
export function resolveVarReferences(value: string, allVars: CssVariable[]): string {
  const varLookup = new Map(allVars.map(v => [v.name, v.value]));
  let result = value;
  let maxIterations = 10;
  while (result.includes('var(') && maxIterations-- > 0) {
    result = result.replace(
      /var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/g,
      (_, varName, fallback) => {
        return varLookup.get(varName) ?? fallback ?? varName;
      }
    );
  }
  return result;
}
```

Also export groupVarsByScope that groups CSS variables by their scope selector, returning a Map<scope, CssVariable[]>.

---

## Task C2: Context Builder (`src/utils/context-builder.ts`)

Export one function:

### buildElementContext(data: ElementSelectionData, activeFilePath: string, cssText: string): ElementContext

Builds the ElementContext object used by the AI system when a user asks about the selected element.

```typescript
import { ElementSelectionData, ElementContext, CssVariable } from '../types';
import { parseCssVariables } from './css-variables';

export function buildElementContext(
  data: ElementSelectionData,
  activeFilePath: string,
  cssText: string
): ElementContext {
  const relevantStyles: string[] = [];
  const priorityProps = [
    'color', 'background-color', 'font-family', 'font-size', 'font-weight',
    'display', 'width', 'height', 'margin', 'padding', 'border', 'border-radius',
    'position', 'flex-direction', 'align-items', 'justify-content',
  ];
  for (const prop of priorityProps) {
    if (data.computedStyles[prop]) {
      relevantStyles.push(prop + ': ' + data.computedStyles[prop] + ';');
    }
  }

  const cssVariables: CssVariable[] = data.cssVariables.length > 0
    ? data.cssVariables
    : parseCssVariables(cssText);

  return {
    html: data.outerHTML,
    css: relevantStyles,
    parentHtml: undefined,
    cssVariables,
    filePath: activeFilePath,
  };
}
```

---

## Task C3: ColorPicker Component (`src/components/editor/ColorPicker.tsx`)

A compact color swatch + hex input + optional CSS variable dropdown.

### Props Interface

```typescript
export interface ColorPickerProps {
  value: string;
  cssVariables?: CssVariable[];
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
}
```

### Implementation

Build a React functional component with:

1. A native color `<input type="color">` swatch (24x24px, rounded, border border-gray-600)
2. A text input for hex/var values (font-mono, bg-gray-900, text-gray-200, border border-gray-600, focus:border-blue-500)
3. A "--" button that toggles a CSS variable dropdown (only when cssVariables.length > 0 and not compact)
4. A dropdown list showing each CSS variable with a color swatch preview, variable name in blue-400, and value in gray-500

Use internal state: `hexInput` (string, synced with value prop via useEffect), `showVarDropdown` (boolean).

Add a helper function `isValidHex(value: string): boolean` that tests `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`.

When compact is true, omit the label and CSS variable dropdown button.

Export ColorPicker as the default export.

---

## Task C4 + C5: Wire `src/components/layout/RightSidebar.tsx`

READ the existing file first. Make these targeted modifications:

### New imports to add at the top

```typescript
import { useAppStore } from '../../store';
import { ElementSelectionData, CssVariable } from '../../types';
import ColorPicker from '../editor/ColorPicker';
```

### State + data from store

Add inside the component body:

```typescript
const { selectedElementData } = useAppStore();
```

### Update the breadcrumb trail

Replace the static "No element selected" paragraph with a dynamic selector display that shows `tagName#id.class` when an element is selected.

### Define local tab components above RightSidebar

Define three local React components (not exported) before the RightSidebar component:

**StylesTab** groups computed styles into categories: Typography, Background, Box Model, Border, Layout, Effects. For each group, show only props that have a value in data.computedStyles. Color properties (color, background-color, border-color) render a compact ColorPicker. Other props render a monospace text span. Hoverable rows with hover:bg-gray-700.

**AttributesTab** shows a list of attribute name (text-blue-400, font-mono) and value (text-gray-300, font-mono) pairs. Show "No attributes" when empty.

**ComputedTab** shows all entries in data.computedStyles as a scrollable two-column list (prop name left, value right, both monospace).

### Replace the tab content area

Replace the single flex-1 div that shows placeholder text with:

```tsx
<div className="flex-1 overflow-y-auto">
  {!selectedElementData ? (
    <div className="flex items-center justify-center h-full px-3">
      <p className="text-gray-500 text-sm text-center">{emptyMessages[activeTab]}</p>
    </div>
  ) : activeTab === 'Styles' ? (
    <StylesTab data={selectedElementData} />
  ) : activeTab === 'Attributes' ? (
    <AttributesTab data={selectedElementData} />
  ) : activeTab === 'Computed' ? (
    <ComputedTab data={selectedElementData} />
  ) : (
    <div className="flex items-center justify-center h-full px-3">
      <p className="text-gray-500 text-sm text-center">Select an element for AI suggestions</p>
    </div>
  )}
</div>
```

### Update the CSS Variables accordion

Replace the static "No CSS variables defined" text with dynamic content from selectedElementData.cssVariables. Show each variable as: color swatch dot, variable name (text-blue-400, font-mono), value (text-gray-400). When empty, show "No CSS variables used" if element is selected, or "No CSS variables defined" otherwise.

---

## Import Paths Reference

```typescript
// In src/utils/css-variables.ts:
import { CssVariable } from '../types';

// In src/utils/context-builder.ts:
import { ElementSelectionData, ElementContext, CssVariable } from '../types';
import { parseCssVariables } from './css-variables';

// In src/components/editor/ColorPicker.tsx:
import React, { useState, useEffect } from 'react';
import { CssVariable } from '../../types';

// In src/components/layout/RightSidebar.tsx (additions):
import { useAppStore } from '../../store';
import { ElementSelectionData, CssVariable } from '../../types';
import ColorPicker from '../editor/ColorPicker';
```

---

## Verification Checklist

Before finishing, confirm:
- [ ] src/utils/css-variables.ts exports parseCssVariables, resolveVarReferences, groupVarsByScope
- [ ] src/utils/context-builder.ts exports buildElementContext
- [ ] src/components/editor/ColorPicker.tsx exports ColorPicker as default and ColorPickerProps as named export
- [ ] src/components/layout/RightSidebar.tsx compiles without errors; existing tab bar and props interface unchanged
- [ ] When selectedElementData is null, the sidebar still renders the "no element selected" placeholder for each tab
- [ ] ColorPicker renders correctly in both compact and full modes
- [ ] No files outside your ownership list were modified
- [ ] All Tailwind classes used exist in the v3 class set (bg-gray-900, text-gray-400, etc.)
