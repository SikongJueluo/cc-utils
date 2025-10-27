import { Result } from "../thirdparty/ts-result-es";

// --- Error Types ---

/**
 * Represents an error when an unknown command is used.
 * @property commandName - The name of the command that was not found.
 */
export interface UnknownCommandError {
  kind: "UnknownCommand";
  commandName: string;
}

/**
 * Represents an error when a required argument is missing.
 * @property argName - The name of the missing argument.
 */
export interface MissingArgumentError {
  kind: "MissingArgument";
  argName: string;
}

/**
 * Represents an error when a required option is missing.
 * @property optionName - The name of the missing option.
 */
export interface MissingOptionError {
  kind: "MissingOption";
  optionName: string;
}

/**
 * Represents an error when a command that requires an action has none.
 * @property commandPath - The path to the command without an action.
 */
export interface NoActionError {
  kind: "NoAction";
  commandPath: string[];
}

/**
 * A union of all possible CLI-related errors.
 * This allows for exhaustive error handling using pattern matching on the `kind` property.
 */
export type CliError =
  | UnknownCommandError
  | MissingArgumentError
  | MissingOptionError
  | NoActionError;

// --- Core CLI Structures ---

/**
 * @interface Argument
 * @description Defines a command-line argument for a command.
 */
export interface Argument {
  /** The name of the argument, used to access its value. */
  name: string;
  /** A brief description of what the argument does, shown in help messages. */
  description: string;
  /** Whether the argument is required. Defaults to false. */
  required?: boolean;
}

/**
 * @interface Option
 * @description Defines a command-line option (also known as a flag).
 */
export interface Option {
  /** The long name of the option (e.g., "verbose" for `--verbose`). */
  name: string;
  /** An optional short name for the option (e.g., "v" for `-v`). */
  shortName?: string;
  /** A brief description of what the option does, shown in help messages. */
  description: string;
  /** Whether the option is required. Defaults to false. */
  required?: boolean;
  /** The default value for the option if it's not provided. */
  defaultValue?: unknown;
}

/**
 * @interface ActionContext
 * @description The context object passed to a command's action handler.
 * @template TContext - The type of the global context object.
 */
export interface ActionContext<TContext extends object> {
  /** A record of parsed argument values, keyed by argument name. */
  args: Record<string, unknown>;
  /** A record of parsed option values, keyed by option name. */
  options: Record<string, unknown>;
  /** The global context object, shared across all commands. */
  context: TContext;
}

/**
 * @interface Command
 * @description Defines a CLI command, which can have its own arguments, options, and subcommands.
 * @template TContext - The type of the global context object.
 */
export interface Command<TContext extends object> {
  /** The name of the command. */
  name: string;
  /** A brief description of the command, shown in help messages. */
  description: string;
  /** A map of argument definitions for the command, keyed by argument name. */
  args?: Argument[];
  /** A map of option definitions for the command, keyed by option name. */
  options?: Map<string, Option>;
  /**
   * The function to execute when the command is run.
   * It receives an `ActionContext` object.
   * Should return a `Result` to indicate success or failure.
   */
  action?: (context: ActionContext<TContext>) => Result<void, CliError>;
  /** A map of subcommands, allowing for nested command structures, keyed by command name. */
  subcommands?: Map<string, Command<TContext>>;
}

// --- Parsing and Execution Internals ---

/**
 * @interface ParseResult
 * @description Enhanced parsing result that includes command resolution.
 */
export interface ParseResult<TContext extends object> {
  /** The resolved command found during parsing. */
  command: Command<TContext>;
  /** The path to the resolved command. */
  commandPath: string[];
  /** A record of parsed option values. */
  options: Record<string, unknown>;
  /** Any remaining arguments that were not parsed as part of the command path or options. */
  remaining: string[];
}

/**
 * @type CommandResolution
 * @description The result of resolving a command path to a specific command.
 */
export interface CommandResolution<TContext extends object> {
  command: Command<TContext>;
  commandPath: string[];
  remainingArgs: string[];
}
