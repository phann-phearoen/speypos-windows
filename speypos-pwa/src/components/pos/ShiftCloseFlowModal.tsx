import { ShiftClosePreviewModal } from '@/components/pos/ShiftClosePreviewModal';
import type { ShiftCloseFlow } from '@/hooks/useShiftCloseFlow';

interface ShiftCloseFlowModalProps {
  flow: ShiftCloseFlow;
}

export function ShiftCloseFlowModal({ flow }: ShiftCloseFlowModalProps) {
  return (
    <ShiftClosePreviewModal
      open={flow.showClosePreview}
      onClose={flow.closeClosePreview}
      onConfirm={flow.confirmCloseShift}
      shiftId={flow.previewShiftId}
      staffName={flow.previewStaffName}
    />
  );
}