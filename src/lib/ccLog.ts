export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

// Define time interval constants in seconds
export const SECOND = 1;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export interface CCLogInitConfig {
  printTerminal?: boolean;
  logInterval?: number;
  outputMinLevel?: LogLevel;
}

export class CCLog {
  private fp: LuaFile | undefined;
  private filename?: string;
  private logInterval: number;
  private printTerminal: boolean;
  private outputMinLevel: LogLevel;
  private startTime: number;
  private currentTimePeriod: string;

  constructor(filename?: string, config?: CCLogInitConfig) {
    term.clear();
    term.setCursorPos(1, 1);

    this.logInterval = config?.logInterval ?? DAY;
    this.printTerminal = config?.printTerminal ?? true;
    this.outputMinLevel = config?.outputMinLevel ?? LogLevel.Debug;

    this.startTime = os.time(os.date("*t"));
    this.currentTimePeriod = this.getTimePeriodString(this.startTime);

    if (filename != undefined && filename.length != 0) {
      this.filename = filename;
      const filepath = this.generateFilePath(filename, this.currentTimePeriod);
      const [file, error] = io.open(filepath, fs.exists(filepath) ? "a" : "w+");
      if (file != undefined) {
        this.fp = file;
      } else {
        throw Error(error);
      }
    }
  }

  /**
   * Generates a time period string based on the interval
   * For DAY interval: YYYY-MM-DD
   * For HOUR interval: YYYY-MM-DD-HH
   * For MINUTE interval: YYYY-MM-DD-HH-MM
   * For SECOND interval: YYYY-MM-DD-HH-MM-SS
   */
  private getTimePeriodString(time: number): string {
    const periodStart = Math.floor(time / this.logInterval) * this.logInterval;
    const d = os.date("*t", periodStart);

    if (this.logInterval >= DAY) {
      return `${d.year}-${string.format("%02d", d.month)}-${string.format("%02d", d.day)}`;
    } else if (this.logInterval >= HOUR) {
      return `${d.year}-${string.format("%02d", d.month)}-${string.format("%02d", d.day)}_${string.format("%02d", d.hour)}`;
    } else if (this.logInterval >= MINUTE) {
      return `${d.year}-${string.format("%02d", d.month)}-${string.format("%02d", d.day)}_${string.format("%02d", d.hour)}-${string.format("%02d", d.min)}`;
    }
    return `${d.year}-${string.format("%02d", d.month)}-${string.format("%02d", d.day)}_${string.format("%02d", d.hour)}-${string.format("%02d", d.min)}-${string.format("%02d", d.sec)}`;
  }

  private generateFilePath(baseFilename: string, timePeriod: string): string {
    const scriptDir = shell.dir() ?? "";

    const [filenameWithoutExt, extension] = baseFilename.includes(".")
      ? baseFilename.split(".")
      : [baseFilename, "log"];

    return fs.combine(
      scriptDir,
      `${filenameWithoutExt}_${timePeriod}.${extension}`,
    );
  }

  private checkAndRotateLogFile() {
    if (this.filename != undefined && this.filename.length != 0) {
      const currentTime = os.time(os.date("*t"));
      const currentTimePeriod = this.getTimePeriodString(currentTime);

      // If we're in a new time period, rotate the log file
      if (currentTimePeriod !== this.currentTimePeriod) {
        // Close current file if open
        if (this.fp) {
          this.fp.close();
          this.fp = undefined;
        }

        // Update the current time period
        this.currentTimePeriod = currentTimePeriod;

        // Open new log file for the new time period
        const filepath = this.generateFilePath(
          this.filename,
          this.currentTimePeriod,
        );
        const [file, error] = io.open(
          filepath,
          fs.exists(filepath) ? "a" : "w+",
        );
        if (file != undefined) {
          this.fp = file;
        } else {
          throw Error(error);
        }
      }
    }
  }

  private getFormatMsg(msg: string, level: LogLevel): string {
    const date = os.date("*t");
    return `[ ${date.year}/${String(date.month).padStart(2, "0")}/${String(date.day).padStart(2, "0")}  ${String(date.hour).padStart(2, "0")}:${String(date.min).padStart(2, "0")}:${String(date.sec).padStart(2, "0")} ${LogLevel[level]} ] : ${msg}`;
  }

  public writeLine(msg: string, color?: Color) {
    // Check if we need to rotate the log file
    this.checkAndRotateLogFile();

    if (this.printTerminal) {
      let originalColor: Color = 0;
      if (color != undefined) {
        originalColor = term.getTextColor();
        term.setTextColor(color);
      }
      print(msg);

      if (color != undefined) {
        term.setTextColor(originalColor);
      }
    }

    // Log
    if (this.fp != undefined) {
      this.fp.write(msg + "\r\n");
    }
  }

  public debug(msg: string) {
    if (LogLevel.Debug >= this.outputMinLevel)
      this.writeLine(this.getFormatMsg(msg, LogLevel.Debug), colors.gray);
  }

  public info(msg: string) {
    if (LogLevel.Info >= this.outputMinLevel)
      this.writeLine(this.getFormatMsg(msg, LogLevel.Info), colors.green);
  }

  public warn(msg: string) {
    if (LogLevel.Warn >= this.outputMinLevel)
      this.writeLine(this.getFormatMsg(msg, LogLevel.Warn), colors.orange);
  }

  public error(msg: string) {
    if (LogLevel.Error >= this.outputMinLevel)
      this.writeLine(this.getFormatMsg(msg, LogLevel.Error), colors.red);
  }

  public setInTerminal(value: boolean) {
    this.printTerminal = value;
  }

  public setLogLevel(value: LogLevel) {
    this.outputMinLevel = value;
  }

  public close() {
    if (this.fp !== undefined) {
      this.fp.close();
      this.fp = undefined;
    }
  }
}
