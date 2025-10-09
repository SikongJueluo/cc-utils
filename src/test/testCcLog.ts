import { CCLog, MINUTE, HOUR, SECOND } from "@/lib/ccLog";

// Test the new time-based rotation functionality
function testTimeBasedRotation() {
  print("Testing time-based log rotation functionality...");

  // Test with default interval (1 day)
  const logger1 = new CCLog("test_log_default.txt");
  logger1.info("This is a test message with default interval (1 day)");

  // Test with custom interval (1 hour)
  const logger2 = new CCLog("test_log_hourly.txt", HOUR);
  logger2.info("This is a test message with 1-hour interval");

  // Test with custom interval (30 minutes)
  const logger3 = new CCLog("test_log_30min.txt", 30 * MINUTE);
  logger3.info("This is a test message with 30-minute interval");

  // Test with custom interval (5 seconds)
  const logger4 = new CCLog("test_log_5sec.txt", 5 * SECOND);
  logger4.info("This is a test message with 5-second interval");
  for (let i = 0; i < 10; i++) {
    logger4.info(`This is a test message with 5-second interval ${i}`);
    sleep(1);
  }

  logger1.close();
  logger2.close();
  logger3.close();
  logger4.close();

  print("Test completed successfully!");
}

export { testTimeBasedRotation };
