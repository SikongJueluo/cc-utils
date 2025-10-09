import { CCLog, DAY } from "@/lib/ccLog";
import { ToastConfig, UserGroupConfig, loadConfig, setLog } from "./config";
import { createAccessControlCLI } from "./cli";
import * as peripheralManager from "../lib/PeripheralManager";

const DEBUG = false;
const args = [...$vararg];

// Init Log
const log = new CCLog("accesscontrol.log", DAY);
setLog(log);

// Load Config
const configFilepath = `${shell.dir()}/access.config.json`;
const config = loadConfig(configFilepath);
log.info("Load config successfully!");
if (DEBUG) log.debug(textutils.serialise(config, { allow_repetitions: true }));
const groupNames = config.usersGroups.map((value) => value.groupName);
let warnTargetPlayers: string[];
const playerDetector = peripheralManager.findByNameRequired("playerDetector");
const chatBox = peripheralManager.findByNameRequired("chatBox");

let inRangePlayers: string[] = [];
let notAllowedPlayers: string[] = [];

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

function sendToast(
  toastConfig: ToastConfig,
  player: string,
  groupConfig?: UserGroupConfig,
) {
  return chatBox.sendFormattedToastToPlayer(
    safeParseTextComponent(
      toastConfig.msg ?? config.defaultToastConfig.msg,
      player,
      groupConfig?.groupName,
    ),
    safeParseTextComponent(
      toastConfig.title ?? config.defaultToastConfig.title,
      player,
      groupConfig?.groupName,
    ),
    player,
    toastConfig.prefix ?? config.defaultToastConfig.prefix,
    toastConfig.brackets ?? config.defaultToastConfig.brackets,
    toastConfig.bracketColor ?? config.defaultToastConfig.bracketColor,
    undefined,
    true,
  );
}

function sendWarnAndNotice(player: string) {
  const playerPos = playerDetector.getPlayerPos(player);
  const onlinePlayers = playerDetector.getOnlinePlayers();
  warnTargetPlayers = config.adminGroupConfig.groupUsers.concat(
    config.usersGroups
      .filter((value) => value.isNotice)
      .map((value) => value.groupUsers ?? [])
      .flat(),
  );

  const warnMsg = `Not Allowed Player ${player} Break in Home at Position ${playerPos?.x}, ${playerPos?.y}, ${playerPos?.z}`;
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

  for (const targetPlayer of warnTargetPlayers) {
    if (!onlinePlayers.includes(targetPlayer)) continue;
    chatBox.sendFormattedMessageToPlayer(
      textutils.serialise({
        text: warnMsg,
        color: "red",
      } as MinecraftTextComponent),
      targetPlayer,
      "AccessControl",
      "[]",
      undefined,
      undefined,
      true,
    );
  }
}

function warnLoop() {
  while (true) {
    for (const player of notAllowedPlayers) {
      if (inRangePlayers.includes(player)) {
        // sendWarnAndNotice(player);
      } else {
        notAllowedPlayers = notAllowedPlayers.filter(
          (value) => value != player,
        );
      }
    }

    os.sleep(config.warnInterval);
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
        log.info(`Admin ${player} enter`);
        sendToast(
          config.adminGroupConfig.toastConfig ?? config.defaultToastConfig,
          player,
          config.adminGroupConfig,
        );
        continue;
      }

      let inUserGroup = false;
      for (const userGroupConfig of config.usersGroups) {
        if (userGroupConfig.groupUsers == undefined) continue;
        if (!userGroupConfig.groupUsers.includes(player)) continue;

        if (!userGroupConfig.isAllowed) {
          sendWarnAndNotice(player);
          notAllowedPlayers.push(player);
          continue;
        }

        log.info(`${userGroupConfig.groupName} ${player} enter`);
        sendToast(
          userGroupConfig.toastConfig ?? config.defaultToastConfig,
          player,
          userGroupConfig,
        );

        inUserGroup = true;
      }
      if (inUserGroup) continue;

      sendWarnAndNotice(player);
      notAllowedPlayers.push(player);
    }

    inRangePlayers = players;
    os.sleep(config.detectInterval);
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

      parallel.waitForAll(
        () => {
          mainLoop();
        },
        () => {
          void cli.startConfigLoop();
        },
        () => {
          warnLoop();
        },
      );
      return;
    }
  }

  print(`Usage: accesscontrol start`);
}

try {
  main(args);
} catch (error: unknown) {
  log.error(textutils.serialise(error as object));
} finally {
  log.close();
}
