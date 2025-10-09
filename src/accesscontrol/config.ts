import { CCLog } from "@/lib/ccLog";
import * as dkjson from "@sikongjueluo/dkjson-types";

let log: CCLog | undefined;

interface ToastConfig {
  title: MinecraftTextComponent;
  msg: MinecraftTextComponent;
  prefix?: string;
  brackets?: string;
  bracketColor?: string;
}

interface UserGroupConfig {
  groupName: string;
  isAllowed: boolean;
  isNotice: boolean;
  groupUsers: string[];
  toastConfig?: ToastConfig;
}

interface AccessConfig {
  detectInterval: number;
  warnInterval: number;
  detectRange: number;
  adminGroupConfig: UserGroupConfig;
  defaultToastConfig: ToastConfig;
  warnToastConfig: ToastConfig;
  usersGroups: UserGroupConfig[];
}

const defaultConfig: AccessConfig = {
  detectRange: 64,
  detectInterval: 3,
  warnInterval: 7,
  adminGroupConfig: {
    groupName: "Admin",
    groupUsers: ["Selcon"],
    isAllowed: true,
    isNotice: false,
  },
  usersGroups: [
    {
      groupName: "user",
      groupUsers: [],
      isAllowed: true,
      isNotice: true,
    },
    {
      groupName: "VIP",
      groupUsers: [],
      isAllowed: true,
      isNotice: false,
    },
    {
      groupName: "enemies",
      groupUsers: [],
      isAllowed: false,
      isNotice: false,
      toastConfig: {
        title: {
          text: "Warn",
          color: "red",
        },
        msg: {
          text: "Warn %playerName%",
          color: "red",
        },
      },
    },
  ],
  defaultToastConfig: {
    title: {
      text: "Welcome",
      color: "green",
    },
    msg: {
      text: "Hello User %playerName%",
      color: "green",
    },
    prefix: "Taohuayuan",
    brackets: "[]",
    bracketColor: "",
  },
  warnToastConfig: {
    title: {
      text: "Attention!!!",
      color: "red",
    },
    msg: {
      text: "%playerName% you are not allowed to be here",
      color: "red",
    },
    prefix: "Taohuayuan",
    brackets: "[]",
    bracketColor: "",
  },
};

function setLog(newLog: CCLog) {
  log = newLog;
}

function loadConfig(filepath: string): AccessConfig {
  const [fp] = io.open(filepath, "r");
  if (fp == undefined) {
    print("Failed to open config file " + filepath);
    return defaultConfig;
  }

  const configJson = fp.read("*a");
  if (configJson == undefined) {
    print("Failed to read config file");
    return defaultConfig;
  }

  const [config, pos, err] = dkjson.decode(configJson);
  if (config == undefined) {
    log?.warn(
      `Config decode failed at ${pos}, use default instead. Error :${err}`,
    );
    return defaultConfig;
  }

  // Not use external lib
  // const config = textutils.unserialiseJSON(configJson, {
  //   parse_empty_array: true,
  // });

  return config as AccessConfig;
}

function saveConfig(config: AccessConfig, filepath: string) {
  const configJson = dkjson.encode(config, { indent: true }) as string;
  // Not use external lib
  // const configJson = textutils.serializeJSON(config, { unicode_strings: true });
  if (configJson == undefined) {
    print("Failed to save config");
  }

  const [fp, _err] = io.open(filepath, "w+");
  if (fp == undefined) {
    print("Failed to open config file " + filepath);
    return;
  }

  fp.write(configJson);
  fp.close();
}

export {
  ToastConfig,
  UserGroupConfig,
  AccessConfig,
  loadConfig,
  saveConfig,
  setLog,
};
