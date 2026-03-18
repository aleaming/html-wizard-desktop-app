# Agent Group D: Frontend — Layout Shell & Components

You are a builder agent responsible for the four-panel layout shell and all layout components. You produce complete, working React/TypeScript code with Tailwind CSS styling. Dark theme throughout.

## File Ownership (ONLY touch these files)
- `src/App.tsx`
- `src/components/layout/LeftSidebar.tsx`
- `src/components/layout/CenterPanel.tsx`
- `src/components/layout/RightSidebar.tsx`
- `src/components/layout/BottomPanel.tsx`

## DO NOT touch any files outside this list. Other agents own other files.

## Important: Create directory:
```
src/components/layout/
```

## Shared Types (defined by another agent — import from `../../types`)
```typescript
// You may import these types from '../types' or '../../types'
// They are defined by Group E. Use these interfaces:
interface ViewportSize { width: number; height: number; label?: string; }
interface PanelState { leftSidebar: boolean; rightSidebar: boolean; bottomPanel: boolean; }
```

## Design System
- **Background:** bg-gray-900 (base), bg-gray-800 (panels), bg-gray-850 (#1a1d23 custom, sidebar bg)
- **Text:** text-gray-100 (primary), text-gray-400 (secondary), text-gray-500 (muted)
- **Borders:** border-gray-700
- **Accent:** blue-500 (active states), blue-600 (hover)
- **Font:** System font stack (-apple-system, BlinkMacSystemFont, etc.)

---

## Task D-1: Create Root App Component with Four-Panel Layout

### `src/App.tsx`

Four-panel layout per the design specification:
```
+------------------+---------------------------+------------------+
|   LEFT SIDEBAR   |      CENTER PANEL         |  RIGHT SIDEBAR   |
|   (AI Chat)      |  (Visual Preview)         |  (Properties)    |
+------------------+---------------------------+------------------+
|                       BOTTOM PANEL                              |
|  (File Tree / Console / Output)                                 |
+-----------------------------------------------------------------+
```

Implementation requirements:
- CSS Grid layout: `grid-template-columns` for left/center/right, `grid-template-rows` for main/bottom
- Resizable panels with drag handles between them
- Panel visibility state (left sidebar, bottom panel toggleable)
- Keyboard shortcuts: Cmd/Ctrl+J toggles left sidebar, Cmd/Ctrl+` toggles bottom panel
- Minimum widths: left 200px, right 200px, bottom height 100px
- Default widths: left 300px, right 280px, bottom 200px

Drag handle component (inline, simple):
```tsx
const ResizeHandle: React.FC<{
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}> = ({ direction, onResize }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      onResize(currentPos - startPos);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`${direction === 'horizontal' ? 'w-1 cursor-col-resize hover:bg-blue-500' : 'h-1 cursor-row-resize hover:bg-blue-500'} bg-gray-700 transition-colors flex-shrink-0`}
      onMouseDown={handleMouseDown}
    />
  );
};
```

Full App component should:
1. Manage panel widths in state (leftWidth, rightWidth, bottomHeight)
2. Manage panel visibility (showLeft, showBottom — right sidebar always visible)
3. Listen for keyboard shortcuts
4. Render the grid with all four panels and resize handles between them
5. Use `useEffect` for keyboard shortcut registration

---

## Task D-2: Create Left Sidebar Component

### `src/components/layout/LeftSidebar.tsx`

AI Chat interface shell (Level 1 — no real AI connectivity):

Structure:
```
┌─────────────────────┐
│ HTML Wizard AI   ▼  │  ← Header with provider selector
├─────────────────────┤
│                     │
│  Open a project to  │  ← Empty state message
│  start chatting     │
│                     │
│  [message area]     │  ← Scrollable chat messages
│                     │
├─────────────────────┤
│ [input]      [Send] │  ← Input area with send button
└─────────────────────┘
```

- Provider selector: dropdown with Claude, Gemini, OpenAI options (non-functional in L1)
- Chat area: scrollable div with flex-grow, empty state centered
- Input: textarea (auto-resize) with Cmd/Ctrl+Enter to send, Send button
- Props: `{ width: number }`
- Style: bg-gray-800 with border-r border-gray-700

---

## Task D-3: Create Center Panel Component

### `src/components/layout/CenterPanel.tsx`

Visual preview area with viewport toolbar:

Structure:
```
┌─────────────────────────────────┐
│ 📱 375  📱 768  🖥 1440 │ W×H │  ← Viewport toolbar
├─────────────────────────────────┤
│                                 │
│                                 │
│    Open a project to see        │  ← Preview area (empty state)
│    the visual preview           │
│                                 │
│                                 │
├─────────────────────────────────┤
│                        100%  🔍 │  ← Zoom indicator
└─────────────────────────────────┘
```

- Viewport toolbar at top with preset buttons:
  - Mobile: 375×667 (active state shows blue highlight)
  - Tablet: 768×1024
  - Desktop: 1440×900
  - Custom: width × height input fields
  - Orientation toggle button (swap width/height for mobile/tablet)
- Preview container: centered in the panel, shows the viewport dimensions as a bordered rectangle
  - If viewport exceeds panel width, calculate scale factor and show zoom percentage
  - Background: slightly different shade (bg-gray-950 or similar) to distinguish from chrome
- Zoom indicator at bottom showing current scale percentage
- No props needed — fills available space via CSS Grid

---

## Task D-4: Create Right Sidebar Component

### `src/components/layout/RightSidebar.tsx`

Property inspector shell:

Structure:
```
┌─────────────────────┐
│ body > div > h1      │  ← Breadcrumb trail
├─────────────────────┤
│ Styles│Attrs│Comp│AI │  ← Tab bar
├─────────────────────┤
│                     │
│  Select an element  │  ← Tab content (empty state)
│  to inspect its     │
│  properties         │
│                     │
├─────────────────────┤
│ ▶ CSS Variables     │  ← Collapsible section
└─────────────────────┘
```

- DOM breadcrumb trail at top (placeholder: "No element selected")
- Four tabs: Styles, Attributes, Computed, AI
  - Active tab has blue bottom border and white text
  - Inactive tabs have gray text
  - Each tab shows empty state message when no element selected
- CSS Variables section at bottom (collapsible with arrow toggle)
- Props: `{ width: number }`
- Style: bg-gray-800 with border-l border-gray-700

---

## Task D-5: Create Bottom Panel Component

### `src/components/layout/BottomPanel.tsx`

File explorer and console shell:

Structure:
```
┌─────────────────────────────────────────────────┐
│ Files  │  Console  │  Output                     │  ← Tab bar
├─────────────────────────────────────────────────┤
│                                                 │
│  Open a project to see files                    │  ← Files tab (empty state)
│                                                 │
│  [scrollable content area]                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Three tabs: Files, Console, Output
  - Files: placeholder for file tree (empty state message)
  - Console: scrollable monospace text area for log output, dark background
  - Output: build status and sync messages
- Tab bar at top with same styling as right sidebar tabs
- Props: `{ height: number }`
- Style: bg-gray-800 with border-t border-gray-700
- The panel takes full width of the layout
