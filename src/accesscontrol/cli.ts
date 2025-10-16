import { CCLog } from "@/lib/ccLog";
import { AccessConfig, UserGroupConfig, saveConfig } from "./config";
import { ChatBoxEvent, pullEventAs } from "@/lib/event";
import { parseBoolean } from "@/lib/common";

// CLI命令接口
interface CLICommand {
  name: string;
  description: string;
  usage: string;
  execute: (args: string[], executor: string, context: CLIContext) => CLIResult;
}

// CLI执行结果
interface CLIResult {
  success: boolean;
  message?: string;
  shouldSaveConfig?: boolean;
}

// CLI上下文
interface CLIContext {
  config: AccessConfig;
  configFilepath: string;
  reloadConfig: () => void;
  log: CCLog;
  chatBox: ChatBoxPeripheral;
}

function getGroupNames(context: CLIContext) {
  return context.config.usersGroups.flatMap((value) => value.groupName);
}

// 基础命令处理器
class CLICommandProcessor {
  private commands = new Map<string, CLICommand>();
  private context: CLIContext;

  constructor(context: CLIContext) {
    this.context = context;
    this.initializeCommands();
  }

  private initializeCommands() {
    // 注册所有命令
    this.registerCommand(new AddCommand());
    this.registerCommand(new DelCommand());
    this.registerCommand(new ListCommand());
    this.registerCommand(new SetCommand());
    this.registerCommand(new EditCommand());
    this.registerCommand(new ShowConfigCommand());
    this.registerCommand(new HelpCommand());
  }

  private registerCommand(command: CLICommand) {
    this.commands.set(command.name, command);
  }

  public processCommand(message: string, executor: string): CLIResult {
    const params = message.split(" ");

    // 移除 "@AC" 前缀
    if (params.length < 2) {
      return this.getHelpCommand().execute([], executor, this.context);
    }

    const commandName = params[1].replace("/", ""); // 移除 "/" 前缀
    const args = params.slice(2);

    const command = this.commands.get(commandName);
    if (!command) {
      return {
        success: false,
        message: `Unknown command: ${commandName}`,
      };
    }

    const ret = command.execute(args, executor, this.context);
    if (ret.success) {
      this.context.reloadConfig();
      return ret;
    }
    return ret;
  }

  private getHelpCommand(): CLICommand {
    return this.commands.get("help")!;
  }

  public sendResponse(result: CLIResult, executor: string) {
    if (result.message != null && result.message.length > 0) {
      this.context.chatBox.sendMessageToPlayer(
        result.message,
        executor,
        "AccessControl",
        "[]",
        undefined,
        undefined,
        true,
      );
    }

    if (result.shouldSaveConfig === true) {
      saveConfig(this.context.config, this.context.configFilepath);
    }
  }
}

// 添加用户命令
class AddCommand implements CLICommand {
  name = "add";
  description = "Add player to group";
  usage = "add <userGroup> <playerName>";

  execute(args: string[], _executor: string, context: CLIContext): CLIResult {
    if (args.length !== 2) {
      return {
        success: false,
        message: `Usage: ${this.usage}`,
      };
    }

    const [groupName, playerName] = args;

    if (groupName === "admin") {
      context.config.adminGroupConfig.groupUsers.push(playerName);
      return {
        success: true,
        message: `Add player ${playerName} to admin`,
        shouldSaveConfig: true,
      };
    }

    const groupNames = getGroupNames(context);

    if (!groupNames.includes(groupName)) {
      return {
        success: false,
        message: `Invalid group: ${groupName}. Available groups: ${groupNames.join(", ")}`,
      };
    }

    const groupConfig = context.config.usersGroups.find(
      (value) => value.groupName === groupName,
    );

    if (!groupConfig) {
      return {
        success: false,
        message: `Group ${groupName} not found`,
      };
    }

    if (groupConfig.groupUsers === undefined) {
      groupConfig.groupUsers = [playerName];
    } else {
      groupConfig.groupUsers.push(playerName);
    }

    return {
      success: true,
      message: `Add player ${playerName} to ${groupConfig.groupName}`,
      shouldSaveConfig: true,
    };
  }
}

// 删除用户命令
class DelCommand implements CLICommand {
  name = "del";
  description = "Delete player from group";
  usage = "del <userGroup> <playerName>";

  execute(args: string[], _executor: string, context: CLIContext): CLIResult {
    if (args.length !== 2) {
      return {
        success: false,
        message: `Usage: ${this.usage}`,
      };
    }

    const [groupName, playerName] = args;

    if (groupName === "admin") {
      return {
        success: false,
        message: "Could't delete admin, please edit config",
      };
    }

    const groupNames = getGroupNames(context);

    if (!groupNames.includes(groupName)) {
      return {
        success: false,
        message: `Invalid group: ${groupName}. Available groups: ${groupNames.join(", ")}`,
      };
    }

    const groupConfig = context.config.usersGroups.find(
      (value) => value.groupName === groupName,
    );

    if (!groupConfig) {
      return {
        success: false,
        message: `Group ${groupName} not found`,
      };
    }

    if (groupConfig.groupUsers === undefined) {
      groupConfig.groupUsers = [];
    } else {
      groupConfig.groupUsers = groupConfig.groupUsers.filter(
        (user) => user !== playerName,
      );
    }

    return {
      success: true,
      message: `Delete ${groupConfig.groupName} ${playerName}`,
      shouldSaveConfig: true,
    };
  }
}

// 列表命令
class ListCommand implements CLICommand {
  name = "list";
  description = "List all players with their groups";
  usage = "list";

  execute(_args: string[], _executor: string, context: CLIContext): CLIResult {
    let message = `Admins : [ ${context.config.adminGroupConfig.groupUsers.join(", ")} ]\n`;

    for (const groupConfig of context.config.usersGroups) {
      const users = groupConfig.groupUsers ?? [];
      message += `${groupConfig.groupName} : [ ${users.join(", ")} ]\n`;
    }

    return {
      success: true,
      message: message.trim(),
    };
  }
}

// 设置命令
class SetCommand implements CLICommand {
  name = "set";
  description = "Config access control settings";
  usage = "set <option> <value>";

  execute(args: string[], _executor: string, context: CLIContext): CLIResult {
    if (args.length !== 2) {
      return {
        success: false,
        message: `Usage: ${this.usage}\nOptions: warnInterval, detectInterval, detectRange`,
      };
    }

    const [option, valueStr] = args;
    const value = parseInt(valueStr);

    if (isNaN(value)) {
      return {
        success: false,
        message: `Invalid value: ${valueStr}. Must be a number.`,
      };
    }

    switch (option) {
      case "warnInterval":
        context.config.watchInterval = value;
        return {
          success: true,
          message: `Set warn interval to ${context.config.watchInterval}`,
          shouldSaveConfig: true,
        };

      case "detectInterval":
        context.config.detectInterval = value;
        return {
          success: true,
          message: `Set detect interval to ${context.config.detectInterval}`,
          shouldSaveConfig: true,
        };

      case "detectRange":
        context.config.detectRange = value;
        return {
          success: true,
          message: `Set detect range to ${context.config.detectRange}`,
          shouldSaveConfig: true,
        };

      default:
        return {
          success: false,
          message: `Unknown option: ${option}. Available options: warnInterval, detectInterval, detectRange`,
        };
    }
  }
}

// 帮助命令
class HelpCommand implements CLICommand {
  name = "help";
  description = "Show command help";
  usage = "help";

  execute(_args: string[], _executor: string, context: CLIContext): CLIResult {
    const groupNames = getGroupNames(context);
    const helpMessage = `
Command Usage: @AC /<Command> [args]
Commands:
  - add <userGroup> <playerName>
      add player to group
      userGroup: ${groupNames.join(", ")}
  - del <userGroup> <playerName>
      delete player in the group, except Admin
      userGroup: ${groupNames.join(", ")}
  - list
      list all of the player with its group
  - set <options> [params]
      config access control settings
      options: warnInterval, detectInterval, detectRange
  - edit <target> [args]
      edit various configurations
      targets: group (edit group properties)
      examples: edit group <groupName> <property> <value> (properties: isAllowed, isNotice)
  - showconfig [type]
      show configuration (type: groups/toast/all)
  - help
      show this help message
    `;

    return {
      success: true,
      message: helpMessage.trim(),
    };
  }
}

// 统一编辑命令
class EditCommand implements CLICommand {
  name = "edit";
  description = "Edit various configurations (only group now)";
  usage = "edit <target> [args]";

  execute(args: string[], _executor: string, context: CLIContext): CLIResult {
    if (args.length < 1) {
      return {
        success: false,
        message: `Usage: ${this.usage}\nTargets: group`,
      };
    }

    const [target, ...rest] = args;

    switch (target) {
      case "group":
        return this.editGroup(rest, context);
      default:
        return {
          success: false,
          message: `Unknown target: ${target}. Available: group`,
        };
    }
  }

  private editGroup(args: string[], context: CLIContext): CLIResult {
    if (args.length !== 3) {
      return {
        success: false,
        message: `Usage: edit group <groupName> <property> <value>\nProperties: isAllowed, isNotice`,
      };
    }

    const [groupName, property, valueStr] = args;

    let groupConfig: UserGroupConfig | undefined;

    if (groupName === "admin") {
      groupConfig = context.config.adminGroupConfig;
    } else {
      groupConfig = context.config.usersGroups.find(
        (group) => group.groupName === groupName,
      );
    }

    if (!groupConfig) {
      return {
        success: false,
        message: `Group ${groupName} not found`,
      };
    }

    switch (property) {
      case "isAllowed": {
        const val = parseBoolean(valueStr);
        if (val != undefined) {
          groupConfig.isAllowed = val;
          return {
            success: true,
            message: `Set ${groupName}.isAllowed to ${groupConfig.isAllowed}`,
            shouldSaveConfig: true,
          };
        } else {
          return {
            success: false,
            message: `Set ${groupName}.isAllowed failed`,
            shouldSaveConfig: false,
          };
        }
      }

      case "isNotice": {
        const val = parseBoolean(valueStr);
        if (val != undefined) {
          groupConfig.isNotice = val;
          return {
            success: true,
            message: `Set ${groupName}.isNotice to ${groupConfig.isNotice}`,
            shouldSaveConfig: true,
          };
        } else {
          return {
            success: false,
            message: `Set ${groupName}.isAllowed failed`,
            shouldSaveConfig: false,
          };
        }
      }

      default:
        return {
          success: false,
          message: `Unknown property: ${property}. Available: isAllowed, isNotice`,
        };
    }
  }
}

// 显示配置命令
class ShowConfigCommand implements CLICommand {
  name = "showconfig";
  description = "Show configuration";
  usage = "showconfig [type]";

  execute(args: string[], _executor: string, context: CLIContext): CLIResult {
    const type = args[0] || "all";

    switch (type) {
      case "groups": {
        let groupsMessage = `Admin Group: ${context.config.adminGroupConfig.groupName}\n`;
        groupsMessage += `  Users: [${context.config.adminGroupConfig.groupUsers.join(", ")}]\n`;
        groupsMessage += `  Allowed: ${context.config.adminGroupConfig.isAllowed}\n`;
        groupsMessage += `  notice: ${context.config.adminGroupConfig.isNotice}\n\n`;

        for (const group of context.config.usersGroups) {
          groupsMessage += `Group: ${group.groupName}\n`;
          groupsMessage += `  Users: [${(group.groupUsers ?? []).join(", ")}]\n`;
          groupsMessage += `  Allowed: ${group.isAllowed}\n`;
          groupsMessage += `  Notice: ${group.isNotice}\n`;
          groupsMessage += "\n";
        }

        return {
          success: true,
          message: groupsMessage.trim(),
        };
      }

      case "toast": {
        let toastMessage = "Default Toast Config:\n";
        toastMessage += `  Title: ${context.config.welcomeToastConfig.title.text}\n`;
        toastMessage += `  Message: ${context.config.welcomeToastConfig.msg.text}\n`;
        toastMessage += `  Prefix: ${context.config.welcomeToastConfig.prefix ?? "none"}\n`;
        toastMessage += `  Brackets: ${context.config.welcomeToastConfig.brackets ?? "none"}\n`;
        toastMessage += `  Bracket Color: ${context.config.welcomeToastConfig.bracketColor ?? "none"}\n\n`;

        toastMessage += "Warn Toast Config:\n";
        toastMessage += `  Title: ${context.config.warnToastConfig.title.text}\n`;
        toastMessage += `  Message: ${context.config.warnToastConfig.msg.text}\n`;
        toastMessage += `  Prefix: ${context.config.warnToastConfig.prefix ?? "none"}\n`;
        toastMessage += `  Brackets: ${context.config.warnToastConfig.brackets ?? "none"}\n`;
        toastMessage += `  Bracket Color: ${context.config.warnToastConfig.bracketColor ?? "none"}`;

        return {
          success: true,
          message: toastMessage,
        };
      }

      case "all": {
        let allMessage = `Detect Range: ${context.config.detectRange}\n`;
        allMessage += `Detect Interval: ${context.config.detectInterval}\n`;
        allMessage += `Warn Interval: ${context.config.watchInterval}\n\n`;
        allMessage +=
          "Use 'showconfig groups' or 'showconfig toast' for detailed view";

        return {
          success: true,
          message: allMessage,
        };
      }

      default:
        return {
          success: false,
          message: `Invalid type: ${type}. Available: groups, toast, all`,
        };
    }
  }
}

// CLI循环处理器
export class AccessControlCLI {
  private processor: CLICommandProcessor;
  private context: CLIContext;

  constructor(context: CLIContext) {
    this.context = context;
    this.processor = new CLICommandProcessor(context);
  }

  public startConfigLoop() {
    while (true) {
      const ev = pullEventAs(ChatBoxEvent, "chat");

      if (ev === undefined) continue;
      if (
        !this.context.config.adminGroupConfig.groupUsers.includes(ev.username)
      )
        continue;
      if (!ev.message.startsWith("@AC")) continue;

      this.context.log.info(
        `Received command "${ev.message}" from admin ${ev.username}`,
      );

      const result = this.processor.processCommand(ev.message, ev.username);
      this.processor.sendResponse(result, ev.username);

      if (!result.success) {
        this.context.log.warn(`Command failed: ${result.message}`);
      }
    }
  }
}

// 导出类型和工厂函数
export { CLIContext, CLIResult, CLICommand };

export function createAccessControlCLI(context: CLIContext): AccessControlCLI {
  return new AccessControlCLI(context);
}
