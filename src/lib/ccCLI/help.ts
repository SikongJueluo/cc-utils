import { Command } from "./types";

/**
 * Generates a well-formatted help string for a given command.
 * @param command The command to generate help for.
 * @param commandPath The path to the command, used for showing the full command name.
 * @returns A formatted string containing the complete help message.
 */
export function generateHelp<TContext extends object>(
  command: Command<TContext>,
  commandPath: string[] = [],
): string {
  const lines: string[] = [];
  const fullCommandName = [...commandPath, command.name].join(" ");

  // Description
  if (command.description !== undefined) {
    lines.push(command.description);
  }

  // Usage
  const usageParts: string[] = ["Usage:", fullCommandName];
  if (command.options && command.options.size > 0) {
    usageParts.push("[OPTIONS]");
  }
  if (command.subcommands && command.subcommands.size > 0) {
    usageParts.push("<COMMAND>");
  }
  if (command.args && command.args.length > 0) {
    for (const arg of command.args) {
      usageParts.push(
        arg.required === true ? `<${arg.name}>` : `[${arg.name}]`,
      );
    }
  }
  lines.push("\n" + usageParts.join(" "));

  // Arguments
  if (command.args && command.args.length > 0) {
    lines.push("\nArguments:");
    for (const arg of command.args) {
      const requiredText = arg.required === true ? " (required)" : "";
      lines.push(`  ${arg.name.padEnd(20)} ${arg.description}${requiredText}`);
    }
  }

  // Options
  if (command.options && command.options.size > 0) {
    lines.push("\nOptions:");
    for (const option of command.options.values()) {
      const short =
        option.shortName !== undefined ? `-${option.shortName}, ` : "    ";
      const long = `--${option.name}`;
      const display = `${short}${long}`.padEnd(20);
      const requiredText = option.required === true ? " (required)" : "";
      const defaultText =
        option.defaultValue !== undefined
          ? ` (default: ${textutils.serialise(option.defaultValue!)})`
          : "";
      lines.push(
        `  ${display} ${option.description}${requiredText}${defaultText}`,
      );
    }
  }

  // Subcommands
  if (command.subcommands && command.subcommands.size > 0) {
    lines.push("\nCommands:");
    for (const subcommand of command.subcommands.values()) {
      lines.push(`  ${subcommand.name.padEnd(20)} ${subcommand.description}`);
    }
    lines.push(
      `\nRun '${fullCommandName} <COMMAND> --help' for more information on a command.`,
    );
  }

  return lines.join("\n");
}

/**
 * Generates a simple list of available commands, typically for error messages.
 * @param commands An array of command objects.
 * @returns A formatted string listing the available commands.
 */
export function generateCommandList<TContext extends object>(
  commands: Map<string, Command<TContext>>,
): string {
  if (commands.size === 0) {
    return "No commands available.";
  }

  const lines: string[] = ["Available commands:"];
  for (const command of commands.values()) {
    lines.push(`  ${command.name.padEnd(20)} ${command.description}`);
  }

  return lines.join("\n");
}

/**
 * Checks if the `--help` or `-h` flag is present in the arguments.
 * @param argv An array of command-line arguments.
 * @returns `true` if a help flag is found, otherwise `false`.
 */
export function shouldShowHelp(argv: string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}
