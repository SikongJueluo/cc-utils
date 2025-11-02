import { CCLog, DAY, LogLevel } from "@/lib/ccLog";
import { ToastConfig, UserGroupConfig, loadConfig } from "./config";
import { createAccessControlCli } from "./cli";
import { launchAccessControlTUI } from "./tui";
import * as peripheralManager from "../lib/PeripheralManager";
import { deepCopy } from "@/lib/common";
import { ReadWriteLock } from "@/lib/mutex/ReadWriteLock";
import { ChatManager } from "@/lib/ChatManager";
import { gTimerManager } from "@/lib/TimerManager";
import { KeyEvent, pullEventAs } from "@/lib/event";

const args = [...$vararg];

// Init Log
const logger = new CCLog("accesscontrol.log", {
  printTerminal: true,
  logInterval: DAY,
  outputMinLevel: LogLevel.Debug,
});

// Load Config
const configFilepath = `${shell.dir()}/access.config.json`;
let config = loadConfig(configFilepath)!;
const configLock = new ReadWriteLock();
logger.info("Load config successfully!");
logger.debug(textutils.serialise(config, { allow_repetitions: true }));

// Peripheral
const playerDetector = peripheral.find(
  "playerDetector",
)[0] as PlayerDetectorPeripheral;
const chatBox = peripheral.find("chatBox")[0] as ChatBoxPeripheral;
const chatManager: ChatManager = new ChatManager([chatBox]);

// Global
let gInRangePlayers: string[] = [];
let gWatchPlayersInfo: { name: string; hasNoticeTimes: number }[] = [];
let gIsRunning = true;

interface ParseParams {
  playerName?: string;
  groupName?: string;
  info?: PlayerInfo;
}

function reloadConfig() {
  let releaser = configLock.tryAcquireWrite();
  while (releaser === undefined) {
    sleep(1);
    releaser = configLock.tryAcquireWrite();
  }

  config = loadConfig(configFilepath)!;
  gInRangePlayers = [];
  gWatchPlayersInfo = [];
  releaser.release();
  logger.info("Reload config successfully!");
}

function safeParseTextComponent(
  component: MinecraftTextComponent,
  params?: ParseParams,
): MinecraftTextComponent {
  const newComponent = deepCopy(component);

  if (newComponent.text == undefined) {
    newComponent.text = "Wrong text, please contanct with admin";
  } else if (newComponent.text.includes("%")) {
    newComponent.text = newComponent.text.replace(
      "%playerName%",
      params?.playerName ?? "UnknowPlayer",
    );
    newComponent.text = newComponent.text.replace(
      "%groupName%",
      params?.groupName ?? "UnknowGroup",
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
  return newComponent;
}

function sendMessage(
  toastConfig: ToastConfig,
  targetPlayer: string,
  params: ParseParams,
) {
  let releaser = configLock.tryAcquireRead();
  while (releaser === undefined) {
    sleep(0.1);
    releaser = configLock.tryAcquireRead();
  }

  chatManager.sendMessage({
    message: safeParseTextComponent(
      toastConfig.msg ?? config.welcomeToastConfig.msg,
      params,
    ),
    prefix: toastConfig.prefix ?? config.welcomeToastConfig.prefix,
    brackets: toastConfig.brackets ?? config.welcomeToastConfig.brackets,
    bracketColor:
      toastConfig.bracketColor ?? config.welcomeToastConfig.bracketColor,
    targetPlayer: targetPlayer,
    utf8Support: true,
  });

  releaser.release();
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

  chatManager.sendToast({
    message: safeParseTextComponent(
      toastConfig.msg ?? config.welcomeToastConfig.msg,
      params,
    ),
    title: safeParseTextComponent(
      toastConfig.title ?? config.welcomeToastConfig.title,
      params,
    ),
    prefix: toastConfig.prefix ?? config.welcomeToastConfig.prefix,
    brackets: toastConfig.brackets ?? config.welcomeToastConfig.brackets,
    bracketColor:
      toastConfig.bracketColor ?? config.welcomeToastConfig.bracketColor,
    targetPlayer: targetPlayer,
    utf8Support: true,
  });
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
      playerName: player,
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

  sendToast(config.warnToastConfig, player, { playerName: player });
  chatManager.sendMessage({
    message: safeParseTextComponent(config.warnToastConfig.msg, {
      playerName: player,
    }),
    targetPlayer: player,
    prefix: "AccessControl",
    brackets: "[]",
    utf8Support: true,
  });
  releaser.release();
}

function watchLoop() {
  while (gIsRunning) {
    const releaser = configLock.tryAcquireRead();
    if (releaser === undefined) {
      os.sleep(1);
      continue;
    }

    const watchPlayerNames = gWatchPlayersInfo.flatMap((value) => value.name);
    logger.debug(`Watch Players [ ${watchPlayerNames.join(", ")} ]`);
    for (const player of gWatchPlayersInfo) {
      const playerInfo = playerDetector.getPlayerPos(player.name);
      if (gInRangePlayers.includes(player.name)) {
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
        gWatchPlayersInfo = gWatchPlayersInfo.filter(
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
  while (gIsRunning) {
    const releaser = configLock.tryAcquireRead();
    if (releaser === undefined) {
      os.sleep(0.1);
      continue;
    }

    const players = playerDetector.getPlayersInRange(config.detectRange);
    const playersList = "[ " + players.join(",") + " ]";
    logger.debug(`Detected ${players.length} players: ${playersList}`);

    for (const player of players) {
      if (gInRangePlayers.includes(player)) continue;

      // Get player Info
      const playerInfo = playerDetector.getPlayerPos(player);

      if (config.adminGroupConfig.groupUsers.includes(player)) {
        logger.info(
          `Admin ${player} appear at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
        );
        if (config.adminGroupConfig.isWelcome)
          sendMessage(config.welcomeToastConfig, player, {
            playerName: player,
            groupName: "Admin",
            info: playerInfo,
          });
        continue;
      }

      // New player appear
      let groupConfig: UserGroupConfig = {
        groupName: "Unfamiliar",
        groupUsers: [],
        isAllowed: false,
        isNotice: false,
        isWelcome: false,
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

      if (config.adminGroupConfig.isWelcome)
        sendMessage(config.welcomeToastConfig, player, {
          playerName: player,
          groupName: groupConfig.groupName,
          info: playerInfo,
        });
      if (groupConfig.isAllowed) continue;

      logger.warn(
        `${groupConfig.groupName} ${player} appear at ${playerInfo?.x}, ${playerInfo?.y}, ${playerInfo?.z}`,
      );
      if (config.isWarn) sendWarn(player);
      gWatchPlayersInfo = [
        ...gWatchPlayersInfo,
        { name: player, hasNoticeTimes: 0 },
      ];
    }

    gInRangePlayers = players;
    releaser.release();
    os.sleep(config.detectInterval);
  }
}

function keyboardLoop() {
  while (gIsRunning) {
    const event = pullEventAs(KeyEvent, "key");
    if (event === undefined) continue;

    if (event.key === keys.c) {
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
    } else if (event.key === keys.r) {
      reloadConfig();
    }
    // else if (event.key === keys.q) {
    //   gIsRunning = false;
    // }
  }
}

function cliLoop() {
  let printTargetPlayer: string | undefined;
  const cli = createAccessControlCli({
    configFilepath: configFilepath,
    reloadConfig: () => reloadConfig(),
    logger: logger,
    print: (msg) =>
      chatManager.sendMessage({
        message: msg,
        targetPlayer: printTargetPlayer,
        prefix: "Access Control System",
        brackets: "[]",
        utf8Support: true,
      }),
  });

  while (gIsRunning) {
    const result = chatManager.getReceivedMessage();
    if (result.isErr()) {
      sleep(0.5);
      continue;
    }
    logger.debug(`Received message: ${result.value.message}`);

    const ev = result.value;

    let releaser = configLock.tryAcquireRead();
    while (releaser === undefined) {
      sleep(0.1);
      releaser = configLock.tryAcquireRead();
    }

    const isAdmin = config.adminGroupConfig.groupUsers.includes(ev.username);

    releaser.release();
    if (!isAdmin) continue;
    if (!ev.message.startsWith("@AC")) continue;

    printTargetPlayer = ev.username;
    logger.info(
      `Received command "${ev.message}" from admin ${printTargetPlayer}`,
    );

    const commandArgs = ev.message
      .substring(3)
      .split(" ")
      .filter((s) => s.length > 0);
    logger.debug(`Command arguments: ${commandArgs.join(", ")}`);

    cli(commandArgs);
    printTargetPlayer = undefined;
  }
}

function main(args: string[]) {
  logger.info("Starting access control system, get args: " + args.join(", "));
  if (args.length == 1) {
    if (args[0] == "start") {
      const tutorial: string[] = [];
      tutorial.push("Access Control System started.");
      tutorial.push("\tPress 'c' to open configuration TUI.");
      tutorial.push("\tPress 'r' to reload configuration.");
      print(tutorial.join("\n"));
      parallel.waitForAll(
        () => mainLoop(),
        () => gTimerManager.run(),
        () => cliLoop(),
        () => watchLoop(),
        () => keyboardLoop(),
        () => chatManager.run(),
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
