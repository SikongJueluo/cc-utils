class ccDate {
  private _timestamp: number;

  constructor() {
    this._timestamp = os.time(os.date("*t"));
  }

  public static toDateTable(timestamp: number): LuaDate {
    return os.date("*t", timestamp) as LuaDate;
  }

  public toDateTable(): LuaDate {
    return os.date("*t", this._timestamp) as LuaDate;
  }

  public static toTimestamp(date: LuaDate): number {
    return os.time(date);
  }

  public toTimestamp(): number {
    return this._timestamp;
  }
}

export { ccDate };
