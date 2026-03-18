# Generated Prompt: Step-Back Prompting

## Style
Step-Back Prompting (identity-structural)

## Mode
Customizable

## Generated Prompt

```
You are an expert Tauri developer specializing in production-ready professional tool applications for developers, designers, and project managers.

Before addressing this task directly, step back to consider the broader context:

1. What fundamental principles from your domain apply here?
   - Cross-platform desktop app architecture using Rust + Web technologies
   - Secure API integration patterns and credential management
   - File system security models and permission handling
   - Real-time DOM manipulation and visual editing frameworks
   - Modular plugin architecture for extensible AI integrations

2. What broader context should inform the approach?
   - Modern web development workflows demand visual-first editing tools
   - AI-assisted coding is becoming essential for productivity
   - Security and privacy are critical when handling project files and API keys
   - Professional tools require robust error handling and user experience design
   - Integration with existing development ecosystems and file structures

3. What general framework or methodology is most appropriate?
   - Component-driven architecture with clear separation of concerns
   - Event-driven communication between Rust backend and frontend
   - Progressive enhancement approach for AI features
   - Secure credential storage using platform keychain services
   - Modular design allowing for future LLM provider additions

Task: Develop a comprehensive Tauri-based Visual HTML Editor with AI Integration

## Application Architecture

Create a desktop application using Tauri 2.0 with the following tech stack:
- **Backend**: Rust with tauri, serde, tokio for async operations, and secure credential storage
- **Frontend**: Modern web technologies (React/Vue/Svelte - your choice) with TypeScript
- **File System**: tauri-plugin-fs with explicit permission management
- **HTTP Client**: tauri-plugin-http for secure API communications

## Core Features Implementation

### 1. Project Management System
- Implement a project selector that allows users to choose HTML/CSS/JS project folders
- Create a secure permission system requiring explicit user consent for file operations
- Build a file tree navigator showing project structure with live file watching
- Include project settings storage for API keys, preferences, and configurations

### 2. Visual HTML Editor Engine
- Develop a split-pane interface with live preview and code editing capabilities
- Implement click-to-edit functionality for DOM elements with visual selection indicators
- Create intelligent CSS variable detection and modification system
- Build a responsive design preview system with multiple viewport options

### 3. AI Integration Framework
- Design a secure API key management system using platform keychain storage
- Implement modular LLM provider adapters (Claude, Gemini, OpenAI) with standardized interfaces
- Create context-aware prompting system that includes relevant file contents and project structure
- Build streaming response handling for real-time AI assistance

### 4. Advanced Editing Capabilities
- **Element-Level AI Assistance**: Context menus on DOM elements triggering focused AI agents
- **Smart Color Management**: CSS custom property detection with visual color picker integration
- **Image Handling Pipeline**: Local upload, URL linking, and AI-generated image workflows
- **Code Synchronization**: Bidirectional sync between visual changes and source code

### 5. User Interface Design
- **Left Sidebar**: Persistent AI chat interface with conversation history and project context
- **Center Panel**: Visual editor with overlay controls and element highlighting
- **Right Sidebar**: Property inspector showing CSS styles, attributes, and AI suggestions
- **Bottom Panel**: File explorer, console output, and build status indicators

## Technical Implementation Requirements

### Security & Performance
- Implement rate limiting for API calls with user-configurable limits
- Use secure HTTP-only communication with certificate validation
- Create efficient file watching with debounced updates
- Implement undo/redo system with granular change tracking

### AI Integration Specifications
- **Element Context Generation**: Include parent/child relationships, current styles, and semantic meaning
- **Multi-file Awareness**: Maintain project-wide context for cross-file dependencies
- **Intelligent Prompting**: Generate contextually appropriate prompts based on edit type and scope
- **Response Processing**: Parse AI responses for code changes, suggestions, and explanations

### File System Operations
- **Safe Write Operations**: Implement atomic file writes with backup creation
- **Change Detection**: Real-time monitoring of external file changes with conflict resolution
- **Asset Management**: Intelligent handling of relative paths, images, and linked resources
- **Version Control Integration**: Git-aware operations with staging and commit capabilities

## User Experience Features

### Onboarding & Setup
- Guided setup wizard for API key configuration and permission granting
- Interactive tutorial showcasing key features and workflows
- Template project creation with common frameworks (Bootstrap, Tailwind, etc.)

### Professional Workflow Integration
- **Export Options**: Generate clean, production-ready code without editor artifacts
- **Collaboration Features**: Share project snapshots and AI conversation histories
- **Plugin System**: Extensible architecture for custom AI providers and editing tools
- **Keyboard Shortcuts**: Comprehensive hotkey system for power users

Deliver a complete, installable application with comprehensive documentation, error handling, and professional-grade user experience suitable for production development workflows.
```

---
Generated by UX Message Mate Prompt Style Generator
