/**
 * Example CLI application demonstrating the ccCLI framework
 * This example shows how to create a calculator CLI with global context injection
 */

import { Command, createCli, CliError } from "../lib/ccCLI/index";
import { Ok, Result } from "../lib/thirdparty/ts-result-es";

// 1. Define global context type
interface AppContext {
  appName: string;
  log: (message: string) => void;
  debugMode: boolean;
}

// 2. Define individual commands
const addCommand: Command<AppContext> = {
  name: "add",
  description: "Adds two numbers together",
  args: [
    { name: "a", description: "The first number", required: true },
    { name: "b", description: "The second number", required: true },
  ],
  action: ({ args, context }): Result<void, CliError> => {
    context.log(`Executing 'add' command in '${context.appName}'`);

    const a = tonumber(args.a as string);
    const b = tonumber(args.b as string);

    if (a === undefined || b === undefined) {
      print("Error: Arguments must be numbers.");
      return Ok.EMPTY;
    }

    const result = a + b;
    print(`${a} + ${b} = ${result}`);

    if (context.debugMode) {
      context.log(`Calculation result: ${result}`);
    }
    return Ok.EMPTY;
  },
};

const subtractCommand: Command<AppContext> = {
  name: "subtract",
  description: "Subtracts the second number from the first",
  args: [
    { name: "a", description: "The minuend", required: true },
    { name: "b", description: "The subtrahend", required: true },
  ],
  action: ({ args, context }): Result<void, CliError> => {
    context.log(`Executing 'subtract' command in '${context.appName}'`);

    const a = tonumber(args.a as string);
    const b = tonumber(args.b as string);

    if (a === undefined || b === undefined) {
      print("Error: Arguments must be numbers.");
      return Ok.EMPTY;
    }

    const result = a - b;
    print(`${a} - ${b} = ${result}`);
    return Ok.EMPTY;
  },
};

const greetCommand: Command<AppContext> = {
  name: "greet",
  description: "Prints a greeting message",
  options: new Map([
    [
      "name",
      {
        name: "name",
        shortName: "n",
        description: "The name to greet",
        defaultValue: "World",
      },
    ],
    [
      "times",
      {
        name: "times",
        shortName: "t",
        description: "Number of times to repeat",
        defaultValue: 1,
      },
    ],
  ]),
  action: ({ options, context }): Result<void, CliError> => {
    context.log(`Executing 'greet' command in '${context.appName}'`);

    const name = options.name as string;
    const times = tonumber(options.times as string) ?? 1;

    for (let i = 1; i <= times; i++) {
      print(`Hello, ${name}!`);

      if (context.debugMode && times > 1) {
        context.log(`Greeting ${i}/${times}`);
      }
    }
    return Ok.EMPTY;
  },
};

// Math subcommands group
const mathCommand: Command<AppContext> = {
  name: "math",
  description: "Mathematical operations",
  subcommands: new Map([
    ["add", addCommand],
    ["subtract", subtractCommand],
  ]),
};

// Config command with nested subcommands
const configShowCommand: Command<AppContext> = {
  name: "show",
  description: "Show current configuration",
  action: ({ context }): Result<void, CliError> => {
    print(`App Name: ${context.appName}`);
    print(`Debug Mode: ${context.debugMode ? "on" : "off"}`);
    return Ok.EMPTY;
  },
};

const configSetCommand: Command<AppContext> = {
  name: "set",
  description: "Set a configuration item",
  args: [
    { name: "key", description: "The configuration key", required: true },
    { name: "value", description: "The configuration value", required: true },
  ],
  action: ({ args, context }): Result<void, CliError> => {
    const key = args.key as string;
    const value = args.value as string;

    context.log(`Setting config: ${key} = ${value}`);
    print(`Config '${key}' has been set to '${value}'`);
    return Ok.EMPTY;
  },
};

const configCommand: Command<AppContext> = {
  name: "config",
  description: "Configuration management commands",
  subcommands: new Map([
    ["show", configShowCommand],
    ["set", configSetCommand],
  ]),
};

// 3. Define root command
const rootCommand: Command<AppContext> = {
  name: "calculator",
  description: "A feature-rich calculator program",
  options: new Map([
    [
      "debug",
      {
        name: "debug",
        shortName: "d",
        description: "Enable debug mode",
        defaultValue: false,
      },
    ],
  ]),
  subcommands: new Map([
    ["math", mathCommand],
    ["greet", greetCommand],
    ["config", configCommand],
  ]),
  action: ({ options, context }): Result<void, CliError> => {
    // Update debug mode from command line option
    const debugFromOption = options.debug as boolean;
    if (debugFromOption) {
      context.debugMode = true;
      context.log("Debug mode enabled");
    }

    print(`Welcome to ${context.appName}!`);
    print("Use --help to see available commands");
    return Ok.EMPTY;
  },
};

// 4. Create global context instance
const appContext: AppContext = {
  appName: "MyAwesomeCalculator",
  debugMode: false,
  log: (message) => {
    print(`[LOG] ${message}`);
  },
};

// 5. Create and export CLI handler
const cli = createCli(rootCommand, { globalContext: appContext });
const args = [...$vararg];
cli(args);

// Example usage (uncomment to test):
/*
// Simple math operations
cli(['math', 'add', '5', '7']);          // Output: 12
cli(['math', 'subtract', '10', '3']);    // Output: 7

// Greet with options
cli(['greet', '--name', 'TypeScript']);  // Output: Hello, TypeScript!
cli(['greet', '-n', 'World', '-t', '3']); // Output: Hello, World! (3 times)

// Config management
cli(['config', 'show']);                 // Shows current config
cli(['config', 'set', 'theme', 'dark']); // Sets config

// Help examples
cli(['--help']);                         // Shows root help
cli(['math', '--help']);                 // Shows math command help
cli(['config', 'set', '--help']);       // Shows config set help

// Debug mode
cli(['--debug', 'math', 'add', '1', '2']); // Enables debug logging
*/
