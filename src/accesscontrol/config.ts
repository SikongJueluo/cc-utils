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
    isWelcome: boolean;
    groupUsers: string[];
}

interface AccessConfig {
    detectInterval: number;
    watchInterval: number;
    noticeTimes: number;
    detectRange: number;
    isWelcome: boolean;
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
    isWelcome: true,
    adminGroupConfig: {
        groupName: "Admin",
        groupUsers: ["Selcon"],
        isAllowed: true,
        isNotice: true,
        isWelcome: false,
    },
    usersGroups: [
        {
            groupName: "user",
            groupUsers: [],
            isAllowed: true,
            isNotice: true,
            isWelcome: false,
        },
        {
            groupName: "TU",
            groupUsers: [],
            isAllowed: true,
            isNotice: false,
            isWelcome: false,
        },
        {
            groupName: "VIP",
            groupUsers: [],
            isAllowed: true,
            isNotice: false,
            isWelcome: true,
        },
        {
            groupName: "enemies",
            groupUsers: [],
            isAllowed: false,
            isNotice: false,
            isWelcome: false,
        },
    ],
    welcomeToastConfig: {
        title: {
            text: "欢迎",
            color: "green",
        },
        msg: {
            text: "欢迎 %playerName% 参观桃源星喵~",
            color: "#EDC8DA",
        },
        prefix: "桃源星",
        brackets: "<>",
        bracketColor: "",
    },
    noticeToastConfig: {
        title: {
            text: "警告",
            color: "red",
        },
        msg: {
            text: "陌生玩家 %playerName% 出现在 %playerPosX%, %playerPosY%, %playerPosZ%",
            color: "red",
        },
        prefix: "桃源星",
        brackets: "<>",
        bracketColor: "",
    },
    warnToastConfig: {
        title: {
            text: "注意",
            color: "red",
        },
        msg: {
            text: "%playerName% 你已经进入桃源星领地",
            color: "red",
        },
        prefix: "桃源星",
        brackets: "<>",
        bracketColor: "",
    },
};

function loadConfig(
    filepath: string,
    useDefault = true,
): AccessConfig | undefined {
    const [fp] = io.open(filepath, "r");
    if (fp == undefined) {
        if (useDefault === false) return undefined;
        print("Failed to open config file " + filepath);
        print("Use default config");
        saveConfig(defaultConfig, filepath);
        return defaultConfig;
    }

    const configJson = fp.read("*a");
    if (configJson == undefined) {
        if (useDefault === false) return undefined;
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
