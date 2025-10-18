import { Semaphore } from "./Semaphore";

const E_CANCELED = new Error("Read-write lock canceled");

export interface ReadLockHandle {
  release(): void;
}

export interface WriteLockHandle {
  release(): void;
}

export class ReadWriteLock {
  private _semaphore: Semaphore;
  private _maxReaders: number;
  private _writerWeight: number;
  private _readerPriority: number;
  private _writerPriority: number;

  constructor(
    maxReaders = 1000,
    readerPriority = 10,
    writerPriority = 0, // Lower number = higher priority
    cancelError: Error = E_CANCELED,
  ) {
    if (maxReaders <= 0) {
      throw new Error("Max readers must be positive");
    }

    this._maxReaders = maxReaders;
    this._writerWeight = maxReaders; // Writers need all capacity for exclusivity
    this._readerPriority = readerPriority;
    this._writerPriority = writerPriority;
    this._semaphore = new Semaphore(maxReaders, cancelError);
  }

  /**
   * Acquires a read lock. Multiple readers can hold the lock simultaneously.
   */
  async acquireRead(): Promise<ReadLockHandle> {
    const [, release] = await this._semaphore.acquire(1, this._readerPriority);

    return { release };
  }

  /**
   * Tries to acquire a read lock immediately. Returns null if not available.
   */
  tryAcquireRead(): ReadLockHandle | null {
    const release = this._semaphore.tryAcquire(1);

    if (release === null) {
      return null;
    }

    return { release };
  }

  /**
   * Acquires a write lock. Only one writer can hold the lock at a time,
   * and it has exclusive access (no readers can access simultaneously).
   */
  async acquireWrite(): Promise<WriteLockHandle> {
    const [, release] = await this._semaphore.acquire(
      this._writerWeight,
      this._writerPriority,
    );

    return { release };
  }

  /**
   * Tries to acquire a write lock immediately. Returns null if not available.
   */
  tryAcquireWrite(): WriteLockHandle | null {
    const release = this._semaphore.tryAcquire(this._writerWeight);

    if (release === null) {
      return null;
    }

    return { release };
  }

  /**
   * Executes a callback with a read lock.
   */
  async runWithReadLock<T>(callback: () => T | Promise<T>): Promise<T> {
    return this._semaphore.runExclusive(
      async () => await callback(),
      1,
      this._readerPriority,
    );
  }

  /**
   * Executes a callback with a write lock (exclusive access).
   */
  async runWithWriteLock<T>(callback: () => T | Promise<T>): Promise<T> {
    return this._semaphore.runExclusive(
      async () => await callback(),
      this._writerWeight,
      this._writerPriority,
    );
  }

  /**
   * Waits until a read lock could be acquired (but doesn't acquire it).
   */
  async waitForReadUnlock(): Promise<void> {
    return this._semaphore.waitForUnlock(1, this._readerPriority);
  }

  /**
   * Waits until a write lock could be acquired (but doesn't acquire it).
   */
  async waitForWriteUnlock(): Promise<void> {
    return this._semaphore.waitForUnlock(
      this._writerWeight,
      this._writerPriority,
    );
  }

  /**
   * Returns true if any locks are currently held.
   */
  isLocked(): boolean {
    return this._semaphore.isLocked();
  }

  /**
   * Returns true if a write lock is currently held (exclusive access).
   */
  isWriteLocked(): boolean {
    return this._semaphore.getValue() <= 0;
  }

  /**
   * Returns true if only read locks are held (no write lock).
   */
  isReadLocked(): boolean {
    const currentValue = this._semaphore.getValue();
    return currentValue < this._maxReaders && currentValue > 0;
  }

  /**
   * Returns the number of available read slots.
   */
  getAvailableReads(): number {
    return Math.max(0, this._semaphore.getValue());
  }

  /**
   * Returns the current number of active readers (approximate).
   */
  getActiveReaders(): number {
    const available = this._semaphore.getValue();
    if (available <= 0) {
      return 0; // Write lock is held
    }
    return this._maxReaders - available;
  }

  /**
   * Cancels all pending lock acquisitions.
   */
  cancel(): void {
    this._semaphore.cancel();
  }

  /**
   * Gets the maximum number of concurrent readers allowed.
   */
  getMaxReaders(): number {
    return this._maxReaders;
  }

  /**
   * Sets the maximum number of concurrent readers.
   * Note: This may affect currently waiting operations.
   */
  setMaxReaders(maxReaders: number): void {
    if (maxReaders <= 0) {
      throw new Error("Max readers must be positive");
    }

    this._maxReaders = maxReaders;
    this._writerWeight = maxReaders;
    this._semaphore.setValue(maxReaders);
  }
}
