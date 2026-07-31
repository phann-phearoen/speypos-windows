import { useCallback, useState } from 'react';
import { useShift } from '@/contexts/ShiftContext';
import { usePendingActions } from '@/contexts/PendingActionsContext';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

export interface ShiftCloseFlow {
  showClosePreview: boolean;
  openClosePreview: () => void;
  closeClosePreview: () => void;
  confirmCloseShift: () => Promise<void>;
  previewShiftId: string;
  previewStaffName: string;
}

export function useShiftCloseFlow(): ShiftCloseFlow {
  const { currentShift, currentStaff, closeShift } = useShift();
  const { refresh: refreshPendingActions } = usePendingActions();
  const { t } = useTranslation();

  const [showClosePreview, setShowClosePreview] = useState(false);

  const openClosePreview = useCallback(() => {
    setShowClosePreview(true);
  }, []);

  const closeClosePreview = useCallback(() => {
    setShowClosePreview(false);
  }, []);

  const confirmCloseShift = useCallback(async () => {
    if (!currentShift) {
      setShowClosePreview(false);
      return;
    }

    try {
      await refreshPendingActions();
      const closedShift = await closeShift();

      if (closedShift?.close_delivery?.status === 'failed') {
        toast({
          title: t('toast.error'),
          description:
            typeof closedShift.close_delivery.message === 'string'
              ? closedShift.close_delivery.message
              : t('shift.closePreview.shiftClosedDesc').replace('{{name}}', currentStaff?.name || ''),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('shift.closePreview.shiftClosed'),
          description: t('shift.closePreview.shiftClosedDesc').replace('{{name}}', currentStaff?.name || ''),
        });
      }

      setShowClosePreview(false);
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: error instanceof Error ? error.message : 'Failed to close shift.',
        variant: 'destructive',
      });
    }
  }, [closeShift, currentShift, currentStaff?.name, refreshPendingActions, t]);

  return {
    showClosePreview,
    openClosePreview,
    closeClosePreview,
    confirmCloseShift,
    previewShiftId: currentShift?.id || '',
    previewStaffName: currentStaff?.name || '',
  };
}