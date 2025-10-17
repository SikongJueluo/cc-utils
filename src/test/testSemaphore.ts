import { Semaphore } from "@/lib/Semaphore";

function assert(condition: boolean, message: string) {
  if (!condition) {
    error(message);
  }
}

async function testBasicAcquireRelease() {
  print("  Running test: testBasicAcquireRelease");
  const s = new Semaphore(1);
  assert(s.getValue() === 1, "Initial value should be 1");

  const [, release] = await s.acquire();
  assert(s.getValue() === 0, "Value after acquire should be 0");

  release();
  assert(s.getValue() === 1, "Value after release should be 1");
  print("  Test passed: testBasicAcquireRelease");
}

async function testRunExclusive() {
  print("  Running test: testRunExclusive");
  const s = new Semaphore(1);
  let inside = false;
  await s.runExclusive(() => {
    inside = true;
    assert(s.isLocked(), "Should be locked inside runExclusive");
    assert(s.getValue() === 0, "Value should be 0 inside runExclusive");
  });
  assert(inside, "Callback should have been executed");
  assert(!s.isLocked(), "Should be unlocked after runExclusive");
  assert(s.getValue() === 1, "Value should be 1 after runExclusive");
  print("  Test passed: testRunExclusive");
}

function testTryAcquire() {
  print("  Running test: testTryAcquire");
  const s = new Semaphore(1);
  const release1 = s.tryAcquire();
  assert(release1 !== null, "tryAcquire should succeed");
  assert(s.getValue() === 0, "Value should be 0 after tryAcquire");

  const release2 = s.tryAcquire();
  assert(release2 === null, "tryAcquire should fail when locked");

  release1!();
  assert(s.getValue() === 1, "Value should be 1 after release");

  const release3 = s.tryAcquire();
  assert(release3 !== null, "tryAcquire should succeed again");
  release3!();
  print("  Test passed: testTryAcquire");
}

async function testQueueing() {
  print("  Running test: testQueueing");
  const s = new Semaphore(1);
  const events: string[] = [];

  // Take the lock
  const [, release1] = await s.acquire();
  events.push("acquired1");

  // These two will be queued
  await s.acquire().then(([, release]) => {
    events.push("acquired2");
    sleep(0.1);
    release();
    events.push("released2");
  });

  await s.acquire().then(([, release]) => {
    events.push("acquired3");
    release();
    events.push("released3");
  });

  // Give some time for promises to queue
  sleep(0.1);
  assert(events.length === 1, "Only first acquire should have completed");

  // Release the first lock, allowing the queue to proceed
  release1();
  events.push("released1");

  // Wait for all promises to finish
  sleep(0.5);

  const expected = [
    "acquired1",
    "released1",
    "acquired2",
    "released2",
    "acquired3",
    "released3",
  ];
  assert(
    textutils.serialiseJSON(events) === textutils.serialiseJSON(expected),
    `Event order incorrect: got ${textutils.serialiseJSON(events)}`,
  );
  print("  Test passed: testQueueing");
}

async function testPriority() {
  print("  Running test: testPriority");
  const s = new Semaphore(1);
  const events: string[] = [];

  const [, release1] = await s.acquire();
  events.push("acquired_main");

  // Queue with low priority
  await s.acquire(1, 10).then(([, release]) => {
    events.push("acquired_low_prio");
    release();
  });

  // Queue with high priority
  await s.acquire(1, 1).then(([, release]) => {
    events.push("acquired_high_prio");
    release();
  });

  sleep(0.1);
  release1();
  sleep(0.1);

  const expected = ["acquired_main", "acquired_high_prio", "acquired_low_prio"];
  assert(
    textutils.serialiseJSON(events) === textutils.serialiseJSON(expected),
    `Priority order incorrect: got ${textutils.serialiseJSON(events)}`,
  );
  print("  Test passed: testPriority");
}

async function testWaitForUnlock() {
  print("  Running test: testWaitForUnlock");
  const s = new Semaphore(1);
  let waited = false;

  const [, release] = await s.acquire();
  assert(s.isLocked(), "Semaphore should be locked");

  await s.waitForUnlock().then(() => {
    waited = true;
    assert(!s.isLocked(), "Should be unlocked when wait is over");
  });

  sleep(0.1);
  assert(!waited, "waitForUnlock should not resolve yet");

  release();
  sleep(0.1);
  assert(waited, "waitForUnlock should have resolved");
  print("  Test passed: testWaitForUnlock");
}

async function testCancel() {
  print("  Running test: testCancel");
  const cancelError = new Error("Canceled for test");
  const s = new Semaphore(1, cancelError);
  let rejected = false;

  const [, release] = await s.acquire();

  s.acquire().then(
    () => {
      assert(false, "acquire should have been rejected");
    },
    (err) => {
      assert(err === cancelError, "acquire rejected with wrong error");
      rejected = true;
    },
  );

  sleep(0.1);
  s.cancel();
  sleep(0.1);

  assert(rejected, "pending acquire should have been rejected");
  assert(s.getValue() === 0, "cancel should not affect current lock");

  release();
  assert(s.getValue() === 1, "release should still work");
  print("  Test passed: testCancel");
}

export async function testSemaphore() {
  print("Testing Semaphore...");
  await testBasicAcquireRelease();
  await testRunExclusive();
  testTryAcquire();
  await testQueueing();
  await testPriority();
  await testWaitForUnlock();
  await testCancel();
  print("Semaphore tests passed!");
}
