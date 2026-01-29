/**
 * Centralized Logging Service
 * 
 * Replaces scattered console.* statements with a configurable,
 * environment-aware logging system. Supports log levels, log groups,
 * and can be configured to report to external services in production.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type LogGroup = 'app' | 'vault' | 'storage' | 'network' | 'ui' | 'worker' | 'general';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  group: LogGroup;
  message: string;
  data?: unknown;
  error?: Error;
}

type LogListener = (entry: LogEntry) => void;

interface LoggerConfig {
  minLevel: LogLevel;
  enabledGroups: LogGroup[];
  enableConsole: boolean;
  enableBuffer: boolean;
  bufferSize: number;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enabledGroups: ['app', 'vault', 'storage', 'network', 'ui', 'worker', 'general'],
  enableConsole: true,
  enableBuffer: true,
  bufferSize: 100,
};

/**
 * Centralized logger service for IIIF Field Archive Studio
 * 
 * @example
 * ```typescript
 * import { logger } from './services/logger';
 * 
 * logger.info('app', 'Application started');
 * logger.debug('vault', 'State updated', { id, changes });
 * logger.error('storage', 'Failed to save', error);
 * ```
 */
class LoggerService {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Configure the logger at runtime
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Subscribe to log entries for custom handling (e.g., error reporting)
   */
  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get recent log entries from buffer
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.buffer.slice(-count);
  }

  /**
   * Clear the log buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  private shouldLog(level: LogLevel, group: LogGroup): boolean {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) return false;
    if (!this.config.enabledGroups.includes(group)) return false;
    return true;
  }

  private formatMessage(level: LogLevel, group: LogGroup, message: string): string {
    const prefix = this.config.prefix ? `[${this.config.prefix}] ` : '';
    return `${prefix}[${group.toUpperCase()}] ${message}`;
  }

  private log(entry: LogEntry): void {
    // Add to buffer
    if (this.config.enableBuffer) {
      this.buffer.push(entry);
      if (this.buffer.length > this.config.bufferSize) {
        this.buffer.shift();
      }
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (e) {
        // Prevent listener errors from breaking logging
      }
    }

    // Console output
    if (this.config.enableConsole) {
      const formatted = this.formatMessage(entry.level, entry.group, entry.message);
      
      switch (entry.level) {
        case 'debug':
          console.debug(formatted, entry.data ?? '');
          break;
        case 'info':
          console.info(formatted, entry.data ?? '');
          break;
        case 'warn':
          console.warn(formatted, entry.data ?? '');
          break;
        case 'error':
          if (entry.error) {
            console.error(formatted, entry.error, entry.data ?? '');
          } else {
            console.error(formatted, entry.data ?? '');
          }
          break;
      }
    }
  }

  debug(group: LogGroup, message: string, data?: unknown): void {
    if (!this.shouldLog('debug', group)) return;
    this.log({ timestamp: Date.now(), level: 'debug', group, message, data });
  }

  info(group: LogGroup, message: string, data?: unknown): void {
    if (!this.shouldLog('info', group)) return;
    this.log({ timestamp: Date.now(), level: 'info', group, message, data });
  }

  warn(group: LogGroup, message: string, data?: unknown): void {
    if (!this.shouldLog('warn', group)) return;
    this.log({ timestamp: Date.now(), level: 'warn', group, message, data });
  }

  error(group: LogGroup, message: string, error?: Error, data?: unknown): void {
    if (!this.shouldLog('error', group)) return;
    this.log({ timestamp: Date.now(), level: 'error', group, message, data, error });
  }

  /**
   * Create a scoped logger for a specific group
   */
  scoped(group: LogGroup): ScopedLogger {
    return new ScopedLogger(this, group);
  }
}

/**
 * Scoped logger that prepends a group to all logs
 */
class ScopedLogger {
  constructor(private logger: LoggerService, private group: LogGroup) {}

  debug(message: string, data?: unknown): void {
    this.logger.debug(this.group, message, data);
  }

  info(message: string, data?: unknown): void {
    this.logger.info(this.group, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(this.group, message, data);
  }

  error(message: string, error?: Error, data?: unknown): void {
    this.logger.error(this.group, message, error, data);
  }
}

// Export singleton instance
export const logger = new LoggerService();

// Export scoped loggers for common groups
export const appLog = logger.scoped('app');
export const vaultLog = logger.scoped('vault');
export const storageLog = logger.scoped('storage');
export const networkLog = logger.scoped('network');
export const uiLog = logger.scoped('ui');
export const workerLog = logger.scoped('worker');
