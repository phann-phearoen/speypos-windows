/**
 * ESC/POS Transport Layer — Windows USB
 *
 * Sends a raw ESC/POS binary buffer directly to a Windows-installed thermal printer.
 * Uses node-thermal-printer's `raw()` interface to bypass the PDF/Sumatra pipeline.
 *
 * Spec: receipt-printing-spec.yml (transport_layer)
 *   - protocols: USB (Bulk Transfer / Virtual Serial)
 *   - management: Direct port connection, connection timeout 5000ms
 */

import pkg from 'node-thermal-printer';
const { printer: ThermalPrinter, types: PrinterTypes } = pkg;
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const CONNECTION_TIMEOUT_MS = 5000;

/**
 * Sends a raw ESC/POS buffer to a named Windows thermal printer.
 *
 * The printer must be installed in the Windows printer subsystem under the
 * exact name given by `printerName` (e.g., "EPSON TM-T20" or "POS-80").
 *
 * @param {string} printerName - Windows printer name (from env.PRINTER_NAME).
 * @param {Buffer} escPosBuffer - Complete ESC/POS buffer (raster + cut command).
 * @returns {Promise<void>} Resolves on success, rejects with a descriptive error.
 */
export async function sendEscPosBuffer(printerName, escPosBuffer) {
  if (!printerName || typeof printerName !== 'string') {
    throw new Error('sendEscPosBuffer: printerName must be a non-empty string.');
  }

  if (!Buffer.isBuffer(escPosBuffer) || escPosBuffer.length === 0) {
    throw new Error('sendEscPosBuffer: escPosBuffer must be a non-empty Buffer.');
  }

  logger.info('ESC/POS transport: preparing to send buffer to printer', {
    printerName,
    bufferBytes: escPosBuffer.length,
  });

  // Detection for direct paths (e.g. \\localhost\XP80 or /dev/usb/lp0).
  // These use the 'File' interface in node-thermal-printer and do NOT require a driver.
  const isDirectPath = printerName.startsWith('\\\\') || printerName.startsWith('/');

  const options = {
    type: PrinterTypes.EPSON,
    interface: isDirectPath ? printerName : `printer:${printerName}`,
    options: {
      timeout: CONNECTION_TIMEOUT_MS,
    },
  };

  if (!isDirectPath && env.printerDriver) {
    try {
      // Dynamically import the driver specified in ENV
      // node-thermal-printer expects the driver object in the 'driver' property
      const driver = await import(env.printerDriver);
      options.driver = driver.default || driver;
      logger.info(`ESC/POS transport: using driver "${env.printerDriver}"`);
    } catch (err) {
      logger.error(`ESC/POS transport: failed to load driver "${env.printerDriver}"`, {
        error: err.message,
      });
      throw new Error(`Failed to load printer driver: ${env.printerDriver}`);
    }
  }

  const printer = new ThermalPrinter(options);

  // Connection check: fs.existsSync (used by File interface) can be unreliable
  // for UNC paths, so we skip it for direct paths and rely on the execute() catch.
  if (!isDirectPath) {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error(
        `ESC/POS transport: printer "${printerName}" is not connected or not found in Windows.`
      );
    }
  }

  logger.debug('ESC/POS transport: transport ready, sending raw buffer', {
    printerName,
    isDirectPath,
  });

  // Send the ESC/POS buffer directly — no additional commands are added here
  // because the buffer already contains the complete image + cut command.
  printer.raw(escPosBuffer);
  await printer.execute();

  logger.info('ESC/POS transport: buffer sent successfully', {
    printerName,
    bufferBytes: escPosBuffer.length,
  });
}
