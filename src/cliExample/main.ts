/**
 * Example CLI application demonstrating the ccCLI framework
 * This example shows how to create a calculator CLI with global context injection
 * and ChatManager integration for Minecraft chat functionality
 */

import { Command, createCli, CliError } from "../lib/ccCLI/index";
import { Ok, Result } from "../lib/thirdparty/ts-result-es";
import { ChatManager, ChatMessage, ChatToast } from "../lib/ChatManager";

// 1. Define global context type
interface AppContext {
  appName: string;
  log: (message: string) => void;
  debugMode: boolean;
  chatManager?: ChatManager;
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

// ChatManager commands
const chatSendCommand: Command<AppContext> = {
  name: "send",
  description: "Send a chat message",
  args: [
    { name: "message", description: "The message to send", required: true },
  ],
  options: new Map([
    [
      "player",
      {
        name: "player",
        shortName: "p",
        description: "Target player for private message",
        defaultValue: undefined,
      },
    ],
    [
      "prefix",
      {
        name: "prefix",
        description: "Message prefix",
        defaultValue: "CC",
      },
    ],
  ]),
  action: ({ args, options, context }): Result<void, CliError> => {
    if (!context.chatManager) {
      print(
        "Error: ChatManager not initialized. No chatbox peripherals found.",
      );
      return Ok.EMPTY;
    }

    const message: ChatMessage = {
      message: args.message as string,
      targetPlayer: options.player as string | undefined,
      prefix: options.prefix as string,
    };

    const result = context.chatManager.sendMessage(message);
    if (result.isOk()) {
      print(`Message queued: "${String(args.message)}"`);

      const targetPlayer = options.player;
      if (
        targetPlayer !== undefined &&
        targetPlayer !== null &&
        typeof targetPlayer === "string"
      ) {
        print(`Target: ${targetPlayer}`);
      } else {
        print("Target: Global chat");
      }
    } else {
      print(`Failed to queue message: ${result.error.reason}`);
    }

    return Ok.EMPTY;
  },
};

const chatToastCommand: Command<AppContext> = {
  name: "toast",
  description: "Send a toast notification to a player",
  args: [
    { name: "player", description: "Target player username", required: true },
    { name: "title", description: "Toast title", required: true },
    { name: "message", description: "Toast message", required: true },
  ],
  options: new Map([
    [
      "prefix",
      {
        name: "prefix",
        description: "Message prefix",
        defaultValue: "CC",
      },
    ],
  ]),
  action: ({ args, options, context }): Result<void, CliError> => {
    if (!context.chatManager) {
      print(
        "Error: ChatManager not initialized. No chatbox peripherals found.",
      );
      return Ok.EMPTY;
    }

    const toast: ChatToast = {
      username: args.player as string,
      title: args.title as string,
      message: args.message as string,
      prefix: options.prefix as string,
    };

    const result = context.chatManager.sendToast(toast);
    if (result.isOk()) {
      print(
        `Toast queued for ${String(args.player)}: "${String(args.title)}" - "${String(args.message)}"`,
      );
    } else {
      print(`Failed to queue toast: ${result.error.reason}`);
    }

    return Ok.EMPTY;
  },
};

const chatStatusCommand: Command<AppContext> = {
  name: "status",
  description: "Show ChatManager status and queue information",
  action: ({ context }): Result<void, CliError> => {
    if (!context.chatManager) {
      print("ChatManager: Not initialized (no chatbox peripherals found)");
      return Ok.EMPTY;
    }

    print("=== ChatManager Status ===");
    print(`Pending messages: ${context.chatManager.getPendingMessageCount()}`);
    print(`Pending toasts: ${context.chatManager.getPendingToastCount()}`);
    print(
      `Buffered received: ${context.chatManager.getBufferedMessageCount()}`,
    );

    const chatboxStatus = context.chatManager.getChatboxStatus();
    print(`Chatboxes: ${chatboxStatus.length} total`);

    for (let i = 0; i < chatboxStatus.length; i++) {
      const status = chatboxStatus[i] ? "idle" : "busy";
      print(`  Chatbox ${i + 1}: ${status}`);
    }

    return Ok.EMPTY;
  },
};

const chatReceiveCommand: Command<AppContext> = {
  name: "receive",
  description: "Check for received chat messages",
  options: new Map([
    [
      "count",
      {
        name: "count",
        shortName: "c",
        description: "Number of messages to retrieve",
        defaultValue: 1,
      },
    ],
  ]),
  action: ({ options, context }): Result<void, CliError> => {
    if (!context.chatManager) {
      print(
        "Error: ChatManager not initialized. No chatbox peripherals found.",
      );
      return Ok.EMPTY;
    }

    const count = tonumber(options.count as string) ?? 1;
    let retrieved = 0;

    print("=== Received Messages ===");
    for (let i = 0; i < count; i++) {
      const result = context.chatManager.getReceivedMessage();
      if (result.isOk()) {
        const event = result.value;
        print(`[${event.username}]: ${event.message}`);
        if (event.uuid !== undefined) {
          print(`  UUID: ${event.uuid}`);
        }
        retrieved++;
      } else {
        // Buffer is empty
        break;
      }
    }

    if (retrieved === 0) {
      print("No messages in buffer");
    } else {
      print(`Retrieved ${retrieved} message(s)`);
    }

    return Ok.EMPTY;
  },
};

const chatSendImmediateCommand: Command<AppContext> = {
  name: "send-immediate",
  description: "Send a chat message immediately (bypass queue)",
  args: [
    { name: "message", description: "The message to send", required: true },
  ],
  options: new Map([
    [
      "player",
      {
        name: "player",
        shortName: "p",
        description: "Target player for private message",
        defaultValue: undefined,
      },
    ],
    [
      "prefix",
      {
        name: "prefix",
        description: "Message prefix",
        defaultValue: "CC",
      },
    ],
  ]),
  action: ({ args, options, context }): Result<void, CliError> => {
    if (!context.chatManager) {
      print(
        "Error: ChatManager not initialized. No chatbox peripherals found.",
      );
      return Ok.EMPTY;
    }

    const message: ChatMessage = {
      message: args.message as string,
      targetPlayer: options.player as string | undefined,
      prefix: options.prefix as string,
    };

    const result = context.chatManager.sendMessageImmediate(message);
    if (result.isOk()) {
      print(`Message sent immediately: "${String(args.message)}"`);
    } else {
      print(`Failed to send message: ${result.error.reason}`);
      if (result.error.kind === "NoIdleChatbox") {
        print("All chatboxes are currently busy. Try queuing instead.");
      }
    }

    return Ok.EMPTY;
  },
};

const chatStopCommand: Command<AppContext> = {
  name: "stop",
  description: "Stop the ChatManager",
  action: ({ context }): Result<void, CliError> => {
    if (!context.chatManager) {
      print("Error: ChatManager not initialized.");
      return Ok.EMPTY;
    }

    const result = context.chatManager.stop();
    if (result.isOk()) {
      print("ChatManager stopped successfully.");
    } else {
      print(`Failed to stop ChatManager: ${result.error.reason}`);
    }

    return Ok.EMPTY;
  },
};

const chatClearCommand: Command<AppContext> = {
  name: "clear",
  description: "Clear queues and buffer",
  options: new Map([
    [
      "queues",
      {
        name: "queues",
        shortName: "q",
        description: "Clear message and toast queues",
        defaultValue: false,
      },
    ],
    [
      "buffer",
      {
        name: "buffer",
        shortName: "b",
        description: "Clear received message buffer",
        defaultValue: false,
      },
    ],
  ]),
  action: ({ options, context }): Result<void, CliError> => {
    if (!context.chatManager) {
      print("Error: ChatManager not initialized.");
      return Ok.EMPTY;
    }

    const clearQueues = options.queues as boolean;
    const clearBuffer = options.buffer as boolean;

    if (!clearQueues && !clearBuffer) {
      print("Specify --queues or --buffer (or both) to clear.");
      return Ok.EMPTY;
    }

    const results: string[] = [];

    if (clearQueues) {
      const result = context.chatManager.clearQueues();
      if (result.isOk()) {
        results.push("Queues cleared");
      } else {
        results.push(`Failed to clear queues: ${result.error.reason}`);
      }
    }

    if (clearBuffer) {
      const result = context.chatManager.clearBuffer();
      if (result.isOk()) {
        results.push("Buffer cleared");
      } else {
        results.push(`Failed to clear buffer: ${result.error.reason}`);
      }
    }

    results.forEach((msg) => print(msg));
    return Ok.EMPTY;
  },
};

const chatCommand: Command<AppContext> = {
  name: "chat",
  description: "Chat management commands using ChatManager",
  subcommands: new Map([
    ["send", chatSendCommand],
    ["send-immediate", chatSendImmediateCommand],
    ["toast", chatToastCommand],
    ["status", chatStatusCommand],
    ["receive", chatReceiveCommand],
    ["stop", chatStopCommand],
    ["clear", chatClearCommand],
  ]),
};

// 3. Define root command
const rootCommand: Command<AppContext> = {
  name: "calculator",
  description: "A feature-rich calculator and chat management program",
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
    ["chat", chatCommand],
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

    if (context.chatManager) {
      print("ChatManager initialized and ready!");
    } else {
      print("Note: No chatbox peripherals found - chat commands unavailable");
    }

    return Ok.EMPTY;
  },
};

// 4. Initialize ChatManager if chatbox peripherals are available
function initializeChatManager(): ChatManager | undefined {
  // Find all available chatbox peripherals
  const peripheralNames = peripheral.getNames();
  const chatboxPeripherals: ChatBoxPeripheral[] = [];

  for (const name of peripheralNames) {
    const peripheralType = peripheral.getType(name);
    if (peripheralType[0] === "chatBox") {
      const chatbox = peripheral.wrap(name) as ChatBoxPeripheral;
      chatboxPeripherals.push(chatbox);
    }
  }

  if (chatboxPeripherals.length === 0) {
    return undefined;
  }

  const chatManager = new ChatManager(chatboxPeripherals);

  // Start ChatManager in async mode so it doesn't block the CLI
  const runResult = chatManager.runAsync();
  if (runResult.isErr()) {
    print(`Warning: Failed to start ChatManager: ${runResult.error.reason}`);
    return undefined;
  }

  return chatManager;
}

// 5. Create global context instance
const appContext: AppContext = {
  appName: "MyAwesome Calculator & Chat Manager",
  debugMode: false,
  log: (message) => {
    print(`[LOG] ${message}`);
  },
  chatManager: initializeChatManager(),
};

// 6. Create and export CLI handler
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

// Chat management (requires chatbox peripherals)
cli(['chat', 'status']);                 // Shows ChatManager status
cli(['chat', 'send', 'Hello World!']);   // Sends global message (queued)
cli(['chat', 'send', 'Hi there!', '--player', 'Steve']); // Private message (queued)
cli(['chat', 'send-immediate', 'Urgent!', '--player', 'Admin']); // Immediate send
cli(['chat', 'toast', 'Steve', 'Alert', 'Server restart in 5 minutes']); // Toast notification
cli(['chat', 'receive', '--count', '5']); // Check for received messages
cli(['chat', 'clear', '--queues']);      // Clear pending queues
cli(['chat', 'clear', '--buffer']);      // Clear received buffer
cli(['chat', 'stop']);                   // Stop ChatManager

// Help examples
cli(['--help']);                         // Shows root help
cli(['math', '--help']);                 // Shows math command help
cli(['chat', '--help']);                 // Shows chat command help
cli(['chat', 'send', '--help']);         // Shows chat send help

// Debug mode
cli(['--debug', 'math', 'add', '1', '2']); // Enables debug logging
cli(['--debug', 'chat', 'status']);      // Debug mode with chat status
*/
