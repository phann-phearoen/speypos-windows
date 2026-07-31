import * as shiftRepo from '../storage/repositories/shift.repo.js';
import * as orderRepo from '../storage/repositories/order.repo.js';
import * as businessDayService from './business-day.service.js';
import { logger } from '../utils/logger.js';
import { sendTelegramEvent } from './telegram.service.js';
import { formatDayCloseMessage } from './telegram.formatter.js';
import { serializeManyShifts } from '../serializers/shift.serializer.js';

/**
 * Retrieves the data needed for a day-close review screen.
 * Fetches all shifts for the given business date (or today if not provided) and all orders within each shift.
 * @param {string|undefined} targetDate - Optional YYYY-MM-DD date.
 * @returns {Promise<object>}
 */
export async function getReviewDataForDayClose(targetDate) {
  const { businessDate, shiftsForDate } = businessDayService.getDayCloseContext({ targetDate });
  logger.info(`Fetching day close review data for date: ${businessDate}`);

  // Use the serializer to add staff data to the shifts
  const serializedShifts = serializeManyShifts(shiftsForDate);

  const shiftsWithOrders = serializedShifts.map(shift => {
    const orders = orderRepo.getAllOrders({ shift_id: shift.id });
    return { ...shift, orders };
  });

  return {
    businessDate,
    shifts: shiftsWithOrders,
  };
}


/**
 * Generates a day-close report by aggregating data from all closed shifts
 * for the given business date (or today if not provided), and sends a Telegram notification.
 * @param {string|undefined} targetDate - Optional YYYY-MM-DD date.
 * @returns {Promise<object>} The generated day close report.
 */
export async function generateDayCloseReport(targetDate) {
  const { businessDate, shiftsForDate } = businessDayService.getDayCloseContext({ targetDate });
  logger.info(`Day close report process started for date: ${businessDate}`);

  businessDayService.assertDayCloseReady({ businessDate, shiftsForDate });

  const closedShifts = shiftsForDate.filter((shift) => shift.status === 'closed');

  const shiftReports = closedShifts.map((shift) => shiftRepo.getShiftSalesReport(shift.id));

  // Combine the two reports
  const combined = {
    totalOrders: 0,
    totalRevenue: 0,
    totalItems: 0,
    revenueByPaymentType: {},
    grandTotalItems: 0,
    voidedOrders: 0,
    voidedAmount: 0,
    voidedItems: 0,
    netRevenue: 0,
  };

  for (const report of shiftReports) {
    combined.totalOrders += report.totalOrders;
    combined.totalRevenue += report.totalRevenue;
    combined.totalItems += report.totalItems;
    combined.voidedOrders += report.voidedOrders || 0;
    combined.voidedAmount += report.voidedAmount || 0;
    combined.voidedItems += report.voidedItems || 0;
    combined.netRevenue += report.netRevenue ?? report.totalRevenue;
    for (const [type, amount] of Object.entries(report.revenueByPaymentType)) {
      if (!combined.revenueByPaymentType[type]) {
        combined.revenueByPaymentType[type] = 0;
      }
      combined.revenueByPaymentType[type] += amount;
    }
    combined.grandTotalItems += report.totalItems;
  }

  const finalReport = {
    businessDate,
    shiftSummaries: shiftReports,
    combinedSummary: combined,
  };
  
  logger.info('Day close report generated successfully.', {
    date: businessDate,
    totalRevenue: combined.totalRevenue,
  });

  return finalReport;
}

export async function sendDayCloseNotification(report) {
  try {
    logger.info('Attempting to send day close report to Telegram...');
    const message = formatDayCloseMessage(report);
    await sendTelegramEvent('SHIFT_TRACKER', message);
    logger.info('Telegram day close report sent successfully or was skipped due to settings.');
  } catch (error) {
    // Notification failures should not fail the close-day API.
    logger.error('Failed to send day close Telegram report.', { error: error.message });
  }
}
