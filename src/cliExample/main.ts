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
  description: "将两个数字相加",
  args: [
    { name: "a", description: "第一个数字", required: true },
    { name: "b", description: "第二个数字", required: true },
  ],
  action: ({ args, context }): Result<void, CliError> => {
    context.log(`在 '${context.appName}' 中执行 'add' 命令`);

    const a = tonumber(args.a as string);
    const b = tonumber(args.b as string);

    if (a === undefined || b === undefined) {
      print("错误: 参数必须是数字。");
      return Ok.EMPTY;
    }

    const result = a + b;
    print(`${a} + ${b} = ${result}`);

    if (context.debugMode) {
      context.log(`计算结果: ${result}`);
    }
    return Ok.EMPTY;
  },
};

const subtractCommand: Command<AppContext> = {
  name: "subtract",
  description: "将第二个数字从第一个数字中减去",
  args: [
    { name: "a", description: "被减数", required: true },
    { name: "b", description: "减数", required: true },
  ],
  action: ({ args, context }): Result<void, CliError> => {
    context.log(`在 '${context.appName}' 中执行 'subtract' 命令`);

    const a = tonumber(args.a as string);
    const b = tonumber(args.b as string);

    if (a === undefined || b === undefined) {
      print("错误: 参数必须是数字。");
      return Ok.EMPTY;
    }

    const result = a - b;
    print(`${a} - ${b} = ${result}`);
    return Ok.EMPTY;
  },
};

const greetCommand: Command<AppContext> = {
  name: "greet",
  description: "打印问候语",
  options: [
    {
      name: "name",
      shortName: "n",
      description: "要问候的名字",
      defaultValue: "World",
    },
    { name: "times", shortName: "t", description: "重复次数", defaultValue: 1 },
  ],
  action: ({ options, context }): Result<void, CliError> => {
    context.log(`在 '${context.appName}' 中执行 'greet' 命令`);

    const name = options.name as string;
    const times = tonumber(options.times as string) ?? 1;

    for (let i = 1; i <= times; i++) {
      print(`Hello, ${name}!`);

      if (context.debugMode && times > 1) {
        context.log(`问候 ${i}/${times}`);
      }
    }
    return Ok.EMPTY;
  },
};

// Math subcommands group
const mathCommand: Command<AppContext> = {
  name: "math",
  description: "数学运算命令",
  subcommands: [addCommand, subtractCommand],
};

// Config command with nested subcommands
const configShowCommand: Command<AppContext> = {
  name: "show",
  description: "显示当前配置",
  action: ({ context }): Result<void, CliError> => {
    print(`应用名称: ${context.appName}`);
    print(`调试模式: ${context.debugMode ? "开启" : "关闭"}`);
    return Ok.EMPTY;
  },
};

const configSetCommand: Command<AppContext> = {
  name: "set",
  description: "设置配置项",
  args: [
    { name: "key", description: "配置键", required: true },
    { name: "value", description: "配置值", required: true },
  ],
  action: ({ args, context }): Result<void, CliError> => {
    const key = args.key as string;
    const value = args.value as string;

    context.log(`设置配置: ${key} = ${value}`);
    print(`配置 '${key}' 已设置为 '${value}'`);
    return Ok.EMPTY;
  },
};

const configCommand: Command<AppContext> = {
  name: "config",
  description: "配置管理命令",
  subcommands: [configShowCommand, configSetCommand],
};

// 3. Define root command
const rootCommand: Command<AppContext> = {
  name: "calculator",
  description: "一个功能丰富的计算器程序",
  options: [
    {
      name: "debug",
      shortName: "d",
      description: "启用调试模式",
      defaultValue: false,
    },
  ],
  subcommands: [mathCommand, greetCommand, configCommand],
  action: ({ options, context }): Result<void, CliError> => {
    // Update debug mode from command line option
    const debugFromOption = options.debug as boolean;
    if (debugFromOption) {
      context.debugMode = true;
      context.log("调试模式已启用");
    }

    print(`欢迎使用 ${context.appName}!`);
    print("使用 --help 查看可用命令");
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
