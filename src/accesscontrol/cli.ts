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
  print: (
    message: string | MinecraftTextComponent | MinecraftTextComponent[],
  ) => void;
}

function getGroupNames(config: AccessConfig) {
  return config.usersGroups.map((value) => value.groupName);
}

// 2. Define Commands

const addCommand: Command<AppContext> = {
  name: "add",
  description: "添加玩家到用户组",
  args: [
    {
      name: "userGroup",
      description: "要添加到的用户组",
      required: true,
    },
    { name: "playerName", description: "要添加的玩家", required: true },
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
        context.print({
          text: `无效的用户组: ${groupName}. 可用用户组: ${groupNames.join(
            ", ",
          )}`,
        });
        return Ok.EMPTY;
      }
      group.groupUsers ??= [];
      if (!group.groupUsers.includes(playerName)) {
        group.groupUsers.push(playerName);
      }
    }

    saveConfig(config, context.configFilepath);
    context.reloadConfig();
    context.print({ text: `已添加玩家 ${playerName} 到 ${groupName}` });
    return Ok.EMPTY;
  },
};

const delCommand: Command<AppContext> = {
  name: "del",
  description: "从用户组删除玩家",
  args: [
    {
      name: "userGroup",
      description: "要从中删除玩家的用户组",
      required: true,
    },
    { name: "playerName", description: "要删除的玩家", required: true },
  ],
  action: ({ args, context }) => {
    const [groupName, playerName] = [
      args.userGroup as string,
      args.playerName as string,
    ];

    if (groupName === "admin") {
      context.print({ text: "无法删除管理员, 请直接编辑配置文件。" });
      return Ok.EMPTY;
    }

    const config = loadConfig(context.configFilepath)!;
    const group = config.usersGroups.find((g) => g.groupName === groupName);

    if (!group) {
      const groupNames = getGroupNames(config);
      context.print({
        text: `无效的用户组: ${groupName}. 可用用户组: ${groupNames.join(
          ", ",
        )}`,
      });
      return Ok.EMPTY;
    }

    if (group.groupUsers !== undefined) {
      group.groupUsers = group.groupUsers.filter((user) => user !== playerName);
    }

    saveConfig(config, context.configFilepath);
    context.reloadConfig();
    context.print({ text: `已从 ${groupName} 中删除玩家 ${playerName}` });
    return Ok.EMPTY;
  },
};

const listCommand: Command<AppContext> = {
  name: "list",
  description: "列出所有玩家及其所在的用户组",
  action: ({ context }) => {
    const config = loadConfig(context.configFilepath)!;
    let message = `管理员 : [ ${config.adminGroupConfig.groupUsers.join(
      ", ",
    )} ]\n`;
    for (const groupConfig of config.usersGroups) {
      const users = groupConfig.groupUsers ?? [];
      message += `${groupConfig.groupName} : [ ${users.join(", ")} ]\n`;
    }
    context.print({ text: message.trim() });
    return Ok.EMPTY;
  },
};

const setCommand: Command<AppContext> = {
  name: "set",
  description: "配置访问控制设置",
  args: [
    {
      name: "option",
      description: "要设置的选项 (warnInterval, detectInterval, detectRange)",
      required: true,
    },
    { name: "value", description: "要设置的值", required: true },
  ],
  action: ({ args, context }) => {
    const [option, valueStr] = [args.option as string, args.value as string];
    const value = parseInt(valueStr);

    if (isNaN(value)) {
      context.print({ text: `无效的值: ${valueStr}. 必须是一个数字。` });
      return Ok.EMPTY;
    }

    const config = loadConfig(context.configFilepath)!;
    let message = "";

    switch (option) {
      case "warnInterval":
        config.watchInterval = value;
        message = `已设置警告间隔为 ${value}`;
        break;
      case "detectInterval":
        config.detectInterval = value;
        message = `已设置检测间隔为 ${value}`;
        break;
      case "detectRange":
        config.detectRange = value;
        message = `已设置检测范围为 ${value}`;
        break;
      default:
        context.print({
          text: `未知选项: ${option}. 可用选项: warnInterval, detectInterval, detectRange`,
        });
        return Ok.EMPTY;
    }

    saveConfig(config, context.configFilepath);
    context.reloadConfig();
    context.print({ text: message });
    return Ok.EMPTY;
  },
};

const editGroupCommand: Command<AppContext> = {
  name: "group",
  description: "编辑用户组属性",
  args: [
    {
      name: "groupName",
      description: "要编辑的用户组名称",
      required: true,
    },
    {
      name: "property",
      description: "要更改的属性 (isAllowed, isNotice)",
      required: true,
    },
    { name: "value", description: "新值 (true/false)", required: true },
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
      context.print({ text: `用户组 ${groupName} 未找到` });
      return Ok.EMPTY;
    }

    const boolValue = parseBoolean(valueStr);
    if (boolValue === undefined) {
      context.print({
        text: `无效的布尔值: ${valueStr}. 请使用 'true' 或 'false'.`,
      });
      return Ok.EMPTY;
    }

    let message = "";
    switch (property) {
      case "isAllowed":
        groupConfig.isAllowed = boolValue;
        message = `已设置 ${groupName}.isAllowed 为 ${boolValue}`;
        break;
      case "isNotice":
        groupConfig.isNotice = boolValue;
        message = `已设置 ${groupName}.isNotice 为 ${boolValue}`;
        break;
      default:
        context.print({
          text: `未知属性: ${property}. 可用属性: isAllowed, isNotice`,
        });
        return Ok.EMPTY;
    }

    saveConfig(config, context.configFilepath);
    context.reloadConfig();
    context.print({ text: message });
    return Ok.EMPTY;
  },
};

const editCommand: Command<AppContext> = {
  name: "edit",
  description: "编辑各项配置",
  subcommands: new Map([["group", editGroupCommand]]),
};

const showConfigCommand: Command<AppContext> = {
  name: "showconfig",
  description: "显示配置",
  options: new Map([
    [
      "type",
      {
        name: "type",
        description: "要显示的配置类型 (groups, toast, all)",
        required: false,
        defaultValue: "all",
      },
    ],
  ]),
  action: ({ options, context }) => {
    const type = options.type as string;
    const config = loadConfig(context.configFilepath)!;
    let message = "";

    switch (type) {
      case "groups": {
        let groupsMessage = `管理员组: ${config.adminGroupConfig.groupName}\n`;
        groupsMessage += `  用户: [${config.adminGroupConfig.groupUsers.join(
          ", ",
        )}]\n`;
        groupsMessage += `  允许: ${config.adminGroupConfig.isAllowed}\n`;
        groupsMessage += `  通知: ${config.adminGroupConfig.isNotice}\n\n`;

        for (const group of config.usersGroups) {
          groupsMessage += `用户组: ${group.groupName}\n`;
          groupsMessage += `  用户: [${(group.groupUsers ?? []).join(", ")}]\n`;
          groupsMessage += `  允许: ${group.isAllowed}\n`;
          groupsMessage += `  通知: ${group.isNotice}\n`;
          groupsMessage += "\n";
        }
        message = groupsMessage.trim();
        break;
      }

      case "toast": {
        let toastMessage = "默认 Toast 配置:\n";
        toastMessage += `  标题: ${config.welcomeToastConfig.title.text}\n`;
        toastMessage += `  消息: ${config.welcomeToastConfig.msg.text}\n`;
        toastMessage += `  前缀: ${
          config.welcomeToastConfig.prefix ?? "none"
        }\n`;
        toastMessage += `  括号: ${
          config.welcomeToastConfig.brackets ?? "none"
        }\n`;
        toastMessage += `  括号颜色: ${
          config.welcomeToastConfig.bracketColor ?? "none"
        }\n\n`;

        toastMessage += "警告 Toast 配置:\n";
        toastMessage += `  标题: ${config.warnToastConfig.title.text}\n`;
        toastMessage += `  消息: ${config.warnToastConfig.msg.text}\n`;
        toastMessage += `  前缀: ${config.warnToastConfig.prefix ?? "none"}\n`;
        toastMessage += `  括号: ${
          config.warnToastConfig.brackets ?? "none"
        }\n`;
        toastMessage += `  括号颜色: ${
          config.warnToastConfig.bracketColor ?? "none"
        }`;
        message = toastMessage;
        break;
      }

      case "all": {
        let allMessage = `检测范围: ${config.detectRange}\n`;
        allMessage += `检测间隔: ${config.detectInterval}\n`;
        allMessage += `警告间隔: ${config.watchInterval}\n\n`;
        allMessage +=
          "使用 'showconfig --type groups' 或 'showconfig --type toast' 查看详细信息";
        message = allMessage;
        break;
      }

      default:
        message = `无效类型: ${type}. 可用类型: groups, toast, all`;
        break;
    }
    context.print({ text: message });
    return Ok.EMPTY;
  },
};

// Root command
const rootCommand: Command<AppContext> = {
  name: "@AC",
  description: "访问控制命令行界面",
  subcommands: new Map([
    ["add", addCommand],
    ["del", delCommand],
    ["list", listCommand],
    ["set", setCommand],
    ["edit", editCommand],
    ["showconfig", showConfigCommand],
  ]),
  action: ({ context }) => {
    context.print([
      {
        text: "请使用 ",
      },
      {
        text: "@AC --help",
        clickEvent: {
          action: "copy_to_clipboard",
          value: "@AC --help",
        },
        hoverEvent: {
          action: "show_text",
          value: "点击复制命令",
        },
      },
      {
        text: " 获取门禁系统更详细的命令说明😊😊😊",
      },
    ]);
    return Ok.EMPTY;
  },
};

export function createAccessControlCli(context: AppContext) {
  return createCli(rootCommand, {
    globalContext: context,
    writer: (msg) => context.print(msg),
  });
}
