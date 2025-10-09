/** @noResolution */

/**
 * Represents a date-time value in TOML.
 * The object can have various combinations of year, month, day, hour, min, sec, and zone properties.
 */
interface TomlDate {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  min?: number;
  sec?: number;
  zone?: number; // timezone offset
}

/**
 * Options for TOML parsing
 */
interface ParseOptions {
  /** Whether to follow the TOML spec strictly (default: true) */
  strict?: boolean;
}

/** The current supported TOML version */
export const version: string;

/** Whether the parser should follow the TOML spec strictly */
export const strict: boolean;

/**
 * Creates a date object with proper validation and string representation
 * @param tab Date components to validate and create a date object from
 * @returns Validated date object or nil with error message
 */
export function datefy(tab: TomlDate): TomlDate | [undefined, string];

/**
 * Checks if a table is a date object
 * @param tab The table to check
 * @returns True if the table is a date object, false otherwise
 */
export function isdate(tab: unknown): boolean;

/**
 * Creates a multi-step parser for streaming TOML data
 * @param options Parsing options
 * @returns A coroutine-based parser function that can be called with data chunks
 * and then called without arguments to get the result
 */
export function multistep_parser(options?: ParseOptions): {
  (data: string): void; // Provide data chunk
  (): [any, string] | any; // Get final result (call without arguments)
};

/**
 * Parses TOML data into a Lua table
 * @param data The TOML string to parse
 * @param options Parsing options
 * @returns The parsed data as a Lua table, or [null, error_message] on failure
 */
export function parse(
  data: string,
  options?: ParseOptions,
): [undefined, string] | any;

/**
 * Parse TOML and return values in toml-test intermediate format
 * Useful for debugging or when you need explicit type information
 * @param data The TOML string to parse
 * @param options Parsing options
 * @returns The parsed data in toml-test format, or [null, error_message] on failure
 */
export function parseToTestFormat(
  data: string,
  options?: ParseOptions,
): [undefined, string] | any;

/**
 * Encodes a Lua table to TOML format
 * @param tbl The Lua table to encode
 * @returns The TOML string representation of the table
 */
export function encode(tbl: any): string;
