/**
 * Standard processors for the ccStructLog library.
 *
 * Processors are functions that can modify, enrich, or filter log events
 * as they flow through the logging pipeline. Each processor receives a
 * LogEvent and can return a modified LogEvent or undefined to drop the log.
 */

import { LogEvent, Processor, LogLevel } from "./types";

/**
 * Adds a timestamp to the log event.
 *
 * This processor adds the current time as a structured timestamp object
 * using CC:Tweaked's os.date() function. The timestamp includes year,
 * month, day, hour, minute, and second components.
 *
 * Performance note: os.date() is relatively expensive, so this should
 * typically be placed early in the processor chain and used only once.
 *
 * @param event - The log event to process
 * @returns The event with timestamp added
 */
export function addTimestamp(): Processor {
    return (event) => {
        const timestamp = os.date("!*t") as LuaDate;
        event.set("timestamp", timestamp);
        return event;
    };
}

/**
 * Adds a human-readable timestamp string to the log event.
 *
 * This processor adds a formatted timestamp string that's easier to read
 * in log output. The format is "HH:MM:SS" in UTC time.
 *
 * @param event - The log event to process
 * @returns The event with formatted timestamp added
 */
export function addFormattedTimestamp(): Processor {
    return (event) => {
        const timestamp = os.date("!*t") as LuaDate;
        const timeStr = `${string.format("%02d", timestamp.hour)}:${string.format("%02d", timestamp.min)}:${string.format("%02d", timestamp.sec)}`;
        event.set("time", timeStr);
        return event;
    };
}

/**
 * Adds a full ISO-like timestamp string to the log event.
 *
 * This processor adds a complete timestamp in YYYY-MM-DD HH:MM:SS format
 * which is useful for file logging and structured output.
 *
 * @param event - The log event to process
 * @returns The event with full timestamp added
 */
export function addFullTimestamp(): Processor {
    return (event) => {
        const timestamp = os.date("!*t") as LuaDate;
        const fullTimeStr = `${timestamp.year}-${string.format("%02d", timestamp.month)}-${string.format("%02d", timestamp.day)} ${string.format("%02d", timestamp.hour)}:${string.format("%02d", timestamp.min)}:${string.format("%02d", timestamp.sec)}`;
        event.set("datetime", fullTimeStr);
        return event;
    };
}

/**
 * Filters log events by minimum level.
 *
 * This processor drops log events that are below the specified minimum level.
 * Note: The Logger class already does early filtering for performance, but
 * this processor can be useful for dynamic filtering or when you need
 * different levels for different streams.
 *
 * @param minLevel - The minimum log level to allow through
 * @returns A processor function that filters by level
 */
export function filterByLevel(minLevel: LogLevel): Processor {
    return (event) => {
        const eventLevel = event.get("level") as LogLevel | undefined;
        if (eventLevel === undefined) {
            return event; // Pass through if no level is set
        }

        if (eventLevel !== undefined && eventLevel < minLevel) {
            return undefined; // Drop the log event
        }

        return event;
    };
}

/**
 * Adds a logger name/source to the log event.
 *
 * This processor is useful when you have multiple loggers in your application
 * and want to identify which component generated each log entry.
 *
 * @param name - The name/source to add to log events
 * @returns A processor function that adds the source name
 */
export function addSource(name: string): Processor {
    return (event) => {
        event.set("source", name);
        return event;
    };
}

/**
 * Adds the current computer ID to the log event.
 *
 * In CC:Tweaked environments, this can help identify which computer
 * generated the log when logs are aggregated from multiple sources.
 *
 * @param event - The log event to process
 * @returns The event with computer ID added
 */
export function addComputerId(): Processor {
    return (event) => {
        event.set("computer_id", os.getComputerID());
        return event;
    };
}

/**
 * Adds the current computer label to the log event.
 *
 * If the computer has a label set, this adds it to the log event.
 * This can be more human-readable than the computer ID.
 *
 * @param event - The log event to process
 * @returns The event with computer label added (if available)
 */
export function addComputerLabel(): Processor {
    return (event) => {
        const label = os.getComputerLabel();
        if (label !== undefined && label !== null) {
            event.set("computer_label", label);
        }
        return event;
    };
}

/**
 * Filters out events that match a specific condition.
 *
 * This is a generic processor that allows you to filter events based on
 * any custom condition. The predicate function should return true to keep
 * the event and false to drop it.
 *
 * @param predicate - Function that returns true to keep the event
 * @returns A processor function that filters based on the predicate
 */
export function filterBy(predicate: (event: LogEvent) => boolean): Processor {
    return (event) => {
        return predicate(event) ? event : undefined;
    };
}

/**
 * Transforms a specific field in the log event.
 *
 * This processor allows you to modify the value of a specific field
 * using a transformation function.
 *
 * @param fieldName - The name of the field to transform
 * @param transformer - Function to transform the field value
 * @returns A processor function that transforms the specified field
 */
export function transformField(
    fieldName: string,
    transformer: (value: unknown) => unknown,
): Processor {
    return (event) => {
        if (event.has(fieldName)) {
            const currentValue = event.get(fieldName);
            const newValue = transformer(currentValue);
            event.set(fieldName, newValue);
        }
        return event;
    };
}

/**
 * Removes specified fields from the log event.
 *
 * This processor can be used to strip sensitive or unnecessary information
 * from log events before they are rendered and output.
 *
 * @param fieldNames - Array of field names to remove
 * @returns A processor function that removes the specified fields
 */
export function removeFields(fieldNames: string[]): Processor {
    return (event) => {
        for (const fieldName of fieldNames) {
            event.delete(fieldName);
        }
        return event;
    };
}

/**
 * Adds static fields to every log event.
 *
 * This processor adds the same set of fields to every log event that
 * passes through it. Useful for adding application name, version,
 * environment, etc.
 *
 * @param fields - Object containing the static fields to add
 * @returns A processor function that adds the static fields
 */
export function addStaticFields(fields: Record<string, unknown>): Processor {
    return (event) => {
        for (const [key, value] of Object.entries(fields)) {
            event.set(key, value);
        }
        return event;
    };
}
