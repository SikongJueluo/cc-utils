/**
 * Main Logger class implementation.
 * This is the primary entry point for users to interact with the logging system.
 */

import { LogLevel, LoggerOptions, LogEvent, ILogger } from "./types";

/**
 * The main Logger class that orchestrates the logging pipeline.
 *
 * This class takes log messages, creates LogEvent objects, processes them through
 * a chain of processors, renders them to strings, and outputs them via streams.
 */
export class Logger implements ILogger {
    private options: LoggerOptions;

    /**
     * Create a new Logger instance.
     *
     * @param options - Configuration options for the logger
     */
    constructor(options: Partial<LoggerOptions>) {
        this.options = {
            processors: options.processors ?? [],
            renderer: options.renderer ?? this.defaultRenderer,
            streams: options.streams ?? [],
        };
    }

    /**
     * Default renderer that returns an empty string.
     * Used as fallback when no renderer is provided.
     */
    private defaultRenderer = (): string => "";

    /**
     * Main logging method that handles the complete logging pipeline.
     *
     * @param level - The log level
     * @param message - The log message
     * @param context - Additional context data as key-value pairs
     */
    public log(
        level: LogLevel,
        message: string,
        context: Record<string, unknown> = {},
    ): void {
        // 1. Create initial LogEvent with core fields
        let event: LogEvent | undefined = new Map<string, unknown>([
            ["level", level],
            ["message", message],
            ...Object.entries(context),
        ]);

        // 2. Process through the processor chain
        for (const processor of this.options.processors) {
            if (event === undefined) {
                break; // Event was dropped by a processor
            }
            event = processor(event);
        }

        // 3. Render and output if event wasn't dropped
        if (event !== undefined) {
            const finalEvent = event;
            const output = this.options.renderer(finalEvent);

            // Send to all configured streams
            for (const stream of this.options.streams) {
                stream.write(output, finalEvent);
            }
        }
    }

    /**
     * Log a trace message.
     * Typically used for very detailed diagnostic information.
     *
     * @param message - The log message
     * @param context - Additional context data
     */
    public trace(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.Trace, message, context);
    }

    /**
     * Log a debug message.
     * Used for diagnostic information useful during development.
     *
     * @param message - The log message
     * @param context - Additional context data
     */
    public debug(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.Debug, message, context);
    }

    /**
     * Log an info message.
     * Used for general informational messages about application flow.
     *
     * @param message - The log message
     * @param context - Additional context data
     */
    public info(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.Info, message, context);
    }

    /**
     * Log a warning message.
     * Used for potentially harmful situations that don't stop execution.
     *
     * @param message - The log message
     * @param context - Additional context data
     */
    public warn(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.Warn, message, context);
    }

    /**
     * Log an error message.
     * Used for error events that might allow the application to continue.
     *
     * @param message - The log message
     * @param context - Additional context data
     */
    public error(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.Error, message, context);
    }

    /**
     * Log a fatal message.
     * Used for very severe error events that might cause termination.
     *
     * @param message - The log message
     * @param context - Additional context data
     */
    public fatal(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.Fatal, message, context);
    }

    /**
     * Update the logger's configuration.
     * Useful for dynamically changing logging behavior at runtime.
     *
     * @param options - New configuration options to merge with existing ones
     */
    public configure(options: Partial<LoggerOptions>): void {
        this.options = {
            ...this.options,
            ...options,
        };
    }

    /**
     * Close all streams and clean up resources.
     * Should be called when the logger is no longer needed.
     */
    public close(): void {
        for (const stream of this.options.streams) {
            if (stream.close) {
                stream.close();
            }
        }
    }
}
