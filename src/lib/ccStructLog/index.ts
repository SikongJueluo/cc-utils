/**
 * Main entry point for the ccStructLog library.
 *
 * This module provides convenient factory functions and pre-configured
 * logger instances for common use cases. It exports all the core components
 * while providing easy-to-use defaults for typical logging scenarios.
 */

// Re-export all core types and classes
export {
    LogLevel,
    LogEvent,
    Processor,
    Renderer,
    Stream,
    LoggerOptions,
    ILogger,
} from "./types";
export { Logger } from "./Logger";

// Re-export all processors
export {
    addTimestamp,
    addFormattedTimestamp,
    addFullTimestamp,
    filterByLevel,
    addSource,
    addComputerId,
    addComputerLabel,
    filterBy,
    transformField,
    removeFields,
    addStaticFields,
} from "./processors";

// Re-export all renderers
export { jsonRenderer, textRenderer } from "./renderers";

// Re-export all streams
export {
    ConsoleStream,
    FileStream,
    BufferStream,
    NullStream,
    SECOND,
    MINUTE,
    HOUR,
    DAY,
    WEEK,
} from "./streams";

import { Logger } from "./Logger";
import { LogLevel, LogEvent } from "./types";
import {
    addFormattedTimestamp,
    addFullTimestamp,
    addComputerId,
} from "./processors";
import { textRenderer, jsonRenderer } from "./renderers";
import { ConsoleStream, FileStream, DAY } from "./streams";

/**
 * Create a development logger with console output and colored formatting.
 *
 * This logger is optimized for development and debugging, with:
 * - Debug level and above
 * - Formatted timestamps
 * - Computer ID tracking
 * - Human-readable console output with colors
 *
 * @param options - Optional configuration to override defaults
 * @returns A configured Logger instance for development
 */
export function createDevLogger(
    options: {
        level?: LogLevel;
        source?: string;
        includeComputerId?: boolean;
    } = {},
): Logger {
    const processors = [addFormattedTimestamp()];

    if (options.includeComputerId !== false) {
        processors.push(addComputerId());
    }

    if (options.source) {
        processors.push((event: LogEvent) => {
            event.set("source", options.source);
            return event;
        });
    }

    return new Logger({
        processors,
        renderer: textRenderer,
        streams: [new ConsoleStream()],
    });
}

/**
 * Create a production logger with file output and JSON formatting.
 *
 * This logger is optimized for production environments, with:
 * - Info level and above
 * - Full timestamps
 * - Computer ID and label tracking
 * - JSON output for machine processing
 * - Daily file rotation
 *
 * @param filename - Base filename for log files
 * @param options - Optional configuration to override defaults
 * @returns A configured Logger instance for production
 */
export function createProdLogger(
    filename: string,
    options: {
        level?: LogLevel;
        source?: string;
        rotationInterval?: number;
        includeConsole?: boolean;
    } = {},
): Logger {
    const processors = [
        addFullTimestamp(),
        addComputerId(),
        (event: LogEvent) => {
            const label = os.getComputerLabel();
            if (label) {
                event.set("computer_label", label);
            }
            return event;
        },
    ];

    if (options.source) {
        processors.push((event: LogEvent) => {
            event.set("source", options.source);
            return event;
        });
    }

    const streams: Array<ConsoleStream | FileStream> = [
        new FileStream(filename, options.rotationInterval ?? DAY),
    ];

    if (options.includeConsole) {
        streams.push(new ConsoleStream());
    }

    return new Logger({
        processors,
        renderer: jsonRenderer,
        streams,
    });
}
