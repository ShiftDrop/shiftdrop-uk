import React, { useState } from 'react';
import {
  Radar,
  TrendingUp,
  Award,
  Clock,
  PoundSterling,
  Fuel,
  Calendar,
  Sparkles,
  BarChart3,
  Sliders,
} from 'lucide-react';
import { UK_COURIER_BENCHMARKS } from '../../data/mockData';
import { CourierBenchmarkRate } from '../../types';
import { triggerHapticFeedback } from '../../services/telemetry';

type TimeframeOption = 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export const PayRadar: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('Weekly');
  const [targetWeeklyHours, setTargetWeeklyHours] = useState<number>(32);
  const [selectedSortBy, setSelectedSortBy] = useState<'hourly' | 'drop' | 'reliability'>('hourly');

  const benchmarks = [...UK_COURIER_BENCHMARKS].sort((a, b) => {
    if (selectedSortBy === 'hourly') return b.averageHourlyRateGbp - a.averageHourlyRateGbp;
    if (selectedSortBy === 'drop') return b.averageDropRateGbp - a.averageDropRateGbp;
    return b.reliabilityScore - a.reliabilityScore;
  });

  const topPerformer = benchmarks[0];

  const getTimeframeMultiplier = (timeframe: TimeframeOption) => {
    switch (timeframe) {
      case 'Hourly':
        return 1;
      case 'Daily':
        return 6.5; // avg 6.5 hrs/day
      case 'Weekly':
        return targetWeeklyHours;
      case 'Monthly':
        return targetWeeklyHours * 4.33;
      case 'Yearly':
        return targetWeeklyHours * 50; // 50 working weeks
    }
  };

  const multiplier = getTimeframeMultiplier(selectedTimeframe);

  return (
    <div id="module-pay-radar" className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Top Banner */}
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 font-bold">
                Live UK Market Intelligence
              </span>
              <span className="text-[10px] font-mono text-secondary">
                Crowdsourced & Verified Driver Pay Rates
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-mono flex items-center gap-2">
              Pay Radar & Earnings Forecaster
            </h1>
            <p className="text-xs text-secondary max-w-xl">
              Compare average UK drop and hourly rates across major delivery networks to maximise your daily gross yield and fuel margin.
            </p>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center justify-between w-full md:w-auto bg-inset p-1 rounded-xl border border-subtle gap-0.5">
            {(['Hourly', 'Daily', 'Weekly', 'Monthly', 'Yearly'] as TimeframeOption[]).map((tf) => (
              <button
                key={tf}
                id={`btn-timeframe-${tf.toLowerCase()}`}
                onClick={() => {
                  setSelectedTimeframe(tf);
                  triggerHapticFeedback('light');
                }}
                className={`flex-1 md:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono font-bold text-center whitespace-nowrap transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-brand-cyan text-canvas shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Benchmark & Comparative Analyzer Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-linear-to-br from-brand-cyan/15 to-[#161B26] border border-brand-cyan/40 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs font-mono text-brand-cyan">
            <span className="font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              <span>Top Yield Network</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-brand-cyan/20 text-primary font-bold">
              Rank #1
            </span>
          </div>
          <div className="text-xl font-black text-primary font-mono">{topPerformer.network}</div>
          <p className="text-xs text-secondary">
            Yielding <strong className="text-brand-emerald">£{topPerformer.averageHourlyRateGbp.toFixed(2)}/hr</strong> (£{(topPerformer.averageHourlyRateGbp * multiplier).toFixed(2)} {selectedTimeframe.toLowerCase()}). Peak: {topPerformer.peakHourWindows}.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs font-mono text-secondary">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-brand-emerald" />
              <span>Target Weekly Workload</span>
            </span>
            <span className="text-primary font-bold font-mono">{targetWeeklyHours} hrs/wk</span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={2}
            value={targetWeeklyHours}
            onChange={(e) => setTargetWeeklyHours(Number(e.target.value))}
            className="w-full accent-[#06B6D4] cursor-pointer"
          />
          <p className="text-[11px] text-secondary">
            Adjust working hours to simulate weekly and annual revenue projections.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-brand-emerald/40 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs font-mono text-brand-emerald">
            <span className="font-bold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Annual Forecast Potential</span>
            </span>
            <span>50 Wks</span>
          </div>
          <div className="text-2xl font-black text-brand-emerald font-mono">
            £{(topPerformer.averageHourlyRateGbp * targetWeeklyHours * 50).toFixed(2)}
          </div>
          <p className="text-[11px] text-secondary">
            Gross projection at top benchmark rate with £{(topPerformer.averageHourlyRateGbp * targetWeeklyHours).toFixed(2)}/week gross.
          </p>
        </div>
      </div>

      {/* UK Delivery Companies Benchmark Table */}
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-cyan" />
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
              UK Courier Pay Benchmark Index
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-secondary">Sort By:</span>
            <button
              onClick={() => setSelectedSortBy('hourly')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedSortBy === 'hourly'
                  ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold'
                  : 'bg-inset border-subtle text-secondary'
              }`}
            >
              Hourly Rate
            </button>
            <button
              onClick={() => setSelectedSortBy('drop')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedSortBy === 'drop'
                  ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold'
                  : 'bg-inset border-subtle text-secondary'
              }`}
            >
              Drop Rate
            </button>
            <button
              onClick={() => setSelectedSortBy('reliability')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                selectedSortBy === 'reliability'
                  ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold'
                  : 'bg-inset border-subtle text-secondary'
              }`}
            >
              Reliability
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-subtle text-secondary font-mono text-[11px] uppercase">
                <th className="pb-3 px-2">Courier Network</th>
                <th className="pb-3 px-2">Avg. Rate ({selectedTimeframe})</th>
                <th className="pb-3 px-2">Drop / Parcel Rate</th>
                <th className="pb-3 px-2">Peak Surge Windows</th>
                <th className="pb-3 px-2">Fuel Surcharge</th>
                <th className="pb-3 px-2">Payout</th>
                <th className="pb-3 px-2 text-right">Reliability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232B3E]/60">
              {benchmarks.map((item) => {
                const projectedPay = item.averageHourlyRateGbp * multiplier;

                return (
                  <tr
                    key={item.network}
                    className="hover:bg-inset transition-colors group font-mono"
                  >
                    <td className="py-3 px-2 font-bold text-primary text-sm font-sans">
                      {item.network}
                    </td>
                    <td className="py-3 px-2 font-bold text-brand-emerald">
                      £{projectedPay.toFixed(2)}
                      <span className="text-[10px] text-secondary block font-normal">
                        (£{item.averageHourlyRateGbp.toFixed(2)}/hr)
                      </span>
                    </td>
                    <td className="py-3 px-2 text-primary">
                      £{item.averageDropRateGbp.toFixed(2)} / drop
                    </td>
                    <td className="py-3 px-2 text-secondary text-[11px] font-sans">
                      {item.peakHourWindows}
                    </td>
                    <td className="py-3 px-2">
                      {item.fuelSurchargeProvided ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-brand-emerald border border-emerald-800 font-bold">
                          Yes (+Fuel)
                        </span>
                      ) : (
                        <span className="text-secondary text-[11px]">Self-Funded</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-secondary text-[11px] font-sans">
                      {item.payoutFrequency}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          item.reliabilityScore >= 90
                            ? 'bg-cyan-950 text-brand-cyan border border-cyan-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.reliabilityScore}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
