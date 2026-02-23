/**
 * Minimal logger stub for vault modules.
 * Replaces @/src/shared/services/logger from the React codebase.
 */
export const vaultLog = {
  warn: (msg: string) => console.warn(`[vault] ${msg}`),
  info: (msg: string) => console.info(`[vault] ${msg}`),
};
