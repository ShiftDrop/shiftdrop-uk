import React, { useState } from 'react';
import {
  Calculator,
  PoundSterling,
  Clock,
  Navigation,
  Fuel,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Play,
  RotateCcw,
  Zap,
  Info,
  Car,
} from 'lucide-react';
import { CourierNetwork, FuelType } from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

interface ShiftProfitCalculatorProps {
  onLaunchShiftFromCalculator?: (
    network: CourierNetwork,
    blockRate: number,
    bonus: number
  ) => void;
}

interface ShiftPreset {
  name: string;
  network: CourierNetwork;
  grossPay: number;
  durationHours: number;
  durationMinutes: number;
  miles: number;
  description: string;
}

const SHIFT_PRESETS: ShiftPreset[] = [
  {
    name: 'Amazon Flex 3.5h Block',
    network: 'Amazon Flex',
    grossPay: 66.50,
    durationHours: 3,
    durationMinutes: 30,
    miles: 44,
    description: 'Typical evening sub-depot route with suburban drops.',
  },
  {
    name: 'DPD Full Day Round',
    network: 'DPD',
    grossPay: 185.00,
    durationHours: 8,
    durationMinutes: 0,
    miles: 65,
    description: '140 commercial & residential stops on dedicated route.',
  },
  {
    name: 'Evri Lifestyle Tour',
    network: 'Evri',
    grossPay: 92.00,
    durationHours: 5,
    durationMinutes: 0,
    miles: 34,
    description: '80 localized neighbourhood drops.',
  },
  {
    name: 'Stuart Dinner Surge',
    network: 'Stuart',
    grossPay: 74.00,
    durationHours: 4,
    durationMinutes: 0,
    miles: 28,
    description: 'City centre multi-drop restaurant and pharmacy orders.',
  },
  {
    name: 'B2B Sameday Express',
    network: 'B2B Sameday',
    grossPay: 195.00,
    durationHours: 5,
    durationMinutes: 30,
    miles: 155,
    description: 'Dedicated long-distance pallet & document delivery.',
  },
];

export const ShiftProfitCalculator: React.FC<ShiftProfitCalculatorProps> = ({
  onLaunchShiftFromCalculator,
}) => {
  // Inputs
  const [selectedNetwork, setSelectedNetwork] = useState<CourierNetwork>('Amazon Flex');
  const [grossPay, setGrossPay] = useState<number>(66.50);
  const [bonusPay, setBonusPay] = useState<number>(0);
  const [durationHours, setDurationHours] = useState<number>(3);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [estimatedMiles, setEstimatedMiles] = useState<number>(44);
  const [fuelType, setFuelType] = useState<FuelType>('Diesel');
  const [fuelPricePerUnit, setFuelPricePerUnit] = useState<number>(1.48); // £/litre or £/kWh
  const [consumptionRate, setConsumptionRate] = useState<number>(42); // MPG or mi/kWh
  const [maintenanceCostPerMile, setMaintenanceCostPerMile] = useState<number>(0.10); // £0.10/mile tyres/brakes/depreciation
  const [cazChargeGbp, setCazChargeGbp] = useState<number>(0); // Clean Air Zone charge
  const [includeHMRCTaxDeduction, setIncludeHMRCTaxDeduction] = useState<boolean>(true);

  // Apply Preset
  const handleApplyPreset = (preset: ShiftPreset) => {
    triggerHapticFeedback('light');
    setSelectedNetwork(preset.network);
    setGrossPay(preset.grossPay);
    setBonusPay(0);
    setDurationHours(preset.durationHours);
    setDurationMinutes(preset.durationMinutes);
    setEstimatedMiles(preset.miles);
    speakUkVoicePrompt(`Preset ${preset.name} applied.`);
  };

  // Calculations
  const totalHours = Math.max(0.5, durationHours + durationMinutes / 60);
  const totalGrossIncome = grossPay + bonusPay;
  const headlineHourlyRate = totalGrossIncome / totalHours;

  // Fuel Cost Calculation
  let fuelCostGbp = 0;
  if (fuelType === 'Full Electric (EV)') {
    // Miles / (miles/kWh) * £/kWh
    const kWhUsed = estimatedMiles / (consumptionRate || 3.5);
    fuelCostGbp = kWhUsed * fuelPricePerUnit;
  } else {
    // Litres used = (Miles / MPG) * 4.54609 litres/gallon
    const gallonsUsed = estimatedMiles / (consumptionRate || 40);
    const litresUsed = gallonsUsed * 4.54609;
    fuelCostGbp = litresUsed * fuelPricePerUnit;
  }

  // Vehicle Maintenance Fund
  const maintenanceFundGbp = estimatedMiles * maintenanceCostPerMile;

  // Total Direct Vehicle Overhead
  const totalVehicleOverhead = fuelCostGbp + maintenanceFundGbp + cazChargeGbp;

  // HMRC Tax Pot Calculation (AMAP 45p/mile allowance)
  const amapAllowanceGbp = estimatedMiles * 0.45; // HMRC allows 45p/mile expense deduction
  const taxableIncomeExcess = Math.max(0, totalGrossIncome - amapAllowanceGbp);
  // Basic rate income tax (20%) + Class 4 NI (6%) = 26%
  const estimatedTaxLiabilityGbp = includeHMRCTaxDeduction ? taxableIncomeExcess * 0.26 : totalGrossIncome * 0.26;
  const amapTaxSavingsGbp = includeHMRCTaxDeduction
    ? (totalGrossIncome * 0.26) - estimatedTaxLiabilityGbp
    : 0;

  // Net In-Pocket Profit
  const trueNetProfitGbp = totalGrossIncome - totalVehicleOverhead - estimatedTaxLiabilityGbp;
  const trueNetHourlyRate = trueNetProfitGbp / totalHours;

  // UK National Living Wage Benchmark (£11.44/hr as of April 2024-2026)
  const NATIONAL_LIVING_WAGE = 11.44;

  const handleLaunchShift = () => {
    if (onLaunchShiftFromCalculator) {
      triggerHapticFeedback('success');
      speakUkVoicePrompt(`Launching ${selectedNetwork} shift with target net £${trueNetHourlyRate.toFixed(2)} per hour.`);
      onLaunchShiftFromCalculator(selectedNetwork, grossPay, bonusPay);
    }
  };

  return (
    <div id="module-shift-profit-calculator" className="max-w-5xl mx-auto p-3 sm:p-5 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald shrink-0 mt-0.5 sm:mt-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <h1 className="text-lg sm:text-xl font-bold text-primary font-mono tracking-tight">
                    Shift Profitability &amp; Real Hourly Rate Engine
                  </h1>
                  <span className="inline-flex items-center whitespace-nowrap shrink-0 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/40 shadow-xs">
                    True Net Pay
                  </span>
                </div>
                <p className="text-xs text-secondary mt-1 leading-relaxed">
                  Eliminate guesswork: calculate real in-pocket earnings after fuel, HMRC AMAP tax shield, vehicle wear, and CAZ fees
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLaunchShift}
              className="px-4 py-2.5 rounded-xl bg-brand-emerald hover:bg-emerald-400 text-canvas text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Accept &amp; Launch Shift</span>
            </button>
          </div>
        </div>

        {/* Quick Shift Presets */}
        <div className="mt-5 pt-4 border-t border-subtle space-y-2">
          <span className="text-[11px] font-mono text-secondary uppercase font-bold block">
            Popular UK Courier Round Presets:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
            {SHIFT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleApplyPreset(preset)}
                className="px-3 py-1.5 rounded-xl bg-inset hover:bg-subtle border border-subtle hover:border-brand-cyan text-secondary hover:text-primary transition-all shrink-0 font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-brand-cyan" />
                <span>{preset.name}</span>
                <span className="text-brand-emerald font-bold">£{preset.grossPay.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Parameters (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <h2 className="text-xs font-mono uppercase font-bold text-primary flex items-center gap-2 border-b border-subtle pb-2">
              <PoundSterling className="w-4 h-4 text-brand-cyan" />
              <span>1. Offer &amp; Round Parameters</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Courier Network
                </label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value as CourierNetwork)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                >
                  <option value="Amazon Flex">Amazon Flex</option>
                  <option value="DPD">DPD</option>
                  <option value="Evri">Evri</option>
                  <option value="Stuart">Stuart</option>
                  <option value="Deliveroo">Deliveroo</option>
                  <option value="Uber Eats">Uber Eats</option>
                  <option value="B2B Sameday">B2B Sameday</option>
                  <option value="Yodel">Yodel</option>
                  <option value="Gophr">Gophr</option>
                </select>
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Agreed Block Gross Pay (£)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold">£</span>
                  <input
                    type="number"
                    step="0.5"
                    value={grossPay}
                    onChange={(e) => setGrossPay(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Round Duration (Hours &amp; Mins)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="14"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-1/2 px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                  />
                  <span className="text-secondary font-sans">h</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-1/2 px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                  />
                  <span className="text-secondary font-sans">m</span>
                </div>
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Estimated Round Mileage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={estimatedMiles}
                    onChange={(e) => setEstimatedMiles(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-[11px] font-sans">
                    Miles
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-xs font-mono uppercase font-bold text-primary flex items-center gap-2 border-b border-subtle pb-2 pt-2">
              <Fuel className="w-4 h-4 text-amber-400" />
              <span>2. Vehicle Overhead &amp; Clean Air Zone</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Fuel Type
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => {
                    const next = e.target.value as FuelType;
                    setFuelType(next);
                    if (next === 'Diesel') {
                      setConsumptionRate(42);
                      setFuelPricePerUnit(1.48);
                    } else if (next === 'Petrol') {
                      setConsumptionRate(36);
                      setFuelPricePerUnit(1.42);
                    } else if (next === 'Full Electric (EV)') {
                      setConsumptionRate(3.4);
                      setFuelPricePerUnit(0.32);
                    } else {
                      setConsumptionRate(52);
                      setFuelPricePerUnit(1.42);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                >
                  <option value="Diesel">Diesel</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Full Electric (EV)">Electric (EV)</option>
                  <option value="PHEV">Hybrid / PHEV</option>
                </select>
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Fuel Price (£/{fuelType === 'Full Electric (EV)' ? 'kWh' : 'L'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelPricePerUnit}
                  onChange={(e) => setFuelPricePerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Efficiency ({fuelType === 'Full Electric (EV)' ? 'mi/kWh' : 'MPG'})
                </label>
                <input
                  type="number"
                  step="1"
                  value={consumptionRate}
                  onChange={(e) => setConsumptionRate(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Wear &amp; Maintenance Allowance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={maintenanceCostPerMile}
                    onChange={(e) => setMaintenanceCostPerMile(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-7 pr-12 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-[11px] font-sans">
                    /mile
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  CAZ / Congestion Fee (£)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold">£</span>
                  <input
                    type="number"
                    step="1"
                    value={cazChargeGbp}
                    onChange={(e) => setCazChargeGbp(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold focus:border-brand-cyan focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* HMRC AMAP Shield Toggle */}
            <div className="p-3.5 rounded-xl bg-inset border border-subtle flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-bold text-primary text-xs">
                  <ShieldCheck className="w-4 h-4 text-brand-emerald" />
                  <span>HMRC AMAP 45p/mile Tax Shield</span>
                </div>
                <p className="text-[11px] text-secondary font-sans leading-relaxed">
                  Applies the official 45p/mile simplified expense deduction to legally reduce your 20% Income Tax and 6% National Insurance liability.
                </p>
                {amapTaxSavingsGbp > 0 && (
                  <span className="text-[11px] font-mono font-bold text-brand-emerald block">
                    ✓ Saves £{amapTaxSavingsGbp.toFixed(2)} in HMRC tax set-aside on this shift!
                  </span>
                )}
              </div>

              <input
                type="checkbox"
                checked={includeHMRCTaxDeduction}
                onChange={(e) => setIncludeHMRCTaxDeduction(e.target.checked)}
                className="w-4 h-4 accent-brand-emerald cursor-pointer shrink-0 mt-1"
              />
            </div>
          </div>
        </div>

        {/* Right Column: True Net Results & Verdict (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <h2 className="text-xs font-mono uppercase font-bold text-secondary flex items-center justify-between border-b border-subtle pb-2">
              <span>Shift Profitability Verdict</span>
              <span className="text-brand-cyan">{totalHours.toFixed(1)} Hours Total</span>
            </h2>

            {/* Headline vs True Rate Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-inset border border-subtle text-center">
                <span className="text-[10px] font-mono uppercase text-secondary block font-bold">
                  Advertised Rate
                </span>
                <span className="text-xl font-bold text-slate-300 font-mono">
                  £{headlineHourlyRate.toFixed(2)}
                </span>
                <span className="text-[10px] text-secondary/70 block">gross / hr</span>
              </div>

              <div
                className={`p-3 rounded-xl border text-center transition-all ${
                  trueNetHourlyRate >= 15
                    ? 'bg-emerald-950/40 border-brand-emerald/50 text-emerald-300'
                    : trueNetHourlyRate >= NATIONAL_LIVING_WAGE
                    ? 'bg-cyan-950/40 border-brand-cyan/50 text-cyan-300'
                    : 'bg-red-950/40 border-red-500/50 text-red-300'
                }`}
              >
                <span className="text-[10px] font-mono uppercase font-bold block">
                  TRUE NET TAKE-HOME
                </span>
                <span className="text-2xl font-black font-mono">
                  £{trueNetHourlyRate.toFixed(2)}
                </span>
                <span className="text-[10px] block opacity-80">in-pocket / hr</span>
              </div>
            </div>

            {/* Verdict Status Banner */}
            {trueNetHourlyRate >= 15 ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-brand-emerald/40 text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-brand-emerald">High Earning Shift</span>
                  <p className="text-[11px] text-emerald-300/80 leading-relaxed font-sans">
                    Yields £{trueNetHourlyRate.toFixed(2)}/hr net after all fuel, tax pot, and van wear. Outstanding commercial block!
                  </p>
                </div>
              </div>
            ) : trueNetHourlyRate >= NATIONAL_LIVING_WAGE ? (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-brand-cyan/40 text-cyan-200 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-brand-cyan">Sustainable Commercial Yield</span>
                  <p className="text-[11px] text-cyan-300/80 leading-relaxed font-sans">
                    Clears the UK National Living Wage (£{NATIONAL_LIVING_WAGE}/hr). Good shift to maintain baseline courier earnings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-red-400">Sub-Minimum Wage Warning</span>
                  <p className="text-[11px] text-red-300/80 leading-relaxed font-sans">
                    After £{fuelCostGbp.toFixed(2)} fuel and vehicle wear, you take home £{trueNetHourlyRate.toFixed(2)}/hr—below the UK Living Wage (£{NATIONAL_LIVING_WAGE}). Consider skipping or waiting for surge pricing.
                  </p>
                </div>
              </div>
            )}

            {/* Complete Cost Waterfall Breakdown */}
            <div className="space-y-2 pt-2 border-t border-subtle text-xs font-mono">
              <span className="text-[11px] font-bold text-secondary uppercase block">
                Cash Flow Breakdown:
              </span>

              <div className="flex justify-between items-center py-1">
                <span className="text-secondary">Gross Revenue</span>
                <span className="text-primary font-bold">+£{totalGrossIncome.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-1 text-amber-400">
                <span>- Fuel &amp; Energy Expense</span>
                <span>-£{fuelCostGbp.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-1 text-slate-400">
                <span>- Vehicle Maintenance &amp; Tyres</span>
                <span>-£{maintenanceFundGbp.toFixed(2)}</span>
              </div>

              {cazChargeGbp > 0 && (
                <div className="flex justify-between items-center py-1 text-red-400">
                  <span>- CAZ / ULEZ Daily Charge</span>
                  <span>-£{cazChargeGbp.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 text-indigo-300">
                <span>- HMRC Tax &amp; NI Set-Aside</span>
                <span>-£{estimatedTaxLiabilityGbp.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-subtle flex justify-between items-center text-sm font-bold">
                <span className="text-primary">Net Profit In-Pocket</span>
                <span className="text-brand-emerald text-base font-black">
                  £{trueNetProfitGbp.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Launch Action Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleLaunchShift}
                className="w-full py-3 rounded-xl bg-linear-to-r from-brand-emerald to-brand-cyan text-canvas text-xs font-black hover:opacity-95 shadow-lg active:scale-98 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch This Shift (£{totalGrossIncome.toFixed(2)} Gross)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
