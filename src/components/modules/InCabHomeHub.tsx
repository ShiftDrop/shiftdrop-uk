import React, { useState } from 'react';
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
  Layers,
  Sparkles,
  Award,
  Key,
  Calculator,
} from 'lucide-react';
import {
  CourierNetwork,
  WeatherTelemetry,
  ActiveShift,
  HMRCTaxCalculations,
} from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

interface InCabHomeHubProps {
  activeShift: ActiveShift | null;
  shiftHistory?: ActiveShift[];
  weather: WeatherTelemetry | null;
  taxMetrics: HMRCTaxCalculations;
  onStartShift: (network: CourierNetwork, startOdo: number, agreedRate: number, bonus: number) => void;
  onNavigateTo: (module: 'hud' | 'loadin' | 'radar' | 'hmrc') => void;
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
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<CourierNetwork>('Amazon Flex');
  const [startOdoInput, setStartOdoInput] = useState<number>(
    activeShift ? activeShift.currentOdometer : 48228
  );
  const [agreedRateInput, setAgreedRateInput] = useState<number>(72.50);
  const [bonusInput, setBonusInput] = useState<number>(0);

  const handleLaunchShift = () => {
    triggerHapticFeedback('success');
    speakUkVoicePrompt(`Clocked in for ${selectedNetwork} block. Opening parcel spatial organiser.`);
    onStartShift(selectedNetwork, startOdoInput, agreedRateInput, bonusInput);
  };

  const todayGross = activeShift?.isActive
    ? (activeShift.agreedBlockRate || 0) + (activeShift.bonusPay || 0)
    : 78.50;

  const pastTotal = shiftHistory.reduce(
    (sum, s) => sum + (s.agreedBlockRate || 0) + (s.bonusPay || 0),
    0
  );
  const currentBlockTotal = activeShift?.isActive
    ? (activeShift.agreedBlockRate || 0) + (activeShift.bonusPay || 0)
    : 0;
  const thisWeekGross = pastTotal + currentBlockTotal > 0 ? pastTotal + currentBlockTotal : 582.40;
  const monthlyProjection = Math.round(thisWeekGross * 4.33);

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
                Manchester NW Hub • UK
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-mono">
              In-Cab Workstation Hub
            </h1>
            <p className="text-xs text-secondary max-w-xl">
              Launch new courier blocks, monitor live road telemetry, track real-time AMAP tax write-offs, and synchronise parcel load-ins.
            </p>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              id="btn-quick-doorstep-intel"
              onClick={() => onNavigateTo('doorstep')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-inset hover:bg-subtle border border-brand-cyan/40 text-brand-cyan text-xs font-bold transition-all shadow-md active:scale-95"
              title="Open Doorstep Intel & Gate Code Vault"
            >
              <Key className="w-4 h-4" />
              <span>Gate Codes</span>
            </button>
            <button
              id="btn-quick-shift-calc"
              onClick={() => onNavigateTo('calculator')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-inset hover:bg-subtle border border-brand-emerald/40 text-brand-emerald text-xs font-bold transition-all shadow-md active:scale-95"
              title="Open Real Hourly Rate & Profit Calculator"
            >
              <Calculator className="w-4 h-4" />
              <span>Shift Profit</span>
            </button>
            <button
              id="btn-quick-active-dispatch"
              onClick={() => onNavigateTo('hud')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Navigation className="w-4 h-4 text-brand-cyan" />
              <span>Active HUD</span>
            </button>
            <button
              id="btn-quick-spatial-loadin"
              onClick={() => onNavigateTo('loadin')}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan to-[#10B981] text-canvas text-xs font-extrabold transition-all shadow-lg hover:opacity-95 active:scale-95"
            >
              <Box className="w-4 h-4" />
              <span>Spatial Load-In</span>
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
            <span>{activeShift?.isActive ? 'Active Block Running' : '1 Block Completed'}</span>
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
            7 Blocks • 28.5 hrs
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
          <div className="text-[10px] text-cyan-400 font-sans">
            Target £2.4k on track
          </div>
        </div>

        {/* AMAP Tax Shield */}
        <div
          onClick={() => onNavigateTo('hmrc')}
          className="p-4 rounded-2xl bg-surface border border-brand-emerald/40 space-y-1 shadow-md cursor-pointer hover:border-brand-emerald transition-colors"
          title="Click to open HMRC AMAP Tax Vault"
        >
          <div className="flex items-center justify-between text-secondary text-[11px]">
            <span>AMAP Tax Shield</span>
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-brand-emerald">
            £{taxMetrics.totalAmapMileageDeduction.toFixed(2)}
          </div>
          <div className="text-[10px] text-secondary font-sans flex items-center justify-between">
            <span>{taxMetrics.totalBusinessMilesYTD} mi claimable</span>
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

          {/* Courier Network Selector */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-2">
              Select Courier Network
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {NETWORKS.map((net) => (
                <button
                  key={net}
                  id={`btn-network-${net.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => {
                    setSelectedNetwork(net);
                    triggerHapticFeedback('light');
                  }}
                  className={`p-2 rounded-xl text-xs font-bold text-center border transition-all ${
                    selectedNetwork === net
                      ? 'bg-brand-cyan/15 border-brand-cyan text-primary shadow-sm'
                      : 'bg-inset border-subtle text-secondary hover:text-primary'
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          {/* Rates & Odometer Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label className="block text-secondary mb-1 font-sans font-semibold">
                Starting Odometer (Miles)
              </label>
              <input
                id="input-start-odometer"
                type="number"
                value={startOdoInput}
                onChange={(e) => setStartOdoInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-secondary mb-1 font-sans font-semibold">
                Agreed Block Rate (£ GBP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-secondary">£</span>
                <input
                  id="input-agreed-block-rate"
                  type="number"
                  step="0.50"
                  value={agreedRateInput}
                  onChange={(e) => setAgreedRateInput(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-secondary mb-1 font-sans font-semibold">
                Surge / Bonus Pay (£ GBP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-secondary">£</span>
                <input
                  id="input-surge-bonus-rate"
                  type="number"
                  step="0.50"
                  value={bonusInput}
                  onChange={(e) => setBonusInput(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-clock-in-action"
              onClick={handleLaunchShift}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-cyan to-[#10B981] text-canvas font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {activeShift?.isActive ? 'Update Active Shift Parameters' : `Clock In for ${selectedNetwork} Block`}
              </span>
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Open-Meteo GPS Weather & Ice Risk */}
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

            {weather && (
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

                {/* Frost / Ice Advisory Box */}
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
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTo('radar')}
              className="w-full py-2.5 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs font-semibold text-secondary hover:text-primary flex items-center justify-center gap-2 transition-colors"
            >
              <Award className="w-4 h-4 text-brand-cyan" />
              <span>Check UK Courier Pay Benchmarks (Pay Radar)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
