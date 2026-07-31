import * as shiftRepo from '../storage/repositories/shift.repo.js';
import { insertDayClose, getDayClose, getLastBusinessDateBefore, getClosedShiftsCountForDate } from '../storage/repositories/shift.repo.js';
import * as businessDayRepo from '../storage/repositories/business-day.repo.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';
import { serializeManyShifts, serializeShift } from '../serializers/shift.serializer.js';
import * as shiftService from '../services/shift.service.js';
import * as businessDayService from '../services/business-day.service.js';
import { queueShiftCloseCloudFlush } from '../services/outbox.service.js';
import { sendShiftCloseNotification } from '../services/telegram.service.js';

function isBusinessDayEnabled() {
  return process.env.BUSINESS_DAY_ENABLED === 'true';
}

function addBusinessDayFieldsToShift(shift, explicitBusinessDay = null) {
  if (!isBusinessDayEnabled() || !shift) {
    return shift;
  }

  let businessDay = explicitBusinessDay;
  if (!businessDay && shift.business_day_id) {
    businessDay = businessDayRepo.getBusinessDayById(shift.business_day_id);
  }

  if (!businessDay && shift.date) {
    businessDay = businessDayRepo.getByBusinessDate('default', shift.date);
  }

  return {
    ...shift,
    business_day_id: businessDay?.id || null,
    business_day_status: businessDay?.status || null,
  };
}

function addBusinessDayFieldsToShiftList(shifts) {
  if (!isBusinessDayEnabled()) {
    return shifts;
  }

  return shifts.map((shift) => addBusinessDayFieldsToShift(shift));
}

/**
 * Handles the request to get all shifts.
 */
export function getShifts(req, res) {
  try {
    const { date, status } = req.query;
    const filters = {};
    if (date) {
      filters.date = date;
    }
    if (status) {
      filters.status = status;
    }

    const items = shiftRepo.getAllShifts(filters);
    const serialized = serializeManyShifts(items);
    res.status(200).json(addBusinessDayFieldsToShiftList(serialized));
  } catch (error) {
    logger.error('Failed to get shifts', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export function getOpenShifts(req, res) {
  try {
    const filter = { status: 'open' };
    const items = shiftRepo.getAllShifts(filter);
    if (items.length > 0) {
      const serialized = serializeManyShifts(items);
      res.status(200).json(addBusinessDayFieldsToShiftList(serialized));
    } else {
      res.status(404).json({ error: 'No open shifts found' });
    }
  } catch (error) {
    logger.error('Failed to get open shifts', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get a single shift by its ID.
 */
export function getShift(req, res) {
  try {
    const { id } = req.params;
    const item = shiftRepo.getShiftById(id);
    if (item) {
      res.status(200).json(addBusinessDayFieldsToShift(serializeShift(item)));
    } else {
      res.status(404).json({ error: `Shift with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to get shift', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to create a new shift.
 * A shift is typically started with a status of 'open'.
 */
export function createShift(req, res) {
  try {
    const { status = 'open', date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Missing required field: date' });
    }

    const newShiftData = {
      id: randomUUID(),
      status,
      started_at: Date.now(),
      ended_at: null,
      date,
    };

    const createdItem = shiftRepo.createShift(newShiftData);
    res.status(201).json(addBusinessDayFieldsToShift(serializeShift(createdItem)));
  } catch (error) {
    logger.error('Failed to create shift', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to update an existing shift.
 * Commonly used to end a shift by setting its status and ended_at time.
 */
export async function updateShift(req, res) {
  try {
    const { id } = req.params;
    const item = shiftRepo.getShiftById(id);
    if (!item) {
      return res.status(404).json({ error: `Shift with ID ${id} not found` });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body cannot be empty for a PATCH request' });
    }

    const updateData = { ...req.body };
    const isClosingShift = updateData.status === 'closed';

    const { utcDate } = getNowInStoreTime();

    if (isClosingShift && !updateData.ended_at) {
      updateData.ended_at = utcDate.getTime();
    }

    const updatedItem = shiftRepo.updateShift(id, updateData);
    const responseBody = addBusinessDayFieldsToShift(serializeShift(updatedItem));

    // If the shift was closed, generate and send the report.
    if (isClosingShift) {
      const shiftReport = shiftRepo.getShiftSalesReport(id);
      if (shiftReport) {
        // Ensure the ended_at time is the one we just set
        shiftReport.shift.ended_at = updatedItem.ended_at;
        try {
          await sendShiftCloseNotification(shiftReport);
          responseBody.close_delivery = { status: 'completed' };
        } catch (error) {
          logger.error(`Shift ${id} was closed but synchronous close delivery failed`, {
            error: error.message,
          });
          responseBody.close_delivery = {
            status: 'failed',
            message: error.message,
          };
        }

        queueShiftCloseCloudFlush({
          shiftId: id,
          businessDayId: updatedItem.business_day_id || null,
          businessDate: updatedItem.date || null,
        }).catch((err) => {
          logger.error(`Failed to enqueue cloud flush for closed shift ${id}`, {
            error: err.message,
          });
          responseBody.cloud_sync = {
            status: 'queue_failed',
            message: err.message,
          };
        });

        if (!responseBody.cloud_sync) {
          responseBody.cloud_sync = { status: 'queued' };
        }
      }
    }

    res.status(200).json(responseBody);
  } catch (error) {
    logger.error('Failed to update shift', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to delete a shift.
 */
export function deleteShift(req, res) {
  try {
    const { id } = req.params;
    const result = shiftRepo.deleteShift(id);
    if (result.changes > 0) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ error: `Shift with ID ${id} not found` });
    }
  } catch (error) {
    logger.error('Failed to delete shift', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to open a new shift and assign a staff member.
 */
import { getNowInStoreTime } from '../services/time.service.js';

export function openShift(req, res) {
  try {
    const { staff_id } = req.body;
    if (!staff_id) {
      return res.status(400).json({ error: 'Missing required field: staff_id' });
    }

    const { todayStoreDate } = getNowInStoreTime();

    let businessDate = todayStoreDate;
    let businessDay = null;

    if (isBusinessDayEnabled()) {
      const resolved = businessDayService.resolveOrCreateTodayOpenDay({
        targetDate: todayStoreDate,
        openedByStaffId: staff_id,
      });
      businessDate = resolved.businessDate;
      businessDay = resolved.businessDay;
    }

    const enforcementStartDate = shiftRepo.getDayCloseEnforcementStartDate();

    // Block only for business days on/after the enforcement start date.
    const previousDate = getLastBusinessDateBefore(todayStoreDate);
    const shouldEnforcePreviousDayClose =
      !!previousDate && !!enforcementStartDate && previousDate >= enforcementStartDate;

    if (isBusinessDayEnabled()) {
      try {
        businessDayService.assertPreviousDayClosed(todayStoreDate);
      } catch (error) {
        if (error.code === 'PREVIOUS_DAY_NOT_CLOSED') {
          logger.warn(
            `PREVIOUS_DAY_NOT_CLOSED: Attempt to open shift on ${todayStoreDate} but previous business day ${error.previousDate} was never closed.`
          );
          return res.status(409).json({
            error: 'PREVIOUS_DAY_NOT_CLOSED',
            message: `The previous business day (${error.previousDate}) was not closed. Please close the day before opening a new shift.`,
            previousDate: error.previousDate,
          });
        }
        throw error;
      }
    } else if (shouldEnforcePreviousDayClose) {
      const dayClose = getDayClose(previousDate);
      if (!dayClose) {
        logger.warn(
          `PREVIOUS_DAY_NOT_CLOSED: Attempt to open shift on ${todayStoreDate} but previous business day ${previousDate} was never closed.`
        );
        return res.status(409).json({
          error: 'PREVIOUS_DAY_NOT_CLOSED',
          message: `The previous business day (${previousDate}) was not closed. Please close the day before opening a new shift.`,
          previousDate,
        });
      }
    }

    // If we've reached this point, all orphans are closed and no shift for today exists.
    const openResult = businessDayService.openShiftTransactionally({
      staffId: staff_id,
      businessDate,
      businessDayId: businessDay?.id || null,
    });

    if (openResult.orphanClosedCount > 0) {
      logger.warn(
        `AUTO_CLOSING_ORPHAN_SHIFT: Closed ${openResult.orphanClosedCount} orphan open shift(s) before opening ${businessDate}.`
      );
    }

    const newShift = openResult.shift;
    const responseBody = addBusinessDayFieldsToShift(serializeShift(newShift), businessDay);
    res.status(201).json(responseBody);
  } catch (error) {
    if (error.code === 'OPEN_SHIFT_EXISTS') {
      logger.error(
        `OPEN_SHIFT_EXISTS: Attempt to open a new shift for store date ${error.businessDate || 'unknown'} when one already exists.`
      );
      return res.status(409).json({
        error: 'OPEN_SHIFT_EXISTS',
        message: 'An open shift for the current day already exists.',
      });
    }

    logger.error('Failed to open shift', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to get data for the day-close review screen.
 */
export async function getDayCloseReview(req, res) {
  try {
    const targetDate = typeof req.query.date === 'string' && req.query.date ? req.query.date : undefined;
    const reviewData = await shiftService.getReviewDataForDayClose(targetDate);
    if (isBusinessDayEnabled()) {
      const day = businessDayRepo.getByBusinessDate('default', reviewData.businessDate);
      reviewData.business_day_id = day?.id || null;
      reviewData.business_day_status = day?.status || null;
    }
    res.status(200).json(reviewData);
  } catch (error) {
    logger.error('Failed to get day close review data', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles the request to generate a day-close report.
 */
export async function closeDay(req, res) {
  try {
    const targetDate = typeof req.query.date === 'string' && req.query.date ? req.query.date : undefined;
    const closedDate = targetDate ?? getNowInStoreTime().todayStoreDate;

    if (isBusinessDayEnabled()) {
      const existingBusinessDay = businessDayRepo.getByBusinessDate('default', closedDate);
      if (existingBusinessDay?.status === businessDayRepo.BUSINESS_DAY_STATUS.CLOSED) {
        return res.status(409).json({
          error: 'DAY_ALREADY_CLOSED',
          message: `Business day ${closedDate} is already closed.`,
          closedAt: existingBusinessDay.closed_at,
          business_day_id: existingBusinessDay.id,
          business_day_status: existingBusinessDay.status,
        });
      }
    }

    const existingDayClose = getDayClose(closedDate);
    if (existingDayClose) {
      return res.status(409).json({
        error: 'DAY_ALREADY_CLOSED',
        message: `Business day ${closedDate} is already closed.`,
        closedAt: existingDayClose.closed_at,
      });
    }

    const report = await shiftService.generateDayCloseReport(targetDate);

    if (isBusinessDayEnabled()) {
      const closeResult = businessDayService.closeBusinessDayTransactionally({
        businessDate: closedDate,
      });

      if (closeResult.alreadyClosed) {
        return res.status(409).json({
          error: 'DAY_ALREADY_CLOSED',
          message: `Business day ${closedDate} is already closed.`,
          closedAt: closeResult.businessDay?.closed_at ?? null,
          business_day_id: closeResult.businessDay?.id ?? null,
          business_day_status: closeResult.businessDay?.status ?? null,
        });
      }

      await shiftService.sendDayCloseNotification(report);

      return res.status(200).json({
        ...report,
        business_day_id: closeResult.businessDay?.id ?? null,
        business_day_status: closeResult.businessDay?.status ?? null,
      });
    }

    // Legacy path: record that this business day was formally closed.
    const inserted = insertDayClose(closedDate);
    if (!inserted) {
      const dayClose = getDayClose(closedDate);
      return res.status(409).json({
        error: 'DAY_ALREADY_CLOSED',
        message: `Business day ${closedDate} is already closed.`,
        closedAt: dayClose?.closed_at ?? null,
      });
    }

    await shiftService.sendDayCloseNotification(report);

    res.status(200).json(report);
  } catch (error) {
    if (error.code === 'DAY_NOT_READY') {
      logger.warn('Day close rejected because the business day is not ready.', {
        error: error.message,
      });
      return res.status(409).json({ error: 'DAY_NOT_READY', message: error.message });
    }

    logger.error('Failed to generate day close report', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Returns the status of the previous business day and today's closed shift count.
 * Used by the frontend to block opening a new shift if the previous day was not closed.
 */
export function getPreviousDayStatus(req, res) {
  try {
    const { todayStoreDate } = getNowInStoreTime();
    const todayClosedShiftsCount = getClosedShiftsCountForDate(todayStoreDate);

    if (isBusinessDayEnabled()) {
      const previousBusinessDay = businessDayRepo.getPreviousBusinessDay('default', todayStoreDate);

      if (!previousBusinessDay) {
        return res.status(200).json({
          hasPreviousDay: false,
          todayClosedShiftsCount,
          enforcementStartDate: null,
          isEnforced: true,
        });
      }

      return res.status(200).json({
        hasPreviousDay: true,
        previousDate: previousBusinessDay.business_date,
        isClosed: previousBusinessDay.status === businessDayRepo.BUSINESS_DAY_STATUS.CLOSED,
        closedAt: previousBusinessDay.closed_at ?? null,
        todayClosedShiftsCount,
        enforcementStartDate: null,
        isEnforced: true,
        previous_business_day_id: previousBusinessDay.id,
        previous_business_day_status: previousBusinessDay.status,
      });
    }

    const previousDate = getLastBusinessDateBefore(todayStoreDate);
    const enforcementStartDate = shiftRepo.getDayCloseEnforcementStartDate();

    if (!previousDate) {
      return res.status(200).json({
        hasPreviousDay: false,
        todayClosedShiftsCount,
        enforcementStartDate,
      });
    }

    const isEnforced =
      !!enforcementStartDate && previousDate >= enforcementStartDate;
    const dayClose = isEnforced ? getDayClose(previousDate) : null;

    return res.status(200).json({
      hasPreviousDay: true,
      previousDate,
      // For pre-cutover dates we treat the day as effectively closed (ignored).
      isClosed: isEnforced ? !!dayClose : true,
      closedAt: dayClose?.closed_at ?? null,
      todayClosedShiftsCount,
      enforcementStartDate,
      isEnforced,
    });
  } catch (error) {
    logger.error('Failed to get previous day status', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
