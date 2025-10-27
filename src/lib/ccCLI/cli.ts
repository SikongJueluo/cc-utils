import { Ok, Err, Result } from "../thirdparty/ts-result-es";
import {
  Command,
  ActionContext,
  Argument,
  Option,
  CliError,
  ParsedInput,
  CommandResolution,
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
  /** An optional function to handle output. Defaults to the global `print` function. */
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
  const { globalContext, writer = print } = options;

  return (argv: string[]): void => {
    // Check for top-level help flags before any parsing.
    if (shouldShowHelp(argv)) {
      writer(generateHelp(rootCommand));
      return;
    }

    const parsedInput = parseArguments(argv);
    const executionResult = findCommand(
      rootCommand,
      parsedInput.commandPath,
    ).andThen((resolution) =>
      processAndExecute(resolution, parsedInput, globalContext, (msg: string) =>
        writer(msg),
      ),
    );

    if (executionResult.isErr()) {
      const error = executionResult.error;
      writer(formatError(error, rootCommand));

      // If it was an unknown command, suggest alternatives.
      if (error.kind === "UnknownCommand") {
        const parent = findCommand(
          rootCommand,
          parsedInput.commandPath.slice(0, -1),
        );
        if (parent.isOk() && parent.value.command.subcommands) {
          writer(generateCommandList(parent.value.command.subcommands));
        }
      }
    }
  };
}

/**
 * Processes the parsed input and executes the resolved command.
 * @param resolution The resolved command and its context.
 * @param parsedInput The raw parsed command-line input.
 * @param globalContext The global context for the CLI.
 * @returns A `Result` indicating the success or failure of the execution.
 */
function processAndExecute<TContext extends object>(
  resolution: CommandResolution<TContext>,
  parsedInput: ParsedInput,
  globalContext: TContext | undefined,
  writer: (message: string) => void,
): Result<void, CliError> {
  const { command, commandPath, remainingArgs } = resolution;

  // Handle requests for help on a specific command.
  if (shouldShowHelp([...remainingArgs, ...Object.keys(parsedInput.options)])) {
    writer(generateHelp(command, commandPath));
    return Ok.EMPTY;
  }

  // If a command has subcommands but no action, show its help page.
  if (
    command.subcommands &&
    command.subcommands.length > 0 &&
    command.action === undefined
  ) {
    writer(generateHelp(command, commandPath));
    return Ok.EMPTY;
  }

  // A command that is meant to be executed must have an action.
  if (command.action === undefined) {
    return new Err({
      kind: "NoAction",
      commandPath: [...commandPath, command.name],
    });
  }

  return processArguments(
    command.args ?? [],
    remainingArgs,
    parsedInput.remaining,
  )
    .andThen((args) => {
      return processOptions(command.options ?? [], parsedInput.options).map(
        (options) => ({ args, options }),
      );
    })
    .andThen(({ args, options }) => {
      const context: ActionContext<TContext> = {
        args,
        options,
        context: globalContext!,
      };
      // Finally, execute the command's action.
      return command.action!(context);
    });
}

/**
 * Finds the target command based on a given path.
 * @param rootCommand The command to start searching from.
 * @param commandPath An array of strings representing the path to the command.
 * @returns A `Result` containing the `CommandResolution` or an `UnknownCommandError`.
 */
function findCommand<TContext extends object>(
  rootCommand: Command<TContext>,
  commandPath: string[],
): Result<CommandResolution<TContext>, CliError> {
  let currentCommand = rootCommand;
  const resolvedPath: string[] = [];
  let i = 0;

  for (const name of commandPath) {
    const subcommand = currentCommand.subcommands?.find(
      (cmd) => cmd.name === name,
    );
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
 * Processes and validates command arguments from the raw input.
 * @param argDefs The argument definitions for the command.
 * @param remainingArgs The positional arguments captured during command resolution.
 * @param additionalArgs Any extra arguments parsed after options.
 * @returns A `Result` with the processed arguments record or a `MissingArgumentError`.
 */
function processArguments(
  argDefs: Argument[],
  remainingArgs: string[],
  additionalArgs: string[],
): Result<Record<string, unknown>, CliError> {
  const args: Record<string, unknown> = {};
  const allArgs = [...remainingArgs, ...additionalArgs];

  for (let i = 0; i < argDefs.length; i++) {
    const argDef = argDefs[i];
    if (i < allArgs.length) {
      args[argDef.name] = allArgs[i];
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
