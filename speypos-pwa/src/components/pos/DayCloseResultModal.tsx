import { CalendarDays, HandCoins, Package, Users, CircleCheckBig, TriangleAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateString } from '@/lib/datetime';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import type { DayCloseCompletion } from '@/types/pos';

interface DayCloseResultModalProps {
  open: boolean;
  result: DayCloseCompletion | null;
  onClose: () => void;
}

export function DayCloseResultModal({ open, result, onClose }: DayCloseResultModalProps) {
  const { t } = useTranslation();
  const { format: formatPrice } = useCurrency();

  const summary = result?.response?.combinedSummary;
  const shiftCount = result?.response?.shiftSummaries.length ?? 0;
  const isAlreadyClosed = result?.status === 'already-closed';
  const title = isAlreadyClosed ? t('shift.dayClose.result.alreadyClosedTitle') : t('shift.dayClose.result.closedTitle');
  const description = isAlreadyClosed ? t('shift.dayClose.result.alreadyClosedDesc') : t('shift.dayClose.result.closedDesc');
  const accentClass = isAlreadyClosed ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900';
  const accentIconClass = isAlreadyClosed ? 'bg-amber-500/15 text-amber-700' : 'bg-emerald-500/15 text-emerald-700';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl border-2 border-foreground/10 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${accentIconClass}`}>
            {isAlreadyClosed ? <TriangleAlert className="h-7 w-7" /> : <CircleCheckBig className="h-7 w-7" />}
          </div>
          <div>
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className={`rounded-2xl border p-4 ${accentClass}`}>
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.14em] opacity-80">
            <CalendarDays className="h-4 w-4" />
            {t('shift.dayClose.result.businessDate')}
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatDateString(result?.businessDate ?? '')}
          </div>
          {result?.business_day_status && (
            <Badge className="mt-3 bg-background/80 text-foreground border-border">
              {result.business_day_status}
            </Badge>
          )}
        </div>

        {summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <Users className="h-4 w-4" />
                {t('shift.dayClose.result.shifts')}
              </div>
              <div className="mt-2 text-xl font-semibold">{shiftCount}</div>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <Package className="h-4 w-4" />
                {t('admin.orderHistory.orders')}
              </div>
              <div className="mt-2 text-xl font-semibold">{summary.totalOrders}</div>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <HandCoins className="h-4 w-4" />
                {t('shift.dayClose.result.netRevenue')}
              </div>
              <div className="mt-2 text-xl font-semibold">{formatPrice(summary.netRevenue)}</div>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <Package className="h-4 w-4" />
                {t('admin.orderHistory.items')}
              </div>
              <div className="mt-2 text-xl font-semibold">{summary.totalItems}</div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={onClose} className="min-w-28">
            {t('shift.dayClose.result.dismiss')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}