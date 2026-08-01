// --- Service Startup Diagnostic Logging ---
import cryptoModule from "node:crypto";
import fs from "fs";

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = cryptoModule.webcrypto ?? {
    getRandomValues(buffer) {
      return cryptoModule.getRandomValues(buffer);
    },
    randomUUID() {
      return cryptoModule.randomUUID();
    },
    subtle: cryptoModule.webcrypto?.subtle,
  };
}

import { initialize, shutdown } from "./system/lifecycle.js";
import { logger } from "./utils/logger.js";

try {
  fs.appendFileSync(
    "service.log",
    `[${new Date().toISOString()}] Service script started\n`
  );
} catch (e) {
  // If logging fails, ignore
}

async function main() {
  logger.info("SpeyPOS service starting...");

  try {
    await initialize();
    logger.info("System initialized successfully.");
  } catch (error) {
    logger.error("Failed to initialize system.", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Received SIGINT. Shutting down gracefully...");
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM. Shutting down gracefully...");
  await shutdown();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception.", {
    error: error.message,
    stack: error.stack,
  });
  // In a real scenario, we might try a graceful shutdown here, but for now, we exit.
  // The watchdog will handle cleanup on the next startup.
  process.exit(1);
});

main();
