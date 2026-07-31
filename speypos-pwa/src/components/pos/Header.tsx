import { Wifi, WifiOff, User, Settings, LogOut, CalendarDays, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StoreBrand } from '@/components/StoreBrand';
import { useTranslation } from '@/lib/i18n';
import { formatDateString, useDateTime } from '@/lib/datetime';
import { orderApi } from '@/lib/api';
import type { Shift, Staff } from '@/types/pos';

interface HeaderProps {
  currentShift: Shift | null;
  currentStaff: Staff | null;
  isConnected: boolean;
  isLoading?: boolean;
  onCloseShift?: () => void;
}

function getBusinessDayLabel(shift: Shift | null) {
  if (!shift?.date) {
    return null;
  }

  return formatDateString(shift.date);
}

function getBusinessDayStatusLabel(status: Shift['business_day_status'], t: (key: string) => string) {
  switch (status) {
    case 'OPEN':
      return t('header.businessDayOpen');
    case 'CLOSING':
      return t('header.businessDayClosing');
    case 'CLOSED':
      return t('header.businessDayClosed');
    default:
      return null;
  }
}

function getBusinessDayStatusClass(status: Shift['business_day_status']) {
  switch (status) {
    case 'OPEN':
      return 'text-emerald-200 bg-emerald-500/15 border-emerald-300/20';
    case 'CLOSING':
      return 'text-amber-200 bg-amber-500/15 border-amber-300/20';
    case 'CLOSED':
      return 'text-rose-200 bg-rose-500/15 border-rose-300/20';
    default:
      return 'text-pos-header-foreground/80 bg-pos-header-foreground/10 border-pos-header-foreground/10';
  }
}

function getShiftStatusClass(status: Shift['status']) {
  return status === 'open'
    ? 'text-emerald-200 bg-emerald-500/15 border-emerald-300/20'
    : 'text-pos-header-foreground/80 bg-pos-header-foreground/10 border-pos-header-foreground/10';
}

export function Header({ currentShift, currentStaff, isConnected, isLoading, onCloseShift }: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatTime } = useDateTime();
  const [shiftOrderCount, setShiftOrderCount] = useState<number | null>(null);
  const businessDayLabel = getBusinessDayLabel(currentShift);
  const businessDayStatusLabel = getBusinessDayStatusLabel(currentShift?.business_day_status, t);

  useEffect(() => {
    let isActive = true;

    if (!currentShift?.id) {
      setShiftOrderCount(null);
      return () => {
        isActive = false;
      };
    }

    setShiftOrderCount(null);

    orderApi.getOrdersByShift(currentShift.id).then((result) => {
      if (!isActive) {
        return;
      }

      if (result.error || !result.data) {
        setShiftOrderCount(null);
        return;
      }

      setShiftOrderCount(result.data.length);
    });

    return () => {
      isActive = false;
    };
  }, [currentShift?.id]);

  return (
    <header className="h-14 bg-pos-header text-pos-header-foreground flex items-center justify-between gap-4 px-4 shrink-0">
      {/* Store Brand */}
      <StoreBrand variant="full" size="md" inverted />

      {/* Center: Session Context */}
      <div className="flex min-w-0 flex-1 justify-center">
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-full border border-pos-header-foreground/10 bg-pos-header-foreground/5 px-3 py-1.5">
            <div className="h-4 w-20 bg-pos-header-foreground/20 rounded animate-pulse" />
            <div className="h-4 w-px bg-pos-header-foreground/15" />
            <div className="h-4 w-24 bg-pos-header-foreground/20 rounded animate-pulse" />
            <div className="h-4 w-px bg-pos-header-foreground/15" />
            <div className="h-4 w-16 bg-pos-header-foreground/20 rounded animate-pulse" />
          </div>
        ) : currentShift && currentStaff ? (
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-pos-header-foreground/10 bg-pos-header-foreground/5 px-2 py-1.5 shadow-sm">
            <div className="flex min-w-0 items-center gap-2 rounded-full bg-pos-header-foreground/6 px-2.5 py-1">
              <User className="h-3.5 w-3.5 text-pos-header-foreground/70" />
              <span className="truncate text-sm font-medium">{currentStaff.name}</span>
            </div>

            <div className="h-4 w-px bg-pos-header-foreground/15" />

            <div className="flex min-w-0 items-center gap-2 rounded-full bg-pos-header-foreground/6 px-2.5 py-1">
              <CalendarDays className="h-3.5 w-3.5 text-pos-header-foreground/70" />
              <span className="text-xs uppercase tracking-[0.14em] text-pos-header-foreground/55">
                {t('header.businessDayShort')}
              </span>
              <span className="text-sm font-medium">{businessDayLabel}</span>
              {businessDayStatusLabel && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getBusinessDayStatusClass(currentShift.business_day_status)}`}
                >
                  {businessDayStatusLabel}
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-pos-header-foreground/15" />

            <div className="flex items-center gap-2 rounded-full bg-pos-header-foreground/6 px-2.5 py-1">
              <div className={`status-dot ${currentShift.status === 'open' ? 'open' : 'closed'}`} />
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${getShiftStatusClass(currentShift.status)}`}
              >
                {currentShift.status === 'open' ? t('header.shiftOpen') : t('header.shiftClosed')}
              </span>
              <span className="text-sm font-medium text-pos-header-foreground/88">
                {formatTime(currentShift.started_at)} ~
              </span>
              <span className="h-4 w-px bg-pos-header-foreground/15" />
              <ReceiptText className="h-3.5 w-3.5 text-pos-header-foreground/70" />
              <span className="text-xs uppercase tracking-[0.14em] text-pos-header-foreground/55">
                {t('header.ordersShort')}
              </span>
              <span className="text-sm font-medium text-pos-header-foreground/88">
                {shiftOrderCount ?? '...'}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Right: Actions & Utilities */}
      <div className="flex items-center gap-2">
        {currentShift?.status === 'open' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseShift}
            className="gap-1.5 rounded-full border border-destructive/35 bg-destructive/15 px-3 text-destructive hover:bg-destructive/20 hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">{t('header.closeShift')}</span>
          </Button>
        )}

        <div className="h-6 w-px bg-pos-header-foreground/20" />

        {/* Settings Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/login')}
          className="text-pos-header-foreground hover:bg-pos-header-foreground/10 rounded-full"
        >
          <Settings className="w-5 h-5" />
        </Button>
        
        <div className="w-px h-6 bg-pos-header-foreground/20" />
        
        <div className="flex items-center" title={isConnected ? t('header.online') : t('header.offline')} aria-label={isConnected ? t('header.online') : t('header.offline')}>
          {isConnected ? (
            <Wifi className="w-5 h-5 text-success" />
          ) : (
            <WifiOff className="w-5 h-5 text-destructive" />
          )}
        </div>
      </div>
    </header>
  );
}
