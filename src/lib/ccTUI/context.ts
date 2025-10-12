/**
 * Global context for the TUI application.
 * This is a simple way to provide global instances like a logger
 * to all components without prop drilling.
 */

import type { CCLog } from "../ccLog";

/**
 * The global logger instance for the TUI application.
 * This will be set by the Application instance on creation.
 */
export let logger: CCLog | undefined;

/**
 * Sets the global logger instance.
 * @param l The logger instance.
 */
export function setLogger(l: CCLog): void {
  logger = l;
}
