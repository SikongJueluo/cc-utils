/** @noResolution */

/**
 * Represents a JSON null value that is distinct from Lua's nil.
 */
interface JsonNull {
  readonly __json_null: unique symbol;
}

/**
 * State object for JSON encoding options
 */
interface EncodeState {
  /** When set, the output will contain newlines and indentations */
  indent?: boolean;
  /** Specifies ordering of keys in encoded output */
  keyorder?: string[];
  /** Initial indentation level when indent is set (2 spaces per level, default is 0) */
  level?: number;
  /** Array to store result strings for concatenation at once */
  buffer?: string[];
  /** Index of last element in buffer (when set) */
  bufferlen?: number;
  /** Used to detect reference cycles (temporary, created when absent) */
  tables?: unknown[];
  /** Called when encoder cannot encode a value */
  exception?: (
    reason: string,
    value: unknown,
    state: EncodeState,
    defaultmessage: string,
  ) => unknown;
}

/**
 * Options for JSON decoding with custom metatables
 */
interface DecodeOptions {
  objectmeta?: unknown;
  arraymeta?: unknown;
}

/**
 * The dkjson module version string
 */
export const version: string;

/**
 * Special value representing JSON null (distinct from Lua's nil)
 */
export const jsonNull: JsonNull;

/**
 * Encode a Lua value to a JSON string.
 * @param object The value to encode (can be a table, string, number, boolean, nil, json.null or any object with a __tojson function in its metatable)
 * @param state Optional table with configuration options for encoding
 * @returns A string containing the JSON representation, or true if state.buffer is set and encoding was successful
 */
export function encode(
  object: object | string | number | boolean | undefined,
  state?: EncodeState,
): string | boolean;

/**
 * Decode a JSON string starting at a given position.
 * @param str The JSON string to decode
 * @param pos Starting position (default is 1)
 * @param nullval Value to return for null values (default is nil, can be set to json.null)
 * @param objectmeta Custom metatable for decoded objects (optional)
 * @param arraymeta Custom metatable for decoded arrays (optional)
 * @returns The decoded object (or the custom null value) and position of next character not part of the object, or undefined, position, and error message in case of errors
 */
export function decode(
  str: string,
  pos?: number,
  nullval?: unknown,
  objectmeta?: unknown,
  arraymeta?: unknown,
): LuaMultiReturn<[object | undefined, number | undefined, string | undefined]>;
/**
 * Quote a UTF-8 string and escape critical characters using JSON escape sequences.
 * Only necessary when building custom __tojson functions.
 * @param str The string to quote and escape
 * @returns The quoted and escaped string
 */
export function quotestring(str: string): string;

/**
 * When state.indent is set, adds a newline to state.buffer and spaces according to state.level.
 * @param state The encoding state containing indent and level information
 */
export function addnewline(state: EncodeState): void;

/**
 * Function that can be used as the exception option in encode. Instead of raising an error,
 * this function encodes the error message as a string for debugging malformed input.
 * @param reason The reason for the exception
 * @param value The value that caused the exception
 * @param state The encoding state
 * @param defaultmessage The default error message
 * @returns The encoded error message
 */
export function encodeexception(
  reason: string,
  value: unknown,
  state: EncodeState,
  defaultmessage: string,
): string;

/**
 * Require the LPeg module and return a copy of the module table where the decode function
 * is replaced by a version that uses LPeg for better performance.
 * @returns A copy of the module with LPeg-optimized decode function
 */
export function use_lpeg(): {
  version: string;
  null: JsonNull;
  encode: typeof encode;
  decode: typeof decode;
  quotestring: typeof quotestring;
  addnewline: typeof addnewline;
  encodeexception: typeof encodeexception;
  use_lpeg: typeof use_lpeg;
  using_lpeg: boolean;
};

/**
 * Variable set to true in the module table copy that uses LPeg support.
 */
export const using_lpeg: boolean;
