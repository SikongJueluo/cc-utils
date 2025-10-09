import { CCLog, DAY } from "@/lib/ccLog";
import {
  ToastConfig,
  UserGroupConfig,
  loadConfig,
  saveConfig,
  setLog,
} from "./config";
import * as peripheralManager from "../lib/PeripheralManager";
import { ChatBoxEvent, pullEventAs } from "@/lib/event";
import { quotestring } from "@sikongjueluo/dkjson-types";

const DEBUG = false;
const args = [...$vararg];

const log = new CCLog("accesscontrol.log", DAY);
setLog(log);

const configFilepath = `${shell.dir()}/access.config.json`;
const config = loadConfig(configFilepath);
log.info("Load config successfully!");
log.debug(textutils.serialise(config, { allow_repetitions: true }));
const groupNames = config.usersGroups.map((value) => value.groupName);
const warnTargetPlayers = config.adminGroupConfig.groupUsers.concat(
  config.usersGroups
    .filter((value) => value.isWarnTarget)
    .map((value) => value.groupUsers ?? [])
    .flat(),
);

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
    quotestring(toastConfig.prefix ?? config.defaultToastConfig.prefix!),
    toastConfig.brackets ?? config.defaultToastConfig.brackets,
    toastConfig.bracketColor ?? config.defaultToastConfig.bracketColor,
    undefined,
    true,
  );
}

function sendWarn(player: string) {
  const playerPos = playerDetector.getPlayerPos(player);
  const onlinePlayers = playerDetector.getOnlinePlayers();

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

function sendCommandHelp(targetPlayer: string) {
  chatBox.sendMessageToPlayer(
    `
      Command Usage: @AC /<Command> [args]
      Command:
        - add <userGroup> <playerName>
            add player to group
            userGroup: ${groupNames.join(", ")}
        - del <userGroup> <playerName>
            delete player in the group, except Admin
            userGroup: ${groupNames.join(", ")}
        - list
            list all of the player with its group
        - set <options> [params]
            config access control settins
            options:
              - warnInterval <number>
                  set the interval of warn, which is not allowed
              - detectInterval <number>
                  set the interval of detecting players
              - detectRange <number>
                  set the sphere range of detect
    `,
    targetPlayer,
    "AccessControl",
    "[]",
    undefined,
    undefined,
    true,
  );
}

function warnLoop() {
  while (true) {
    for (const player of notAllowedPlayers) {
      if (inRangePlayers.includes(player)) {
        sendWarn(player);
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
          sendWarn(player);
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

      sendWarn(player);
      notAllowedPlayers.push(player);
    }

    inRangePlayers = players;
    os.sleep(config.detectInterval);
  }
}

function configLoop() {
  while (true) {
    const ev = pullEventAs(ChatBoxEvent, "chat");

    if (ev == undefined) continue;
    if (!config.adminGroupConfig.groupUsers.includes(ev.username)) continue;
    if (!ev.message.startsWith("@AC")) continue;
    // log.info(`Received "${ev.message}" from admin ${ev.username}`);

    const params = ev.message.split(" ");
    if (params.length < 2) {
      sendCommandHelp(ev.username);
      continue;
    }

    if (params[1] == "/add" && params.length == 4) {
      if (params[2] == "admin") {
        config.adminGroupConfig.groupUsers.push(params[3]);
        chatBox.sendMessageToPlayer(
          `Add player ${params[3]} to admin`,
          ev.username,
          "AccessControl",
        );
      } else if (groupNames.includes(params[2])) {
        const groupConfig = config.usersGroups.find(
          (value) => value.groupName == params[2],
        )!;

        if (groupConfig.groupUsers == undefined)
          groupConfig.groupUsers = [params[3]];
        else groupConfig.groupUsers.push(params[3]);

        chatBox.sendMessageToPlayer(
          `Add player ${params[3]} to ${groupConfig.groupName}`,
          ev.username,
          "AccessControl",
        );
      } else {
        sendCommandHelp(ev.username);
        continue;
      }
    } else if (params[1] == "/del" && params.length == 4) {
      if (params[2] == "admin") {
        chatBox.sendMessageToPlayer(
          `Could't delete admin, please edit config`,
          ev.username,
          "AccessControl",
        );
      } else if (groupNames.includes(params[2])) {
        const groupConfig = config.usersGroups.find(
          (value) => value.groupName == params[2],
        )!;

        if (groupConfig.groupUsers == undefined) groupConfig.groupUsers = [];
        else
          groupConfig.groupUsers = groupConfig.groupUsers.filter(
            (user) => user != params[3],
          );

        chatBox.sendMessageToPlayer(
          `Delete ${groupConfig.groupName} ${params[3]}`,
          ev.username,
          "AccessControl",
        );
      } else {
        sendCommandHelp(ev.username);
        continue;
      }
    } else if (params[1] == "/list") {
      chatBox.sendMessageToPlayer(
        `Admins : [ ${config.adminGroupConfig.groupUsers.join(", ")} ]`,
        ev.username,
        "AccessControl",
      );
      for (const groupConfig of config.usersGroups) {
        chatBox.sendMessageToPlayer(
          `${groupConfig.groupName} : [ ${config.adminGroupConfig.groupUsers.join(", ")} ]`,
          ev.username,
          "AccessControl",
        );
      }
    } else if (params[1] == "/set" && params.length == 4) {
      if (params[2] == "warnInterval") {
        config.warnInterval = parseInt(params[3]);
        chatBox.sendMessageToPlayer(
          `Set warn interval to ${config.warnInterval}`,
          ev.username,
          "AccessControl",
        );
      } else if (params[2] == "detectInterval") {
        config.detectInterval = parseInt(params[3]);
        chatBox.sendMessageToPlayer(
          `Set detect interval to ${config.detectInterval}`,
          ev.username,
          "AccessControl",
        );
      } else if (params[2] == "detectRange") {
        config.detectRange = parseInt(params[3]);
        chatBox.sendMessageToPlayer(
          `Set detect range to ${config.detectRange}`,
          ev.username,
          "AccessControl",
        );
      } else {
        sendCommandHelp(ev.username);
        continue;
      }
    } else {
      sendCommandHelp(ev.username);
      continue;
    }

    saveConfig(config, configFilepath);
  }
}

function main(args: string[]) {
  log.debug("Starting access control system, get args: " + args.join(", "));
  if (args.length == 1) {
    if (args[0] == "start") {
      parallel.waitForAll(
        () => {
          mainLoop();
        },
        () => {
          configLoop();
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
