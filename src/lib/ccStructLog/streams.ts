/**
 * Standard output streams for the ccStructLog library.
 *
 * Streams are responsible for writing the final formatted log messages
 * to their destination (console, file, network, etc.). Each stream
 * implements the Stream interface and handles its own output logic.
 */

import { LogLevel, Stream, LogEvent } from "./types";

/**
 * Configuration interface for FileStream with auto-cleanup options.
 */
interface FileStreamConfig {
    /** Path to the log file */
    filePath: string;
    /** Time in seconds between file rotations (0 = no rotation) */
    rotationInterval?: number;
    /** Auto-cleanup configuration */
    autoCleanup?: {
        /** Whether to enable auto-cleanup */
        enabled: boolean;
        /** Maximum number of log files to keep */
        maxFiles?: number;
        /** Maximum total size in bytes for all log files */
        maxSizeBytes?: number;
        /** Directory to search for log files (defaults to log file directory) */
        logDir?: string;
        /** File pattern to match (defaults to base filename pattern) */
        pattern?: string;
    };
}

/**
 * Console stream that outputs to the CC:Tweaked terminal.
 *
 * This stream writes log messages to the computer's terminal with
 * color coding based on log levels. It preserves the original text
 * color after writing each message.
 */
export class ConsoleStream implements Stream {
    private levelColors: { [key: string]: number } = {
        Trace: colors.lightGray,
        Debug: colors.gray,
        Info: colors.green,
        Warn: colors.orange,
        Error: colors.red,
        Fatal: colors.red,
    };

    /**
     * Write a formatted log message to the terminal.
     *
     * @param message - The formatted log message
     * @param event - The original log event for context (used for level-based coloring)
     */
    public write(message: string, event: LogEvent): void {
        const level: string | undefined =
            LogLevel[event.get("level") as LogLevel];
        const color = level !== undefined ? this.levelColors[level] : undefined;

        if (color !== undefined) {
            const originalColor = term.getTextColor();
            term.setTextColor(color);
            print(message);
            term.setTextColor(originalColor);
        } else {
            print(message);
        }
    }
}

/**
 * File stream that outputs to a file on disk.
 *
 * This stream writes log messages to a specified file, creating the file
 * if it doesn't exist and appending to it if it does. It handles file
 * rotation based on time intervals.
 */
export class FileStream implements Stream {
    private fileHandle: LuaFile | undefined;
    private filePath: string;
    private rotationInterval: number;
    private lastRotationTime: number;
    private autoCleanupConfig?: FileStreamConfig["autoCleanup"];

    /**
     * Create a new file stream with configuration object.
     *
     * @param config - FileStream configuration object
     */
    constructor(config: FileStreamConfig) {
        this.filePath = config.filePath;
        this.rotationInterval = config.rotationInterval || 0;
        this.autoCleanupConfig = config.autoCleanup;
        this.lastRotationTime = os.time();
        this.openFile();
    }

    /**
     * Open the log file for writing.
     * Creates the file if it doesn't exist, appends if it does.
     */
    private openFile(): void {
        const actualPath =
            this.rotationInterval > 0
                ? this.getRotatedFilename()
                : this.filePath;

        const [handle, err] = io.open(actualPath, "a");
        if (handle === undefined) {
            printError(
                `Failed to open log file ${actualPath}: ${err ?? "Unknown error"}`,
            );
            return;
        }
        this.fileHandle = handle;

        // Perform auto-cleanup when opening file
        this.performAutoCleanup();
    }

    /**
     * Generate a filename with timestamp for file rotation.
     */
    private getRotatedFilename(): string {
        const currentTime = os.time();
        const rotationPeriod =
            Math.floor(currentTime / this.rotationInterval) *
            this.rotationInterval;
        const date = os.date("*t", rotationPeriod) as LuaDate;

        const timestamp = `${date.year}-${string.format("%02d", date.month)}-${string.format("%02d", date.day)}_${string.format("%02d", date.hour)}-${string.format("%02d", date.min)}`;

        // Split filename and extension
        const splitStrs = this.filePath.split(".");
        if (splitStrs.length === 1) {
            return `${this.filePath}_${timestamp}.log`;
        }

        const name = splitStrs[0];
        const ext = splitStrs[1];
        return `${name}_${timestamp}.${ext}`;
    }

    /**
     * Check if file rotation is needed and rotate if necessary.
     */
    private checkRotation(): void {
        if (this.rotationInterval <= 0) return;

        const currentTime = os.time();
        const currentPeriod = Math.floor(currentTime / this.rotationInterval);
        const lastPeriod = Math.floor(
            this.lastRotationTime / this.rotationInterval,
        );

        if (currentPeriod > lastPeriod) {
            // Time to rotate
            this.close();
            this.lastRotationTime = currentTime;
            this.openFile();
            // Auto-cleanup is performed in openFile()
        }
    }

    /**
     * Perform auto-cleanup based on configuration.
     * This method is called automatically when opening files or rotating.
     */
    private performAutoCleanup(): void {
        if (!this.autoCleanupConfig || !this.autoCleanupConfig.enabled) {
            return;
        }

        const config = this.autoCleanupConfig;

        // Cleanup by file count if configured
        if (config.maxFiles !== undefined && config.maxFiles > 0) {
            this.cleanupOldLogFiles(
                config.maxFiles,
                config.logDir,
                config.pattern,
            );
        }

        // Cleanup by total size if configured
        if (config.maxSizeBytes !== undefined && config.maxSizeBytes > 0) {
            this.cleanupLogFilesBySize(
                config.maxSizeBytes,
                config.logDir,
                config.pattern,
            );
        }
    }

    /**
     * Enable or update auto-cleanup configuration at runtime.
     *
     * @param config - Auto-cleanup configuration
     */
    public setAutoCleanup(config: FileStreamConfig["autoCleanup"]): void {
        this.autoCleanupConfig = config;
    }

    /**
     * Write a formatted log message to the file.
     *
     * @param message - The formatted log message
     * @param event - The original log event (unused in this implementation)
     */
    public write(message: string, event: LogEvent): void {
        this.checkRotation();

        if (this.fileHandle) {
            this.fileHandle.write(message + "\n");
            this.fileHandle.flush();
        }
    }

    /**
     * Close the file handle and release resources.
     */
    public close(): void {
        if (this.fileHandle) {
            this.fileHandle.close();
            this.fileHandle = undefined;
        }
    }

    /**
     * Search for log files matching the specified pattern in a directory.
     *
     * @param logDir - Directory containing log files (defaults to directory of current log file)
     * @param fileName - Base File Name
     * @returns Array of log file information including path, size, and modification time
     */
    private searchLogFiles(
        logDir?: string,
        fileName?: string,
    ): Array<{ path: string; size: number; modified: number }> {
        const directory = logDir || fs.getDir(this.filePath);
        const baseFileName =
            fileName || fs.getName(this.filePath).split(".")[0];

        if (!fs.exists(directory) || !fs.isDir(directory)) {
            return [];
        }

        const logFiles: Array<{
            path: string;
            size: number;
            modified: number;
        }> = [];
        const files = fs.list(directory);

        for (const file of files) {
            const fullPath = fs.combine(directory, file);
            if (fs.isDir(fullPath) || !file.startsWith(baseFileName)) continue;

            const attributes = fs.attributes(fullPath);
            if (attributes !== undefined) {
                logFiles.push({
                    path: fullPath,
                    size: attributes.size,
                    modified: attributes.modified,
                });
            }
        }

        return logFiles;
    }

    /**
     * Clean up old log files by keeping only the specified number of most recent files.
     *
     * @param maxFiles - Maximum number of log files to keep
     * @param logDir - Directory containing log files (defaults to directory of current log file)
     * @param fileName - Base File Name
     */
    public cleanupOldLogFiles(
        maxFiles: number,
        logDir?: string,
        fileName?: string,
    ): void {
        if (maxFiles <= 0) return;

        const logFiles = this.searchLogFiles(logDir, fileName);
        if (logFiles.length <= maxFiles) return;

        // Sort by modification time (newest first)
        logFiles.sort((a, b) => b.modified - a.modified);

        // Delete files beyond the limit
        for (let i = maxFiles; i < logFiles.length; i++) {
            try {
                fs.delete(logFiles[i].path);
            } catch (err) {
                printError(
                    `Failed to delete old log file ${logFiles[i].path}: ${err}`,
                );
            }
        }
    }

    /**
     * Clean up log files by total size, deleting oldest files until total size is under limit.
     *
     * @param maxSizeBytes - Maximum total size in bytes for all log files
     * @param logDir - Directory containing log files (defaults to directory of current log file)
     * @param fileName - Base File Name
     */
    public cleanupLogFilesBySize(
        maxSizeBytes: number,
        logDir?: string,
        fileName?: string,
    ): void {
        if (maxSizeBytes <= 0) return;

        const logFiles = this.searchLogFiles(logDir, fileName);
        if (logFiles.length === 0) return;

        // Calculate total size
        let totalSize = 0;
        for (const logFile of logFiles) {
            totalSize += logFile.size;
        }

        // If total size is within limit, no cleanup needed
        if (totalSize <= maxSizeBytes) {
            return;
        }

        // Sort by modification time (oldest first for deletion)
        logFiles.sort((a, b) => a.modified - b.modified);

        // Delete oldest files until we're under the size limit
        for (const logFile of logFiles) {
            if (totalSize <= maxSizeBytes) {
                break;
            }

            try {
                fs.delete(logFile.path);
                totalSize -= logFile.size;
            } catch (err) {
                printError(`Failed to delete log file ${logFile.path}: ${err}`);
            }
        }
    }
}

/**
 * Buffer stream that collects log messages in memory.
 *
 * This stream stores log messages in an internal buffer, which can be
 * useful for testing, temporary storage, or implementing custom output
 * logic that processes multiple messages at once.
 */
export class BufferStream implements Stream {
    private buffer: string[] = [];
    private maxSize: number;

    /**
     * Create a new buffer stream.
     *
     * @param maxSize - Maximum number of messages to store (0 = unlimited)
     */
    constructor(maxSize: number = 0) {
        this.maxSize = maxSize;
    }

    /**
     * Write a formatted log message to the buffer.
     *
     * @param message - The formatted log message
     * @param event - The original log event (unused in this implementation)
     */
    public write(message: string, event: LogEvent): void {
        this.buffer.push(message);

        // Trim buffer if it exceeds max size
        if (this.maxSize > 0 && this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }

    /**
     * Get all buffered messages.
     *
     * @returns Array of all buffered log messages
     */
    public getMessages(): string[] {
        return [...this.buffer];
    }

    /**
     * Get and clear all buffered messages.
     *
     * @returns Array of all buffered log messages
     */
    public flush(): string[] {
        const messages = [...this.buffer];
        this.buffer = [];
        return messages;
    }

    /**
     * Clear the buffer without returning messages.
     */
    public clear(): void {
        this.buffer = [];
    }

    /**
     * Get the current number of buffered messages.
     *
     * @returns Number of messages in the buffer
     */
    public size(): number {
        return this.buffer.length;
    }
}

/**
 * Null stream that discards all log messages.
 *
 * This stream can be useful for testing or when you want to temporarily
 * disable logging output without reconfiguring the entire logger.
 */
export class NullStream implements Stream {
    /**
     * Discard the log message (do nothing).
     *
     * @param message - The formatted log message (ignored)
     * @param event - The original log event (ignored)
     */
    public write(message: string, event: LogEvent): void {
        // Intentionally do nothing
    }
}

/**
 * Conditional stream that only writes messages meeting certain criteria.
 *
 * This stream wraps another stream and only forwards messages that
 * match the specified condition.
 */
export class ConditionalStream implements Stream {
    private targetStream: Stream;
    private condition: (message: string, event: LogEvent) => boolean;

    /**
     * Create a new conditional stream.
     *
     * @param targetStream - The stream to write to when condition is met
     * @param condition - Function that returns true to allow writing
     */
    constructor(
        targetStream: Stream,
        condition: (message: string, event: LogEvent) => boolean,
    ) {
        this.targetStream = targetStream;
        this.condition = (message, event) => condition(message, event);
    }

    /**
     * Write a formatted log message if the condition is met.
     *
     * @param message - The formatted log message
     * @param event - The original log event
     */
    public write(message: string, event: LogEvent): void {
        if (this.condition(message, event)) {
            this.targetStream.write(message, event);
        }
    }

    /**
     * Close the target stream.
     */
    public close(): void {
        if (this.targetStream.close) {
            this.targetStream.close();
        }
    }
}

// Time constants for file rotation
export const SECOND = 1;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

// Byte constants for file rotation
export const MB = 1024 * 1024;
export const KB = 1024;
