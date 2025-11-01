import { Ok, Err, Result } from "../thirdparty/ts-result-es";
import {
  Command,
  ActionContext,
  Argument,
  Option,
  CliError,
  ParseResult,
} from "./types";
import {
  parseArguments,
  validateRequiredArgs,
  validateRequiredOptions,
  normalizeOptions,
} from "./parser";
import { generateHelp, shouldShowHelp, generateCommandList } from "./help";

/**
 * @interface CreateCliOptions
 * @description Optional configuration for the CLI handler.
 */
export interface CreateCliOptions<TContext extends object> {
  /** An optional global context object to be made available in all command actions. */
  globalContext?: TContext;
  /** An optional function to handle output.
   *  Default: textutils.pagedPrint(msg, term.getCursorPos()[1] - 2)
   **/
  writer?: (message: string) => void;
}

/**
 * Creates a CLI handler function from a root command definition.
 * @param rootCommand The root command for the entire CLI application.
 * @param globalContext An optional global context object to be made available in all command actions.
 * @returns A function that takes command-line arguments and executes the appropriate command.
 */
export function createCli<TContext extends object>(
  rootCommand: Command<TContext>,
  options: CreateCliOptions<TContext> = {},
): (argv: string[]) => void {
  const {
    globalContext,
    writer = (msg) => textutils.pagedPrint(msg, term.getCursorPos()[1] - 2),
  } = options;

  return (argv: string[]): void => {
    // Check for top-level help flags before any parsing.
    if (argv[0]?.startsWith("--help") || argv[0]?.startsWith("-h")) {
      writer(generateHelp(rootCommand, [rootCommand.name]));
      return;
    }

    const parseResult = parseArguments(argv, rootCommand);

    if (parseResult.isErr()) {
      const error = parseResult.error;
      writer(formatError(error, rootCommand));

      // If it was an unknown command, suggest alternatives.
      if (error.kind === "UnknownCommand") {
        // Find parent command to suggest alternatives
        const parentResult = parseArguments(argv.slice(0, -1), rootCommand);
        if (parentResult.isOk() && parentResult.value.command.subcommands) {
          writer(generateCommandList(parentResult.value.command.subcommands));
        }
      }
      return;
    }

    const executionResult = processAndExecute(
      parseResult.value,
      globalContext,
      (msg: string) => writer(msg),
    );

    if (executionResult.isErr()) {
      const error = executionResult.error;
      writer(formatError(error, rootCommand));
    }
  };
}

/**
 * Processes the parsed input and executes the resolved command.
 * @param parseResult The result from parsing with integrated command resolution.
 * @param globalContext The global context for the CLI.
 * @param writer Function to output messages.
 * @returns A `Result` indicating the success or failure of the execution.
 */
function processAndExecute<TContext extends object>(
  parseResult: ParseResult<TContext>,
  globalContext: TContext | undefined,
  writer: (message: string) => void,
): Result<void, CliError> {
  const { command, commandPath, options, remaining } = parseResult;

  // Unified Help Check:
  // A command should show its help page if:
  // 1. A help flag is explicitly passed (`--help` or `-h`). This has the highest priority.
  // 2. It's a command group that was called without a subcommand (i.e., it has no action).
  const isHelpFlagPassed = shouldShowHelp([
    ...remaining,
    ...Object.keys(options),
  ]);
  const isCommandGroupWithoutAction =
    command.subcommands !== undefined &&
    command.subcommands.size > 0 &&
    command.action === undefined;

  if (isHelpFlagPassed || isCommandGroupWithoutAction) {
    writer(generateHelp(command, commandPath));
    return Ok.EMPTY;
  }

  // If we are here, it's a runnable command. It must have an action.
  if (command.action === undefined) {
    // This case should ideally not be reached if the parser and the logic above are correct.
    // It would mean a command has no action and no subcommands, which is a configuration error.
    return new Err({
      kind: "NoAction",
      commandPath: [...commandPath, command.name],
    });
  }

  // Now we know it's a runnable command, and no help flag was passed.
  // We can now safely process the remaining items as arguments.
  return processArguments(command.args ?? [], remaining)
    .andThen((args) => {
      return processOptions(
        command.options !== undefined
          ? Array.from(command.options.values())
          : [],
        options,
      ).map((processedOptions) => ({ args, options: processedOptions }));
    })
    .andThen(({ args, options: processedOptions }) => {
      const context: ActionContext<TContext> = {
        args,
        options: processedOptions,
        context: globalContext!,
      };
      // Finally, execute the command's action.
      return command.action!(context);
    });
}

/**
 * Processes and validates command arguments from the raw input.
 * @param argDefs The argument definitions for the command.
 * @param remainingArgs The remaining positional arguments.
 * @returns A `Result` with the processed arguments record or a `MissingArgumentError`.
 */
function processArguments(
  argDefs: Argument[],
  remainingArgs: string[],
): Result<Record<string, unknown>, CliError> {
  const args: Record<string, unknown> = {};

  for (let i = 0; i < argDefs.length; i++) {
    const argDef = argDefs[i];
    if (i < remainingArgs.length) {
      args[argDef.name] = remainingArgs[i];
    }
  }

  const requiredArgs = argDefs
    .filter((arg) => arg.required ?? false)
    .map((arg) => arg.name);
  return validateRequiredArgs(args, requiredArgs).map(() => args);
}

/**
 * Processes and validates command options from the raw input.
 * @param optionDefs The option definitions for the command.
 * @param rawOptions The raw options parsed from the command line.
 * @returns A `Result` with the processed options record or a `MissingOptionError`.
 */
function processOptions(
  optionDefs: Option[],
  rawOptions: Record<string, unknown>,
): Result<Record<string, unknown>, CliError> {
  const shortToLongMap: Record<string, string> = {};
  const defaultValues: Record<string, unknown> = {};

  for (const optionDef of optionDefs) {
    if (optionDef.shortName !== undefined) {
      shortToLongMap[optionDef.shortName] = optionDef.name;
    }
    if (optionDef.defaultValue !== undefined) {
      defaultValues[optionDef.name] = optionDef.defaultValue;
    }
  }

  const normalizedOptions = normalizeOptions(rawOptions, shortToLongMap);
  const options = { ...defaultValues, ...normalizedOptions };

  const requiredOptions = optionDefs
    .filter((opt) => opt.required ?? false)
    .map((opt) => opt.name);
  return validateRequiredOptions(options, requiredOptions).map(() => options);
}

/**
 * Formats a `CliError` into a user-friendly string.
 * @param error The `CliError` object.
 * @param rootCommand The root command, used for context in some errors.
 * @returns A formatted error message string.
 */
function formatError<TContext extends object>(
  error: CliError,
  _rootCommand: Command<TContext>,
): string {
  switch (error.kind) {
    case "UnknownCommand":
      return `Error: Unknown command "${error.commandName}".`;
    case "MissingArgument":
      return `Error: Missing required argument "${error.argName}".`;
    case "MissingOption":
      return `Error: Missing required option "--${error.optionName}".`;
    case "NoAction":
      return `Error: Command "${error.commandPath.join(" ")}" is not runnable.`;
    default:
      // This should be unreachable if all error kinds are handled.
      return "An unexpected error occurred.";
  }
}
