/**
 * Logger Service — Full Stubs
 * Extends the basic vaultLog with domain-specific loggers.
 */

interface Logger {
  warn: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  debug: (msg: string, ...args: unknown[]) => void;
}

function createLogger(prefix: string): Logger {
  return {
    warn: (msg: string, ...args: unknown[]) => console.warn(`[${prefix}]`, msg, ...args),
    info: (msg: string, ...args: unknown[]) => console.info(`[${prefix}]`, msg, ...args),
    error: (msg: string, ...args: unknown[]) => console.error(`[${prefix}]`, msg, ...args),
    debug: (msg: string, ...args: unknown[]) => {
      try {
        // @ts-ignore -- import.meta.env available at runtime in Vite
        if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
          console.debug(`[${prefix}]`, msg, ...args);
        }
      } catch {
        // Silently ignore in non-Vite environments
      }
    },
  };
}

export const vaultLog = createLogger('vault');
export const uiLog = createLogger('ui');
export const networkLog = createLogger('network');
export const ingestLog = createLogger('ingest');
export const storageLog = createLogger('storage');
