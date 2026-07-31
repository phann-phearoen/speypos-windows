import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { CheckCircle, Printer, Plus, Ban } from 'lucide-react';
import { Header } from '@/components/pos/Header';
import { ShiftCloseFlowModal } from '@/components/pos/ShiftCloseFlowModal';
import { useShift } from '@/contexts/ShiftContext';
import { useConnectionStatus } from '@/hooks/useApi';
import { useDisplaySession } from '@/hooks/useDisplaySession';
import { useShiftCloseFlow } from '@/hooks/useShiftCloseFlow';
import { useCurrency } from '@/lib/currency';
import { orderApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

interface LocationState {
  orderId?: string;
  total: number;
  received: number;
  change: number;
  paymentType?: string;
  voided?: boolean;
}

export default function CompletePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const shiftId = searchParams.get('shiftId');
  const completedOrderId = searchParams.get('orderId');

  const { isConnected } = useConnectionStatus();
  const { currentShift, currentStaff, isLoading: shiftLoading } = useShift();
  const shiftCloseFlow = useShiftCloseFlow();
  const { formatPrice } = useCurrency();
  const { updateToIdle } = useDisplaySession();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [showContent, setShowContent] = useState(false);
  const state = location.state as LocationState | null;
  const orderId = completedOrderId || state?.orderId;

  useEffect(() => {
    const animTimer = setTimeout(() => setShowContent(true), 100);
    idleTimerRef.current = setTimeout(() => {
      updateToIdle();
    }, 3000);
    return () => {
      clearTimeout(animTimer);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [updateToIdle]);

  if (!state) {
    return <Navigate to={`/pos/order?shiftId=${shiftId}`} replace />;
  }

  const { total, received, change, voided } = state;

  const handleNewOrder = () => {
    updateToIdle();
    navigate(`/pos/order?shiftId=${shiftId}`);
  };

  const handlePrintReceipt = async () => {
    if (!orderId) {
      toast({
        title: 'Unable to reprint',
        description: 'Order ID is missing for this receipt.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsPrinting(true);
      const result = await orderApi.printReceipt(orderId, { reprint: true });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Reprint sent',
        description: 'Receipt has been sent to the printer.',
      });
    } catch (error) {
      toast({
        title: 'Reprint failed',
        description: error instanceof Error ? error.message : 'Failed to reprint receipt.',
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <Header
        currentShift={currentShift}
        currentStaff={currentStaff}
        isConnected={isConnected}
        isLoading={shiftLoading}
        onCloseShift={shiftCloseFlow.openClosePreview}
      />

      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className={`
          text-center max-w-md transition-all duration-500 payment-success-shell
          ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        >
          <div className="payment-success-visual">
            {!voided && showContent && (
              <div className="payment-success-rings" aria-hidden="true">
                <div className="payment-success-ring" />
                <div className="payment-success-ring payment-success-ring--delayed" />
              </div>
            )}

            {/* Icon */}
            <div
              className={`absolute inset-0 m-auto w-24 h-24 rounded-full flex items-center justify-center ${
                !voided ? 'payment-success-icon payment-success-badge' : 'bg-destructive/10'
              }`}
            >
              {voided ? (
                <Ban className="w-14 h-14 text-destructive" />
              ) : (
                <CheckCircle className="w-14 h-14 text-success" />
              )}
            </div>
          </div>

          <h1 className={`text-3xl font-bold mb-2 ${!voided ? 'text-success payment-success-heading' : 'text-foreground'}`}>
            {voided ? t('complete.voided') : t('complete.success')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {voided ? t('complete.voidedDesc') : t('complete.receiptSent')}
          </p>

          {/* Transaction Summary */}
          <div className={`bg-card rounded-xl border border-border p-6 mb-8 ${!voided ? 'payment-success-summary' : ''}`}>
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('complete.total')}</span>
                <span className={`font-semibold ${voided ? 'line-through text-muted-foreground' : ''}`}>
                  {formatPrice(total)}
                </span>
              </div>
              {!voided && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('complete.cashReceived')}</span>
                    <span className="font-semibold">{formatPrice(received)}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">{t('complete.change')}</span>
                    <span className="font-bold text-success">{formatPrice(change)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleNewOrder}
              className="w-full pos-btn py-4 rounded-xl bg-accent text-accent-foreground font-semibold text-lg shadow-md gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('complete.newOrder')}
            </button>

            {!voided && (
              <button
                onClick={handlePrintReceipt}
                className="w-full pos-btn py-3 rounded-xl bg-secondary text-secondary-foreground font-medium gap-2"
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <span className="flex items-center justify-center">
                    <Printer className="w-5 h-5 animate-spin mr-2" /> {t('complete.printing')}...
                  </span>
                ) : (
                  <Printer className="w-5 h-5" />
                )}
                {!isPrinting && t('complete.reprint')}
              </button>
            )}
          </div>
        </div>
      </div>

      <ShiftCloseFlowModal flow={shiftCloseFlow} />
    </div>
  );
}
