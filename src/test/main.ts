import { testTimeBasedRotation } from "./testCCLog";
import { testSortedArray } from "./testSortedArray";
import { testSemaphore } from "./testSemaphore";
import { testReadWriteLock } from "./testReadWriteLock";

testTimeBasedRotation();
testSortedArray();
testSemaphore()
  .then(() => {
    print("Semaphore test completed");
    return testReadWriteLock();
  })
  .catch((error) => {
    print(`Semaphore test failed: ${error}`);
  });
testReadWriteLock()
  .then(() => {
    print("ReadWriteLock test completed");
  })
  .catch((error) => {
    print(`Test failed: ${error}`);
  });
