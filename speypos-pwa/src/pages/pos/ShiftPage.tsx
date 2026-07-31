import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, User, AlertCircle, RefreshCw, AlertTriangle, X, ArrowRight, CalendarCheck, Lock } from 'lucide-react';
import { staffApi, shiftApi } from '@/lib/api';
import { useShift } from '@/contexts/ShiftContext';
import { usePendingActions } from '@/contexts/PendingActionsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/i18n';
import { Header } from '@/components/pos/Header';
import { StoreBrand } from '@/components/StoreBrand';
import { DayClosePreviewModal } from '@/components/pos/DayClosePreviewModal';
import { StaleShiftsModal } from '@/components/pos/StaleShiftsModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { Staff, Shift, PreviousDayStatus } from '@/types/pos';

function isPreviousDayBlocked(status: PreviousDayStatus | null): boolean {
  if (!status?.hasPreviousDay) {
    return false;
  }

  if (status.previous_business_day_status) {
    return status.previous_business_day_status !== 'CLOSED';
  }

  return !status.isClosed;
}

export default function ShiftPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openShift, currentShift, currentStaff, detectActiveShift } = useShift();
  const { refresh: refreshPendingActions } = usePendingActions();
  const { getBrandName } = useSettings();
  const { t } = useTranslation();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingShift, setOpeningShift] = useState(false);
  const [checkingActiveShift, setCheckingActiveShift] = useState(true);
  
  // Orphaned shifts state
  const [orphanedShifts, setOrphanedShifts] = useState<Shift[]>([]);
  const [showOrphanedWarning, setShowOrphanedWarning] = useState(false);
  
  // Previous day status
  const [previousDayStatus, setPreviousDayStatus] = useState<PreviousDayStatus | null>(null);
  const [animateCloseDay, setAnimateCloseDay] = useState(false);

  // Day close modal state
  const [showDayCloseModal, setShowDayCloseModal] = useState(false);
  const [dayCloseTargetDate, setDayCloseTargetDate] = useState<string | null>(null);
  const [showStaleShiftsModal, setShowStaleShiftsModal] = useState(false);
  const lifecycleError =
    (location.state as { lifecycleError?: string; invalidatedAt?: number } | null)?.lifecycleError || null;

  const openDayCloseModal = (date?: string) => {
    setDayCloseTargetDate(date ?? null);
    setShowDayCloseModal(true);
  };

  const refreshPreviousDayStatus = () => {
    shiftApi.getPreviousDayStatus().then((result) => {
      if (!result.error && result.data) {
        setPreviousDayStatus(result.data);
      }
    });
  };

  // Check for active shift and pending actions on mount
  useEffect(() => {
    const checkActiveShift = async () => {
      setCheckingActiveShift(true);

      // If we landed here from lifecycle invalidation, keep the user on shift page.
      if (lifecycleError) {
        setCheckingActiveShift(false);
        loadStaff();
        refreshPreviousDayStatus();
        return;
      }
      
      // Refresh pending actions on app startup
      refreshPendingActions();
      
      const activeShiftInfo = await detectActiveShift();
      
      if (activeShiftInfo) {
        // Track orphaned shifts for warning
        if (activeShiftInfo.orphaned && activeShiftInfo.orphaned.length > 0) {
          setOrphanedShifts(activeShiftInfo.orphaned);
          setShowOrphanedWarning(true);
        }
        
        // Set shift in context and redirect immediately
        openShift(activeShiftInfo.shift, activeShiftInfo.staff);
        navigate(`/pos/order?shiftId=${activeShiftInfo.shift.id}`, { replace: true });
      } else {
        setCheckingActiveShift(false);
        // Load staff and check previous day status in parallel
        loadStaff();
        refreshPreviousDayStatus();
      }
    };
    
    checkActiveShift();
  }, [detectActiveShift, lifecycleError, openShift, navigate, refreshPendingActions]);

  useEffect(() => {
    if (lifecycleError) {
      setError(lifecycleError);
    }
  }, [lifecycleError]);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);

    const result = await staffApi.getStaff();

    if (result.error) {
      setError(result.error);
      setStaffList([]);
    } else {
      setStaffList(result.data || []);
    }

    setLoading(false);
  };

  const handleOpenShift = async () => {
    if (!selectedStaff) return;

    setOpeningShift(true);
    setError(null);
    
    // Refresh pending actions before opening shift
    await refreshPendingActions();

    // Backend handles date using store timezone - no date param needed
    const result = await shiftApi.openShift(selectedStaff.id);
    if (result.error) {
      // Previous day was not closed
      if (
        result.errorCode === 'PREVIOUS_DAY_NOT_CLOSED' ||
        result.error.toUpperCase().includes('PREVIOUS_DAY_NOT_CLOSED')
      ) {
        setError(t('shift.previousDayNotClosed').replace(
          '{{date}}',
          String(result.errorDetails?.previousDate ?? '')
        ));
      // Handle backend rejection for existing open shifts
      } else if (
        result.errorCode === 'OPEN_SHIFT_EXISTS' ||
        result.error.toUpperCase().includes('OPEN_SHIFT_EXISTS')
      ) {
        setError(t('shift.openShiftExists'));
      } else {
        setError(result.error);
      }
      setOpeningShift(false);
      return;
    }

    openShift(result.data, selectedStaff);
    navigate(`/pos/order?shiftId=${result.data.id}`);
    setOpeningShift(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleManageShifts = () => {
    navigate('/admin/order-history');
  };

  const handleDayCloseSuccess = () => {
    setShowDayCloseModal(false);
    // Re-fetch previous day status so the block and animation clear
    refreshPreviousDayStatus();
    toast({
      title: t('shift.dayClose.success'),
      description: t('shift.dayClose.successDesc'),
    });
  };

  const handleStaleShiftsUpdated = () => {
    refreshPreviousDayStatus();
  };

  const activeStaff = staffList.filter((s) => s.status === 'active');
  const previousDayBlocked = isPreviousDayBlocked(previousDayStatus);
  const closedShiftCount = previousDayStatus?.todayClosedShiftsCount ?? 0;
  const closeDayAttention = closedShiftCount >= 2;
  const closeDayAnimate = closeDayAttention && animateCloseDay;
  const isShiftActionsReady = !checkingActiveShift && !loading && activeStaff.length > 0;

  useEffect(() => {
    const justClosedShiftAt = (location.state as { justClosedShiftAt?: number } | null)?.justClosedShiftAt;
    if (!justClosedShiftAt) return;

    // Nudge the user right after shift close; active styling remains while count >= 2.
    setAnimateCloseDay(true);
    const timer = window.setTimeout(() => setAnimateCloseDay(false), 12000);
    return () => window.clearTimeout(timer);
  }, [location.state]);

  // Show backend unavailable state when there's an error and no staff loaded
  const isBackendUnavailable = error && staffList.length === 0 && !checkingActiveShift && !loading;

  return (
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      <Header
        currentShift={currentShift}
        currentStaff={currentStaff}
        isConnected={!isBackendUnavailable}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8">
        <div className="w-full max-w-lg mx-auto min-h-full flex flex-col justify-center">
          {/* Store Brand & Welcome */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <StoreBrand variant="logo-only" size="lg" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t('shift.welcomeTo').replace('{{brand}}', getBrandName())}
            </h1>
            <p className="text-muted-foreground">
              {t('shift.selectProfile')}
            </p>
          </div>

          {/* Orphaned Shifts Warning Banner */}
          {showOrphanedWarning && orphanedShifts.length > 0 && (
            <div className="bg-warning/10 border border-warning rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-warning">
                    {t('shift.orphanedShiftsWarning')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('shift.orphanedShiftsDescription').replace('{{count}}', orphanedShifts.length.toString())}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={handleManageShifts}
                  >
                    {t('shift.manageShifts')}
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="shrink-0 h-8 w-8 p-0"
                  onClick={() => setShowOrphanedWarning(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Previous Day Not Closed Warning */}
          {isPreviousDayBlocked(previousDayStatus) && (
            <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-destructive">
                    {t('shift.previousDayNotClosedTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('shift.previousDayNotClosed').replace('{{date}}', previousDayStatus.previousDate ?? '')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('shift.closeStaleFirstHint')}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowStaleShiftsModal(true)}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                      {t('shift.closeStaleShifts')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => openDayCloseModal(previousDayStatus.previousDate)}
                    >
                      <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                      {t('shift.closeDay')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backend Unavailable State */}
          {isBackendUnavailable ? (
            <div className="bg-card rounded-xl border border-border p-6 shadow-md">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Backend Not Available
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Unable to connect to the server. Please ensure the backend is running and try again.
                  </p>
                </div>
                <button
                  onClick={handleReload}
                  className="pos-btn gap-2 px-6 py-3 rounded-xl font-medium bg-primary text-primary-foreground"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload
                </button>
              </div>
            </div>
          ) : (
            /* Staff Selection */
            <div className="bg-card rounded-xl border border-border p-6 shadow-md">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('shift.selectStaff')}
              </h2>

              {checkingActiveShift ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    {t('shift.checkingActiveShift')}
                  </p>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-lg bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : activeStaff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  <User className="w-10 h-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm">
                    {t('shift.noActiveStaff')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {activeStaff.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className={`
                        pos-btn flex-col p-4 gap-1 rounded-xl border-2 transition-all
                        ${
                          selectedStaff?.id === staff.id
                            ? 'border-accent bg-accent/10 text-accent-foreground'
                            : 'border-border bg-card hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-1">
                        <span className="text-lg font-semibold text-secondary-foreground">
                          {staff.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium">{staff.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {staff.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {error && !isBackendUnavailable && (
                <div>
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>

                  <button onClick={() => navigate('/admin/order-history')} className="pos-btn gap-2 px-4 py-2 rounded-xl font-medium bg-secondary text-secondary-foreground mb-4 w-full">
                    <ArrowRight className="w-4 h-4 inline-block mr-1" />
                    {t('shift.manageShifts')}
                  </button>
                </div>
              )}

              {/* Shift action area */}
              {isShiftActionsReady && (
                <>
                  {!error && (
                    <button
                      onClick={handleOpenShift}
                      disabled={!selectedStaff || openingShift || previousDayBlocked}
                      className={`
                        w-full pos-btn gap-3 py-4 rounded-xl font-semibold text-lg
                        ${
                          !selectedStaff || openingShift || previousDayBlocked
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-success text-success-foreground shadow-md'
                        }
                      `}
                    >
                      {openingShift ? (
                        <>
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {t('shift.openingShift')}
                        </>
                      ) : previousDayBlocked ? (
                        <>
                          <Lock className="w-5 h-5" />
                          {t('shift.openShift')}
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          {t('shift.openShift')}
                        </>
                      )}
                    </button>
                  )}

                  {/* Close Day Button */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <Button
                      variant={closeDayAttention ? 'default' : 'outline'}
                      className={[
                        'w-full gap-2 transition-all duration-300',
                        closeDayAttention
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent shadow-lg ring-2 ring-amber-300/70'
                          : '',
                        closeDayAnimate ? 'animate-pulse scale-[1.02]' : '',
                      ].join(' ')}
                      onClick={() => openDayCloseModal()}
                    >
                      <CalendarCheck className="w-4 h-4" />
                      {t('shift.closeDay')}
                      {closeDayAttention && (
                        <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-bold leading-none">
                          {closedShiftCount}
                        </span>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {t('shift.closeDayHint')}
                    </p>
                    {closeDayAttention && (
                      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center justify-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{t('shift.closeDayReminder')}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Day Close Preview Modal */}
          <DayClosePreviewModal
            open={showDayCloseModal}
            onClose={() => setShowDayCloseModal(false)}
            onSuccess={handleDayCloseSuccess}
            targetDate={dayCloseTargetDate ?? undefined}
          />

          <StaleShiftsModal
            open={showStaleShiftsModal}
            onClose={() => setShowStaleShiftsModal(false)}
            previousDate={previousDayStatus?.previousDate}
            onUpdated={handleStaleShiftsUpdated}
          />
        </div>
      </div>
    </div>
  );
}
