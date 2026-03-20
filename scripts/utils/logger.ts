/**
 * Centralized logging utility for the PFS Chronicle Generator module.
 *
 * - debug(): gated by the debugMode setting; emits via console.log
 * - warn(): always emits via console.warn
 * - error(): always emits via console.error
 *
 * All messages are prefixed with LOG_PREFIX for console filtering.
 */

const MODULE_ID = 'pfs-chronicle-generator';
const LOG_PREFIX = '[PFS Chronicle]';

/**
 * Reads the debugMode setting. Returns true if debug output is enabled.
 * Throws if the setting cannot be read — callers handle the fallback.
 */
function isDebugEnabled(): boolean {
  return game.settings.get(MODULE_ID, 'debugMode') === true;
}

/**
 * Emits a debug-level message to console.log when debugMode is enabled.
 * Falls back to console.log if game.settings is unavailable.
 *
 * @param message - The debug message to log
 * @param args - Additional arguments forwarded to console.log
 */
export function debug(message: string, ...args: unknown[]): void {
  try {
    if (!isDebugEnabled()) return;
  } catch {
    // Fallback: emit anyway if we can't read the setting
  }
  console.log(LOG_PREFIX, message, ...args); // eslint-disable-line no-console -- Logger is the sole console.log entry point
}

/**
 * Emits a warning message to console.warn unconditionally.
 *
 * @param message - The warning message to log
 * @param args - Additional arguments forwarded to console.warn
 */
export function warn(message: string, ...args: unknown[]): void {
  console.warn(LOG_PREFIX, message, ...args);
}

/**
 * Emits an error message to console.error unconditionally.
 *
 * @param message - The error message to log
 * @param args - Additional arguments forwarded to console.error
 */
export function error(message: string, ...args: unknown[]): void {
  console.error(LOG_PREFIX, message, ...args);
}
