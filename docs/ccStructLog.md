# ccStructLog

A modern, structured logging library for CC:Tweaked, inspired by Python's structlog. This library provides a flexible, extensible logging framework based on processors, renderers, and streams.

## Features

- **Structured Logging**: Log events are represented as key-value pairs, not just strings.
- **Extensible**: Easy to customize with processors, renderers, and streams.
- **Type Safe**: Full TypeScript support with proper type definitions.
- **CC:Tweaked Optimized**: Designed specifically for Minecraft's ComputerCraft environment, with features like file rotation and colored console output.

## Quick Start

```typescript
import { createDevLogger } from "@/lib/ccStructLog";

// Create a development logger
const logger = createDevLogger();

// Log messages with context
logger.info("Server started", { port: 8080, version: "1.0.0" });
logger.warn("Low disk space", { available: 1024, threshold: 2048 });
logger.error("Connection failed", { host: "example.com", retries: 3 });
```

## Core Concepts

### Log Levels

```typescript
export enum LogLevel {
    Trace = 0,  // Very detailed diagnostic information
    Debug = 1,  // Diagnostic information for development
    Info = 2,   // General informational messages
    Warn = 3,   // Potentially harmful situations
    Error = 4,  // Error events that might allow continued execution
    Fatal = 5,  // Very severe errors that might cause termination
}
```

### Data Flow

1. **Capture**: User calls `logger.info("message", {key: "value"})`.
2. **Package**: A `LogEvent` object (`Map<string, unknown>`) is created with the message, context, and metadata.
3. **Process**: The event is passed through a chain of processors (e.g., to add a timestamp, filter by level).
4. **Render**: The final event is converted to a string by a renderer (e.g., `textRenderer`, `jsonRenderer`).
5. **Output**: The string is sent to one or more streams (e.g., console, file).

## Pre-configured Loggers

### Development Logger
Optimized for development and debugging with human-readable console output.

```typescript
import { createDevLogger, LogLevel } from "@/lib/ccStructLog";

const logger = createDevLogger({
    source: "MyApp",
    includeComputerId: true,
});

logger.debug("This is a debug message.");
```

### Production Logger
Optimized for production with JSON-formatted file output and daily rotation.

```typescript
import { createProdLogger, DAY } from "@/lib/ccStructLog";

const logger = createProdLogger("app.log", {
    source: "MyApp",
    rotationInterval: DAY, // Rotate daily
    includeConsole: false, // Don't log to console
});

logger.info("Application is running in production.");
```

## Custom Configuration

You can create a logger with a completely custom setup.

```typescript
import {
    Logger,
    LogLevel,
    addFullTimestamp,
    addComputerId,
    addSource,
    jsonRenderer,
    FileStream,
    ConsoleStream,
    HOUR,
} from "@/lib/ccStructLog";

const logger = new Logger({
    processors: [
        addFullTimestamp(),
        addComputerId(),
        addSource("MyApplication"),
    ],
    renderer: jsonRenderer,
    streams: [
        new ConsoleStream(),
        new FileStream("custom.log", HOUR), // Rotate every hour
    ],
});

logger.info("Custom logger reporting for duty.", { user: "admin" });
```

## Processors

Processors are functions that modify, enrich, or filter log events before they are rendered.

### Built-in Processors
```typescript
import {
    addTimestamp,         // Add structured timestamp
    addFormattedTimestamp,  // Add HH:MM:SS string
    addFullTimestamp,     // Add YYYY-MM-DD HH:MM:SS string
    filterByLevel,        // Filter by minimum level
    filterBy,             // Filter based on a custom predicate
    addSource,            // Add source/logger name
    addComputerId,        // Add computer ID
    addComputerLabel,     // Add computer label
    addStaticFields,      // Add static fields to all events
    transformField,       // Transform a specific field's value
    removeFields,         // Remove sensitive fields
} from "@/lib/ccStructLog";

// Usage example
const logger = new Logger({
    processors: [
        addTimestamp(),
        addSource("MyApp"),
        filterByLevel(LogLevel.Warn), // Only allow Warn, Error, Fatal
        removeFields(["password", "token"]),
    ],
    // ... other config
});
```

### Custom Processors
A custom processor is a function that takes a `LogEvent` and returns a `LogEvent` or `undefined` (to drop the event).

```typescript
import { LogEvent } from "@/lib/ccStructLog";

// Add a unique request ID to all log events
const addRequestId = (event: LogEvent): LogEvent => {
    event.set("requestId", `req_${Math.random().toString(36).substr(2, 9)}`);
    return event;
};

// Sanitize sensitive information
const sanitizePasswords = (event: LogEvent): LogEvent => {
    if (event.has("password")) {
        event.set("password", "[REDACTED]");
    }
    return event;
};
```

## Renderers

Renderers convert the final `LogEvent` object into a string.

### Built-in Renderers
```typescript
import { textRenderer, jsonRenderer } from "@/lib/ccStructLog";

// textRenderer: Human-readable, colored output for the console.
// Example: 15:30:45 [INFO] Message key=value

// jsonRenderer: Machine-readable JSON output.
// Example: {"level":"info","message":"Message","key":"value","timestamp":"..."}
```

## Streams

Streams handle the final output destination. You can use multiple streams to send logs to different places.

### Built-in Streams
```typescript
import {
    ConsoleStream,      // Output to CC:Tweaked terminal with colors
    FileStream,         // Output to file with rotation support
    BufferStream,       // Store in an in-memory buffer
    NullStream,         // Discard all output
} from "@/lib/ccStructLog";
import { ConditionalStream } from "@/lib/ccStructLog/streams"; // Note direct import

// File stream with daily rotation
const fileStream = new FileStream("app.log", DAY);

// Buffer stream (useful for testing or UI display)
const bufferStream = new BufferStream(100); // Keep last 100 messages

// Conditional stream (only send errors to a separate file)
const errorStream = new ConditionalStream(
    new FileStream("errors.log"),
    (message, event) => (event.get("level") as LogLevel) >= LogLevel.Error
);
```

## File Rotation

`FileStream` supports automatic file rotation based on time intervals.

```typescript
import { FileStream, HOUR, DAY, WEEK } from "@/lib/ccStructLog";

// Rotate every hour
const hourlyLog = new FileStream("app_hourly.log", HOUR);

// Rotate daily (recommended for most applications)
const dailyLog = new FileStream("app_daily.log", DAY);

// Rotate weekly
const weeklyLog = new FileStream("app_weekly.log", WEEK);

// No rotation
const permanentLog = new FileStream("permanent.log", 0);
```

## Best Practices

1. **Use Structured Context**: Always provide relevant context as key-value pairs.
   ```typescript
   // Good
   logger.info("User action completed", { userId: 123, action: "purchase" });
   
   // Less useful
   logger.info("User 123 purchased an item");
   ```

2. **Choose Appropriate Levels**:
   - `debug`: For developers to diagnose issues.
   - `info`: Normal application behavior.
   - `warn`: Potentially harmful situations that don't break functionality.
   - `error`: Errors that affect a single operation but not the whole app.
   - `fatal`: Critical errors that require the application to shut down.

3. **Use a `source`**: Identify which component generated the log.
   ```typescript
   const logger = createDevLogger({ source: "UserService" });
   ```

4. **Sanitize Sensitive Data**: Use a processor to remove passwords, API keys, etc.
   ```typescript
   const secureLogger = new Logger({
       processors: [ removeFields(["password", "token"]) ],
       //...
   });
   ```

5. **Proper Cleanup**: Close loggers during application shutdown to ensure file streams are saved.
   ```typescript
   // At application shutdown
   logger.close();
   ```

## Examples

See `src/logExample/main.ts` for comprehensive usage examples including:
- Basic logging patterns
- Custom processor chains
- Multiple output streams with different formats
- Error handling strategies

## API Reference

For complete API documentation, refer to the TypeScript definitions in each module:
- `src/lib/ccStructLog/types.ts` - Core interfaces and types
- `src/lib/ccStructLog/Logger.ts` - Main Logger class
- `src/lib/ccStructLog/processors.ts` - Built-in processors
- `src/lib/ccStructLog/renderers.ts` - Built-in renderers
- `src/lib/ccStructLog/streams.ts` - Built-in streams
- `src/lib/ccStructLog/index.ts` - Convenience functions and exports
