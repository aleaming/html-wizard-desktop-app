import React, { useRef, useImperativeHandle, useEffect, useMemo } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { debouncedWithCancel } from '../../utils/debounce';

export interface CodeEditorProps {
  value: string;
  language?: 'html' | 'css' | 'javascript';
  filePath?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

export interface CodeEditorHandle {
  /** Apply a diff to the editor without triggering onChange */
  applyEdit: (selector: string, before: string, after: string) => void;
  /** Get the current full text value */
  getValue: () => string;
  /** Focus the editor */
  focus: () => void;
}

const CodeEditor = React.forwardRef<CodeEditorHandle, CodeEditorProps>((
  { value, language = 'html', filePath: _filePath, onChange, onSave, className, readOnly = false },
  ref
) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  // Debounced onChange to avoid flooding the parent on rapid keystrokes
  const { fn: debouncedOnChange, cancel } = useMemo(
    () => debouncedWithCancel((val: string) => onChange?.(val), 300),
    [onChange]
  );

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Dark theme matching the app's gray-900 background
    monaco.editor.defineTheme('html-wizard-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#111827',
        'editor.lineHighlightBackground': '#1f2937',
        'editorLineNumber.foreground': '#4b5563',
        'editorCursor.foreground': '#3b82f6',
      },
    });
    monaco.editor.setTheme('html-wizard-dark');

    // Cmd+S / Ctrl+S save handler
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        const currentValue = editor.getValue();
        onSave?.(currentValue);
      }
    );
  };

  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    applyEdit: (_selector: string, before: string, after: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const model = editor.getModel();
      if (!model) return;

      const fullText = model.getValue();
      const beforeIndex = fullText.indexOf(before);
      if (beforeIndex === -1) {
        console.warn('[CodeEditor] applyEdit: could not find "before" text in document');
        return;
      }

      // Convert character offset to line/column position
      const beforePos = model.getPositionAt(beforeIndex);
      const afterPos = model.getPositionAt(beforeIndex + before.length);

      // Apply edit without triggering onChange — preserves undo history
      editor.executeEdits('visual-editor', [
        {
          range: {
            startLineNumber: beforePos.lineNumber,
            startColumn: beforePos.column,
            endLineNumber: afterPos.lineNumber,
            endColumn: afterPos.column,
          },
          text: after,
          forceMoveMarkers: true,
        },
      ]);
    },

    getValue: () => editorRef.current?.getValue() ?? '',
    focus: () => editorRef.current?.focus(),
  }), []);

  const editorOptions: MonacoEditor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: true, side: 'right', scale: 1 },
    fontSize: 13,
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
    fontLigatures: true,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    automaticLayout: true,
    readOnly,
    padding: { top: 8, bottom: 8 },
    scrollbar: {
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
  };

  return (
    <div className={`h-full w-full bg-gray-900 ${className ?? ''}`}>
      <Editor
        value={value}
        language={language}
        onMount={handleMount}
        onChange={(val) => debouncedOnChange(val ?? '')}
        options={editorOptions}
      />
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
