import React, { useState, useEffect } from 'react';
import {
  Play,
  CloudRain,
  Snowflake,
  Wind,
  ShieldCheck,
  TrendingUp,
  Box,
  Navigation,
  PoundSterling,
  Calendar,
  Award,
  Key,
  Calculator,
  CheckCircle2,
  Clock,
  Trash2,
} from 'lucide-react';
import {
  CourierNetwork,
  WeatherTelemetry,
  ActiveShift,
  HMRCTaxCalculations,
} from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';
import { deleteShiftFromSupabase } from '../../services/db';

interface InCabHomeHubProps {
  activeShift: ActiveShift | null;
  shiftHistory?: ActiveShift[];
  weather: WeatherTelemetry | null;
  taxMetrics: HMRCTaxCalculations;
  onStartShift: (network: CourierNetwork, startOdo: number, agreedRate: number, bonus: number) => void;
  onNavigateTo: (module: 'hud' | 'loadin' | 'radar' | 'hmrc' | 'doorstep' | 'calculator' | 'pro') => void;
  isProUser?: boolean;
}

const NETWORKS: CourierNetwork[] = [
  'Amazon Flex',
  'DPD',
  'Evri',
  'Stuart',
  'Deliveroo',
  'Uber Eats',
  'B2B Sameday',
  'Yodel',
  'Just Eat',
  'Gophr',
];

export const InCabHomeHub: React.FC<InCabHomeHubProps> = ({
  activeShift,
  shiftHistory = [],
  weather,
  taxMetrics,
  onStartShift,
  onNavigateTo,
  isProUser = false,
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<CourierNetwork>('Amazon Flex');
  const [startOdoInput, setStartOdoInput] = useState<number | ''>(
    activeShift ? activeShift.currentOdometer : ''
  );
  const [agreedRateInput, setAgreedRateInput] = useState<number | ''>(
    activeShift ? activeShift.agreedBlockRate : ''
  );
  const [bonusInput, setBonusInput] = useState<number | ''>(
    activeShift ? activeShift.bonusPay : ''
  );
  const [localHistory, setLocalHistory] = useState<ActiveShift[]>(shiftHistory);
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);

  useEffect(() => {
    setLocalHistory(shiftHistory);
  }, [shiftHistory]);

  useEffect(() => {
    if (activeShift) {
      setStartOdoInput(activeShift.currentOdometer || '');
      setAgreedRateInput(activeShift.agreedBlockRate || '');
      setBonusInput(activeShift.bonusPay || '');
      setSelectedNetwork(activeShift.network);
    }
  }, [activeShift]);

  const handleLaunchShift = () => {
    triggerHapticFeedback('success');
    speakUkVoicePrompt(`Clocked in for ${selectedNetwork} block. Opening van parcel map.`);
    onStartShift(
      selectedNetwork,
      typeof startOdoInput === 'number' ? startOdoInput : 0,
      typeof agreedRateInput === 'number' ? agreedRateInput : 0,
      typeof bonusInput === 'number' ? bonusInput : 0
    );
  };

  const handleProGatedNavigation = (module: 'doorstep' | 'calculator') => {
    if (!isProUser) {
      onNavigateTo('pro');
    } else {
      onNavigateTo(module);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm('Delete this shift block from your records?')) return;
    setDeletingShiftId(shiftId);
    triggerHapticFeedback('warning');

    const success = await deleteShiftFromSupabase(shiftId);
    if (success) {
      setLocalHistory((prev) => prev.filter((s) => s.id !== shiftId));
    }
    setDeletingShiftId(null);
  };

  // Dynamic calculations derived strictly from shifts
  const todayGross = activeShift?.isActive
    ? (activeShift.agreedBlockRate || 0) + (activeShift.bonusPay || 0)
    : 0;

  const pastTotal = localHistory.reduce(
    (sum, s) => sum + (s.agreedBlockRate || 0) + (s.bonusPay || 0),
    0
  );
  const thisWeekGross = pastTotal + todayGross;
  const monthlyProjection = Math.round(thisWeekGross * 4.33);

  const totalAmapDeduction = Number(taxMetrics?.totalAmapMileageDeduction);
  const displayAmapDeduction = isNaN(totalAmapDeduction) ? 0 : totalAmapDeduction;

  const totalMilesYTD = Number(taxMetrics?.totalBusinessMilesYTD);
  const displayMilesYTD = isNaN(totalMilesYTD) ? 0 : totalMilesYTD;

  return (
    <div id="module-incab-home-hub" className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Top Welcome / Status Hero */}
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 font-bold">
                Cab Telemetry Online
              </span>
              <span className="text-[10px] font-mono text-secondary">
                {weather?.city ? `${weather.city} Hub • UK` : 'UK Regional Hub'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-mono">
              In-Cab Workstation Hub
            </h1>
            <p className="text-xs text-secondary max-w-xl">
              Launch delivery blocks, track road weather conditions, log HMRC AMAP mileage write-offs, and organise your vehicle parcels.
            </p>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              id="btn-quick-doorstep-intel"
              onClick={() => handleProGatedNavigation('doorstep')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-inset hover:bg-subtle border border-brand-cyan/40 text-brand-cyan text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer touch-manipulation"
              title="Open Customer Access & Gate Codes Vault"
            >
              <Key className="w-4 h-4" />
              <span>Access Codes</span>
              {!isProUser && (
                <span className="px-1.5 py-0.2 text-[9px] font-bold font-mono rounded bg-amber-400/15 text-amber-400 border border-amber-400/30 ml-0.5">
                  PRO
                </span>
              )}
            </button>
            <button
              id="btn-quick-shift-calc"
              onClick={() => handleProGatedNavigation('calculator')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-inset hover:bg-subtle border border-brand-emerald/40 text-brand-emerald text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer touch-manipulation"
              title="Open Hourly Rate & Net Profit Calculator"
            >
              <Calculator className="w-4 h-4" />
              <span>Shift Profit</span>
              {!isProUser && (
                <span className="px-1.5 py-0.2 text-[9px] font-bold font-mono rounded bg-amber-400/15 text-amber-400 border border-amber-400/30 ml-0.5">
                  PRO
                </span>
              )}
            </button>
            <button
              id="btn-quick-active-dispatch"
              onClick={() => onNavigateTo('hud')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer touch-manipulation"
            >
              <Navigation className="w-4 h-4 text-brand-cyan" />
              <span>Active HUD</span>
            </button>
            <button
              id="btn-quick-spatial-loadin"
              onClick={() => onNavigateTo('loadin')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas text-xs font-black transition-all shadow-lg hover:opacity-95 active:scale-95 cursor-pointer touch-manipulation"
            >
              <Box className="w-4 h-4" />
              <span>Van Parcel Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Period Earnings & Tax Shield Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* Today */}
        <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-1 shadow-md">
          <div className="flex items-center justify-between text-secondary text-[11px]">
            <span>Today Gross</span>
            <PoundSterling className="w-3.5 h-3.5 text-brand-emerald" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-primary">
            £{todayGross.toFixed(2)}
          </div>
          <div className="text-[10px] text-brand-emerald flex items-center gap-1 font-sans">
            <TrendingUp className="w-3 h-3" />
            <span>
              {activeShift?.isActive
                ? 'Active Block Running'
                : localHistory.length > 0
                  ? `${localHistory.length} Block(s) Logged`
                  : 'No shifts recorded'}
            </span>
          </div>
        </div>

        {/* This Week */}
        <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-1 shadow-md">
          <div className="flex items-center justify-between text-secondary text-[11px]">
            <span>This Week</span>
            <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-primary">
            £{thisWeekGross.toFixed(2)}
          </div>
          <div className="text-[10px] text-secondary font-sans">
            {localHistory.length > 0 ? `${localHistory.length} Blocks Recorded` : '0 Blocks Recorded'}
          </div>
        </div>

        {/* Monthly Projection */}
        <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-1 shadow-md">
          <div className="flex items-center justify-between text-secondary text-[11px]">
            <span>Month Forecast</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-primary">
            £{monthlyProjection.toFixed(2)}
          </div>
          <div className="text-[10px] text-secondary font-sans">
            {thisWeekGross > 0 ? 'Paced on current activity' : 'Awaiting shift data'}
          </div>
        </div>

        {/* AMAP Tax Shield */}
        <div
          onClick={() => (!isProUser ? onNavigateTo('pro') : onNavigateTo('hmrc'))}
          className="p-4 rounded-2xl bg-surface border border-brand-emerald/40 space-y-1 shadow-md cursor-pointer hover:border-brand-emerald transition-colors relative"
          title="Click to open HMRC AMAP Tax Vault"
        >
          <div className="flex items-center justify-between text-secondary text-[11px]">
            <div className="flex items-center gap-1.5">
              <span>AMAP Tax Shield</span>
              {!isProUser && (
                <span className="px-1 py-0.2 text-[8px] font-bold font-mono rounded bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  PRO
                </span>
              )}
            </div>
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-brand-emerald">
            £{displayAmapDeduction.toFixed(2)}
          </div>
          <div className="text-[10px] text-secondary font-sans flex items-center justify-between">
            <span>{displayMilesYTD} mi claimable</span>
            <span className="text-brand-emerald font-bold">45p/mi</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Shift Launcher & Live Weather Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Shift Launcher */}
        <div className="lg:col-span-7 bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-brand-cyan" />
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
                Shift Launcher & Clock-In
              </h2>
            </div>
            {activeShift?.isActive && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-brand-emerald border border-emerald-800 font-bold animate-pulse">
                SHIFT IN PROGRESS
              </span>
            )}
          </div>

          {/* Courier Network Selector - Glove-friendly horizontal swipe bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary">
                Select Courier Network
              </span>
              <span className="text-[10px] font-mono text-secondary/60 uppercase">
                Swipe to choose
              </span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar touch-pan-x">
              {NETWORKS.map((net) => {
                const isSelected = selectedNetwork === net;
                return (
                  <button
                    key={net}
                    id={`btn-network-${net.toLowerCase().replace(/\s+/g, '-')}`}
                    type="button"
                    onClick={() => {
                      setSelectedNetwork(net);
                      triggerHapticFeedback('light');
                    }}
                    className={`shrink-0 min-w-[120px] min-h-[52px] px-4 py-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center ${
                      isSelected
                        ? 'bg-brand-cyan text-canvas border-brand-cyan shadow-lg shadow-cyan-500/25'
                        : 'bg-inset border-subtle text-secondary hover:text-primary hover:border-brand-cyan/40'
                    }`}
                  >
                    {net}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rates & Odometer Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label htmlFor="input-start-odometer" className="block text-secondary mb-1 font-sans font-semibold">
                Starting Odometer (Miles)
              </label>
              <input
                id="input-start-odometer"
                type="number"
                placeholder="e.g. 48000"
                value={startOdoInput}
                onChange={(e) => setStartOdoInput(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-inset border border-subtle text-primary font-bold placeholder:text-secondary/40 focus:border-brand-cyan focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="input-agreed-block-rate" className="block text-secondary mb-1 font-sans font-semibold">
                Block Pay (£)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-secondary font-bold">£</span>
                <input
                  id="input-agreed-block-rate"
                  type="number"
                  step="0.50"
                  placeholder="0.00"
                  value={agreedRateInput}
                  onChange={(e) => setAgreedRateInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-inset border border-subtle text-primary font-bold placeholder:text-secondary/40 focus:border-brand-cyan focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-surge-bonus-rate" className="block text-secondary mb-1 font-sans font-semibold">
                Bonus / Surge (£)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-secondary font-bold">£</span>
                <input
                  id="input-surge-bonus-rate"
                  type="number"
                  step="0.50"
                  placeholder="0.00"
                  value={bonusInput}
                  onChange={(e) => setBonusInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-inset border border-subtle text-primary font-bold placeholder:text-secondary/40 focus:border-brand-cyan focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-clock-in-action"
              onClick={handleLaunchShift}
              className="w-full min-h-[50px] py-3.5 rounded-xl bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {activeShift?.isActive ? 'Update Active Shift Parameters' : `Clock In for ${selectedNetwork} Block`}
              </span>
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Live Weather Telemetry */}
        <div className="lg:col-span-5 bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-subtle pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-brand-cyan" />
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
                  Live Weather Telemetry
                </h2>
              </div>
              <span className="text-[10px] text-secondary font-mono">
                Open-Meteo GPS
              </span>
            </div>

            {weather ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-black text-primary font-mono flex items-center gap-2">
                      <span>{weather.temperature}°C</span>
                      {weather.isFrostWarning && (
                        <Snowflake className="w-6 h-6 text-amber-400 animate-spin" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-secondary">
                      {weather.conditionDescription} • Feels like {weather.feelsLike}°C
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-brand-cyan font-bold block">
                      {weather.city}
                    </span>
                    <span className="text-[10px] text-secondary">
                      Updated {weather.lastUpdated}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-inset border border-subtle flex items-center gap-2">
                    <Wind className="w-4 h-4 text-secondary" />
                    <div>
                      <span className="text-[10px] text-secondary block">Wind Speed</span>
                      <span className="font-bold text-primary">{weather.windSpeedMph} mph</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-inset border border-subtle flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-brand-cyan" />
                    <div>
                      <span className="text-[10px] text-secondary block">Precipitation</span>
                      <span className="font-bold text-primary">
                        {weather.precipitationProbability}%
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    weather.isFrostWarning
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                      : 'bg-inset border-subtle text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {weather.isFrostWarning ? (
                      <Snowflake className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-brand-emerald" />
                    )}
                    <span className={weather.isFrostWarning ? 'text-amber-300' : 'text-primary'}>
                      {weather.isFrostWarning ? 'FROST WARNING ADVISORY' : 'Road Safety Telemetry'}
                    </span>
                  </div>
                  <p className="text-[11px]">{weather.frostAdvisory}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-6 text-center">
                <div className="w-8 h-8 mx-auto border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-secondary font-mono">Connecting to UK Weather Station...</p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => (!isProUser ? onNavigateTo('pro') : onNavigateTo('radar'))}
              className="w-full py-2.5 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs font-semibold text-secondary hover:text-primary flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Award className="w-4 h-4 text-brand-cyan" />
              <span>Check UK Courier Pay Benchmarks (Pay Radar)</span>
              {!isProUser && (
                <span className="px-1.5 py-0.2 text-[9px] font-bold font-mono rounded bg-amber-400/15 text-amber-400 border border-amber-400/30 ml-1">
                  PRO
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Logged Shifts Section with Delete Trigger */}
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-emerald" />
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
              Completed Block Logs & History
            </h2>
          </div>
          <span className="text-xs font-mono text-secondary">
            {localHistory.length} Block(s) Recorded
          </span>
        </div>

        {localHistory.length === 0 ? (
          <div className="py-8 text-center text-secondary text-xs font-mono">
            No completed shifts logged yet. Once you tap "End Shift" on an active route, it will appear here.
          </div>
        ) : (
          <div className="divide-y divide-subtle">
            {localHistory.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs font-mono">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{s.network}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-subtle text-secondary font-sans">
                      {new Date(s.startTime).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-secondary">
                    Clocked in: {new Date(s.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    {s.endTime && ` • Ended: ${new Date(s.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                    {s.totalMilesDriven > 0 && ` • ${s.totalMilesDriven} miles driven`}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-black text-brand-emerald">
                      £{(Number(s.agreedBlockRate || 0) + Number(s.bonusPay || 0)).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-secondary font-sans flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3 text-brand-emerald" />
                      Logged to HMRC
                    </span>
                  </div>

                  <button
                    type="button"
                    title="Delete this block"
                    disabled={deletingShiftId === s.id}
                    onClick={() => handleDeleteShift(s.id)}
                    className="p-2 rounded-lg bg-inset hover:bg-red-500/10 hover:text-red-400 text-secondary border border-subtle hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};