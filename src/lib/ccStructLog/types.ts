/**
 * Core types for the ccStructLog library.
 * This module defines the fundamental interfaces and types used throughout the logging system.
 */

/**
 * Available log levels in order of severity.
 */
export enum LogLevel {
    Trace = 0,
    Debug = 1,
    Info = 2,
    Warn = 3,
    Error = 4,
    Fatal = 5,
}

/**
 * A log event represented as a key-value map.
 * Uses Map to maintain insertion order of keys.
 */
export type LogEvent = Map<string, unknown>;

/**
 * A processor function that can modify, filter, or enrich log events.
 *
 * @param event - The log event to process
 * @returns The processed log event, or undefined to drop the log
 */
export type Processor = (event: LogEvent) => LogEvent | undefined;

/**
 * A renderer function that converts a log event to a string representation.
 *
 * @param event - The final log event after all processing
 * @returns The formatted string representation
 */
export type Renderer = (event: LogEvent) => string;

/**
 * Interface for output streams that handle the final log output.
 */
export interface Stream {
    /**
     * Write a formatted log message to the output destination.
     *
     * @param message - The formatted log message
     * @param event - The original log event for context
     */
    write(message: string, event: LogEvent): void;

    /**
     * Close the stream and release any resources.
     * Optional method for cleanup.
     */
    close?(): void;
}

/**
 * Configuration options for creating a Logger instance.
 */
export interface LoggerOptions {
    /** Array of processors to apply to log events */
    processors: Processor[];

    /** Renderer to format the final log output */
    renderer: Renderer;

    /** Array of streams to output the formatted logs */
    streams: Stream[];
}

/**
 * Interface for the main Logger class.
 */
export interface ILogger {
    /**
     * Log a message at the specified level.
     *
     * @param level - The log level
     * @param message - The log message
     * @param context - Additional context data
     */
    log(
        level: LogLevel,
        message: string,
        context?: Record<string, unknown>,
    ): void;

    /** Log at trace level */
    trace(message: string, context?: Record<string, unknown>): void;

    /** Log at debug level */
    debug(message: string, context?: Record<string, unknown>): void;

    /** Log at info level */
    info(message: string, context?: Record<string, unknown>): void;

    /** Log at warn level */
    warn(message: string, context?: Record<string, unknown>): void;

    /** Log at error level */
    error(message: string, context?: Record<string, unknown>): void;

    /** Log at fatal level */
    fatal(message: string, context?: Record<string, unknown>): void;
}
