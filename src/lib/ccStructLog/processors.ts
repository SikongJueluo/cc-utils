/**
 * Standard processors for the ccStructLog library.
 *
 * Processors are functions that can modify, enrich, or filter log events
 * as they flow through the logging pipeline. Each processor receives a
 * LogEvent and can return a modified LogEvent or undefined to drop the log.
 */

import { LogEvent, Processor, LogLevel } from "./types";

export namespace processor {
    /**
     * Configuration options for the timestamp processor.
     */
    interface TimestampConfig {
        /**
         * The format string takes the same formats as C's strftime function.
         */
        format?: string;
    }

    /**
     * Adds a timestamp to each log event.
     *
     * This processor adds a "time" field to each log event with the current
     * timestamp. The timestamp format can be customized using the `format`
     * option.
     *
     * @param config - Configuration options for the timestamp processor.
     * @returns A processor function that adds a timestamp to each log event.
     */
    export function addTimestamp(config: TimestampConfig = {}): Processor {
        return (event) => {
            let time: string;
            if (config.format === undefined) {
                time = os.date("%F %T") as string;
            } else {
                time = os.date(config.format) as string;
            }

            event.set("timestamp", time);
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

            if (eventLevel < minLevel) {
                return undefined; // Drop the log event
            }

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
    export function filterBy(
        predicate: (event: LogEvent) => boolean,
    ): Processor {
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
    export function addStaticFields(
        fields: Record<string, unknown>,
    ): Processor {
        return (event) => {
            for (const [key, value] of Object.entries(fields)) {
                event.set(key, value);
            }
            return event;
        };
    }
}
