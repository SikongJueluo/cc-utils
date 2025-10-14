// import * as dkjson from "@sikongjueluo/dkjson-types";

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
}

interface AccessConfig {
  detectInterval: number;
  watchInterval: number;
  noticeTimes: number;
  detectRange: number;
  isWarn: boolean;
  adminGroupConfig: UserGroupConfig;
  welcomeToastConfig: ToastConfig;
  warnToastConfig: ToastConfig;
  noticeToastConfig: ToastConfig;
  usersGroups: UserGroupConfig[];
}

const defaultConfig: AccessConfig = {
  detectRange: 256,
  detectInterval: 1,
  watchInterval: 10,
  noticeTimes: 2,
  isWarn: false,
  adminGroupConfig: {
    groupName: "Admin",
    groupUsers: ["Selcon"],
    isAllowed: true,
    isNotice: true,
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
    },
  ],
  welcomeToastConfig: {
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
  noticeToastConfig: {
    title: {
      text: "Notice",
      color: "red",
    },
    msg: {
      text: "Unfamiliar player %playerName% appeared at\n Position %PlayerPosX%, %PlayerPosY%, %PlayerPosZ%",
      color: "red",
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

function loadConfig(filepath: string): AccessConfig {
  const [fp] = io.open(filepath, "r");
  if (fp == undefined) {
    print("Failed to open config file " + filepath);
    print("Use default config");
    saveConfig(defaultConfig, filepath);
    return defaultConfig;
  }

  const configJson = fp.read("*a");
  if (configJson == undefined) {
    print("Failed to read config file");
    print("Use default config");
    saveConfig(defaultConfig, filepath);
    return defaultConfig;
  }

  // const [config, pos, err] = dkjson.decode(configJson);
  // if (config == undefined) {
  //   log?.warn(
  //     `Config decode failed at ${pos}, use default instead. Error :${err}`,
  //   );
  //   return defaultConfig;
  // }

  // Not use external lib
  const config = textutils.unserialiseJSON(configJson, {
    parse_empty_array: true,
  });

  return config as AccessConfig;
}

function saveConfig(config: AccessConfig, filepath: string) {
  // const configJson = dkjson.encode(config, { indent: true }) as string;
  // Not use external lib
  const configJson = textutils.serializeJSON(config, {
    allow_repetitions: true,
    unicode_strings: true,
  });
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

export { ToastConfig, UserGroupConfig, AccessConfig, loadConfig, saveConfig };
