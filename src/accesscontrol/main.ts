import { CCLog, DAY, LogLevel } from "@/lib/ccLog";
import { ToastConfig, UserGroupConfig, loadConfig } from "./config";
import { createAccessControlCLI } from "./cli";
import { launchAccessControlTUI } from "./tui";
import * as peripheralManager from "../lib/PeripheralManager";
import { deepCopy } from "@/lib/common";
import { ReadWriteLock } from "@/lib/mutex/ReadWriteLock";

const args = [...$vararg];

// Init Log
const logger = new CCLog("accesscontrol.log", {
  printTerminal: true,
  logInterval: DAY,
  outputMinLevel: LogLevel.Info,
});

// Load Config
const configFilepath = `${shell.dir()}/access.config.json`;
let config = loadConfig(configFilepath)!;
const configLock = new ReadWriteLock();
logger.info("Load config successfully!");
logger.debug(textutils.serialise(config, { allow_repetitions: true }));

// Peripheral
const playerDetector = peripheralManager.findByNameRequired("playerDetector");
const chatBox = peripheralManager.findByNameRequired("chatBox");

// Global
let inRangePlayers: string[] = [];
let watchPlayersInfo: { name: string; hasNoticeTimes: number }[] = [];

interface ParseParams {
  name?: string;
  group?: string;
  info?: PlayerInfo;
}

function reloadConfig() {
  let releaser = configLock.tryAcquireWrite();
  while (releaser === undefined) {
    sleep(1);
    releaser = configLock.tryAcquireWrite();
  }

  config = loadConfig(configFilepath)!;
  inRangePlayers = [];
  watchPlayersInfo = [];
  releaser.release();
  logger.info("Reload config successfully!");
}

function safeParseTextComponent(
  component: MinecraftTextComponent,
  params?: ParseParams,
): string {
  const newComponent = deepCopy(component);

  if (newComponent.text == undefined) {
    newComponent.text = "Wrong text, please contanct with admin";
  } else if (newComponent.text.includes("%")) {
    newComponent.text = newComponent.text.replace(
      "%playerName%",
      params?.name ?? "UnknowPlayer",
    );
    newComponent.text = newComponent.text.replace(
      "%groupName%",
      params?.group ?? "UnknowGroup",
    );
    newComponent.text = newComponent.text.replace(
      "%playerPosX%",
      params?.info?.x.toString() ?? "UnknowPosX",
    );
    newComponent.text = newComponent.text.replace(
      "%playerPosY%",
      params?.info?.y.toString() ?? "UnknowPosY",
    );
    newComponent.text = newComponent.text.replace(
      "%playerPosZ%",
      params?.info?.z.toString() ?? "UnknowPosZ",
    );
  }
  return textutils.serialiseJSON(newComponent);
}

function sendToast(
  toastConfig: ToastConfig,
  targetPlayer: string,
  params: ParseParams,
) {
  let releaser = configLock.tryAcquireRead();
  while (releaser === undefined) {
    sleep(0.1);
    releaser = configLock.tryAcquireRead();
  }

  chatBox.sendFormattedToastToPlayer(
    safeParseTextComponent(
      toastConfig.msg ?? config.welcomeToastConfig.msg,
      params,
    ),
    safeParseTextComponent(
      toastConfig.title ?? config.welcomeToastConfig.title,
      params,
    ),
    targetPlayer,
    toastConfig.prefix ?? config.welcomeToastConfig.prefix,
    toastConfig.brackets ?? config.welcomeToastConfig.brackets,
    toastConfig.bracketColor ?? config.welcomeToastConfig.bracketColor,
    undefined,
    true,
  );
  releaser.release();
}

function sendNotice(player: string, playerInfo?: PlayerInfo) {
  let releaser = configLock.tryAcquireRead();
  while (releaser === undefined) {
    sleep(0.1);
    releaser = configLock.tryAcquireRead();
  }

  const onlinePlayers = playerDetector.getOnlinePlayers();
  const noticeTargetPlayers = config.adminGroupConfig.groupUsers.concat(
    config.usersGroups
      .filter((value) => value.isNotice)
      .flatMap((value) => value.groupUsers ?? []),
  );
  logger.debug(`noticeTargetPlayers: ${noticeTargetPlayers.join(", ")}`);

  for (const targetPlayer of noticeTargetPlayers) {
    if (!onlinePlayers.includes(targetPlayer)) continue;
    sendToast(config.noticeToastConfig, targetPlayer, {
      name: player,
      info: playerInfo,
    });
    sleep(1);
  }
  releaser.release();
}

function sendWarn(player: string) {
  const warnMsg = `Not Allowed Player ${player} Break in Home `;
  logger.warn(warnMsg);

  let releaser = configLock.tryAcquireRead();
  while (releaser === undefined) {
    sleep(0.1);
    releaser = configLock.tryAcquireRead();
  }

  sendToast(config.warnToastConfig, player, { name: player });
  chatBox.sendFormattedMessageToPlayer(
    safeParseTextComponent(config.warnToastConfig.msg, { name: player }),
    player,
    "AccessControl",
    "[]",
    undefined,
    undefined,
    true,
  );
  releaser.release();
}

function watchLoop() {
  while (true) {
    const releaser = configLock.tryAcquireRead();
    if (releaser === undefined) {
      os.sleep(1);
      continue;
    }

    const watchPlayerNames = watchPlayersInfo.flatMap((value) => value.name);
    logger.debug(`Watch Players [ ${watchPlayerNames.join(", ")} ]`);
    for (const player of watchPlayersInfo) {
      const playerInfo = playerDetector.getPlayerPos(player.name);
      if (inRangePlayers.includes(player.name)) {
        // Notice
        if (player.hasNoticeTimes < config.noticeTimes) {
          sendNotice(player.name, playerInfo);
          player.hasNoticeTimes += 1;
        }

        // Warn
        if (config.isWarn) sendWarn(player.name);

        // Record
        logger.warn(
          `Stranger ${player.name} appear at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
        );
      } else {
        // Get rid of player from list
        watchPlayersInfo = watchPlayersInfo.filter(
          (value) => value.name != player.name,
        );
        logger.info(
          `Stranger ${player.name} has left the range at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
        );
      }
      os.sleep(1);
    }

    releaser.release();
    os.sleep(config.watchInterval);
  }
}

function mainLoop() {
  while (true) {
    const releaser = configLock.tryAcquireRead();
    if (releaser === undefined) {
      os.sleep(0.1);
      continue;
    }

    const players = playerDetector.getPlayersInRange(config.detectRange);
    const playersList = "[ " + players.join(",") + " ]";
    logger.debug(`Detected ${players.length} players: ${playersList}`);

    for (const player of players) {
      if (inRangePlayers.includes(player)) continue;

      if (config.adminGroupConfig.groupUsers.includes(player)) {
        logger.info(`Admin ${player} appear`);
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
        logger.info(
          `${groupConfig.groupName} ${player} appear at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
        );

        break;
      }
      if (groupConfig.isAllowed) continue;

      logger.warn(
        `${groupConfig.groupName} ${player} appear at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
      );
      if (config.isWarn) sendWarn(player);
      watchPlayersInfo = [
        ...watchPlayersInfo,
        { name: player, hasNoticeTimes: 0 },
      ];
    }

    inRangePlayers = players;
    releaser.release();
    os.sleep(config.detectInterval);
  }
}

function keyboardLoop() {
  while (true) {
    const [eventType, key] = os.pullEvent("key");
    if (eventType === "key" && key === keys.c) {
      logger.info("Launching Access Control TUI...");
      try {
        logger.setInTerminal(false);
        launchAccessControlTUI();
        logger.info("TUI closed, resuming normal operation");
      } catch (error) {
        logger.error(`TUI error: ${textutils.serialise(error as object)}`);
      } finally {
        logger.setInTerminal(true);
        reloadConfig();
      }
    }
  }
}

function main(args: string[]) {
  logger.info("Starting access control system, get args: " + args.join(", "));
  if (args.length == 1) {
    if (args[0] == "start") {
      // 创建CLI处理器
      const cli = createAccessControlCLI({
        configFilepath: configFilepath,
        reloadConfig: () => reloadConfig(),
        log: logger,
        chatBox: chatBox,
      });

      print(
        "Access Control System started. Press 'c' to open configuration TUI.",
      );
      parallel.waitForAll(
        () => {
          mainLoop();
        },
        () => {
          cli.startConfigLoop();
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
      logger.info("Launching Access Control TUI...");
      logger.setInTerminal(false);
      try {
        launchAccessControlTUI();
      } catch (error) {
        logger.error(`TUI error: ${textutils.serialise(error as object)}`);
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
  logger.error(textutils.serialise(error as object));
} finally {
  logger.close();
}
