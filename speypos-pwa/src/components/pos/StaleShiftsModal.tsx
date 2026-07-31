import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Lock, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { shiftApi } from '@/lib/api';
import { useDateTime, formatDateString } from '@/lib/datetime';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';
import type { Shift } from '@/types/pos';

interface StaleShiftsModalProps {
  open: boolean;
  onClose: () => void;
  previousDate?: string;
  onUpdated?: (payload?: { staleRemainingCount: number; staleResolved: boolean }) => void;
  onRequestCloseShift?: (shift: Shift) => void;
  enforcePreviewClose?: boolean;
  refreshKey?: number;
}

function isEmptyOpenShiftsResponse(errorCode: string | null, errorMessage: string | null): boolean {
  if (errorCode?.toUpperCase() === 'NO_OPEN_SHIFTS_FOUND') {
    return true;
  }

  return (errorMessage || '').toLowerCase().includes('no open shifts found');
}

function getStaleShifts(shifts: Shift[], boundaryDate: string): Shift[] {
  return shifts.filter((shift) => shift.status === 'open' && shift.date <= boundaryDate);
}

export function StaleShiftsModal({
  open,
  onClose,
  previousDate,
  onUpdated,
  onRequestCloseShift,
  enforcePreviewClose,
  refreshKey,
}: StaleShiftsModalProps) {
  const { t } = useTranslation();
  const { getTodayDateString, formatTime } = useDateTime();
  const [loading, setLoading] = useState(false);
  const [closingAll, setClosingAll] = useState(false);
  const [closingShiftId, setClosingShiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);

  const staleShifts = useMemo(() => {
    const boundaryDate = previousDate || getTodayDateString();
    return getStaleShifts(openShifts, boundaryDate);
  }, [getTodayDateString, openShifts, previousDate]);

  const loadOpenShifts = async () => {
    setLoading(true);
    setError(null);

    const boundaryDate = previousDate || getTodayDateString();

    const result = await shiftApi.getOpenShifts();

    if (result.error) {
      if (isEmptyOpenShiftsResponse(result.errorCode, result.error)) {
        setOpenShifts([]);
        onUpdated?.({ staleRemainingCount: 0, staleResolved: true });
      } else {
        setError(result.error);
      }
    } else {
      const shifts = result.data || [];
      setOpenShifts(shifts);
      const stale = getStaleShifts(shifts, boundaryDate);
      onUpdated?.({ staleRemainingCount: stale.length, staleResolved: stale.length === 0 });
    }

    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadOpenShifts();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      loadOpenShifts();
    }
  }, [open, refreshKey]);

  const closeShiftAndRefresh = async (shiftId: string): Promise<boolean> => {
    const result = await shiftApi.closeShift(shiftId);
    const normalizedCode = (result.errorCode || '').toUpperCase();
    const normalizedMessage = (result.error || '').toUpperCase();
    const isNoLongerOpenLifecycle =
      normalizedCode === 'SHIFT_NOT_FOUND' ||
      normalizedCode === 'SHIFT_NOT_OPEN' ||
      normalizedCode === 'SHIFT_NOT_CURRENT_BUSINESS_DAY' ||
      normalizedCode === 'PREVIOUS_DAY_NOT_CLOSED' ||
      normalizedMessage.includes('SHIFT_NOT_FOUND') ||
      normalizedMessage.includes('SHIFT_NOT_OPEN') ||
      normalizedMessage.includes('SHIFT_NOT_CURRENT_BUSINESS_DAY') ||
      normalizedMessage.includes('PREVIOUS_DAY_NOT_CLOSED') ||
      normalizedMessage.includes('PREVIOUS BUSINESS DAY');

    if (result.data) {
      await loadOpenShifts();
      return true;
    }

    if (isNoLongerOpenLifecycle) {
      await loadOpenShifts();
      return true;
    }

    toast({
      title: t('toast.error'),
      description: result.error || t('shift.staleCloseFailed'),
      variant: 'destructive',
    });
    return false;
  };

  const handleCloseShift = async (shiftId: string) => {
    if (enforcePreviewClose) {
      const targetShift = staleShifts.find((shift) => shift.id === shiftId);
      if (targetShift) {
        onRequestCloseShift?.(targetShift);
      }
      return;
    }

    setClosingShiftId(shiftId);
    const closed = await closeShiftAndRefresh(shiftId);

    if (closed) {
      toast({
        title: t('toast.success'),
        description: t('shift.staleClosedOneSuccess'),
      });
    }

    setClosingShiftId(null);
  };

  const handleCloseAllStale = async () => {
    if (staleShifts.length === 0 || closingAll) {
      return;
    }

    setClosingAll(true);
    let successCount = 0;

    for (const shift of staleShifts) {
      setClosingShiftId(shift.id);
      const closed = await closeShiftAndRefresh(shift.id);
      if (closed) {
        successCount += 1;
      }
    }

    setClosingShiftId(null);
    setClosingAll(false);

    if (successCount === staleShifts.length) {
      toast({
        title: t('toast.success'),
        description: t('shift.staleClosedAllSuccess').replace('{{count}}', String(successCount)),
      });
      return;
    }

    if (successCount > 0) {
      toast({
        title: t('toast.error'),
        description: t('shift.staleClosedPartial').replace('{{count}}', String(successCount)),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            {t('shift.closeStaleShifts')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('shift.closeStaleShiftsDesc')}
          </p>

          {loading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t('common.loading')}
            </div>
          ) : error ? (
            <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          ) : staleShifts.length === 0 ? (
            <div className="p-4 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
              {t('shift.noStaleShifts')}
            </div>
          ) : (
            <div className="space-y-2">
              {staleShifts.map((shift) => {
                const isClosingThis = closingShiftId === shift.id;
                const staffName = shift.staff?.name || shift.staff_name || t('common.unknown');
                return (
                  <div key={shift.id} className="p-3 rounded-md border border-border bg-card flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="w-4 h-4 text-destructive" />
                        <span className="font-medium">{formatDateString(shift.date)}</span>
                        <Badge variant="destructive" className="text-xs">
                          {t('admin.orderHistory.outdated')}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {staffName}
                        </span>
                        <span>{formatTime(shift.started_at)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCloseShift(shift.id)}
                      disabled={isClosingThis || closingAll}
                    >
                      {isClosingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.orderHistory.closeShift')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={closingAll || !!closingShiftId}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleCloseAllStale}
            disabled={loading || closingAll || staleShifts.length === 0 || !!enforcePreviewClose}
          >
            {closingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('shift.closingStaleShifts')}
              </>
            ) : (
              t('shift.closeAllStaleShifts')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
