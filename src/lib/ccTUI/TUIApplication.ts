import { CCLog, DAY } from "../ccLog";
import { UIWindow } from "./UIWindow";
import { UIComponent } from "./UIComponent";
import { KeyEvent, CharEvent, TimerEvent, pullEventAs } from "../event";

/**
 * Main TUI Application class
 */
export class TUIApplication {
  private log = new CCLog(`TUI.log`, false, DAY);

  private window: UIWindow;
  private running = false;

  constructor() {
    this.window = new UIWindow();
  }

  addComponent(component: UIComponent): void {
    this.window.addComponent(component);
  }

  run(): void {
    this.running = true;

    // Initial render
    term.setCursorBlink(false);
    this.window.render();

    parallel.waitForAll(
      () => {
        this.mainLoop();
      },
      () => {
        this.keyLoop();
      },
      () => {
        this.charLoop();
      },
    );
  }

  stop(): void {
    this.running = false;
    this.log.close();
  }

  mainLoop(): void {
    // Main event loop
    while (this.running) {
      // Render the UI
      this.window.render();

      // Small delay to prevent excessive CPU usage
      os.sleep(0.05);
    }
  }

  keyLoop(): void {
    while (this.running) {
      // Handle input events
      const keyEvent = pullEventAs(KeyEvent, "key");
      this.log.debug(
        `[${TUIApplication.name}]: Get Key Event: ${textutils.serialise(keyEvent ?? {})}`,
      );
      if (keyEvent == undefined) continue;
      this.window.handleKeyInput(keyEvent);
    }
  }

  charLoop(): void {
    while (this.running) {
      // Handle input events
      const charEvent = pullEventAs(CharEvent, "char");
      this.log.debug(
        `[${TUIApplication.name}]: Get Char Event: ${textutils.serialise(charEvent ?? {})}`,
      );
      if (charEvent == undefined) continue;
      this.window.handleCharInput(charEvent);
    }
  }

  timerLoop(): void {
    while (this.running) {
      // Handle events
      const timerEvent = pullEventAs(TimerEvent, "timer");
      this.log.debug(
        `[${TUIApplication.name}]: Get Timer Event: ${textutils.serialise(timerEvent ?? {})}`,
      );
      if (timerEvent == undefined) continue;
      this.window.handleTimerTrigger(timerEvent);
    }
  }

  getWindow(): UIWindow {
    return this.window;
  }
}
