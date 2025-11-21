/**
 * Standard renderers for the ccStructLog library.
 *
 * Renderers are functions that convert processed LogEvent objects into
 * their final string representation. Different renderers can produce
 * different output formats (JSON, console-friendly, etc.).
 */

import { LogLevel, Renderer } from "./types";

/**
 * Renders log events as JSON strings.
 *
 * This renderer converts the LogEvent Map into a plain object and then
 * serializes it as JSON. This format is ideal for structured logging
 * and machine processing.
 *
 * Note: This assumes textutils.serialiseJSON is available (CC:Tweaked).
 * Falls back to a simple key=value format if JSON serialization fails.
 *
 * @param event - The log event to render
 * @returns JSON string representation of the event
 */
export const jsonRenderer: Renderer = (event) => {
    try {
        // Convert Map to plain object for JSON serialization
        const obj: Record<string, unknown> = {};
        for (const [key, value] of event.entries()) {
            obj[key] = value;
        }

        // Use CC:Tweaked's JSON serialization if available
        return textutils.serialiseJSON(obj);
    } catch (error) {
        return String(error);
    }
};

/**
 * Renders log events in a human-readable Text format.
 *
 * This renderer creates output suitable for terminal display, with
 * timestamp, level, message, and additional context fields formatted
 * in a readable way.
 *
 * Format: [YYYY-MM-DD HH:MM:SS] [LEVEL] message  key=value, key2=value2
 *
 * @param event - The log event to render
 * @returns Human-readable string representation
 */
export const textRenderer: Renderer = (event) => {
    // Extract core components
    const timeStr = event.get("timestamp") as string | undefined;
    const level: string | undefined = LogLevel[event.get("level") as LogLevel];
    const message = (event.get("message") as string) ?? "";

    // Start building the output
    let output = `[${timeStr}] [${level}] ${message} \t`;

    // Add context fields (excluding the core fields we already used)
    const contextFields: string[] = [];
    for (const [key, value] of event.entries()) {
        if (key !== "timestamp" && key !== "level" && key !== "message") {
            contextFields.push(`${key}=${tostring(value)}`);
        }
    }

    if (contextFields.length > 0) {
        output += contextFields.join(", ");
    }

    return output;
};
