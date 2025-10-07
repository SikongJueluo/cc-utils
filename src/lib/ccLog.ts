enum LogLevel {
  Info = 0,
  Warn = 1,
  Error = 2,
}

export class CCLog {
  private fp: LuaFile | undefined;
  constructor(filename?: string) {
    term.clear();
    term.setCursorPos(1, 1);
    if (filename != undefined && filename.length != 0) {
      const filepath = shell.dir() + "/" + filename;
      const [file, error] = io.open(filepath, fs.exists(filepath) ? "a" : "w+");
      if (file != undefined) {
        this.fp = file;
      } else {
        throw Error(error);
      }
    }
  }

  private getFormatMsg(msg: string, level: LogLevel): string {
    const date = os.date("*t");
    return `[ ${date.year}/${date.month}/${date.day} -- ${date.hour}:${date.min}:${date.sec} ${LogLevel[level]} ] : ${msg}\r\n`;
  }

  public writeLine(msg: string, color?: Color) {
    let originalColor: Color = 0;
    if (color != undefined) {
      originalColor = term.getTextColor();
      term.setTextColor(color);
    }

    // Log
    term.write(msg);
    if (this.fp != undefined) {
      this.fp.write(msg);
    }

    if (color != undefined) {
      term.setTextColor(originalColor);
    }

    // Next line
    term.setCursorPos(1, term.getCursorPos()[1] + 1);
  }

  public info(msg: string) {
    this.writeLine(this.getFormatMsg(msg, LogLevel.Info), colors.green);
  }

  public warn(msg: string) {
    this.writeLine(this.getFormatMsg(msg, LogLevel.Warn), colors.orange);
  }

  public error(msg: string) {
    this.writeLine(this.getFormatMsg(msg, LogLevel.Error), colors.red);
  }

  public close() {
    if (this.fp !== undefined) {
      this.fp.close();
      this.fp = undefined;
    }
  }
}
