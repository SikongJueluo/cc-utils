/**
 * Global context for the TUI application.
 * This is a simple way to provide global instances like a logger
 * to all components without prop drilling.
 */

import { Logger } from "@/lib/ccStructLog";

/**
 * The global context object for the TUI application.
 * This will be set by the Application instance on creation.
 */
export const context: { logger: Logger | undefined } = {
    logger: undefined,
};

/**
 * Sets the global logger instance.
 * @param l The logger instance.
 */
export function setLogger(l: Logger): void {
    context.logger = l;
}
