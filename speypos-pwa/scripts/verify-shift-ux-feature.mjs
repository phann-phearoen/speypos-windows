import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());

const apiPath = path.join(projectRoot, 'src/lib/api.ts');
const shiftPagePath = path.join(projectRoot, 'src/pages/pos/ShiftPage.tsx');
const i18nPath = path.join(projectRoot, 'src/lib/i18n.ts');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function assertContains(content, pattern, message) {
  if (!pattern.test(content)) {
    throw new Error(message);
  }
}

function run() {
  const apiContent = read(apiPath);
  const shiftPageContent = read(shiftPagePath);
  const i18nContent = read(i18nPath);

  // 1) API method must exist.
  assertContains(
    apiContent,
    /getPreviousDayStatus\s*:\s*\(\)\s*=>\s*request<[^>]+>\('\/shift\/day-status\/previous'\)/,
    'Missing shiftApi.getPreviousDayStatus() in src/lib/api.ts'
  );

  // 2) Shift page must compute close-day attention from todayClosedShiftsCount >= 2.
  assertContains(
    shiftPageContent,
    /const\s+closeDayAttention\s*=\s*closedShiftCount\s*>=\s*2\s*;/,
    'ShiftPage does not derive closeDayAttention from closedShiftCount >= 2'
  );

  // 3) Close day button must support active class styling and reminder text.
  assertContains(
    shiftPageContent,
    /bg-amber-500/,
    'ShiftPage Close Day button active styling missing (bg-amber-500)'
  );
  assertContains(
    shiftPageContent,
    /shift\.closeDayReminder/,
    'ShiftPage does not render shift.closeDayReminder text'
  );

  // 4) Immediate animation trigger from navigation state should exist.
  assertContains(
    shiftPageContent,
    /justClosedShiftAt/,
    'ShiftPage missing justClosedShiftAt immediate animation trigger'
  );

  // 5) Close day section should not be blocked by !error gate.
  assertContains(
    shiftPageContent,
    /const\s+isShiftActionsReady\s*=\s*!checkingActiveShift\s*&&\s*!loading\s*&&\s*activeStaff\.length\s*>\s*0\s*;/,
    'ShiftPage missing isShiftActionsReady gate'
  );
  if (/!checkingActiveShift\s*&&\s*!loading\s*&&\s*activeStaff\.length\s*>\s*0\s*&&\s*!error/.test(shiftPageContent)) {
    throw new Error('ShiftPage still uses legacy !error gate for entire shift action area');
  }

  // 6) i18n keys must exist.
  assertContains(
    i18nContent,
    /'shift\.closeDayReminder'\s*:\s*'[^']+'/,
    'Missing shift.closeDayReminder localization key'
  );

  console.log('Shift UX verification passed: all critical code-level checks succeeded.');
}

run();
