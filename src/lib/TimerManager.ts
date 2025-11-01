import { pullEventAs, TimerEvent } from "./event";
import { Result, Ok, Err, Option, Some, None } from "./thirdparty/ts-result-es";

class TimerManager {
  private isRunning = false;

  private timerTaskMap = new Map<number, () => void>();

  // Don't put heavy logic on callback function
  public setTimeOut(delay: number, callback: () => void): void {
    const timerId = os.startTimer(delay);
    this.timerTaskMap.set(timerId, callback);
  }

  public run() {
    this.isRunning = true;
    while (this.isRunning) {
      const event = pullEventAs(TimerEvent, "timer");
      if (event === undefined) continue;

      const task = this.timerTaskMap.get(event.id);
      if (task === undefined) continue;
      task();
    }
  }

  public stop() {
    this.isRunning = false;
  }

  public status(): boolean {
    return this.isRunning;
  }
}

export const gTimerManager = new TimerManager();
