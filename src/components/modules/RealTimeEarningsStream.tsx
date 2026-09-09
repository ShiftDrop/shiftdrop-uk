import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Coins,
  Zap,
  Activity,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Fuel,
  ArrowUpRight,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { ParcelStop, ActiveShift, HMRCTaxCalculations } from '../../types';
import { triggerHapticFeedback } from '../../services/telemetry';

interface RealTimeEarningsStreamProps {
  stops: ParcelStop[];
  activeShift: ActiveShift;
  taxMetrics: HMRCTaxCalculations;
  onConfirmDrop: (stopId: string) => void;
}

export const RealTimeEarningsStream: React.FC<RealTimeEarningsStreamProps> = ({
  stops,
  activeShift,
  taxMetrics,
  onConfirmDrop,
}) => {
  const [pulseActive, setPulseActive] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'delivered' | 'returned'>('all');

  const deliveredStops = stops.filter((s) => s.status === 'Delivered');
  const returnedStops = stops.filter((s) => s.status === 'Returned');
  const pendingStops = stops.filter((s) => s.status === 'Pending');

  const totalDrops = stops.length;
  const completedDrops = deliveredStops.length;
  const grossPay = activeShift.agreedBlockRate + (activeShift.bonusPay || 0);
  const avgPayPerDrop = completedDrops > 0 ? grossPay / completedDrops : grossPay / totalDrops;
  const effectiveHourly = grossPay > 0 ? grossPay / 4 : 21.5;

  // Flash pulse when stops change
  useEffect(() => {
    setPulseActive(true);
    const t = setTimeout(() => setPulseActive(false), 800);
    return () => clearTimeout(t);
  }, [stops]);

  const filteredStops = stops.filter((s) => {
    if (filterMode === 'delivered') return s.status === 'Delivered';
    if (filterMode === 'returned') return s.status === 'Returned';
    return true;
  });

  return (
    <div id="module-realtime-earnings" className="w-full p-2 sm:p-4 md:p-6 font-sans space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tight font-mono truncate">
              Live Real-Time Earnings Stream
            </h1>
            <p className="text-xs text-secondary truncate">
              Zero-latency drop counter • Instant HMRC AMAP tax shield updates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              realtimeConnected
                ? 'bg-brand-emerald/15 text-brand-emerald border-brand-emerald/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{realtimeConnected ? 'REACTIVE STREAM LIVE' : 'STREAM OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Shift Gross Pay */}
        <div
          className={`bg-surface border rounded-2xl p-5 shadow-xl transition-all ${
            pulseActive ? 'border-brand-cyan shadow-[0_0_20px_#06B6D433]' : 'border-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-secondary font-mono">
            <span>SHIFT GROSS PAY</span>
            <Coins className="w-4 h-4 text-brand-cyan" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono text-primary tracking-tight">
              £{grossPay.toFixed(2)}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-brand-emerald font-bold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Block Rate: £{activeShift.agreedBlockRate.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: AMAP Tax Shield Accrued */}
        <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-secondary font-mono">
            <span>HMRC AMAP TAX SHIELD</span>
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono text-brand-emerald tracking-tight">
              £{taxMetrics.totalAmapMileageDeduction.toFixed(2)}
            </span>
            <p className="text-xs text-secondary font-mono mt-1">
              @ 45p/mi on {taxMetrics.amapAllowanceFirstTierMiles} miles
            </p>
          </div>
        </div>

        {/* Card 3: Avg Drop Velocity */}
        <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-secondary font-mono">
            <span>PER-DROP YIELD</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono text-amber-400 tracking-tight">
              £{avgPayPerDrop.toFixed(2)}
            </span>
            <p className="text-xs text-secondary font-mono mt-1">
              {completedDrops} of {totalDrops} parcels completed
            </p>
          </div>
        </div>

        {/* Card 4: Effective Hourly Rate */}
        <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-secondary font-mono">
            <span>EFFECTIVE HOURLY</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black font-mono text-cyan-400 tracking-tight">
              £{effectiveHourly.toFixed(2)}
            </span>
            <p className="text-xs text-secondary font-mono mt-1">
              Net of estimated tax shield
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Drops Stream Table & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Live Drop Events Feed */}
        <div className="lg:col-span-8 bg-surface border border-subtle rounded-2xl p-3.5 sm:p-5 shadow-xl flex flex-col min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-subtle pb-3.5 mb-3.5">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-cyan" />
              <h3 className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wider font-mono">
                Live Manifest Activity Feed
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-inset p-1 rounded-xl border border-subtle text-xs shrink-0">
              <button
                id="btn-filter-stream-all"
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  triggerHapticFeedback('light');
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all font-medium text-[11px] sm:text-xs whitespace-nowrap active:scale-95 ${
                  filterMode === 'all'
                    ? 'bg-subtle text-primary font-bold shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                All ({stops.length})
              </button>
              <button
                id="btn-filter-stream-delivered"
                type="button"
                onClick={() => {
                  setFilterMode('delivered');
                  triggerHapticFeedback('light');
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all font-medium text-[11px] sm:text-xs whitespace-nowrap active:scale-95 ${
                  filterMode === 'delivered'
                    ? 'bg-brand-emerald text-canvas font-bold shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Delivered ({deliveredStops.length})
              </button>
              <button
                id="btn-filter-stream-returned"
                type="button"
                onClick={() => {
                  setFilterMode('returned');
                  triggerHapticFeedback('light');
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all font-medium text-[11px] sm:text-xs whitespace-nowrap active:scale-95 ${
                  filterMode === 'returned'
                    ? 'bg-red-500 text-white font-bold shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Returned ({returnedStops.length})
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredStops.length === 0 ? (
              <div className="bg-inset border border-subtle rounded-xl p-6 text-center space-y-2.5 my-2">
                <CheckCircle2 className="w-7 h-7 text-brand-emerald mx-auto opacity-80" />
                <h4 className="text-xs font-bold text-primary font-mono">
                  {filterMode === 'returned'
                    ? 'No Returned Parcels'
                    : filterMode === 'delivered'
                    ? 'No Completed Drops Yet'
                    : 'No Parcels Found'}
                </h4>
                <p className="text-[11px] text-secondary max-w-xs mx-auto">
                  {filterMode === 'returned'
                    ? 'All parcel drops are either delivered or in progress.'
                    : filterMode === 'delivered'
                    ? 'Click "Drop" on any pending stop in the manifest to confirm delivery.'
                    : 'No stops currently match the selected filter.'}
                </p>
                <button
                  onClick={() => {
                    setFilterMode('all');
                    triggerHapticFeedback('light');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-subtle hover:opacity-90 text-primary text-xs font-mono font-bold transition-colors"
                >
                  Show All ({stops.length}) Drops
                </button>
              </div>
            ) : (
              filteredStops.map((stop) => {
                const isDelivered = stop.status === 'Delivered';
                const isReturned = stop.status === 'Returned';

                return (
                  <div
                    key={stop.id}
                    className={`p-2.5 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isDelivered
                        ? 'bg-brand-emerald/10 border-brand-emerald/30 text-primary'
                        : isReturned
                        ? 'bg-red-950/20 border-red-500/30 text-white'
                        : 'bg-inset border-subtle text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                          isDelivered
                            ? 'bg-brand-emerald text-canvas'
                            : isReturned
                            ? 'bg-red-500 text-white'
                            : 'bg-subtle text-secondary'
                        }`}
                      >
                        #{stop.stopNumber}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-primary truncate">{stop.recipientName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface text-brand-cyan border border-subtle shrink-0">
                            {stop.postcode}
                          </span>
                        </div>
                        <p className="text-[11px] text-secondary truncate mt-0.5">
                          {stop.addressLine1}, {stop.townCity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-subtle sm:border-transparent pt-2 sm:pt-0">
                      <div className="text-right font-mono shrink-0">
                        <span className="text-xs font-bold text-primary block whitespace-nowrap">
                          {isDelivered ? `+£${(grossPay / totalDrops).toFixed(2)}` : '£0.00'}
                        </span>
                        <span className="text-[10px] text-secondary block whitespace-nowrap">
                          {stop.assignedZone.split(' ')[0]}
                        </span>
                      </div>

                      {stop.status === 'Pending' && (
                        <button
                          onClick={() => onConfirmDrop(stop.id)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-brand-emerald text-canvas font-bold text-xs hover:opacity-90 transition-all active:scale-95 shadow-sm shrink-0 whitespace-nowrap"
                        >
                          Drop
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 4 Cols: Performance Pace & Projected Total */}
        <div className="lg:col-span-4 space-y-6">
          {/* Shift Projection Card */}
          <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider font-mono">
              Pace & Projection
            </h3>

            <div className="space-y-3 font-mono">
              <div className="flex justify-between text-xs pb-2 border-b border-subtle">
                <span className="text-secondary">Completion Rate:</span>
                <span className="text-primary font-bold">
                  {((completedDrops / totalDrops) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-subtle">
                <span className="text-secondary">Drops Left:</span>
                <span className="text-brand-cyan font-bold">{pendingStops.length} stops</span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-subtle">
                <span className="text-secondary">Est. Completion Time:</span>
                <span className="text-brand-emerald font-bold">
                  ~{(pendingStops.length * 3.5).toFixed(0)} mins
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-secondary">Total Tax Shield:</span>
                <span className="text-brand-emerald font-black">
                  £{taxMetrics.totalAmapMileageDeduction.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Voice Prompt Reminder */}
          <div className="bg-inset border border-brand-cyan/30 rounded-2xl p-4 shadow-md text-xs space-y-2">
            <div className="flex items-center gap-2 text-brand-cyan font-bold font-mono">
              <Zap className="w-4 h-4" />
              <span>Voice Query Tip</span>
            </div>
            <p className="text-secondary text-[11px] leading-relaxed">
              Say <span className="text-primary font-mono font-bold">"What are my earnings today?"</span> or <span className="text-primary font-mono font-bold">"Give me a route summary"</span> at any time for instant hands-free speech responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
