import { Command, createCli } from "@/lib/ccCLI";
import { Ok } from "@/lib/thirdparty/ts-result-es";
import { CCLog } from "@/lib/ccLog";
import {
  AccessConfig,
  UserGroupConfig,
  loadConfig,
  saveConfig,
} from "./config";
import { parseBoolean } from "@/lib/common";

// 1. Define AppContext
export interface AppContext {
  configFilepath: string;
  reloadConfig: () => void;
  logger: CCLog;
  print: (message: string) => void;
}

function getGroupNames(config: AccessConfig) {
  return config.usersGroups.map((value) => value.groupName);
}

// 2. Define Commands

const addCommand: Command<AppContext> = {
  name: "add",
  description: "Add player to group",
  args: [
    {
      name: "userGroup",
      description: "Group to add player to",
      required: true,
    },
    { name: "playerName", description: "Player to add", required: true },
  ],
  action: ({ args, context }) => {
    const [groupName, playerName] = [
      args.userGroup as string,
      args.playerName as string,
    ];
    const config = loadConfig(context.configFilepath)!;

    if (groupName === "admin") {
      if (!config.adminGroupConfig.groupUsers.includes(playerName)) {
        config.adminGroupConfig.groupUsers.push(playerName);
      }
    } else {
      const group = config.usersGroups.find((g) => g.groupName === groupName);
      if (!group) {
        const groupNames = getGroupNames(config);
        context.print(
          `Invalid group: ${groupName}. Available groups: ${groupNames.join(", ")}`,
        );
        return Ok.EMPTY;
      }
      group.groupUsers ??= [];
      if (!group.groupUsers.includes(playerName)) {
        group.groupUsers.push(playerName);
      }
    }

    saveConfig(config, context.configFilepath);
    context.reloadConfig();
    context.print(`Added player ${playerName} to ${groupName}`);
    return Ok.EMPTY;
  },
};

const delCommand: Command<AppContext> = {
  name: "del",
  description: "Delete player from group",
  args: [
    {
      name: "userGroup",
      description: "Group to delete player from",
      required: true,
    },
    { name: "playerName", description: "Player to delete", required: true },
  ],
  action: ({ args, context }) => {
    const [groupName, playerName] = [
      args.userGroup as string,
      args.playerName as string,
    ];

    if (groupName === "admin") {
      context.print("Could not delete admin, please edit config file.");
      return Ok.EMPTY;
    }

    const config = loadConfig(context.configFilepath)!;
    const group = config.usersGroups.find((g) => g.groupName === groupName);

    if (!group) {
      const groupNames = getGroupNames(config);
      context.print(
        `Invalid group: ${groupName}. Available groups: ${groupNames.join(", ")}`,
      );
      return Ok.EMPTY;
    }

    if (group.groupUsers !== undefined) {
      group.groupUsers = group.groupUsers.filter((user) => user !== playerName);
    }

    saveConfig(config, context.configFilepath);
    context.reloadConfig();
    context.print(`Deleted player ${playerName} from ${groupName}`);
    return Ok.EMPTY;
  },
};

const listCommand: Command<AppContext> = {
  name: "list",
  description: "List all players with their groups",
  action: ({ context }) => {
    const config = loadConfig(context.configFilepath)!;
    let message = `Admins : [ ${config.adminGroupConfig.groupUsers.join(", ")} ]\n`;
    for (const groupConfig of config.usersGroups) {
      const users = groupConfig.groupUsers ?? [];
      message += `${groupConfig.groupName} : [ ${users.join(", ")} ]\n`;
    }
    context.print(message.trim());
    return Ok.EMPTY;
  },
};

const setCommand: Command<AppContext> = {
  name: "set",
  description: "Config access control settings",
  args: [
    {
      name: "option",
      description: "Option to set (warnInterval, detectInterval, detectRange)",
      required: true,
    },
    { name: "value", description: "Value to set", required: true },
  ],
  action: ({ args, context }) => {
    const [option, valueStr] = [args.option as string, args.value as string];
    const value = parseInt(valueStr);

    if (isNaN(value)) {
      context.print(`Invalid value: ${valueStr}. Must be a number.`);
      return Ok.EMPTY;
    }

    const config = loadConfig(context.configFilepath)!;
    let message = "";

    switch (option) {
      case "warnInterval":
        config.watchInterval = value;
        message = `Set warn interval to ${value}`;
        break;
      case "detectInterval":
        config.detectInterval = value;
        message = `Set detect interval to ${value}`;
        break;
      case "detectRange":
        config.detectRange = value;
        message = `Set detect range to ${value}`;
        break;
      default:
        context.print(
          `Unknown option: ${option}. Available: warnInterval, detectInterval, detectRange`,
        );
        return Ok.EMPTY;
    }

    saveConfig(config, context.configFilepath);
    context.reloadConfig();
    context.print(message);
    return Ok.EMPTY;
  },
};

const editGroupCommand: Command<AppContext> = {
  name: "group",
  description: "Edit group properties",
  args: [
    {
      name: "groupName",
      description: "Name of the group to edit",
      required: true,
    },
    {
      name: "property",
      description: "Property to change (isAllowed, isNotice)",
      required: true,
    },
    { name: "value", description: "New value (true/false)", required: true },
  ],
  action: ({ args, context }) => {
    const [groupName, property, valueStr] = [
      args.groupName as string,
      args.property as string,
      args.value as string,
    ];
    const config = loadConfig(context.configFilepath)!;

    let groupConfig: UserGroupConfig | undefined;
    if (groupName === "admin") {
      groupConfig = config.adminGroupConfig;
    } else {
      groupConfig = config.usersGroups.find((g) => g.groupName === groupName);
    }

    if (!groupConfig) {
      context.print(`Group ${groupName} not found`);
      return Ok.EMPTY;
    }

    const boolValue = parseBoolean(valueStr);
    if (boolValue === undefined) {
      context.print(
        `Invalid boolean value: ${valueStr}. Use 'true' or 'false'.`,
      );
      return Ok.EMPTY;
    }

    let message = "";
    switch (property) {
      case "isAllowed":
        groupConfig.isAllowed = boolValue;
        message = `Set ${groupName}.isAllowed to ${boolValue}`;
        break;
      case "isNotice":
        groupConfig.isNotice = boolValue;
        message = `Set ${groupName}.isNotice to ${boolValue}`;
        break;
      default:
        context.print(
          `Unknown property: ${property}. Available: isAllowed, isNotice`,
        );
        return Ok.EMPTY;
    }

    saveConfig(config, context.configFilepath);
    context.reloadConfig();
    context.print(message);
    return Ok.EMPTY;
  },
};

const editCommand: Command<AppContext> = {
  name: "edit",
  description: "Edit various configurations",
  subcommands: new Map([["group", editGroupCommand]]),
};

const showConfigCommand: Command<AppContext> = {
  name: "showconfig",
  description: "Show configuration",
  options: new Map([
    [
      "type",
      {
        name: "type",
        description: "Type of config to show (groups, toast, all)",
        required: false,
        defaultValue: "all",
      },
    ],
  ]),
  action: ({ args, context }) => {
    const type = args.type as string;
    const config = loadConfig(context.configFilepath)!;
    let message = "";

    switch (type) {
      case "groups": {
        let groupsMessage = `Admin Group: ${config.adminGroupConfig.groupName}\n`;
        groupsMessage += `  Users: [${config.adminGroupConfig.groupUsers.join(", ")}]\n`;
        groupsMessage += `  Allowed: ${config.adminGroupConfig.isAllowed}\n`;
        groupsMessage += `  notice: ${config.adminGroupConfig.isNotice}\n\n`;

        for (const group of config.usersGroups) {
          groupsMessage += `Group: ${group.groupName}\n`;
          groupsMessage += `  Users: [${(group.groupUsers ?? []).join(", ")}]\n`;
          groupsMessage += `  Allowed: ${group.isAllowed}\n`;
          groupsMessage += `  Notice: ${group.isNotice}\n`;
          groupsMessage += "\n";
        }
        message = groupsMessage.trim();
        break;
      }

      case "toast": {
        let toastMessage = "Default Toast Config:\n";
        toastMessage += `  Title: ${config.welcomeToastConfig.title.text}\n`;
        toastMessage += `  Message: ${config.welcomeToastConfig.msg.text}\n`;
        toastMessage += `  Prefix: ${config.welcomeToastConfig.prefix ?? "none"}\n`;
        toastMessage += `  Brackets: ${config.welcomeToastConfig.brackets ?? "none"}\n`;
        toastMessage += `  Bracket Color: ${config.welcomeToastConfig.bracketColor ?? "none"}\n\n`;

        toastMessage += "Warn Toast Config:\n";
        toastMessage += `  Title: ${config.warnToastConfig.title.text}\n`;
        toastMessage += `  Message: ${config.warnToastConfig.msg.text}\n`;
        toastMessage += `  Prefix: ${config.warnToastConfig.prefix ?? "none"}\n`;
        toastMessage += `  Brackets: ${config.warnToastConfig.brackets ?? "none"}\n`;
        toastMessage += `  Bracket Color: ${config.warnToastConfig.bracketColor ?? "none"}`;
        message = toastMessage;
        break;
      }

      case "all": {
        let allMessage = `Detect Range: ${config.detectRange}\n`;
        allMessage += `Detect Interval: ${config.detectInterval}\n`;
        allMessage += `Warn Interval: ${config.watchInterval}\n\n`;
        allMessage +=
          "Use 'showconfig groups' or 'showconfig toast' for detailed view";
        message = allMessage;
        break;
      }

      default:
        message = `Invalid type: ${type}. Available: groups, toast, all`;
        break;
    }
    context.print(message);
    return Ok.EMPTY;
  },
};

// Root command
const rootCommand: Command<AppContext> = {
  name: "@AC",
  description: "Access Control command line interface",
  subcommands: new Map([
    ["add", addCommand],
    ["del", delCommand],
    ["list", listCommand],
    ["set", setCommand],
    ["edit", editCommand],
    ["showconfig", showConfigCommand],
  ]),
  action: ({ context }) => {
    context.print("Welcome to Access Control CLI");
    return Ok.EMPTY;
  },
};

export function createAccessControlCli(context: AppContext) {
  return createCli(rootCommand, {
    globalContext: context,
    writer: (msg) => context.print(msg),
  });
}
