/**
 * Example usage of the ccStructLog library.
 *
 * This file demonstrates various ways to use the restructured logging system,
 * including basic usage, custom configurations, and advanced scenarios.
 */

import {
    Logger,
    createDevLogger,
    createProdLogger,

    // Processors
    addTimestamp,
    addFormattedTimestamp,
    addFullTimestamp,
    addSource,
    addComputerId,
    addStaticFields,
    transformField,

    // Renderers
    textRenderer,
    jsonRenderer,

    // Streams
    ConsoleStream,
    FileStream,
    BufferStream,
    DAY,
    HOUR,
    LogLevel,
} from "../lib/ccStructLog";
import { ConditionalStream } from "@/lib/ccStructLog/streams";

// =============================================================================
// Basic Usage Examples
// =============================================================================

print("=== Basic Usage Examples ===");

// 1. Quick start with pre-configured loggers
const devLog = createDevLogger();
devLog.info("Application started", { version: "1.0.0", port: 8080 });
devLog.debug("Debug information", { userId: 123, action: "login" });
devLog.error("Something went wrong", {
    error: "Connection failed",
    retries: 3,
});

// 2. Production logging to file
const prodLog = createProdLogger("app.log", {
    source: "MyApplication",
    rotationInterval: DAY,
    includeConsole: true,
});

prodLog.info("User action", { userId: 456, action: "purchase", amount: 29.99 });
prodLog.warn("Low disk space", { available: 1024, threshold: 2048 });

// =============================================================================
// Custom Logger Configurations
// =============================================================================

print("\n=== Custom Logger Configurations ===");

// 4. Custom logger with specific processors and renderer
const customLogger = new Logger({
    processors: [
        addFullTimestamp(),
        addComputerId(),
        addSource("CustomApp"),
        addStaticFields({
            environment: "development",
            version: "2.1.0",
        }),
    ],
    renderer: jsonRenderer,
    streams: [new ConsoleStream(), new FileStream("custom.log", HOUR)],
});

customLogger.info("Custom logger example", {
    feature: "user_management",
    operation: "create_user",
});

// =============================================================================
// Advanced Processor Examples
// =============================================================================

print("\n=== Advanced Processor Examples ===");

// 6. Custom processors
const addRequestId = (event: Map<string, unknown>) => {
    event.set("requestId", `req_${Math.random().toString(36).substr(2, 9)}`);
    return event;
};

const sanitizePasswords = (event: Map<string, unknown>) => {
    // Remove sensitive information
    if (event.has("password")) {
        event.set("password", "[REDACTED]");
    }
    if (event.has("token")) {
        event.set("token", "[REDACTED]");
    }
    return event;
};

const secureLogger = new Logger({
    processors: [
        addTimestamp(),
        addRequestId,
        sanitizePasswords,
        transformField("message", (msg) => `[SECURE] ${msg}`),
    ],
    renderer: jsonRenderer,
    streams: [new ConsoleStream()],
});

secureLogger.info("User login attempt", {
    username: "john_doe",
    password: "secret123",
    token: "abc123def456",
});

// =============================================================================
// Stream Examples
// =============================================================================

print("\n=== Stream Examples ===");

// 11. Buffer stream for batch processing
const bufferStream = new BufferStream(100); // Keep last 100 messages
const bufferLogger = new Logger({
    processors: [addFormattedTimestamp()],
    renderer: textRenderer,
    streams: [
        new ConditionalStream(new ConsoleStream(), (msg, event) => {
            if (event.get("level") === LogLevel.Info) {
                return false;
            } else {
                return true;
            }
        }),
        bufferStream,
    ],
});

// Log several messages
for (let i = 0; i < 5; i++) {
    bufferLogger.info(`Buffered info message ${i}`, { iteration: i });
    bufferLogger.warn(`Buffered warn message ${i}`, { iteration: i });
}

// Get all buffered messages
const bufferedMessages = bufferStream.getMessages();
print(`Buffered ${bufferedMessages.length} messages:`);
for (const msg of bufferedMessages) {
    print(`  ${msg}`);
}

// 12. Multi-stream with different formats
const multiFormatLogger = new Logger({
    processors: [addFullTimestamp(), addComputerId()],
    renderer: (event) => "default", // This won't be used
    streams: [
        // Console with human-readable format
        {
            write: (_, event) => {
                const formatted = textRenderer(event);
                new ConsoleStream().write(formatted, event);
            },
        },
        // File with JSON format
        {
            write: (_, event) => {
                const formatted = jsonRenderer(event);
                new FileStream("structured.log").write(formatted, event);
            },
        },
    ],
});

multiFormatLogger.info("Multi-format message", {
    feature: "logging",
    test: true,
});

// =============================================================================
// Error Handling and Edge Cases
// =============================================================================

print("\n=== Error Handling Examples ===");

// 13. Robust error handling
const robustLogger = new Logger({
    processors: [
        addTimestamp(),
        // Processor that might fail
        (event) => {
            try {
                // Simulate potential failure
                if (Math.random() > 0.8) {
                    throw new Error("Processor failed");
                }
                event.set("processed", true);
                return event;
            } catch (error) {
                // Log processor errors but don't break the chain
                printError(`Processor error: ${String(error)}`);
                event.set("processor_error", true);
                return event;
            }
        },
    ],
    renderer: textRenderer,
    streams: [new ConsoleStream()],
});

// Log multiple messages to see error handling in action
for (let i = 0; i < 10; i++) {
    robustLogger.info(`Message ${i}`, { attempt: i });
}

// =============================================================================
// Cleanup Examples
// =============================================================================

print("\n=== Cleanup Examples ===");

// 14. Proper cleanup
const fileLogger = new Logger({
    processors: [addTimestamp()],
    renderer: jsonRenderer,
    streams: [new FileStream("temp.log")],
});

fileLogger.info("Temporary log entry");

// Clean shutdown - close all streams
fileLogger.close();

print("\n=== Examples Complete ===");
print("Check the generated log files:");
print("- app.log (daily rotation)");
print("- custom.log (hourly rotation)");
print("- all.log (complete log)");
print("- debug.log (detailed debug info)");
print("- structured.log (JSON format)");
print("- temp.log (temporary file, now closed)");

// =============================================================================
// Performance Comparison (commented out to avoid noise)
// =============================================================================

/*
print("\n=== Performance Comparison ===");

const iterations = 1000;

// Test simple console logging
const startTime1 = os.clock();
const simpleLogger = createMinimalLogger();
for (let i = 0; i < iterations; i++) {
    simpleLogger.info(`Simple message ${i}`);
}
const endTime1 = os.clock();
print(`Simple Console Logger: ${endTime1 - startTime1} seconds`);

// Test complex processor chain
const startTime2 = os.clock();
const complexLogger = createDetailedLogger("perf_test.log", {
    source: "PerfTest"
});
for (let i = 0; i < iterations; i++) {
    complexLogger.info(`Complex message ${i}`, {
        iteration: i,
        data: { nested: { value: i * 2 } }
    });
}
complexLogger.close();
const endTime2 = os.clock();
print(`Complex Processor Chain: ${endTime2 - startTime2} seconds`);
*/
