import { ReadWriteLock } from "../lib/ReadWriteLock";

function assert(condition: boolean, message: string) {
  if (!condition) {
    error(message);
  }
}

export async function testReadWriteLock() {
  print("Testing ReadWriteLock...");

  async function testMultipleReaders() {
    const lock = new ReadWriteLock(3);
    const reader1 = await lock.acquireRead();
    const reader2 = await lock.acquireRead();
    assert(
      lock.getActiveReaders() === 2,
      "allows multiple readers: active readers should be 2",
    );
    reader1.release();
    assert(
      lock.getActiveReaders() === 1,
      "allows multiple readers: active readers should be 1",
    );
    reader2.release();
    assert(
      lock.getActiveReaders() === 0,
      "allows multiple readers: active readers should be 0",
    );
    print("testMultipleReaders passed");
  }

  async function testSingleWriter() {
    const lock = new ReadWriteLock(3);
    const writer = await lock.acquireWrite();
    assert(
      lock.isWriteLocked() === true,
      "allows only one writer: isWriteLocked should be true",
    );
    writer.release();
    assert(
      lock.isWriteLocked() === false,
      "allows only one writer: isWriteLocked should be false",
    );
    print("testSingleWriter passed");
  }

  async function testWriterBlocksReaders() {
    const lock = new ReadWriteLock(3);
    const writer = await lock.acquireWrite();
    let readerAcquired = false;
    const _ = lock.acquireRead().then(() => {
      readerAcquired = true;
    });
    assert(
      !readerAcquired,
      "blocks readers when a writer has the lock: reader should not be acquired yet",
    );
    writer.release();
    assert(
      readerAcquired,
      "blocks readers when a writer has the lock: reader should be acquired now",
    );
    print("testWriterBlocksReaders passed");
  }

  async function testReaderBlocksWriters() {
    const lock = new ReadWriteLock(3);
    const reader = await lock.acquireRead();
    let writerAcquired = false;
    const _ = lock.acquireWrite().then(() => {
      writerAcquired = true;
    });
    assert(
      !writerAcquired,
      "blocks writers when a reader has the lock: writer should not be acquired yet",
    );
    reader.release();
    assert(
      writerAcquired,
      "blocks writers when a reader has the lock: writer should be acquired now",
    );
    print("testReaderBlocksWriters passed");
  }

  function testTryAcquireRead() {
    const lock = new ReadWriteLock(1);
    const reader1 = lock.tryAcquireRead();
    assert(
      reader1 !== null,
      "tryAcquireRead works: first reader should be acquired",
    );
    const reader2 = lock.tryAcquireRead();
    assert(
      reader2 === null,
      "tryAcquireRead works: second reader should not be acquired",
    );
    reader1!.release();
    const reader3 = lock.tryAcquireRead();
    assert(
      reader3 !== null,
      "tryAcquireRead works: third reader should be acquired",
    );
    reader3!.release();
    print("testTryAcquireRead passed");
  }

  function testTryAcquireWrite() {
    const lock = new ReadWriteLock();
    const writer1 = lock.tryAcquireWrite();
    assert(
      writer1 !== null,
      "tryAcquireWrite works: first writer should be acquired",
    );
    const writer2 = lock.tryAcquireWrite();
    assert(
      writer2 === null,
      "tryAcquireWrite works: second writer should not be acquired",
    );
    writer1!.release();
    const writer3 = lock.tryAcquireWrite();
    assert(
      writer3 !== null,
      "tryAcquireWrite works: third writer should be acquired",
    );
    writer3!.release();
    print("testTryAcquireWrite passed");
  }

  async function testRunWithReadLock() {
    const lock = new ReadWriteLock();
    let value = 0;
    await lock.runWithReadLock(() => {
      value = 1;
    });
    assert(value === 1, "runWithReadLock works: value should be 1");
    print("testRunWithReadLock passed");
  }

  async function testRunWithWriteLock() {
    const lock = new ReadWriteLock();
    let value = 0;
    await lock.runWithWriteLock(() => {
      value = 1;
    });
    assert(value === 1, "runWithWriteLock works: value should be 1");
    print("testRunWithWriteLock passed");
  }

  await testMultipleReaders();
  await testSingleWriter();
  await testWriterBlocksReaders();
  await testReaderBlocksWriters();
  testTryAcquireRead();
  testTryAcquireWrite();
  await testRunWithReadLock();
  await testRunWithWriteLock();

  print("ReadWriteLock tests passed!");
}
