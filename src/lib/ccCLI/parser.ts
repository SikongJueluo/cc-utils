import { Ok, Err, Result } from "../thirdparty/ts-result-es";
import { ParsedInput, MissingArgumentError, MissingOptionError } from "./types";

/**
 * Parses command line arguments into a structured format.
 * This function does not validate arguments or options, it only parses the raw input.
 * @param argv Array of command line arguments (e.g., from `os.pullEvent`).
 * @returns A `ParsedInput` object containing the command path, options, and remaining args.
 */
export function parseArguments(argv: string[]): ParsedInput {
  const result: ParsedInput = {
    commandPath: [],
    options: {},
    remaining: [],
  };

  let i = 0;
  let inOptions = false;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === undefined) {
      i++;
      continue;
    }

    // Handle double dash (--) - everything after is treated as a remaining argument.
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
        if (
          i + 1 < argv.length &&
          argv[i + 1] !== undefined &&
          !argv[i + 1].startsWith("-")
        ) {
          result.options[optionName] = argv[i + 1];
          i++; // Skip the value argument
        } else {
          // Boolean flag
          result.options[optionName] = true;
        }
      }
    }
    // Handle short options (-o or -o value)
    else if (arg.startsWith("-") && arg.length > 1) {
      inOptions = true;
      const optionName = arg.slice(1);

      if (
        i + 1 < argv.length &&
        argv[i + 1] !== undefined &&
        !argv[i + 1].startsWith("-")
      ) {
        result.options[optionName] = argv[i + 1];
        i++; // Skip the value argument
      } else {
        // Boolean flag
        result.options[optionName] = true;
      }
    }
    // Handle positional arguments and commands
    else {
      if (!inOptions) {
        // Before any options, treat as part of the command path
        result.commandPath.push(arg);
      } else {
        // After options have started, treat as a remaining argument
        result.remaining.push(arg);
      }
    }

    i++;
  }

  return result;
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
