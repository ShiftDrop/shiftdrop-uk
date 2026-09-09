import React, { useState, useEffect } from 'react';
import {
  Clock,
  Package,
  Gauge,
  PowerOff,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { ActiveShift } from '../types';
import { triggerHapticFeedback } from '../services/telemetry';

interface ActiveShiftRibbonProps {
  activeShift: ActiveShift | null;
  onEndShift: () => void;
  onUpdateOdometer: (newOdo: number) => void;
}

export const ActiveShiftRibbon: React.FC<ActiveShiftRibbonProps> = ({
  activeShift,
  onEndShift,
  onUpdateOdometer,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isEndingModalOpen, setIsEndingModalOpen] = useState(false);
  const [finalOdoInput, setFinalOdoInput] = useState<number>(0);

  useEffect(() => {
    if (!activeShift || !activeShift.isActive) {
      setElapsedSeconds(0);
      return;
    }

    const startTimestamp = new Date(activeShift.startTime).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startTimestamp) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeShift]);

  if (!activeShift || !activeShift.isActive) {
    return null;
  }

  const formatStopwatch = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const deliveredCount = activeShift.stops.filter((s) => s.status === 'Delivered').length;
  const returnedCount = activeShift.stops.filter((s) => s.status === 'Returned').length;
  const totalCount = activeShift.stops.length;
  const totalGross = (activeShift.agreedBlockRate || 0) + (activeShift.bonusPay || 0);
  const milesDriven = Math.max(0, activeShift.currentOdometer - activeShift.startingOdometer);

  const getNetworkBadgeStyle = (network: string) => {
    switch (network) {
      case 'Amazon Flex':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'DPD':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'Evri':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Stuart':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Deliveroo':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'Uber Eats':
        return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'B2B Sameday':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  const handleOpenEndModal = () => {
    triggerHapticFeedback('warning');
    setFinalOdoInput(activeShift.currentOdometer);
    setIsEndingModalOpen(true);
  };

  const handleConfirmEndShift = () => {
    triggerHapticFeedback('success');
    if (finalOdoInput >= activeShift.startingOdometer) {
      onUpdateOdometer(finalOdoInput);
    }
    setIsEndingModalOpen(false);
    onEndShift();
  };

  return (
    <>
      <div
        id="sticky-active-shift-ribbon"
        className="sticky top-14 sm:top-16 z-20 w-full bg-brand-cyan text-canvas font-bold shadow-md font-sans border-b border-[#0891B2]"
      >
        {/* MOBILE VIEW (< 640px): 2-Tier Stacked Layout */}
        <div className="sm:hidden px-3 py-2 space-y-1.5">
          {/* Top Tier: Network Badge + End Shift Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                id="badge-active-courier-network"
                className="bg-canvas text-brand-cyan px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider shrink-0"
              >
                ACTIVE
              </span>
              <span className="text-xs font-bold text-canvas truncate">
                {activeShift.network}
              </span>
            </div>

            <button
              id="btn-punch-out-shift-mobile"
              onClick={handleOpenEndModal}
              className="bg-canvas text-primary px-3 py-1 rounded-lg text-[11px] font-bold hover:bg-black/80 shadow transition-all active:scale-95 shrink-0 uppercase tracking-wide"
              title="End Active Shift & Generate Tax Debrief"
            >
              END SHIFT
            </button>
          </div>

          {/* Bottom Tier: 3 Equal Metrics (Time, Drops, Gross) */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5 border-t border-[#0B0D131A] text-center">
            {/* Time */}
            <div className="bg-canvas/10 rounded-md py-1 px-1">
              <span className="text-[9px] uppercase tracking-tighter opacity-70 block leading-tight">
                TIME
              </span>
              <span className="text-xs font-mono font-black text-canvas">
                {formatStopwatch(elapsedSeconds)}
              </span>
            </div>

            {/* Drops */}
            <div className="bg-canvas/10 rounded-md py-1 px-1">
              <span className="text-[9px] uppercase tracking-tighter opacity-70 block leading-tight">
                DROPS
              </span>
              <span className="text-xs font-bold text-canvas">
                {deliveredCount}/{totalCount}
                {returnedCount > 0 && (
                  <span className="text-[10px] text-red-900 ml-0.5 font-mono">
                    ({returnedCount}R)
                  </span>
                )}
              </span>
            </div>

            {/* Gross Est */}
            <div className="bg-canvas/10 rounded-md py-1 px-1">
              <span className="text-[9px] uppercase tracking-tighter opacity-70 block leading-tight">
                GROSS EST.
              </span>
              <span className="text-xs font-mono font-black text-canvas">
                £{totalGross.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* TABLET & DESKTOP VIEW (>= 640px): 1-Row Horizontal Streamlined Ribbon */}
        <div className="hidden sm:flex items-center px-4 sm:px-6 py-2 min-h-[52px] justify-between gap-4 text-sm">
          {/* Left Metrics */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <span
                id="badge-active-courier-network-desktop"
                className="bg-canvas text-brand-cyan px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider"
              >
                ACTIVE
              </span>
              <span className="text-sm font-bold text-canvas whitespace-nowrap">
                {activeShift.network}
              </span>
            </div>

            <div className="h-5 w-px bg-[#0B0D1333]" />

            {/* Time Elapsed */}
            <div
              id="ribbon-live-stopwatch"
              className="flex items-center gap-1.5 shrink-0"
              title="Live Shift Elapsed Time"
            >
              <span className="text-xs uppercase opacity-75">Time:</span>
              <span className="text-sm sm:text-base font-mono font-black text-canvas">
                {formatStopwatch(elapsedSeconds)}
              </span>
            </div>

            <div className="h-5 w-px bg-[#0B0D1333]" />

            {/* Drops Progress */}
            <div
              id="ribbon-parcel-counter"
              className="flex items-center gap-1.5 shrink-0"
              title="Delivered / Total Parcels"
            >
              <span className="text-xs uppercase opacity-75">Progress:</span>
              <span className="text-sm sm:text-base font-bold text-canvas whitespace-nowrap">
                {deliveredCount} / {totalCount} Drops
              </span>
              {returnedCount > 0 && (
                <span className="text-xs bg-canvas text-red-400 px-1.5 py-0.2 rounded font-mono ml-1">
                  {returnedCount} Ret.
                </span>
              )}
            </div>
          </div>

          {/* Right Metrics: Gross & Action Button */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-auto">
            <div
              id="ribbon-gross-pay"
              className="text-right shrink-0"
              title="Agreed Block Rate + Bonuses"
            >
              <span className="text-[10px] uppercase opacity-75 block leading-none">
                Gross Est.
              </span>
              <span className="text-base sm:text-lg font-mono font-black leading-tight text-canvas">
                £{totalGross.toFixed(2)}
              </span>
            </div>

            <button
              id="btn-punch-out-shift"
              onClick={handleOpenEndModal}
              className="bg-canvas text-primary px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-black/80 shadow-md transition-all active:scale-95 shrink-0 uppercase tracking-wide whitespace-nowrap"
              title="End Active Shift & Generate Tax Debrief"
            >
              END SHIFT
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation & Final Odometer Modal */}
      {isEndingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-subtle rounded-2xl p-6 shadow-2xl text-primary font-sans">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-950/80 rounded-xl border border-red-500/40 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">End Courier Shift?</h3>
                <p className="text-xs text-secondary">
                  Complete route debrief and record HMRC AMAP mileage.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-3 rounded-xl bg-inset border border-subtle space-y-2">
                <div className="flex justify-between text-xs text-secondary">
                  <span>Courier Network:</span>
                  <span className="font-bold text-primary">{activeShift.network}</span>
                </div>
                <div className="flex justify-between text-xs text-secondary">
                  <span>Shift Duration:</span>
                  <span className="font-bold text-primary font-mono">
                    {formatStopwatch(elapsedSeconds)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-secondary">
                  <span>Total Delivered:</span>
                  <span className="font-bold text-brand-emerald">
                    {deliveredCount} / {totalCount} drops ({returnedCount} returned)
                  </span>
                </div>
                <div className="flex justify-between text-xs text-secondary">
                  <span>Total Gross Pay:</span>
                  <span className="font-bold text-brand-emerald font-mono text-sm">
                    £{totalGross.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Final Odometer Reading (Miles):
                </label>
                <div className="relative">
                  <input
                    id="input-end-odometer"
                    type="number"
                    value={finalOdoInput}
                    onChange={(e) => setFinalOdoInput(Number(e.target.value))}
                    min={activeShift.startingOdometer}
                    className="w-full px-3 py-2 bg-inset border border-subtle rounded-lg text-primary font-mono text-base focus:border-brand-cyan focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-secondary">
                    Start: {activeShift.startingOdometer}
                  </span>
                </div>
                <p className="text-[11px] text-secondary mt-1">
                  Total distance calculated:{' '}
                  <strong className="text-brand-emerald">
                    {Math.max(0, finalOdoInput - activeShift.startingOdometer).toFixed(1)} miles
                  </strong>{' '}
                  (AMAP tax claimable at 45p/mi).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEndingModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-inset border border-subtle text-sm text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-end-shift-punchout"
                onClick={handleConfirmEndShift}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95"
              >
                Punch Out & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
