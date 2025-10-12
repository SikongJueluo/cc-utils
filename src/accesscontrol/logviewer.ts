/**
 * Access Control Log Viewer
 * Simple log viewer that allows launching the TUI with 'c' key
 */

import { launchAccessControlTUI } from "./tui";

const args = [...$vararg];

function displayLog(filepath: string, lines = 20) {
  const [file] = io.open(filepath, "r");
  if (!file) {
    print(`Failed to open log file: ${filepath}`);
    return;
  }

  const content = file.read("*a");
  file.close();

  if (content === null || content === undefined || content === "") {
    print("Log file is empty");
    return;
  }

  const logLines = content.split("\n");
  const startIndex = Math.max(0, logLines.length - lines);
  const displayLines = logLines.slice(startIndex);

  term.clear();
  term.setCursorPos(1, 1);

  print("=== Access Control Log Viewer ===");
  print("Press 'c' to open configuration TUI, 'q' to quit, 'r' to refresh");
  print("==========================================");
  print("");

  for (const line of displayLines) {
    if (line.trim() !== "") {
      print(line);
    }
  }

  print("");
  print("==========================================");
  print(`Showing last ${displayLines.length} lines of ${filepath}`);
}

function main(args: string[]) {
  const logFilepath = args[0] || `${shell.dir()}/accesscontrol.log`;
  const lines = args[1] ? parseInt(args[1]) : 20;

  if (isNaN(lines) || lines <= 0) {
    print("Usage: logviewer [logfile] [lines]");
    print("  logfile - Path to log file (default: accesscontrol.log)");
    print("  lines   - Number of lines to display (default: 20)");
    return;
  }

  let running = true;

  // Initial display
  displayLog(logFilepath, lines);

  while (running) {
    const [eventType, key] = os.pullEvent();

    if (eventType === "key") {
      if (key === keys.c) {
        // Launch TUI
        print("Launching Access Control TUI...");
        try {
          launchAccessControlTUI();
          // Refresh display after TUI closes
          displayLog(logFilepath, lines);
        } catch (error) {
          if (error === "TUI_CLOSE" || error === "Terminated") {
            displayLog(logFilepath, lines);
          } else {
            print(`TUI error: ${String(error)}`);
            os.sleep(2);
            displayLog(logFilepath, lines);
          }
        }
      } else if (key === keys.q) {
        // Quit
        running = false;
      } else if (key === keys.r) {
        // Refresh
        displayLog(logFilepath, lines);
      }
    } else if (eventType === "terminate") {
      running = false;
    }
  }

  term.clear();
  term.setCursorPos(1, 1);
  print("Log viewer closed.");
}

try {
  main(args);
} catch (error) {
  if (error === "Terminated") {
    print("Log viewer terminated by user.");
  } else {
    print("Error in log viewer:");
    printError(error);
  }
}
