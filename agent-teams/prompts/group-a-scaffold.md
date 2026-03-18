# Agent Group A: Project Scaffolding & Configuration

You are a builder agent responsible for initializing the Tauri 2.0 project structure and all configuration files. You produce complete, runnable files — no pseudocode or skeletons.

## File Ownership (ONLY touch these files)
- `src-tauri/Cargo.toml`
- `package.json`
- `tsconfig.json`
- `src-tauri/tauri.conf.json`
- `tailwind.config.js`
- `postcss.config.js`
- `vite.config.ts`
- `index.html`
- `src/main.tsx`
- `src/index.css`
- `.gitignore`

## DO NOT touch any files outside this list. Other agents own other files.

---

## Task A-1: Initialize Tauri 2.0 Cargo Configuration

Create `src-tauri/Cargo.toml` with these dependencies:
- `tauri = { version = "2", features = ["devtools"] }`
- `tauri-plugin-fs = "2"`
- `tauri-plugin-http = "2"`
- `tauri-plugin-shell = "2"`
- `serde = { version = "1", features = ["derive"] }`
- `serde_json = "1"`
- `tokio = { version = "1", features = ["full"] }`
- `reqwest = { version = "0.12", features = ["json", "stream"] }`
- `keyring = "3"`
- `tracing = "0.1"`
- `tracing-subscriber = { version = "0.3", features = ["json"] }`
- `notify = "7"`
- `thiserror = "2"`
- `async-trait = "0.1"`
- `uuid = { version = "1", features = ["v4"] }`

Package name: `html-wizard`
Edition: `2021`

**Acceptance:** `cargo check` in src-tauri/ must pass (once other agents add .rs files).

---

## Task A-2: Create Frontend Package Configuration

Create `package.json`:
```json
{
  "name": "html-wizard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.0",
    "@monaco-editor/react": "^4.6.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-fs": "^2.0.0",
    "@tauri-apps/plugin-http": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

---

## Task A-3: Configure Tauri Window and Security

Create `src-tauri/tauri.conf.json`:
- Window: title "HTML Wizard", width 1600, height 1000, minWidth 1200, minHeight 800
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https: data:; connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com https://api.openai.com; font-src 'self' data:`
- Identifier: `com.htmlwizard.app`
- Use Tauri 2.0 configuration format with `app`, `build`, `bundle` sections
- Permissions: reference fs, http, shell plugins with scoped access

---

## Task A-4: Configure Tailwind CSS and Vite

Create `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#1a1d23',
          750: '#2d3039',
        }
      }
    }
  },
  plugins: []
}
```

Create `postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
```

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
```

---

## Task A-5: Create Entry HTML and Gitignore

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HTML Wizard</title>
  </head>
  <body class="bg-gray-900 text-gray-100 overflow-hidden">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #1a1d23;
  }

  ::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
}
```

Create `.gitignore`:
```
node_modules/
dist/
target/
.DS_Store
*.bak
.env
.env.local
*.log
```
