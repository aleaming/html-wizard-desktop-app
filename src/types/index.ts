// ===== Project Types =====

export interface ProjectInfo {
  root: string;
  name: string;
  isGit: boolean;
  fileCount: number;
}

export type FileType = 'html' | 'css' | 'js' | 'image' | 'other';

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  fileType: FileType;
  children?: FileNode[];
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

export interface ChangeEntry {
  filePath: string;
  original: string | null;
  modified: string;
  timestamp: number;
}

export interface ChangeBuffer {
  entries: ChangeEntry[];
}

// ===== AI Types =====

export type AIProviderType = 'claude' | 'gemini' | 'openai' | { plugin: string };

export interface AIRequest {
  provider: AIProviderType;
  prompt: string;
  context?: ElementContext;
  conversationId?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  provider: AIProviderType;
  tokenUsage: TokenUsage;
  finishReason: string;
}

export interface ElementContext {
  html: string;
  css: string[];
  parentHtml?: string;
  cssVariables: CssVariable[];
  filePath: string;
}

export interface CssVariable {
  name: string;
  value: string;
  scope: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderConfig {
  providerType: AIProviderType;
  model: string;
  baseUrl?: string;
  supportsStreaming: boolean;
  supportsImages: boolean;
}

// ===== UI Types =====

export interface PanelState {
  leftSidebar: boolean;
  rightSidebar: boolean;
  bottomPanel: boolean;
}

export interface ViewportSize {
  width: number;
  height: number;
  label?: string;
}

export const VIEWPORT_PRESETS: ViewportSize[] = [
  { width: 375, height: 667, label: 'Mobile' },
  { width: 768, height: 1024, label: 'Tablet' },
  { width: 1440, height: 900, label: 'Desktop' },
];

// ===== Chat Types =====

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  projectRoot: string;
  createdAt: number;
}

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

// ===== Editor Types =====

export type OperationType = 'style' | 'content' | 'attribute' | 'structure' | 'ai';

export interface EditOperation {
  id: string;
  type: OperationType;
  elementSelector: string;
  filePath: string;
  before: string;
  after: string;
  timestamp: number;
  groupId?: string; // For grouping related operations (e.g., all changes from one AI suggestion)
}
