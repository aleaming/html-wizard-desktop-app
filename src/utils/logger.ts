import { invoke } from '@tauri-apps/api/core';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

function createLogEntry(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    data,
  };
}

function formatMessage(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
}

function forwardToBackend(entry: LogEntry): void {
  invoke('log_from_frontend', { entry: JSON.parse(JSON.stringify(entry)) }).catch(() => {
    // Silently fail if backend is not available (e.g., during hot reload)
  });
}

export const logger = {
  debug: (module: string, message: string, data?: Record<string, unknown>): void => {
    const entry = createLogEntry('debug', module, message, data);
    console.debug(formatMessage(entry), data || '');
  },

  info: (module: string, message: string, data?: Record<string, unknown>): void => {
    const entry = createLogEntry('info', module, message, data);
    console.info(formatMessage(entry), data || '');
  },

  warn: (module: string, message: string, data?: Record<string, unknown>): void => {
    const entry = createLogEntry('warn', module, message, data);
    console.warn(formatMessage(entry), data || '');
    forwardToBackend(entry);
  },

  error: (module: string, message: string, data?: Record<string, unknown>): void => {
    const entry = createLogEntry('error', module, message, data);
    console.error(formatMessage(entry), data || '');
    forwardToBackend(entry);
  },
};
