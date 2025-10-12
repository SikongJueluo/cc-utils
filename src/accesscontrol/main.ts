import { CCLog, DAY } from "@/lib/ccLog";
import { ToastConfig, UserGroupConfig, loadConfig, setLog } from "./config";
import { createAccessControlCLI } from "./cli";
import { launchAccessControlTUI } from "./tui";
import * as peripheralManager from "../lib/PeripheralManager";

const DEBUG = false;
const args = [...$vararg];

// Init Log
const log = new CCLog("accesscontrol.log", true, DAY);
setLog(log);

// Load Config
const configFilepath = `${shell.dir()}/access.config.json`;
const config = loadConfig(configFilepath);
log.info("Load config successfully!");
if (DEBUG) log.debug(textutils.serialise(config, { allow_repetitions: true }));
const groupNames = config.usersGroups.map((value) => value.groupName);
let noticeTargetPlayers: string[];
const playerDetector = peripheralManager.findByNameRequired("playerDetector");
const chatBox = peripheralManager.findByNameRequired("chatBox");

let inRangePlayers: string[] = [];
let watchPlayersInfo: { name: string; hasNoticeTimes: number }[] = [];

function safeParseTextComponent(
  component: MinecraftTextComponent,
  playerName: string,
  groupName?: string,
): string {
  if (component.text == undefined) {
    component.text = "Wrong text, please contanct with admin";
  } else if (component.text.includes("%")) {
    component.text = component.text.replace("%playerName%", playerName);
    if (groupName != undefined)
      component.text = component.text.replace("%groupName%", groupName);
  }
  return textutils.serialiseJSON(component);
}

function sendToast(toastConfig: ToastConfig, targetPlayer: string) {
  return chatBox.sendFormattedToastToPlayer(
    textutils.serialiseJSON(toastConfig.msg ?? config.welcomeToastConfig.msg),
    textutils.serialiseJSON(
      toastConfig.title ?? config.welcomeToastConfig.title,
    ),
    targetPlayer,
    toastConfig.prefix ?? config.welcomeToastConfig.prefix,
    toastConfig.brackets ?? config.welcomeToastConfig.brackets,
    toastConfig.bracketColor ?? config.welcomeToastConfig.bracketColor,
    undefined,
    true,
  );
}

function sendNotice(player: string, playerInfo?: PlayerInfo) {
  const onlinePlayers = playerDetector.getOnlinePlayers();
  noticeTargetPlayers = config.adminGroupConfig.groupUsers.concat(
    config.usersGroups
      .filter((value) => value.isNotice)
      .map((value) => value.groupUsers ?? [])
      .flat(),
  );

  const toastConfig: ToastConfig = {
    title: {
      text: "Notice",
      color: "red",
    },
    msg: {
      text: `Unfamiliar Player ${player} appeared at\n Position ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
      color: "red",
    },
  };
  for (const targetPlayer of noticeTargetPlayers) {
    if (!onlinePlayers.includes(targetPlayer)) continue;
    sendToast(toastConfig, targetPlayer);
  }
}

function sendWarn(player: string) {
  const warnMsg = `Not Allowed Player ${player} Break in Home `;
  log.warn(warnMsg);

  sendToast(config.warnToastConfig, player);
  chatBox.sendFormattedMessageToPlayer(
    safeParseTextComponent(config.warnToastConfig.msg, player),
    player,
    "AccessControl",
    "[]",
    undefined,
    undefined,
    true,
  );
}

function watchLoop() {
  while (true) {
    for (const player of watchPlayersInfo) {
      if (inRangePlayers.includes(player.name)) {
        const playerInfo = playerDetector.getPlayerPos(player.name);

        // Notice
        if (player.hasNoticeTimes < config.noticeTimes) {
          sendNotice(player.name, playerInfo);
          player.hasNoticeTimes += 1;
        }

        // Warn
        if (config.isWarn) sendWarn(player.name);

        // Record
        log.warn(
          `${player.name} appear at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
        );
      } else {
        // Get rid of player from list
        watchPlayersInfo = watchPlayersInfo.filter(
          (value) => value.name != player.name,
        );
      }
    }

    os.sleep(config.watchInterval);
  }
}

function mainLoop() {
  while (true) {
    const players = playerDetector.getPlayersInRange(config.detectRange);
    if (DEBUG) {
      const playersList = "[ " + players.join(",") + " ]";
      log.debug(`Detected ${players.length} players: ${playersList}`);
    }

    for (const player of players) {
      if (inRangePlayers.includes(player)) continue;

      if (config.adminGroupConfig.groupUsers.includes(player)) {
        log.info(`Admin ${player} appear`);
        continue;
      }

      // New player appear
      const playerInfo = playerDetector.getPlayerPos(player);
      let groupConfig: UserGroupConfig = {
        groupName: "Unfamiliar",
        groupUsers: [],
        isAllowed: false,
        isNotice: false,
      };
      for (const userGroupConfig of config.usersGroups) {
        if (userGroupConfig.groupUsers == undefined) continue;
        if (!userGroupConfig.groupUsers.includes(player)) continue;

        groupConfig = userGroupConfig;
        log.info(
          `${groupConfig.groupName} ${player} appear at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
        );

        break;
      }
      if (groupConfig.isAllowed) continue;

      log.warn(
        `${groupConfig.groupName} ${player} appear at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
      );
      if (config.isWarn) sendWarn(player);
      watchPlayersInfo.push({ name: player, hasNoticeTimes: 0 });
    }

    inRangePlayers = players;
    os.sleep(config.detectInterval);
  }
}

function keyboardLoop() {
  while (true) {
    const [eventType, key] = os.pullEvent("key");
    if (eventType === "key" && key === keys.c) {
      log.info("Launching Access Control TUI...");
      try {
        launchAccessControlTUI();
        log.info("TUI closed, resuming normal operation");
      } catch (error) {
        log.error(`TUI error: ${textutils.serialise(error as object)}`);
      }
    }
  }
}

function main(args: string[]) {
  log.info("Starting access control system, get args: " + args.join(", "));
  if (args.length == 1) {
    if (args[0] == "start") {
      // 创建CLI处理器
      const cli = createAccessControlCLI(
        config,
        configFilepath,
        log,
        chatBox,
        groupNames,
      );

      print(
        "Access Control System started. Press 'c' to open configuration TUI.",
      );
      parallel.waitForAll(
        () => {
          mainLoop();
        },
        () => {
          void cli.startConfigLoop();
        },
        () => {
          watchLoop();
        },
        () => {
          keyboardLoop();
        },
      );
      return;
    } else if (args[0] == "config") {
      log.info("Launching Access Control TUI...");
      try {
        launchAccessControlTUI();
      } catch (error) {
        log.error(`TUI error: ${textutils.serialise(error as object)}`);
      }
      return;
    }
  }

  print(`Usage: accesscontrol start | config`);
  print("  start  - Start the access control system with monitoring");
  print("  config - Open configuration TUI");
}

try {
  main(args);
} catch (error: unknown) {
  log.error(textutils.serialise(error as object));
} finally {
  log.close();
}
