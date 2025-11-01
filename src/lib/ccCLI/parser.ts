import { Ok, Err, Result } from "../thirdparty/ts-result-es";
import {
  ParseResult,
  MissingArgumentError,
  MissingOptionError,
  Command,
  Option,
  CliError,
  CommandResolution,
} from "./types";

// Cache class to handle option maps with proper typing
class OptionMapCache {
  private cache = new WeakMap<
    object,
    {
      optionMap: Map<string, Option>;
      shortNameMap: Map<string, string>;
    }
  >();

  get<TContext extends object>(command: Command<TContext>) {
    return this.cache.get(command);
  }

  set<TContext extends object>(
    command: Command<TContext>,
    value: {
      optionMap: Map<string, Option>;
      shortNameMap: Map<string, string>;
    },
  ) {
    this.cache.set(command, value);
  }
}

// Lazy option map builder with global caching
function getOptionMaps<TContext extends object>(
  optionCache: OptionMapCache,
  command: Command<TContext>,
) {
  // Quick check: if command has no options, return empty maps
  if (!command.options || command.options.size === 0) {
    return {
      optionMap: new Map<string, Option>(),
      shortNameMap: new Map<string, string>(),
    };
  }

  let cached = optionCache.get(command);
  if (cached !== undefined) {
    return cached;
  }

  const optionMap = new Map<string, Option>();
  const shortNameMap = new Map<string, string>();

  for (const [optionName, option] of command.options) {
    optionMap.set(optionName, option);
    if (option.shortName !== undefined && option.shortName !== null) {
      shortNameMap.set(option.shortName, optionName);
    }
  }

  cached = { optionMap, shortNameMap };
  optionCache.set(command, cached);
  return cached;
}

/**
 * Parses command line arguments with integrated command resolution.
 * This function dynamically finds the target command during parsing and uses
 * the command's option definitions for intelligent option handling.
 * @param argv Array of command line arguments.
 * @param rootCommand The root command to start parsing from.
 * @returns A `Result` containing the `ParseResult` or a `CliError`.
 */
export function parseArguments<TContext extends object>(
  argv: string[],
  rootCommand: Command<TContext>,
): Result<ParseResult<TContext>, CliError> {
  const result: ParseResult<TContext> = {
    command: rootCommand,
    commandPath: [rootCommand.name],
    options: {},
    remaining: [],
  };

  let currentCommand = rootCommand;
  let inOptions = false;
  const optionMapCache = new OptionMapCache();

  // Cache option maps for current command - only updated when command changes
  let currentOptionMaps = getOptionMaps(optionMapCache, currentCommand);

  // Helper function to update command context and refresh option maps
  const updateCommand = (
    newCommand: Command<TContext>,
    commandName: string,
  ) => {
    currentCommand = newCommand;
    result.command = currentCommand;
    result.commandPath.push(commandName);
    currentOptionMaps = getOptionMaps(optionMapCache, currentCommand);
  };

  // Helper function to process option value
  const processOption = (optionName: string, i: number): number => {
    const optionDef = currentOptionMaps.optionMap.get(optionName);
    const nextArg = argv[i + 1];
    const isKnownBooleanOption =
      optionDef !== undefined && optionDef.defaultValue === undefined;
    const nextArgLooksLikeValue =
      nextArg !== undefined && nextArg !== null && !nextArg.startsWith("-");

    if (nextArgLooksLikeValue && !isKnownBooleanOption) {
      result.options[optionName] = nextArg;
      return i + 1; // Skip the value argument
    } else {
      result.options[optionName] = true;
      return i;
    }
  };

  // Single pass through argv
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // Skip null/undefined arguments
    if (!arg) continue;

    // Handle double dash (--) - everything after is treated as remaining
    if (arg === "--") {
      result.remaining.push(...argv.slice(i + 1));
      break;
    }

    // Handle long options (--option or --option=value)
    if (arg.startsWith("--")) {
      inOptions = true;
      const equalsIndex = arg.indexOf("=");

      if (equalsIndex !== -1) {
        // --option=value format
        const optionName = arg.slice(2, equalsIndex);
        const optionValue = arg.slice(equalsIndex + 1);
        result.options[optionName] = optionValue;
      } else {
        // --option [value] format
        const optionName = arg.slice(2);
        i = processOption(optionName, i);
      }
    }
    // Handle short options (-o or -o value)
    else if (arg.startsWith("-") && arg.length > 1) {
      inOptions = true;
      const shortName = arg.slice(1);
      const optionName =
        currentOptionMaps.shortNameMap.get(shortName) ?? shortName;
      i = processOption(optionName, i);
    }
    // Handle positional arguments and command resolution
    else {
      if (!inOptions) {
        // Try to find this as a subcommand of the current command
        const subcommand = currentCommand.subcommands?.get(arg);
        if (subcommand) {
          updateCommand(subcommand, arg);
        } else {
          // Not a subcommand, treat as remaining argument
          result.remaining.push(arg);
        }
      } else {
        // After options have started, treat as remaining argument
        result.remaining.push(arg);
      }
    }
  }

  return new Ok(result);
}

/**
 * Finds the target command based on a given path.
 * @param rootCommand The command to start searching from.
 * @param commandPath An array of strings representing the path to the command.
 * @returns A `Result` containing the `CommandResolution` or an `UnknownCommandError`.
 */
export function findCommand<TContext extends object>(
  rootCommand: Command<TContext>,
  commandPath: string[],
): Result<CommandResolution<TContext>, CliError> {
  let currentCommand = rootCommand;
  const resolvedPath: string[] = [];
  let i = 0;

  for (const name of commandPath) {
    const subcommand = currentCommand.subcommands?.get(name);
    if (!subcommand) {
      // Part of the path was not a valid command, so the rest are arguments.
      return new Err({ kind: "UnknownCommand", commandName: name });
    }
    currentCommand = subcommand;
    resolvedPath.push(name);
    i++;
  }

  const remainingArgs = commandPath.slice(i);
  return new Ok({
    command: currentCommand,
    commandPath: resolvedPath,
    remainingArgs,
  });
}

/**
 * Validates that all required arguments are present in the parsed arguments.
 * @param parsedArgs A record of the arguments that were parsed.
 * @param requiredArgs An array of names of required arguments.
 * @returns An `Ok` result if validation passes, otherwise an `Err` with a `MissingArgumentError`.
 */
export function validateRequiredArgs(
  parsedArgs: Record<string, unknown>,
  requiredArgs: string[],
): Result<void, MissingArgumentError> {
  for (const argName of requiredArgs) {
    if (!(argName in parsedArgs) || parsedArgs[argName] === undefined) {
      return new Err({ kind: "MissingArgument", argName });
    }
  }
  return Ok.EMPTY;
}

/**
 * Validates that all required options are present in the parsed options.
 * @param parsedOptions A record of the options that were parsed.
 * @param requiredOptions An array of names of required options.
 * @returns An `Ok` result if validation passes, otherwise an `Err` with a `MissingOptionError`.
 */
export function validateRequiredOptions(
  parsedOptions: Record<string, unknown>,
  requiredOptions: string[],
): Result<void, MissingOptionError> {
  for (const optionName of requiredOptions) {
    if (
      !(optionName in parsedOptions) ||
      parsedOptions[optionName] === undefined
    ) {
      return new Err({ kind: "MissingOption", optionName });
    }
  }
  return Ok.EMPTY;
}

/**
 * Normalizes option names by mapping short names to their corresponding long names.
 * @param options The raw parsed options record (may contain short names).
 * @param optionMapping A map from short option names to long option names.
 * @returns A new options record with all short names replaced by long names.
 */
export function normalizeOptions(
  options: Record<string, unknown>,
  optionMapping: Record<string, string>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(options)) {
    const normalizedKey = optionMapping[key] ?? key;
    normalized[normalizedKey] = value;
  }

  return normalized;
}
