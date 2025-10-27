/**
 * CC:Tweaked CLI Framework
 *
 * A functional-style CLI framework for CC:Tweaked and TSTL.
 * This framework provides a declarative way to define command-line interfaces with support
 * for nested commands, arguments, options, and Result-based error handling.
 */

// --- Core public API ---
export { createCli } from "./cli";

// --- Type definitions for creating commands ---
export type {
  Command,
  Argument,
  Option,
  ActionContext,
  CliError,
  UnknownCommandError,
  MissingArgumentError,
  MissingOptionError,
  NoActionError,
} from "./types";

// --- Utility functions for help generation and advanced parsing ---
export { generateHelp, generateCommandList, shouldShowHelp } from "./help";
export {
  parseArguments,
  validateRequiredArgs,
  validateRequiredOptions,
  normalizeOptions,
} from "./parser";
