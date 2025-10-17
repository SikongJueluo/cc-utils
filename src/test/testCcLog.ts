import { CCLog, MINUTE, HOUR } from "@/lib/ccLog";

// Test the new time-based rotation functionality
function testTimeBasedRotation() {
  print("Testing time-based log rotation functionality...");

  // Test with default interval (1 day)
  const logger1 = new CCLog("test_log_default.txt");
  logger1.info("This is a test message with default interval (1 day)");

  // Test with custom interval (1 hour)
  const logger2 = new CCLog("test_log_hourly.txt", { logInterval: HOUR });
  logger2.info("This is a test message with 1-hour interval");

  // Test with custom interval (30 minutes)
  const logger3 = new CCLog("test_log_30min.txt", { logInterval: 30 * MINUTE });
  logger3.info("This is a test message with 30-minute interval");

  logger1.close();
  logger2.close();
  logger3.close();

  print("Test completed successfully!");
}

export { testTimeBasedRotation };
