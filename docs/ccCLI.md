# ccCLI Framework Documentation

## Introduction

`ccCLI` is a lightweight, functional-style framework for building command-line interfaces (CLIs) within the CC:Tweaked environment using TSTL (TypeScriptToLua). It provides a declarative and type-safe way to define commands, arguments, and options, with built-in support for nested commands, automatic help generation, and robust error handling.

Its design is inspired by modern CLI libraries and emphasizes simplicity and ease of use, allowing developers to quickly structure complex command-based applications.

## Features

*   **Declarative API:** Define commands as simple objects.
*   **Type-Safe:** Leverage TypeScript for defining commands, arguments, options, and context.
*   **Nested Commands:** Easily create command groups and subcommands (e.g., `git remote add`).
*   **Automatic Help Generation:** Generates `--help` messages for the root command and all subcommands.
*   **Flexible Argument & Option Parsing:** Supports long names (`--verbose`), short names (`-v`), value assignment (`--file=path.txt`), and boolean flags.
*   **Global Context Injection:** Share state, services, or configuration across all commands.
*   **Result-Based Error Handling:** Command actions return a `Result` type, ensuring that errors are handled explicitly.
*   **No Dependencies:** Written in pure TypeScript with no external runtime dependencies.

## Core Concepts

The framework is built around a few key interfaces:

*   `Command<TContext>`: The central piece. It defines a command's name, description, arguments, options, subcommands, and the action to perform.
*   `Argument`: Defines a positional argument for a command. It can be marked as required.
*   `Option`: Defines a named option (flag). It can have a long name, a short name, a default value, and be marked as required.
*   `ActionContext<TContext>`: The object passed to every command's `action` function. It contains the parsed `args`, `options`, and the shared `context` object.

## Tutorial: Creating a Simple Calculator CLI

Let's build a simple calculator to see how `ccCLI` works.

### 1. Define the Global Context (Optional)

The global context is a powerful feature for sharing data or services. Let's define a context for our app.

```typescript
// src/cliExample/main.ts

interface AppContext {
  appName: string;
  log: (message: string) => void;
  debugMode: boolean;
}
```

### 2. Define Commands

Commands are just JavaScript objects. The logic goes into the `action` function.

```typescript
// src/cliExample/main.ts

import { Command, CliError } from "../lib/ccCLI/index";
import { Ok, Result } from "../lib/thirdparty/ts-result-es";

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
    return Ok.EMPTY;
  },
};
```

### 3. Create Nested Commands

You can group commands under a parent command using the `subcommands` property.

```typescript
// src/cliExample/main.ts

// (addCommand is defined above, subtractCommand would be similar)

const mathCommand: Command<AppContext> = {
  name: "math",
  description: "Mathematical operations",
  subcommands: new Map([
    ["add", addCommand],
    ["subtract", subtractCommand], // Assuming subtractCommand is defined
  ]),
};
```
If a command with subcommands is called without an action, it will automatically display its help page.

### 4. Define the Root Command

The root command is the entry point for your entire application. It contains all top-level commands and global options.

```typescript
// src/cliExample/main.ts

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
    // other commands...
  ]),
  action: ({ context }) => {
    print(`Welcome to ${context.appName}!`);
    print("Use --help to see available commands");
    return Ok.EMPTY;
  },
};
```

### 5. Create and Run the CLI

Finally, create the context instance and pass it along with the root command to `createCli`. This returns a handler function that you can call with the program's arguments.

```typescript
// src/cliExample/main.ts

import { createCli } from "../lib/ccCLI/index";

// Create global context instance
const appContext: AppContext = {
  appName: "MyAwesome Calculator",
  debugMode: false,
  log: (message) => {
    if (appContext.debugMode) {
      print(`[LOG] ${message}`);
    }
  },
};

// Create the CLI handler
const cli = createCli(rootCommand, { globalContext: appContext });

// Get arguments and run
const args = [...$vararg];
cli(args);
```

### Usage

You can now run your CLI from the ComputerCraft terminal:

```sh
> lua program.lua math add 5 7
12

> lua program.lua --debug math add 5 7
[LOG] Executing 'add' command in 'MyAwesome Calculator'
12

> lua program.lua math --help
# Displays help for the 'math' command
```

## Advanced Topics

### Arguments

Arguments are positional values passed after a command. They are defined in an array.

```typescript
args: [
  { name: "a", description: "The first number", required: true },
  { name: "b", description: "The second number" }, // optional
],
```

### Options

Options are named values (flags) that can appear anywhere. They are defined in a `Map`.

```typescript
options: new Map([
  [
    "name", // The key in the map must match the option's name
    {
      name: "name",
      shortName: "n",
      description: "The name to greet",
      defaultValue: "World",
    },
  ],
  [
    "force",
    {
      name: "force",
      description: "Force the operation",
      defaultValue: false, // For boolean flags
    },
  ],
]),
```

They can be used like this:
*   `--name "John"` or `-n "John"`
*   `--name="John"`
*   `--force` (sets the value to `true`)

### Error Handling

The `action` function must return a `Result<void, CliError>`.
*   Return `Ok.EMPTY` on success.
*   The framework automatically handles parsing errors like missing arguments or unknown commands. You can return your own errors from within an action if needed, though this is less common. The primary mechanism is simply printing an error message and returning `Ok.EMPTY`.

## API Reference

The public API is exposed through `src/lib/ccCLI/index.ts`.

### Core Function

*   `createCli<TContext>(rootCommand, options)`: Creates the main CLI handler function.
    *   `rootCommand`: The top-level command of your application.
    *   `options.globalContext`: The context object to be injected into all actions.
    *   `options.writer`: An optional function to handle output (defaults to `textutils.pagedPrint`).

### Core Types

*   `Command<TContext>`
*   `Argument`
*   `Option`
*   `ActionContext<TContext>`
*   `CliError`

This documentation provides a comprehensive overview of the `ccCLI` framework. By following the tutorial and referencing the examples, you can build powerful and well-structured command-line tools for CC:Tweaked.
