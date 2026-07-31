import * as timeService from './time.service.js';
import * as shiftRepo from '../storage/repositories/shift.repo.js';
import * as businessDayRepo from '../storage/repositories/business-day.repo.js';
import { getDb } from '../storage/database.js';

const DEFAULT_STORE_ID = 'default';

function isBusinessDayEnabled() {
  return process.env.BUSINESS_DAY_ENABLED === 'true';
}

function createLifecycleError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function withSqliteBusyRetry(operation, { maxRetries = 2 } = {}) {
  let attempt = 0;

  while (true) {
    try {
      return operation();
    } catch (error) {
      const isLockError = error?.code === 'SQLITE_BUSY' || error?.code === 'SQLITE_LOCKED';
      if (!isLockError || attempt >= maxRetries) {
        throw error;
      }
      attempt += 1;
    }
  }
}

export function openShiftTransactionally({
  staffId,
  businessDate,
  businessDayId = null,
  maxRetries = 2,
} = {}) {
  const { utcDate } = timeService.getNowInStoreTime();
  return shiftRepo.openShiftForStaffGuarded({
    staffId,
    businessDate,
    businessDayId,
    nowUtcMillis: utcDate.getTime(),
    maxRetries,
  });
}

export function getDayCloseContext({ targetDate } = {}) {
  const storeDate = targetDate ?? timeService.getNowInStoreTime().todayStoreDate;
  const shiftsForDate = shiftRepo.getAllShifts({ date: storeDate });

  let businessDay = null;
  if (isBusinessDayEnabled()) {
    businessDay = businessDayRepo.getByBusinessDate(DEFAULT_STORE_ID, storeDate);
  }

  return {
    businessDate: storeDate,
    shiftsForDate,
    businessDay,
  };
}

export function resolveOrCreateTodayOpenDay({ targetDate, openedByStaffId } = {}) {
  const { todayStoreDate, utcDate } = timeService.getNowInStoreTime();
  const businessDate = targetDate ?? todayStoreDate;

  if (!isBusinessDayEnabled()) {
    return { businessDate, businessDay: null };
  }

  let businessDay = businessDayRepo.getByBusinessDate(DEFAULT_STORE_ID, businessDate);

  if (!businessDay) {
    businessDay = businessDayRepo.createOpenDay({
      storeId: DEFAULT_STORE_ID,
      businessDate,
      openedAt: utcDate.getTime(),
      openedByStaffId,
    });
  }

  if (businessDay?.status === businessDayRepo.BUSINESS_DAY_STATUS.CLOSED) {
    throw createLifecycleError(
      'BUSINESS_DAY_CLOSED',
      `Business day ${businessDate} is already closed and cannot be opened for new shifts.`,
      {
        businessDate,
        status: 409,
      }
    );
  }

  return { businessDate, businessDay };
}

export function assertPreviousDayClosed(todayStoreDate) {
  if (!isBusinessDayEnabled()) {
    return { isEnforced: false, previousDay: null };
  }

  const previousDay = businessDayRepo.getPreviousBusinessDay(DEFAULT_STORE_ID, todayStoreDate);

  if (!previousDay) {
    return { isEnforced: true, previousDay: null };
  }

  if (previousDay.status !== businessDayRepo.BUSINESS_DAY_STATUS.CLOSED) {
    throw createLifecycleError(
      'PREVIOUS_DAY_NOT_CLOSED',
      `The previous business day (${previousDay.business_date}) was not closed.`,
      {
        previousDate: previousDay.business_date,
        status: 409,
      }
    );
  }

  return { isEnforced: true, previousDay };
}

export function assertDayCloseReady({ businessDate, shiftsForDate }) {
  if (!shiftsForDate || shiftsForDate.length === 0) {
    throw createLifecycleError('DAY_NOT_READY', `Business day ${businessDate} has no shifts to close.`);
  }

  const openShifts = shiftsForDate.filter((shift) => shift.status !== 'closed');
  if (openShifts.length > 0) {
    throw createLifecycleError(
      'DAY_NOT_READY',
      `Business day ${businessDate} cannot be closed until all shifts are closed.`,
      {
        openShiftIds: openShifts.map((shift) => shift.id),
      }
    );
  }

  if (!isBusinessDayEnabled()) {
    return null;
  }

  let businessDay = businessDayRepo.getByBusinessDate(DEFAULT_STORE_ID, businessDate);
  if (!businessDay) {
    const openedAt = shiftsForDate.reduce(
      (min, shift) => Math.min(min, shift.started_at),
      shiftsForDate[0].started_at
    );
    businessDay = businessDayRepo.createOpenDay({
      storeId: DEFAULT_STORE_ID,
      businessDate,
      openedAt,
    });
  }

  if (businessDay.status === businessDayRepo.BUSINESS_DAY_STATUS.CLOSED) {
    throw createLifecycleError('DAY_ALREADY_CLOSED', `Business day ${businessDate} is already closed.`, {
      businessDate,
      closedAt: businessDay.closed_at,
      status: 409,
    });
  }

  return businessDay;
}

export function closeBusinessDayTransactionally({
  businessDate,
  closedByStaffId = null,
  closeReportRef = null,
  maxRetries = 2,
} = {}) {
  if (!businessDate) {
    throw new Error('businessDate is required');
  }
  const db = getDb();

  const transaction = db.transaction(() => {
    const readiness = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status <> 'closed' THEN 1 ELSE 0 END) AS open_count,
           MIN(started_at) AS min_started_at
         FROM Shift
         WHERE date = ?`
      )
      .get(businessDate);

    if (!readiness?.total) {
      throw createLifecycleError('DAY_NOT_READY', `Business day ${businessDate} has no shifts to close.`);
    }

    if ((readiness.open_count || 0) > 0) {
      throw createLifecycleError(
        'DAY_NOT_READY',
        `Business day ${businessDate} cannot be closed until all shifts are closed.`
      );
    }

    if (!isBusinessDayEnabled()) {
      const inserted = shiftRepo.insertDayClose(businessDate);
      return {
        businessDay: null,
        alreadyClosed: !inserted,
        legacyDayCloseInserted: inserted,
      };
    }

    let businessDay = businessDayRepo.getByBusinessDate(DEFAULT_STORE_ID, businessDate);
    if (!businessDay) {
      businessDay = businessDayRepo.createOpenDay({
        storeId: DEFAULT_STORE_ID,
        businessDate,
        openedAt: readiness.min_started_at || Date.now(),
      });
    }

    if (businessDay.status === businessDayRepo.BUSINESS_DAY_STATUS.CLOSED) {
      shiftRepo.insertDayClose(businessDate);
      return {
        businessDay,
        alreadyClosed: true,
        legacyDayCloseInserted: false,
      };
    }

    if (businessDay.status === businessDayRepo.BUSINESS_DAY_STATUS.OPEN) {
      const transitioned = businessDayRepo.transitionStatus(
        businessDay.id,
        businessDayRepo.BUSINESS_DAY_STATUS.OPEN,
        businessDayRepo.BUSINESS_DAY_STATUS.CLOSING
      );
      businessDay = transitioned || businessDayRepo.getBusinessDayById(businessDay.id) || businessDay;
    }

    const closedAt = Date.now();
    const closed = businessDayRepo.transitionStatus(
      businessDay.id,
      businessDayRepo.BUSINESS_DAY_STATUS.CLOSING,
      businessDayRepo.BUSINESS_DAY_STATUS.CLOSED,
      {
        closedAt,
        closedByStaffId,
        closeReportRef,
      }
    );

    const finalDay = closed || businessDayRepo.getBusinessDayById(businessDay.id);
    if (!finalDay || finalDay.status !== businessDayRepo.BUSINESS_DAY_STATUS.CLOSED) {
      throw createLifecycleError(
        'BUSINESS_DAY_CLOSE_CONFLICT',
        `Failed to transition business day ${businessDate} to CLOSED.`
      );
    }

    const inserted = shiftRepo.insertDayClose(businessDate);

    return {
      businessDay: finalDay,
      alreadyClosed: false,
      legacyDayCloseInserted: inserted,
    };
  });

  return withSqliteBusyRetry(() => transaction(), { maxRetries });
}
