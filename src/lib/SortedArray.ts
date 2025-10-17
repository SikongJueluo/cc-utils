interface Priority<T> {
  priority: number;
  data: T;
}

export class SortedArray<T> {
  private _data: Priority<T>[];

  constructor(data?: Priority<T>[]) {
    this._data = data ?? [];
  }

  private findIndex(priority: number): number {
    const target = priority + 1;
    let left = 0;
    let right = this._data.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this._data[mid].priority < target) {
        left = mid + 1;
      } else if (this._data[mid].priority > target) {
        right = mid - 1;
      } else {
        right = mid - 1;
      }
    }

    return left - 1;
  }

  public push(value: Priority<T>): void {
    if (this._data.length === 0) {
      this._data.push(value);
      return;
    } else if (this._data.length === 1) {
      if (this._data[0].priority <= value.priority) this._data.push(value);
      else this._data = [value, ...this._data];
      return;
    }

    const index = this.findIndex(value.priority);

    if (index === this._data.length - 1) {
      if (this._data[index].priority <= value.priority) {
        this._data.push(value);
      } else {
        this._data = [
          ...this._data.slice(0, index),
          value,
          ...this._data.slice(index),
        ];
      }
      return;
    }

    const endIndex = index + 1;
    this._data = [
      ...this._data.slice(0, endIndex),
      value,
      ...this._data.slice(endIndex),
    ];
  }

  public shift(): T | undefined {
    const value = this._data.shift();
    return value?.data;
  }

  public pop(): T | undefined {
    const value = this._data.pop();
    return value?.data;
  }

  public toArray(): T[] {
    return this._data.map(({ data }) => data);
  }

  public clear() {
    this._data = [];
  }
}
