import { SortedArray } from "@/lib/SortedArray";

function assert(condition: boolean, message: string) {
  if (!condition) {
    error(message);
  }
}

function assertDeepEquals(actual: object, expect: object, message: string) {
  const jsonExpect = textutils.serialiseJSON(expect, {
    allow_repetitions: true,
  });
  const jsonActual = textutils.serialiseJSON(actual, {
    allow_repetitions: true,
  });
  if (jsonExpect !== jsonActual) {
    error(`${message}: expected ${jsonExpect}, got ${jsonActual}`);
  }
}

export function testSortedArray() {
  print("Testing SortedArray...");

  // Test constructor
  const sortedArray = new SortedArray<string>();
  assert(
    sortedArray.toArray().length === 0,
    "Constructor: initial length should be 0",
  );

  // Test push (FIFO)
  const fifoArray = new SortedArray<string>([]);
  fifoArray.push({ priority: 2, data: "b" });
  fifoArray.push({ priority: 1, data: "a" });
  fifoArray.push({ priority: 3, data: "c" });
  fifoArray.push({ priority: 2, data: "b2" });
  assertDeepEquals(fifoArray.toArray(), ["a", "b", "b2", "c"], "Push (FIFO)");

  // Test shift
  const shiftedValue = fifoArray.shift();
  assert(shiftedValue === "a", "Shift: should return the first element");
  assertDeepEquals(
    fifoArray.toArray(),
    ["b", "b2", "c"],
    "Shift: array should be modified",
  );

  // Test pop
  const poppedValue = fifoArray.pop();
  assert(poppedValue === "c", "Pop: should return the last element");
  assertDeepEquals(
    fifoArray.toArray(),
    ["b", "b2"],
    "Pop: array should be modified",
  );

  // Test clear
  fifoArray.clear();
  assert(fifoArray.toArray().length === 0, "Clear: array should be empty");

  print("SortedArray tests passed!");
}
