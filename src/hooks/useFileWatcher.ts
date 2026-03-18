import { useEffect, useRef, useCallback } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';

interface FileChangedPayload {
  path: string;
  kind: 'modified' | 'created' | 'removed';
}

interface UseFileWatcherOptions {
  onFileChanged: (path: string, content: string) => void;
  enabled?: boolean;
}

export function useFileWatcher(options: UseFileWatcherOptions) {
  const { onFileChanged, enabled = true } = options;
  const activeFile = useAppStore((s) => s.activeFile);
  const lastUserEditRef = useRef<number>(0);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const watchedPathRef = useRef<string | null>(null);

  // Call this from the parent whenever the user edits in Monaco
  const markUserEdit = useCallback(() => {
    lastUserEditRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled || !activeFile) return;

    const startWatching = async () => {
      // Stop watching previous file
      if (watchedPathRef.current && watchedPathRef.current !== activeFile) {
        await invoke('unwatch_file', { path: watchedPathRef.current }).catch(() => {});
      }

      watchedPathRef.current = activeFile;
      await invoke('watch_file', { path: activeFile }).catch((e: unknown) => {
        console.warn('[useFileWatcher] Failed to watch file:', e);
      });

      // Subscribe to file-changed events
      if (unlistenRef.current) {
        unlistenRef.current();
      }

      unlistenRef.current = await listen<FileChangedPayload>('file-changed', async (event) => {
        const { path, kind } = event.payload;

        if (path !== activeFile) return;
        if (kind === 'removed') return;

        // Most recent edit wins: ignore FS events within 2s of user typing
        const timeSinceUserEdit = Date.now() - lastUserEditRef.current;
        if (timeSinceUserEdit < 2000) {
          return;
        }

        // Re-read file and notify parent
        try {
          const content = await invoke<string>('read_file', { path });
          onFileChanged(path, content);
        } catch (e) {
          console.warn('[useFileWatcher] Failed to re-read file:', e);
        }
      });
    };

    startWatching();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      if (watchedPathRef.current) {
        invoke('unwatch_file', { path: watchedPathRef.current }).catch(() => {});
        watchedPathRef.current = null;
      }
    };
  }, [activeFile, enabled, onFileChanged]);

  return { markUserEdit };
}
