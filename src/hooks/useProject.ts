import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';
import { ProjectInfo, FileNode } from '../types';
import { logger } from '../utils/logger';

export function useProject() {
  const {
    projectInfo,
    fileTree,
    activeFile,
    changeBuffer,
    setProject,
    setFileTree,
    setActiveFile,
    addChange,
    commitChanges,
    discardChanges,
    hasUnsavedChanges,
  } = useAppStore();

  const openProject = async (path: string): Promise<ProjectInfo> => {
    logger.info('useProject', 'Opening project', { path });
    const info = await invoke<ProjectInfo>('open_project', { path });
    setProject(info);

    const tree = await invoke<FileNode[]>('scan_directory', { path });
    setFileTree(tree);

    logger.info('useProject', 'Project opened', { name: info.name, fileCount: info.fileCount });
    return info;
  };

  const readFile = async (path: string): Promise<string> => {
    logger.debug('useProject', 'Reading file', { path });
    return invoke<string>('read_file', { path });
  };

  const writeFile = async (path: string, content: string): Promise<void> => {
    logger.info('useProject', 'Writing file', { path });
    return invoke<void>('write_file', { path, content });
  };

  const createFile = async (path: string, content: string): Promise<void> => {
    logger.info('useProject', 'Creating file', { path });
    return invoke<void>('create_file', { path, content });
  };

  const deleteFile = async (path: string): Promise<void> => {
    logger.warn('useProject', 'Deleting file', { path });
    return invoke<void>('delete_file', { path });
  };

  const saveAllChanges = async (): Promise<void> => {
    const entries = commitChanges();
    for (const entry of entries) {
      await writeFile(entry.filePath, entry.modified);
    }
    logger.info('useProject', 'All changes saved', { count: entries.length });
  };

  return {
    projectInfo,
    fileTree,
    activeFile,
    changeBuffer,
    openProject,
    readFile,
    writeFile,
    createFile,
    deleteFile,
    setActiveFile,
    addChange,
    saveAllChanges,
    discardChanges,
    hasUnsavedChanges,
  };
}
