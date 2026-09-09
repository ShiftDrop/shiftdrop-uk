import React, { useState, useRef } from 'react';
import { Camera, ScanLine,
  Wrench,
  Plus,
  Car,
  Fuel,
  Zap,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Receipt,
  Upload,
  Sparkles,
  X,
} from 'lucide-react';
import {
  RegisteredVehicle,
  FuelExpenseLog,
  FuelType,
  VehicleLayoutType,
} from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';
import { supabaseUploadReceipt } from '../../services/supabase';

interface VehicleGarageProps {
  vehicles: RegisteredVehicle[];
  onAddVehicle: (vehicle: RegisteredVehicle) => void;
  onUpdateTyres: (
    vehicleId: string,
    fl: number,
    fr: number,
    rl: number,
    rr: number
  ) => void;
  onAddExpense: (expense: FuelExpenseLog) => void;
  fuelExpenses: FuelExpenseLog[];
}

export const VehicleGarage: React.FC<VehicleGarageProps> = ({
  vehicles,
  onAddVehicle,
  onUpdateTyres,
  onAddExpense,
  fuelExpenses,
}) => {
  const [activeVehicleId, setActiveVehicleId] = useState<string>(
    vehicles[0]?.id || 'veh-01'
  );
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // New vehicle form state
  const [newReg, setNewReg] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newFuel, setNewFuel] = useState<FuelType>('Diesel');
  const [newLayout, setNewLayout] = useState<VehicleLayoutType>(
    'SWB Van (e.g. Ford Transit Custom)'
  );

  // Expense form state
  const [expenseVolume, setExpenseVolume] = useState<number>(45.0);
  const [expenseUnitPrice, setExpenseUnitPrice] = useState<number>(1.489);
  const [expenseOdo, setExpenseOdo] = useState<number>(48250);
  const [expenseStation, setExpenseStation] = useState('Shell Trafford Park');

  // Receipt Scanner state
  const [scannedReceiptImg, setScannedReceiptImg] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedReceipt, setDetectedReceipt] = useState<{
    station: string;
    volume: number;
    unitPrice: number;
    total: number;
    odo: number;
    fuelType: FuelType;
  } | null>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);

  const selectedVehicle =
    vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || null;

  const handleSimulateScan = (preset?: {
    station: string;
    volume: number;
    unitPrice: number;
    total: number;
    odo: number;
    fuelType: FuelType;
  }) => {
    setIsAnalyzing(true);
    triggerHapticFeedback('light');
    setTimeout(() => {
      setIsAnalyzing(false);
      const isEv = selectedVehicle?.fuelType === 'Full Electric (EV)';
      const res = preset || {
        station: isEv ? 'BP Pulse Ultra-Rapid Hub' : 'Shell Trafford Park',
        volume: isEv ? 42.5 : 48.5,
        unitPrice: isEv ? 0.690 : 1.489,
        total: isEv ? 29.33 : 72.22,
        odo: (selectedVehicle ? 48315 : 48250),
        fuelType: (selectedVehicle?.fuelType || 'Diesel') as FuelType,
      };
      setDetectedReceipt(res);
      triggerHapticFeedback('success');
      speakUkVoicePrompt(`Scanned receipt: ${res.station}, total £${res.total.toFixed(2)}`);
    }, 1100);
  };

  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScannedReceiptImg(reader.result as string);
      handleSimulateScan();
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmScannedExpense = async () => {
    if (!detectedReceipt) return;
    triggerHapticFeedback('success');
    
    let uploadedUrl: string | undefined = undefined;
    if (scannedReceiptImg) {
      try {
        uploadedUrl = await supabaseUploadReceipt(activeVehicleId || 'default_user', scannedReceiptImg);
      } catch (e) {}
    }

    const newLog: FuelExpenseLog = {
      id: `exp_${Date.now()}`,
      vehicleId: activeVehicleId,
      date: new Date().toISOString().slice(0, 10),
      fuelType: detectedReceipt.fuelType,
      litresOrKWh: detectedReceipt.volume,
      unitPriceGbp: detectedReceipt.unitPrice,
      totalCostGbp: detectedReceipt.total,
      odometerReading: detectedReceipt.odo,
      locationName: detectedReceipt.station,
      receiptImageBase64: uploadedUrl || scannedReceiptImg || undefined,
    };
    onAddExpense(newLog);
    speakUkVoicePrompt(`Logged £${detectedReceipt.total.toFixed(2)} fuel expense with receipt image to cloud ledger.`);
    setIsScannerOpen(false);
    setScannedReceiptImg(null);
    setDetectedReceipt(null);
  };

  // Calculate days until MOT
  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReg.trim() || !newMake.trim()) return;

    triggerHapticFeedback('success');
    const created: RegisteredVehicle = {
      id: `veh_${Date.now()}`,
      regPlate: newReg.toUpperCase().trim(),
      makeModel: newMake.trim(),
      fuelType: newFuel,
      layoutType: newLayout,
      motDueDate: '2027-05-01',
      serviceDueDate: '2026-12-15',
      tyrePressureFrontLeftPsi: 38,
      tyrePressureFrontRightPsi: 38,
      tyrePressureRearLeftPsi: 44,
      tyrePressureRearRightPsi: 44,
      recommendedFrontPsi: 39,
      recommendedRearPsi: 45,
      euroStatus: newFuel === 'Full Electric (EV)' ? 'Zero Emission (EV)' : 'Euro 6 (Compliant)',
    };

    onAddVehicle(created);
    setActiveVehicleId(created.id);
    setIsAddVehicleOpen(false);
    setNewReg('');
    setNewMake('');
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticFeedback('success');
    const total = Math.round(expenseVolume * expenseUnitPrice * 100) / 100;
    const newLog: FuelExpenseLog = {
      id: `exp_${Date.now()}`,
      vehicleId: activeVehicleId,
      date: new Date().toISOString().slice(0, 10),
      fuelType: selectedVehicle ? selectedVehicle.fuelType : 'Diesel',
      litresOrKWh: expenseVolume,
      unitPriceGbp: expenseUnitPrice,
      totalCostGbp: total,
      odometerReading: expenseOdo,
      locationName: expenseStation,
    };
    onAddExpense(newLog);
    speakUkVoicePrompt(`Recorded £${total.toFixed(2)} ${newLog.fuelType} expense.`);
    setIsAddExpenseOpen(false);
  };

  return (
    <div id="module-vehicle-garage" className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Top Banner */}
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 font-bold">
                Fleet & Fleet Telemetry
              </span>
              <span className="text-[10px] font-mono text-secondary">
                DVLA MOT & Tyre PSI Guardian
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-mono flex items-center gap-2">
              Vehicle Garage & Energy Manager
            </h1>
            <p className="text-xs text-secondary max-w-xl">
              Monitor commercial vehicle roadworthiness, tyre pressures, MOT countdowns, and fuel or EV kilowatt expenses.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-log-fuel-expense"
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Fuel className="w-4 h-4" />
              <span>Log Fuel / EV Charge</span>
            </button>
            <button
              id="btn-add-vehicle-registry"
              onClick={() => setIsAddVehicleOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary font-bold text-xs transition-colors"
            >
              <Plus className="w-4 h-4 text-brand-cyan" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {vehicles.map((v) => (
          <button
            key={v.id}
            id={`tab-vehicle-${v.regPlate.toLowerCase().replace(/\s+/g, '')}`}
            onClick={() => {
              setActiveVehicleId(v.id);
              triggerHapticFeedback('light');
            }}
            className={`px-4 py-3 rounded-2xl border text-left shrink-0 transition-all font-mono text-xs ${
              activeVehicleId === v.id
                ? 'bg-surface border-brand-cyan text-primary shadow-lg'
                : 'bg-inset border-subtle text-secondary hover:text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-brand-cyan bg-canvas px-2 py-0.5 rounded border border-subtle">
                {v.regPlate}
              </span>
              {v.fuelType === 'Full Electric (EV)' ? (
                <Zap className="w-3.5 h-3.5 text-brand-emerald" />
              ) : (
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <p className="font-sans text-[11px] text-primary mt-1 truncate max-w-50">
              {v.makeModel}
            </p>
          </button>
        ))}
      </div>

      {selectedVehicle && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 6 Cols: Vehicle Telemetry & MOT / Service Countdown */}
          <div className="lg:col-span-6 bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-brand-cyan" />
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
                  {selectedVehicle.makeModel}
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-brand-emerald border border-emerald-800 font-bold">
                {selectedVehicle.euroStatus}
              </span>
            </div>

            {/* MOT & Service Alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-inset border border-subtle space-y-1">
                <div className="flex items-center justify-between text-secondary">
                  <span className="text-[10px] uppercase">DVLA MOT Expiry</span>
                  <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
                </div>
                <div className="text-sm font-bold text-primary">{selectedVehicle.motDueDate}</div>
                <div className="text-[10px] text-brand-emerald font-bold">
                  {getDaysUntil(selectedVehicle.motDueDate)} days remaining (Valid)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-inset border border-subtle space-y-1">
                <div className="flex items-center justify-between text-secondary">
                  <span className="text-[10px] uppercase">Scheduled Service</span>
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-sm font-bold text-primary">{selectedVehicle.serviceDueDate}</div>
                <div className="text-[10px] text-amber-400 font-bold">
                  {getDaysUntil(selectedVehicle.serviceDueDate)} days remaining (Booked)
                </div>
              </div>
            </div>

            {/* Fuel Specs */}
            <div className="p-3 rounded-xl bg-inset border border-subtle space-y-1 text-xs">
              <div className="flex justify-between text-secondary">
                <span>Fuel Classification:</span>
                <span className="font-bold text-primary font-mono">{selectedVehicle.fuelType}</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>Chassis Layout:</span>
                <span className="font-bold text-primary">{selectedVehicle.layoutType}</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span>CAZ / ULEZ Compliance:</span>
                <span className="text-brand-emerald font-bold">Exempt / Free Access</span>
              </div>
            </div>
          </div>

          {/* Right 6 Cols: Tyre Pressure Matrix (PSI) */}
          <div className="lg:col-span-6 bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-brand-emerald" />
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
                  Tyre Pressure Telemetry (PSI)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-secondary">
                Rec. Front: {selectedVehicle.recommendedFrontPsi} | Rear: {selectedVehicle.recommendedRearPsi} PSI
              </span>
            </div>

            {/* 4 Wheels Visual Layout */}
            <div className="p-4 bg-inset rounded-2xl border border-subtle space-y-4">
              <div className="text-[10px] font-mono text-center text-secondary uppercase tracking-widest">
                ↑ Front Axle (Steering) ↑
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                {/* Front Left */}
                <div className="p-3 rounded-xl bg-surface border border-subtle text-center space-y-1">
                  <span className="text-[10px] text-secondary block">Front Left (FL)</span>
                  <span className="text-2xl font-black text-primary">
                    {selectedVehicle.tyrePressureFrontLeftPsi}
                  </span>
                  <span className="text-[10px] text-brand-emerald block font-bold">
                    Nominal ({selectedVehicle.recommendedFrontPsi} PSI)
                  </span>
                </div>

                {/* Front Right */}
                <div className="p-3 rounded-xl bg-surface border border-subtle text-center space-y-1">
                  <span className="text-[10px] text-secondary block">Front Right (FR)</span>
                  <span className="text-2xl font-black text-primary">
                    {selectedVehicle.tyrePressureFrontRightPsi}
                  </span>
                  <span className="text-[10px] text-brand-emerald block font-bold">
                    Nominal ({selectedVehicle.recommendedFrontPsi} PSI)
                  </span>
                </div>

                {/* Rear Left */}
                <div className="p-3 rounded-xl bg-surface border border-subtle text-center space-y-1">
                  <span className="text-[10px] text-secondary block">Rear Left (RL)</span>
                  <span className="text-2xl font-black text-primary">
                    {selectedVehicle.tyrePressureRearLeftPsi}
                  </span>
                  <span className="text-[10px] text-brand-emerald block font-bold">
                    Nominal ({selectedVehicle.recommendedRearPsi} PSI)
                  </span>
                </div>

                {/* Rear Right */}
                <div className="p-3 rounded-xl bg-surface border border-subtle text-center space-y-1">
                  <span className="text-[10px] text-secondary block">Rear Right (RR)</span>
                  <span className="text-2xl font-black text-primary">
                    {selectedVehicle.tyrePressureRearRightPsi}
                  </span>
                  <span className="text-[10px] text-amber-400 block font-bold">
                    -2 PSI Lower ({selectedVehicle.recommendedRearPsi} PSI)
                  </span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-center text-secondary uppercase tracking-widest">
                ↓ Rear Axle (Payload) ↓
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fuel & EV Expense History */}
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-subtle pb-3 text-xs font-mono font-bold text-primary uppercase">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand-cyan" />
              <span>Fuel & EV Charging Cloud Log ({fuelExpenses.length})</span>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan text-canvas text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all active:scale-95 shadow-md"
            >
              <Camera className="w-3.5 h-3.5" />
              Scan Receipt
            </button>
          </div>
        </div>

        {fuelExpenses.length > 0 ? (
          <div className="space-y-2">
            {fuelExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3 rounded-xl bg-inset border border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary font-sans">{exp.locationName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface text-brand-cyan border border-subtle">
                      {exp.fuelType}
                    </span>
                  </div>
                  <span className="text-[11px] text-secondary">
                    {exp.date} • {exp.litresOrKWh} {exp.fuelType === 'Full Electric (EV)' ? 'kWh' : 'Litres'} @ £{exp.unitPriceGbp.toFixed(3)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-brand-emerald">
                    £{exp.totalCostGbp.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-secondary block">
                    Odo: {exp.odometerReading} mi
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-secondary py-4 text-center">
            No fuel or EV charges logged yet. Click "Log Fuel / EV Charge" to add a receipt.
          </p>
        )}
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-subtle rounded-2xl p-6 shadow-2xl text-primary space-y-4 font-sans text-xs">
            <h3 className="text-base font-bold font-mono text-primary flex items-center gap-2">
              <Fuel className="w-5 h-5 text-brand-cyan" />
              <span>Log Fuel or EV Charge</span>
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-secondary mb-1 font-semibold">
                  Station / Charger Location
                </label>
                <input
                  type="text"
                  required
                  value={expenseStation}
                  onChange={(e) => setExpenseStation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-secondary mb-1 font-sans font-semibold">
                    Volume (Litres or kWh)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={expenseVolume}
                    onChange={(e) => setExpenseVolume(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-secondary mb-1 font-sans font-semibold">
                    Unit Price (£/L or £/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={expenseUnitPrice}
                    onChange={(e) => setExpenseUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-secondary mb-1 font-semibold">
                  Current Odometer Reading (Miles)
                </label>
                <input
                  type="number"
                  required
                  value={expenseOdo}
                  onChange={(e) => setExpenseOdo(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-mono focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-inset border border-subtle flex items-center justify-between font-mono">
                <span className="text-secondary">Calculated Total Cost:</span>
                <span className="text-base font-bold text-brand-emerald">
                  £{(expenseVolume * expenseUnitPrice).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 rounded-lg bg-inset border border-subtle text-secondary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-cyan hover:opacity-90 text-canvas font-bold"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-subtle rounded-2xl p-6 shadow-2xl text-primary space-y-4 font-sans text-xs">
            <h3 className="text-base font-bold font-mono text-primary flex items-center gap-2">
              <Car className="w-5 h-5 text-brand-cyan" />
              <span>Register New Vehicle</span>
            </h3>

            <form onSubmit={handleSaveVehicle} className="space-y-3">
              <div>
                <label className="block text-secondary mb-1 font-semibold">
                  UK Registration Plate
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VK22 KYL"
                  value={newReg}
                  onChange={(e) => setNewReg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-mono uppercase focus:border-brand-cyan focus:outline-none text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-secondary mb-1 font-semibold">
                  Make & Model Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ford Transit Custom 2.0 EcoBlue"
                  value={newMake}
                  onChange={(e) => setNewMake(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-secondary mb-1 font-semibold">Fuel Type</label>
                  <select
                    value={newFuel}
                    onChange={(e) => setNewFuel(e.target.value as FuelType)}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none font-mono"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="PHEV">PHEV</option>
                    <option value="Full Electric (EV)">Full Electric (EV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-secondary mb-1 font-semibold">
                    Chassis Layout
                  </label>
                  <select
                    value={newLayout}
                    onChange={(e) => setNewLayout(e.target.value as VehicleLayoutType)}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none text-[11px]"
                  >
                    <option value="SWB Van (e.g. Ford Transit Custom)">SWB Van</option>
                    <option value="MWB / LWB Van (e.g. Mercedes Sprinter)">MWB / LWB Van</option>
                    <option value="Estate / SUV">Estate / SUV</option>
                    <option value="Hatchback / City Car">Hatchback / City Car</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="px-4 py-2 rounded-lg bg-inset border border-subtle text-secondary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-cyan hover:opacity-90 text-canvas font-bold"
                >
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-surface border border-subtle rounded-2xl p-6 shadow-2xl text-primary space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2 font-mono font-bold text-sm">
                <div className="p-1.5 rounded-lg bg-brand-cyan/20 text-brand-cyan">
                  <Camera className="w-4 h-4" />
                </div>
                <span>Optical Receipt & Charging Scanner</span>
              </div>
              <button
                onClick={() => {
                  setIsScannerOpen(false);
                  setScannedReceiptImg(null);
                  setDetectedReceipt(null);
                }}
                className="p-1 rounded-lg hover:bg-subtle text-secondary hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scanner Viewport */}
            <div className="relative rounded-xl overflow-hidden border border-subtle bg-black/90 aspect-video flex flex-col items-center justify-center p-4 text-center">
              {scannedReceiptImg ? (
                <img
                  src={scannedReceiptImg}
                  alt="Scanned receipt"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <div className="space-y-3 z-10">
                  <div className="w-14 h-14 mx-auto rounded-full bg-inset border border-subtle flex items-center justify-center text-brand-cyan">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-primary">Position Fuel or EV Receipt in Frame</p>
                    <p className="text-[11px] text-secondary">Auto-extracts litres/kWh, fuel type, station & total</p>
                  </div>
                </div>
              )}

              {/* Laser beam animation when analyzing */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-brand-cyan/10 pointer-events-none flex flex-col justify-center items-center">
                  <div className="w-full h-0.5 bg-brand-cyan shadow-[0_0_12px_#06b6d4] animate-pulse" />
                  <div className="mt-3 px-3 py-1 rounded-full bg-black/80 border border-brand-cyan/40 text-brand-cyan font-mono text-[10px] font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 animate-spin" />
                    <span>Optical AI Extracting VAT & Fuel Metrics...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions: Presets or Upload */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-secondary uppercase tracking-wider block">
                Quick Scan Presets or Live Capture
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    handleSimulateScan({
                      station: 'Shell Trafford Park',
                      volume: 48.5,
                      unitPrice: 1.489,
                      total: 72.22,
                      odo: 48320,
                      fuelType: 'Diesel',
                    })
                  }
                  className="p-2 rounded-lg bg-inset border border-subtle hover:border-brand-cyan hover:text-brand-cyan text-left transition-colors"
                >
                  <span className="font-bold block text-primary">Shell Diesel</span>
                  <span className="text-secondary">48.5L • £72.22</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSimulateScan({
                      station: 'BP Pulse Ultra-Rapid',
                      volume: 42.0,
                      unitPrice: 0.690,
                      total: 28.98,
                      odo: 48320,
                      fuelType: 'Full Electric (EV)',
                    })
                  }
                  className="p-2 rounded-lg bg-inset border border-subtle hover:border-brand-emerald hover:text-brand-emerald text-left transition-colors"
                >
                  <span className="font-bold block text-primary">BP Pulse EV</span>
                  <span className="text-secondary">42.0 kWh • £28.98</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSimulateScan({
                      station: 'Esso Synergy Express',
                      volume: 51.2,
                      unitPrice: 1.459,
                      total: 74.70,
                      odo: 48320,
                      fuelType: 'Diesel',
                    })
                  }
                  className="p-2 rounded-lg bg-inset border border-subtle hover:border-brand-cyan hover:text-brand-cyan text-left transition-colors col-span-2 sm:col-span-1"
                >
                  <span className="font-bold block text-primary">Esso Express</span>
                  <span className="text-secondary">51.2L • £74.70</span>
                </button>
              </div>

              <input
                type="file"
                accept="image/*"
                ref={receiptFileRef}
                onChange={handleReceiptImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => receiptFileRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg bg-inset hover:bg-subtle border border-dashed border-subtle text-secondary hover:text-primary font-mono text-[11px] flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Upload Physical Receipt Image / Photo</span>
              </button>
            </div>

            {/* Extracted Receipt Data Form */}
            {detectedReceipt && (
              <div className="p-3.5 rounded-xl bg-inset border border-brand-cyan/40 space-y-3 font-mono text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-subtle pb-1.5">
                  <span className="font-bold text-brand-cyan flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                    <span>OCR Extracted Data</span>
                  </span>
                  <span className="text-[10px] text-secondary">Verified UK VAT Format</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-secondary block">Station:</span>
                    <input
                      type="text"
                      value={detectedReceipt.station}
                      onChange={(e) =>
                        setDetectedReceipt({ ...detectedReceipt, station: e.target.value })
                      }
                      className="w-full p-1.5 rounded bg-surface border border-subtle text-primary font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-secondary block">Type:</span>
                    <select
                      value={detectedReceipt.fuelType}
                      onChange={(e) =>
                        setDetectedReceipt({
                          ...detectedReceipt,
                          fuelType: e.target.value as FuelType,
                        })
                      }
                      className="w-full p-1.5 rounded bg-surface border border-subtle text-primary font-semibold"
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol (Unleaded)">Petrol (Unleaded)</option>
                      <option value="Full Electric (EV)">Full Electric (EV)</option>
                      <option value="PHEV">PHEV</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-secondary block">
                      {detectedReceipt.fuelType === 'Full Electric (EV)' ? 'Volume (kWh)' : 'Volume (Litres)'}:
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={detectedReceipt.volume}
                      onChange={(e) => {
                        const vol = Number(e.target.value);
                        setDetectedReceipt({
                          ...detectedReceipt,
                          volume: vol,
                          total: Math.round(vol * detectedReceipt.unitPrice * 100) / 100,
                        });
                      }}
                      className="w-full p-1.5 rounded bg-surface border border-subtle text-primary font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-secondary block">Total Cost (£):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={detectedReceipt.total}
                      onChange={(e) =>
                        setDetectedReceipt({ ...detectedReceipt, total: Number(e.target.value) })
                      }
                      className="w-full p-1.5 rounded bg-surface border border-subtle text-brand-emerald font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmScannedExpense}
                  className="w-full py-2.5 rounded-lg bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas font-black text-xs shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Save Scanned Expense (£{detectedReceipt.total.toFixed(2)})</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-subtle">
              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(false);
                  setScannedReceiptImg(null);
                  setDetectedReceipt(null);
                }}
                className="px-4 py-2 rounded-lg bg-inset border border-subtle text-secondary hover:text-primary font-mono text-xs"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
