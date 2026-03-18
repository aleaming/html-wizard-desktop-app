# Primary Document Assessment: rought-draft-seed-prompt.md

**Assessed document:** `/Users/alexleaming/ALEX-workspace/custom-work-mates/html-wizard-desktop-app/rought-draft-seed-prompt.md`
**Assessment date:** 2026-03-18
**Assessor role:** Document Assessment Specialist
**Purpose:** Provide a structured assessment for the integration agent to build the final merged document from this seed prompt and its 12 meta-prompt derivatives.

---

## rought-draft-seed-prompt.md

### Strengths

1. **Clear product vision in minimal space.** The entire specification is 27 lines and communicates the core concept unambiguously: a Tauri desktop app that combines visual HTML editing with AI assistance.

2. **Well-structured functional decomposition.** The document cleanly separates concerns into four sections -- Core Functionality, Visual Editing Features, AI Integration, and File System Access -- each addressing a distinct capability domain.

3. **Concrete UI/UX intent.** The document specifies *where* things go and *how* users interact:
   - "click directly on page elements to modify content, colors, and images"
   - "a persistent chat interface positioned on the left side of the screen"
   - "each clickable element should trigger an inline AI agent specifically focused on that code section"

4. **Dual AI architecture is clearly defined.** The distinction between element-scoped inline AI agents and the project-wide chat sidebar is the most architecturally significant design decision in the document and is stated with precision.

5. **Smart CSS variable awareness.** The requirement to "utilize existing CSS root variables when available, with options for custom color selection" shows awareness of real-world CSS authoring patterns and avoids the trap of generating inline styles that break design systems.

6. **Three-method image handling is exhaustive and well-enumerated.** Upload, URL, and AI-generated -- covers the practical universe of image sourcing for web projects.

7. **Security-conscious.** Explicit permission confirmation during project opening is called out as a requirement, not an afterthought.

---

### Weaknesses

1. **No technical stack specification beyond "Tauri."** The document does not mention Rust, any frontend framework (React/Vue/Svelte), TypeScript, or any specific Tauri APIs. All 12 meta-prompts had to infer or decide this themselves.

2. **No architecture or implementation guidance.** There is no mention of:
   - Frontend-backend separation patterns
   - IPC communication
   - WebView rendering strategy (iframe vs. direct DOM vs. shadow DOM)
   - State management
   - Plugin architecture

3. **AI integration details are underspecified.** The document says to integrate with "Claude Code, Gemini, or similar" but does not address:
   - How context is extracted and sent to the LLM
   - Streaming vs. batch responses
   - Token/cost management
   - Multi-provider abstraction pattern
   - How AI-generated code changes are applied to source files

4. **No mention of undo/redo.** This is a critical requirement for any editor and is entirely absent from the seed document. Multiple meta-prompts added it independently.

5. **No performance requirements.** No mention of response times, memory management, handling of large projects, lazy loading, or background processing.

6. **No error handling or recovery specification.** No mention of what happens when API calls fail, files are corrupted, or edits conflict.

7. **No deployment, distribution, or platform targets.** The document says "Tauri" (implying cross-platform) but never states which platforms must be supported, nor addresses code signing, auto-updates, or installers.

8. **No mention of version control integration.** No reference to Git awareness, backup creation before edits, or change history tracking.

9. **No target audience definition.** The meta-prompts unanimously added "developers, designers, and project managers" but this is absent from the seed document.

10. **No testing strategy.** No mention of unit tests, integration tests, or quality assurance processes.

11. **No accessibility requirements.** WCAG compliance, keyboard navigation, and screen reader support are not mentioned.

12. **The closing paragraph is conversational filler.** "Please let me know if you need clarification..." is appropriate for a message to a human but carries no specification value and should be dropped in the final document.

---

### Quality: 3 / 5

**Justification:** The document succeeds as a *seed concept* -- it clearly communicates the product vision and core interaction model in a concise, readable format. The dual AI architecture and CSS variable awareness demonstrate genuine design thinking. However, it fails as a *specification* -- it lacks technical architecture, performance requirements, error handling, deployment strategy, testing, accessibility, undo/redo, and dozens of implementation details that every meta-prompt had to independently invent. Its value is in *intent and vision*, not in *completeness*.

---

### Key Topics

1. Tauri desktop application framework
2. AI-powered visual HTML/CSS/JS editing
3. LLM API integration (Claude, Gemini)
4. User-provided API key management
5. Click-to-edit visual editing paradigm
6. CSS root variable detection and utilization
7. Three-method image handling (upload, URL, AI-generated)
8. Dual AI system (inline element agent + project-wide chat sidebar)
9. File system permissions with explicit user consent
10. Project folder-based workflow

---

### Key Claims (with direct quotes)

1. **Product type:** "a desktop application using Tauri that provides AI-powered visual editing capabilities for HTML/CSS/JS projects"

2. **LLM integration method:** "integrate with LLM APIs (Claude Code, Gemini, or similar) through user-provided API keys"

3. **Project workflow:** "Users will open existing HTML/CSS/JS project folders to access a visual editor interface that displays rendered HTML files with direct editing capabilities"

4. **Visual editing interaction model:** "Users should be able to click directly on page elements to modify content, colors, and images"

5. **CSS variable intelligence:** "Color changes should utilize existing CSS root variables when available, with options for custom color selection"

6. **Image handling requirements (enumerated):**
   - "Uploading local files"
   - "Linking to external URLs"
   - "AI-generated/edited images through the integrated LLM"

7. **Inline AI agent behavior:** "Each clickable element should trigger an inline AI agent specifically focused on that code section to assist with targeted edits"

8. **Project-wide chat behavior:** "a persistent chat interface positioned on the left side of the screen should handle broader requests affecting multiple files or larger structural changes to the project"

9. **File system permissions:** "The application must have read, write, and create permissions for files and folders within the selected project directory"

10. **Consent model:** "Users should provide explicit confirmation when granting these permissions during the project opening process"

11. **Product mission statement:** "streamline the web development workflow by combining visual editing with intelligent code assistance, making complex HTML/CSS modifications more accessible while maintaining professional development standards"

---

### Data Points

- **LLM providers named:** Claude Code, Gemini (2 named, plus "or similar")
- **Image handling methods:** 3 (upload, URL, AI-generated)
- **AI modes:** 2 (inline element agent, project-wide chat)
- **File permissions required:** 3 types (read, write, create)
- **Chat panel position:** left side of the screen
- **No quantitative performance metrics, version numbers, or dates are present in the document.**

---

### Unique Content

The seed document establishes several elements that, while expanded upon by the meta-prompts, originate solely here:

1. **The dual AI architecture concept** -- the specific split between "inline AI agent specifically focused on that code section" and "persistent chat interface...for broader requests" is the document's most distinctive architectural contribution. Every meta-prompt preserved this.

2. **CSS root variable awareness as a first-class requirement** -- this is a nuanced, real-world consideration that signals the author understands modern CSS authoring practices. It distinguishes this tool from naive visual editors that generate inline styles.

3. **The phrase "Claude Code"** specifically as an LLM target -- this appears in the seed but some meta-prompts normalized it to just "Claude." The seed's intent to work with Claude Code (the CLI tool) vs. the Claude API may be significant.

4. **The explicit consent model for file access** -- while security is mentioned in all meta-prompts, the seed's specific requirement that consent happens "during the project opening process" establishes the UX timing for the permission flow.

---

### Core Requirements Extracted

Every concrete requirement/feature specified in the seed document, enumerated:

| # | Requirement | Source Quote |
|---|-------------|-------------|
| R1 | Desktop application built with Tauri framework | "a desktop application using Tauri" |
| R2 | AI-powered visual editing for HTML/CSS/JS projects | "AI-powered visual editing capabilities for HTML/CSS/JS projects" |
| R3 | LLM API integration (Claude Code, Gemini, or similar) | "integrate with LLM APIs (Claude Code, Gemini, or similar)" |
| R4 | User-provided API key authentication | "through user-provided API keys" |
| R5 | Open existing project folders | "Users will open existing HTML/CSS/JS project folders" |
| R6 | Visual editor displays rendered HTML | "a visual editor interface that displays rendered HTML files" |
| R7 | Direct editing capabilities on rendered output | "with direct editing capabilities" |
| R8 | Click-to-edit on page elements | "click directly on page elements to modify content, colors, and images" |
| R9 | Content modification via click | (included in R8) |
| R10 | Color modification via click | (included in R8) |
| R11 | Image modification via click | (included in R8) |
| R12 | CSS root variable detection and utilization for color changes | "utilize existing CSS root variables when available" |
| R13 | Custom color selection fallback | "with options for custom color selection" |
| R14 | Image upload from local files | "Uploading local files" |
| R15 | Image linking via external URLs | "Linking to external URLs" |
| R16 | AI-generated/edited images via LLM | "AI-generated/edited images through the integrated LLM" |
| R17 | Inline AI agent per clickable element | "Each clickable element should trigger an inline AI agent" |
| R18 | AI agent scoped to specific code section | "specifically focused on that code section to assist with targeted edits" |
| R19 | Persistent chat interface on left side | "a persistent chat interface positioned on the left side of the screen" |
| R20 | Chat handles multi-file requests | "handle broader requests affecting multiple files" |
| R21 | Chat handles structural changes | "or larger structural changes to the project" |
| R22 | Read permissions for project directory | "read...permissions for files and folders within the selected project directory" |
| R23 | Write permissions for project directory | "write...permissions for files and folders within the selected project directory" |
| R24 | Create permissions for project directory | "create permissions for files and folders within the selected project directory" |
| R25 | Explicit user consent for file permissions | "Users should provide explicit confirmation when granting these permissions" |
| R26 | Consent granted during project opening | "during the project opening process" |
| R27 | Maintain professional development standards | "maintaining professional development standards" |

**Total explicit requirements: 27**

---

## Cross-Document Summary

### Overall Set Quality Rating: 3.5 / 5

**Justification:** The seed document is a strong vision statement but a weak specification. It earns its points through clarity of intent and thoughtful UX decisions (dual AI, CSS variables, consent timing), but loses points for the extensive gaps that forced all 12 meta-prompts to independently invent solutions for architecture, error handling, performance, testing, deployment, and accessibility. The good news: the meta-prompts are remarkably consistent in how they fill these gaps, suggesting the seed's intent was clear enough to guide them reliably.

---

### The Document's Role as "Source of Truth" for Project Intent

This document is the **authoritative source for product intent, interaction model, and user-facing behavior**. It should NOT be treated as authoritative for:
- Technical architecture decisions (framework choices, rendering strategies)
- Non-functional requirements (performance, accessibility, testing)
- Deployment and distribution strategy
- Error handling patterns

The meta-prompts collectively represent the "expanded specification" -- but they are interpretations, not mandates. When meta-prompts conflict with each other, the seed document should be the tiebreaker for *what the product does*, while the best-reasoned meta-prompt should win for *how it does it*.

---

### What the Integrator MUST Preserve from This Document

These are non-negotiable elements from the seed that must survive integration:

1. **The dual AI architecture** -- inline element agents AND persistent left-side chat. This is the product's core differentiator. Do not collapse these into a single interface.

2. **CSS root variable awareness** -- color editing must detect and prefer existing CSS custom properties. This is not just a nice-to-have; it's what makes the tool respect existing design systems.

3. **Three-method image handling** -- upload, URL, AI-generated. All three must be present.

4. **Click-to-edit as the primary interaction model** -- users click rendered elements to edit them. This is not a code editor with a preview pane; it is a visual editor backed by code.

5. **Explicit consent during project opening** -- the timing and mechanism of file permission grants.

6. **The scope boundary: existing HTML/CSS/JS projects** -- this tool opens existing projects, it does not create new ones from scratch (though meta-prompts added template creation, which could be a valid extension).

7. **User-provided API keys** -- the tool does not ship with its own API access; users bring their own credentials.

8. **The product mission:** "streamline the web development workflow by combining visual editing with intelligent code assistance, making complex HTML/CSS modifications more accessible while maintaining professional development standards."

---

### What's Missing That the Meta-Prompts Should Fill In

The following gaps in the seed document are addressed by one or more meta-prompts and should be incorporated during integration:

| Gap | Meta-Prompts That Address It | Recommended Resolution |
|-----|-------------------------------|----------------------|
| **Technical stack** (Rust backend, React/Vue/Svelte frontend, TypeScript) | All 12 | Adopt consensus: Rust backend + React or Vue frontend + TypeScript |
| **Undo/redo system** | Role-Persona, Step-Back, Emotion, Self-Ask, Technical-Documentation | Must be included -- critical for any editor |
| **Error handling and recovery** | All 12 | Comprehensive error boundaries, user feedback, rollback |
| **Performance requirements** | Technical-Documentation (sub-100ms element selection), Step-Back, Learning-Teaching | Include specific benchmarks from Technical-Documentation |
| **Backup/version control integration** | Step-Back, Decision-Analysis, Emotion, Learning-Teaching | Git awareness and backup before modifications |
| **Target audience** | All 12 ("developers, designers, and project managers") | Adopt this consensus |
| **Cross-platform support** | Emotion, Decision-Analysis, Step-Back | Explicit: Windows, macOS, Linux |
| **Security details** (API key encryption, sandboxing, XSS prevention) | Technical-Documentation, Role-Persona, Learning-Teaching, Step-Back | Comprehensive security model |
| **Plugin/extensibility architecture** | Step-Back, Chain-of-Thought, Learning-Teaching | Modular AI provider adapters at minimum |
| **Testing strategy** | Technical-Documentation, Emotion, Learning-Teaching | Unit + integration + E2E testing |
| **Accessibility** | Technical-Documentation (WCAG 2.1 AA), Learning-Teaching | WCAG 2.1 AA compliance |
| **Deployment/distribution** | Role-Persona, Step-Back | Code signing, auto-updates, installers |
| **UI layout beyond left chat** | Step-Back (4-panel layout), Technical-Documentation | Adopt Step-Back's 4-panel layout as the most complete |
| **Onboarding/setup wizard** | Step-Back, Learning-Teaching | Guided API key setup + permission granting |
| **Real-time file watching** | Step-Back, Chain-of-Thought, Emotion | File system watcher with debounced updates |
| **Streaming AI responses** | Step-Back | Real-time streaming for chat interface |
| **Keyboard shortcuts** | Step-Back | Power user hotkey system |
| **Code editor integration** | Learning-Teaching (Monaco Editor) | Consider Monaco or similar for code view |
| **Responsive design preview** | Technical-Documentation, Step-Back | Multiple viewport preview modes |
| **Template project creation** | Step-Back | Nice-to-have extension of the "open existing projects" core |

---

### Priority Guidance for the Integrator

**Tier 1 -- Must integrate (seed requirements + critical gaps):**
- All 27 seed requirements (R1-R27)
- Undo/redo system
- Error handling and recovery
- Security model (API key encryption, file sandboxing)
- Target audience definition

**Tier 2 -- Should integrate (strong consensus across meta-prompts):**
- Technical stack specification
- Performance requirements
- Cross-platform support declaration
- Backup/version control integration
- Testing strategy
- Plugin/extensibility architecture

**Tier 3 -- Consider integrating (valuable additions from individual meta-prompts):**
- 4-panel UI layout (Step-Back)
- Onboarding wizard (Step-Back, Learning-Teaching)
- Monaco Editor integration (Learning-Teaching)
- WCAG 2.1 AA accessibility (Technical-Documentation)
- Responsive design preview modes
- Keyboard shortcuts
- Template project creation
- Deployment/distribution strategy

---

*End of primary document assessment.*
