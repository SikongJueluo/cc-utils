import { SortedArray } from "../datatype/SortedArray";

const E_CANCELED = new Error("Request canceled");
// const E_INSUFFICIENT_RESOURCES = new Error("Insufficient resources");

interface QueueEntry {
  resolve(result: [number, () => void]): void;
  reject(error: unknown): void;
  weight: number;
}

interface Waiter {
  resolve(): void;
}

type Releaser = () => void;

export class Semaphore {
  private _value: number;
  private _cancelError: Error;
  private _queue = new SortedArray<QueueEntry>();
  private _waiters = new SortedArray<Waiter>();

  constructor(value: number, cancelError: Error = E_CANCELED) {
    if (value < 0) {
      throw new Error("Semaphore value must be non-negative");
    }
    this._value = value;
    this._cancelError = cancelError;
  }

  acquire(weight = 1, priority = 0): Promise<[number, Releaser]> {
    if (weight <= 0) {
      throw new Error(`invalid weight ${weight}: must be positive`);
    }

    return new Promise((resolve, reject) => {
      const entry: QueueEntry = { resolve, reject, weight };

      if (this._queue.toArray().length === 0 && weight <= this._value) {
        this._dispatchItem(entry);
      } else {
        this._queue.push({ priority, data: entry });
      }
    });
  }

  tryAcquire(weight = 1): Releaser | undefined {
    if (weight <= 0) {
      throw new Error(`invalid weight ${weight}: must be positive`);
    }

    if (weight > this._value || this._queue.toArray().length > 0) {
      return undefined;
    }

    this._value -= weight;
    return this._newReleaser(weight);
  }

  async runExclusive<T>(
    callback: (value: number) => T | Promise<T>,
    weight = 1,
    priority = 0,
  ): Promise<T> {
    const [value, release] = await this.acquire(weight, priority);
    try {
      return await callback(value);
    } finally {
      release();
    }
  }

  waitForUnlock(weight = 1, priority = 0): Promise<void> {
    if (weight <= 0) {
      throw new Error(`invalid weight ${weight}: must be positive`);
    }

    if (this._couldLockImmediately(weight)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const waiter: Waiter = { resolve };
      this._waiters.push({ priority, data: waiter });
    });
  }

  isLocked(): boolean {
    return this._value <= 0;
  }

  getValue(): number {
    return this._value;
  }

  setValue(value: number): void {
    if (value < 0) {
      throw new Error("Semaphore value must be non-negative");
    }
    this._value = value;
    this._dispatchQueue();
  }

  release(weight = 1): void {
    if (weight <= 0) {
      throw new Error(`invalid weight ${weight}: must be positive`);
    }
    this._value += weight;
    this._dispatchQueue();
  }

  cancel(): void {
    const queueItems = this._queue.toArray();
    queueItems.forEach((entry) => entry.reject(this._cancelError));
    this._queue.clear();

    const waiters = this._waiters.toArray();
    waiters.forEach((waiter) => waiter.resolve());
    this._waiters.clear();
  }

  private _dispatchQueue(): void {
    this._drainWaiters();

    let next = this._peek();
    while (next && next.weight <= this._value) {
      const item = this._queue.shift();
      if (item) {
        this._dispatchItem(item);
      }
      this._drainWaiters();
      next = this._peek();
    }
  }

  private _dispatchItem(item: QueueEntry): void {
    const previousValue = this._value;
    this._value -= item.weight;
    item.resolve([previousValue, this._newReleaser(item.weight)]);
  }

  private _peek(): QueueEntry | undefined {
    return this._queue.peek();
  }

  private _newReleaser(weight: number): Releaser {
    let called = false;
    return () => {
      if (called) return;
      called = true;
      this.release(weight);
    };
  }

  private _drainWaiters(): void {
    const waiters = this._waiters.toArray();
    if (waiters.length === 0) return;

    // If no queue or resources available, resolve all waiters
    const hasQueue = this._queue.toArray().length > 0;
    if (!hasQueue || this._value > 0) {
      waiters.forEach((waiter) => waiter.resolve());
      this._waiters.clear();
    }
  }

  private _couldLockImmediately(weight: number): boolean {
    return this._queue.toArray().length === 0 && weight <= this._value;
  }
}
