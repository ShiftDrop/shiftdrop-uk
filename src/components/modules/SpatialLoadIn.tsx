import React, { useState } from 'react';
import {
  Box,
  Truck,
  Layers,
  Search,
  Camera,
  ArrowDownUp,
  Sparkles,
  CheckCircle2,
  Filter,
  Check,
  Plus,
  FileText,
  Upload,
  X,
  Volume2,
  MapPin,
  Barcode,
  HelpCircle,
  Car,
  Compass,
} from 'lucide-react';
import {
  ParcelStop,
  VehicleLayoutType,
  VanCompartmentZone,
  ParcelSize,
} from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';
import { CameraManifestScannerModal } from './CameraManifestScannerModal';

interface SpatialLoadInProps {
  stops: ParcelStop[];
  onUpdateParcelZone: (stopId: string, zone: VanCompartmentZone) => void;
  onAddScannedParcel: (parcel: Partial<ParcelStop>) => void;
}

const VEHICLE_LAYOUTS: { type: VehicleLayoutType; description: string; capacity: string }[] = [
  {
    type: 'SWB Van (e.g. Ford Transit Custom)',
    description: 'Short Wheelbase Standard Van (Ideal for Amazon Flex & DPD urban blocks)',
    capacity: 'Up to 90 Parcels',
  },
  {
    type: 'MWB / LWB Van (e.g. Mercedes Sprinter)',
    description: 'Medium / Long Wheelbase High Roof (Full lifestyle rounds & heavy freight)',
    capacity: 'Up to 180 Parcels',
  },
  {
    type: 'Estate / SUV',
    description: '5-Door Estate with Folded Rear Seats (Flexible 3-4hr suburban rounds)',
    capacity: 'Up to 55 Parcels',
  },
  {
    type: 'Hatchback / City Car',
    description: 'Compact 5-Door Hatchback (Small envelopes & fast urban grocery drops)',
    capacity: 'Up to 30 Parcels',
  },
];

const COMPARTMENT_ZONES: {
  zone: VanCompartmentZone;
  description: string;
  recommendedFor: string;
  gridClass: string;
  iconColor: string;
}[] = [
  {
    zone: 'Bulkhead Lower',
    description: 'Deep front floor against bulkhead wall',
    recommendedFor: 'Final Drops & Heavy Bulky Freight (LOAD FIRST)',
    gridClass: 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300',
    iconColor: 'text-indigo-400',
  },
  {
    zone: 'Bulkhead Upper',
    description: 'Top front shelf behind driver cab',
    recommendedFor: 'Final Drops / Lightweight LIFO Parcels',
    gridClass: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
    iconColor: 'text-blue-400',
  },
  {
    zone: 'Left Shelf Mid',
    description: 'Nearside mid-height shelving',
    recommendedFor: 'Middle Shift Drops (e.g. Stops 4-6)',
    gridClass: 'border-teal-500/40 bg-teal-950/40 text-teal-300',
    iconColor: 'text-teal-400',
  },
  {
    zone: 'Right Shelf Mid',
    description: 'Offside mid-height shelving',
    recommendedFor: 'Fragile Parcels & Standard Boxes',
    gridClass: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
    iconColor: 'text-cyan-400',
  },
  {
    zone: 'Sliding Door Zone',
    description: 'Side entry door walkway',
    recommendedFor: 'High-Frequency Urban Drops & Heavy Mediums',
    gridClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
    iconColor: 'text-emerald-400',
  },
  {
    zone: 'Passenger Footwell',
    description: 'Front cabin passenger footwell',
    recommendedFor: 'Small Envelopes & Stop #1 Urgent Drops',
    gridClass: 'border-purple-500/40 bg-purple-950/40 text-purple-300',
    iconColor: 'text-purple-400',
  },
  {
    zone: 'Underfloor Vault',
    description: 'False floor secured lockbox',
    recommendedFor: 'High-Value Electronics & OTP Required Parcels',
    gridClass: 'border-slate-500/40 bg-slate-900/60 text-slate-300',
    iconColor: 'text-slate-400',
  },
  {
    zone: 'Rear Fast-Access Zone',
    description: 'Immediate tailgate / rear barn door area',
    recommendedFor: 'First 3 Drops (Stops 1-3 - LOAD LAST)',
    gridClass: 'border-brand-cyan bg-brand-cyan/15 text-brand-cyan',
    iconColor: 'text-brand-cyan',
  },
];

export const SpatialLoadIn: React.FC<SpatialLoadInProps> = ({
  stops,
  onUpdateParcelZone,
  onAddScannedParcel,
}) => {
  const [selectedLayout, setSelectedLayout] = useState<VehicleLayoutType>(
    'SWB Van (e.g. Ford Transit Custom)'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulatingScanner, setIsSimulatingScanner] = useState(false);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');
  const [activeHoverZone, setActiveHoverZone] = useState<VanCompartmentZone | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);

  // Manual Add Form State
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualPostcode, setManualPostcode] = useState('');
  const [manualCity, setManualCity] = useState('Manchester');
  const [manualSize, setManualSize] = useState<ParcelSize>('Standard Box');
  const [manualZone, setManualZone] = useState<VanCompartmentZone>('Rear Fast-Access Zone');
  const [manualGateCode, setManualGateCode] = useState('');
  const [manualInstructions, setManualInstructions] = useState('');

  // LIFO (Reverse Order Loading) Calculation
  const sortedStopsLIFO = [...stops].sort((a, b) => b.stopNumber - a.stopNumber);

  const filteredStops = sortedStopsLIFO.filter((stop) => {
    const matchesSearch =
      stop.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stop.postcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stop.trackingBarcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stop.addressLine1.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesZone = selectedZoneFilter === 'all' || stop.assignedZone === selectedZoneFilter;
    return matchesSearch && matchesZone;
  });

  const getZoneCount = (zoneName: VanCompartmentZone) => {
    return stops.filter((s) => s.assignedZone === zoneName).length;
  };

  const handleSimulateOCRScan = () => {
    setIsSimulatingScanner(true);
    triggerHapticFeedback('medium');
    setTimeout(() => {
      const nextStopNum = stops.length + 1;
      const sampleUkPostcodes = ['M1 4BT', 'M2 3JL', 'M4 6DE', 'M15 4FN', 'SK4 1BG', 'WA14 2EP'];
      const sampleNames = ['Amelia Clark', 'David Sterling', 'Hannah Wright', 'Tariq Hussain', 'Gemma Davies'];
      const sampleStreets = ['42 Oxford Road', '18 Deansgate', '9 Chester Road', '87 Wilmslow Road'];

      let assignedZone: VanCompartmentZone = 'Rear Fast-Access Zone';
      if (nextStopNum > 6) assignedZone = 'Bulkhead Lower';
      else if (nextStopNum > 4) assignedZone = 'Left Shelf Mid';
      else if (nextStopNum > 2) assignedZone = 'Sliding Door Zone';

      const scannedParcel: Partial<ParcelStop> = {
        id: `scanned_${Date.now()}`,
        stopNumber: nextStopNum,
        trackingBarcode: `GB${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        recipientName: sampleNames[Math.floor(Math.random() * sampleNames.length)],
        addressLine1: sampleStreets[Math.floor(Math.random() * sampleStreets.length)],
        townCity: 'Manchester',
        postcode: sampleUkPostcodes[Math.floor(Math.random() * sampleUkPostcodes.length)],
        parcelSize: 'Standard Box',
        assignedZone: assignedZone,
        status: 'Pending',
        latitude: 53.48 + (Math.random() - 0.5) * 0.05,
        longitude: -2.24 + (Math.random() - 0.5) * 0.05,
        gateAccessCode: '#2026',
        customerInstructions: 'Scanned via camera OCR. Ring doorbell twice.',
      };

      onAddScannedParcel(scannedParcel);
      setIsSimulatingScanner(false);
      triggerHapticFeedback('success');
      speakUkVoicePrompt(
        `Scanned Stop #${nextStopNum}: ${scannedParcel.recipientName}. Place in ${assignedZone}.`
      );
    }, 1100);
  };

  const handleSaveManualParcel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualAddress.trim()) return;

    triggerHapticFeedback('success');
    const nextStopNum = stops.length + 1;
    const newParcel: Partial<ParcelStop> = {
      id: `manual_${Date.now()}`,
      stopNumber: nextStopNum,
      trackingBarcode: `MAN-${Math.floor(100000 + Math.random() * 900000)}`,
      recipientName: manualName.trim(),
      addressLine1: manualAddress.trim(),
      townCity: manualCity.trim() || 'Manchester',
      postcode: manualPostcode.trim().toUpperCase() || 'M1 1AE',
      parcelSize: manualSize,
      assignedZone: manualZone,
      status: 'Pending',
      latitude: 53.48 + (Math.random() - 0.5) * 0.04,
      longitude: -2.24 + (Math.random() - 0.5) * 0.04,
      gateAccessCode: manualGateCode.trim() || undefined,
      customerInstructions: manualInstructions.trim() || undefined,
    };

    onAddScannedParcel(newParcel);
    speakUkVoicePrompt(
      `Added Stop #${nextStopNum}: ${newParcel.recipientName}. Loaded to ${manualZone}.`
    );

    setManualName('');
    setManualAddress('');
    setManualPostcode('');
    setManualGateCode('');
    setManualInstructions('');
    setIsAddModalOpen(false);
  };

  return (
    <div id="module-spatial-loadin" className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5 font-sans">
      {/* Top Banner & LIFO Protocol */}
      <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 font-bold">
                Smart Van Load Map
              </span>
              <span className="text-[10px] font-mono text-secondary">
                Reverse Delivery Order (LIFO)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-mono flex items-center gap-2">
              Van Parcel Map
            </h1>
            <p className="text-xs text-secondary max-w-xl">
              Assign parcel drops to front, mid, and rear van load zones so Stop #1 stays right at the rear doors without unstacking cargo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              id="btn-open-manual-add-parcel"
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-inset hover:bg-subtle border border-brand-cyan/40 text-brand-cyan text-xs font-bold transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer touch-manipulation"
              title="Manually add parcel to vehicle"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Parcel</span>
            </button>

            <button
              id="btn-open-manifest-modal"
              onClick={() => {
                setIsManifestModalOpen(true);
                triggerHapticFeedback('light');
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-inset hover:bg-subtle border border-brand-emerald/40 text-brand-emerald text-xs font-bold transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer touch-manipulation"
              title="Camera Manifest Scanner"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Sheet OCR</span>
            </button>

            <button
              id="btn-scan-label-ocr"
              onClick={handleSimulateOCRScan}
              disabled={isSimulatingScanner}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas text-xs font-black shadow-lg hover:opacity-95 transition-all active:scale-95 whitespace-nowrap cursor-pointer touch-manipulation"
            >
              <Camera className="w-4 h-4" />
              <span>{isSimulatingScanner ? 'Scanning...' : 'Scan Parcel Barcode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Van Blueprint */}
      <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-cyan" />
            <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
              Van Load Zones ({selectedLayout.split('(')[0]})
            </span>
          </div>
          <span className="text-[11px] font-mono text-brand-emerald font-semibold">
            {stops.length} Total Parcels Loaded
          </span>
        </div>

        <div className="bg-inset border-2 border-subtle rounded-2xl p-4 sm:p-6 relative">
          <div className="flex items-center justify-between text-[10px] font-mono text-secondary uppercase mb-3 px-1 border-b border-subtle/60 pb-2">
            <span className="flex items-center gap-1 text-indigo-400 font-bold">
              ⬆ FRONT CABIN &amp; BULKHEAD (FINAL DROPS)
            </span>
            <span className="flex items-center gap-1 text-brand-cyan font-bold">
              ⬇ REAR BARN DOORS (FIRST DROPS)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COMPARTMENT_ZONES.map((zoneItem) => {
              const count = getZoneCount(zoneItem.zone);
              const isFiltered = selectedZoneFilter === zoneItem.zone;
              const isHovered = activeHoverZone === zoneItem.zone;

              return (
                <div
                  key={zoneItem.zone}
                  onClick={() => {
                    setSelectedZoneFilter(selectedZoneFilter === zoneItem.zone ? 'all' : zoneItem.zone);
                    triggerHapticFeedback('light');
                  }}
                  onMouseEnter={() => setActiveHoverZone(zoneItem.zone)}
                  onMouseLeave={() => setActiveHoverZone(null)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                    zoneItem.gridClass
                  } ${
                    isFiltered || isHovered
                      ? 'ring-2 ring-[#06B6D4] shadow-lg shadow-cyan-500/10'
                      : 'hover:border-brand-cyan/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-bold font-mono tracking-tight">
                      {zoneItem.zone}
                    </span>
                    <span
                      className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
                        count > 0 ? 'bg-brand-cyan text-canvas' : 'bg-inset text-secondary'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-80 leading-snug">
                    {zoneItem.description}
                  </p>
                  <span className="text-[9px] font-mono uppercase font-bold block mt-1.5 opacity-90">
                    🎯 {zoneItem.recommendedFor}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vehicle Profile Selector */}
      <div className="bg-surface border border-subtle rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-subtle pb-2 text-xs font-mono font-bold text-primary uppercase">
          <Truck className="w-4 h-4 text-brand-cyan" />
          <span>Vehicle Chassis Profile</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {VEHICLE_LAYOUTS.map((layout) => {
            const isSelected = selectedLayout === layout.type;
            return (
              <button
                key={layout.type}
                onClick={() => {
                  setSelectedLayout(layout.type);
                  triggerHapticFeedback('light');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-cyan/15 border-brand-cyan text-primary shadow-md'
                    : 'bg-inset border-subtle text-secondary hover:text-primary'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold font-mono">
                  <span>{layout.type.split('(')[0]}</span>
                  {isSelected && <Check className="w-4 h-4 text-brand-cyan" />}
                </div>
                <p className="text-[11px] text-secondary mt-1 leading-snug">
                  {layout.description}
                </p>
                <span className="text-[10px] font-mono text-brand-emerald block mt-1 font-semibold">
                  {layout.capacity}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface border border-subtle rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-secondary absolute left-3 top-2.5" />
            <input
              id="input-loadin-search"
              type="text"
              placeholder="Search parcel by customer, UK postcode, street, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary placeholder-[#8F9CAE] focus:border-brand-cyan focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  triggerHapticFeedback('light');
                }}
                className="absolute right-2.5 top-2.5 text-secondary hover:text-primary cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-toggle-loadin-filter"
              type="button"
              onClick={() => {
                triggerHapticFeedback('light');
                setSelectedZoneFilter((prev) => (prev === 'all' ? COMPARTMENT_ZONES[0].zone : 'all'));
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all shrink-0 cursor-pointer ${
                selectedZoneFilter !== 'all'
                  ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan'
                  : 'bg-inset border-subtle text-secondary hover:text-primary'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>

            <select
              id="select-loadin-zone-filter"
              value={selectedZoneFilter}
              onChange={(e) => {
                setSelectedZoneFilter(e.target.value as any);
                triggerHapticFeedback('light');
              }}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono cursor-pointer"
            >
              <option value="all">All Van Zones ({stops.length})</option>
              {COMPARTMENT_ZONES.map((z) => (
                <option key={z.zone} value={z.zone}>
                  {z.zone} ({getZoneCount(z.zone)})
                </option>
              ))}
            </select>

            {(selectedZoneFilter !== 'all' || searchQuery) && (
              <button
                id="btn-reset-all-filters"
                onClick={() => {
                  setSelectedZoneFilter('all');
                  setSearchQuery('');
                  triggerHapticFeedback('light');
                }}
                className="px-2.5 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs font-mono text-brand-cyan font-bold shrink-0 whitespace-nowrap cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Zone Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-[11px] font-mono">
          <button
            onClick={() => {
              setSelectedZoneFilter('all');
              triggerHapticFeedback('light');
            }}
            className={`px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              selectedZoneFilter === 'all'
                ? 'bg-brand-cyan text-canvas font-bold border-brand-cyan'
                : 'bg-inset border-subtle text-secondary hover:text-primary'
            }`}
          >
            All ({stops.length})
          </button>
          {COMPARTMENT_ZONES.map((z) => {
            const count = getZoneCount(z.zone);
            const isSelected = selectedZoneFilter === z.zone;
            return (
              <button
                key={z.zone}
                onClick={() => {
                  setSelectedZoneFilter(isSelected ? 'all' : z.zone);
                  triggerHapticFeedback('light');
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-cyan text-canvas font-bold border-brand-cyan'
                    : 'bg-inset border-subtle text-secondary hover:text-primary'
                }`}
              >
                <span>{z.zone.split(' ')[0]}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-canvas/20 text-canvas' : 'bg-surface text-brand-cyan'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Manifest Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-secondary px-1">
          <div className="flex items-center gap-1.5">
            <ArrowDownUp className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Optimal Pack Order (Bulkhead → Sliding Door → Rear Barn Doors)</span>
          </div>
          <span>Showing {filteredStops.length} Parcels</span>
        </div>

        {filteredStops.length === 0 ? (
          <div className="bg-surface border border-subtle rounded-2xl p-8 text-center space-y-3">
            <Filter className="w-8 h-8 text-brand-cyan mx-auto opacity-70" />
            <h4 className="text-sm font-bold text-primary font-mono">No Parcels Match Filter</h4>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              No parcel records found for the selected zone or search query.
            </p>
            <button
              onClick={() => {
                setSelectedZoneFilter('all');
                setSearchQuery('');
                triggerHapticFeedback('light');
              }}
              className="px-4 py-2 rounded-xl bg-brand-cyan text-canvas font-bold text-xs font-mono shadow-md hover:opacity-90 transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredStops.map((stop, index) => {
              const isFirstDrop = stop.stopNumber === 1;
              const isLastDrop = stop.stopNumber === stops.length;
              const currentZoneConfig = COMPARTMENT_ZONES.find((c) => c.zone === stop.assignedZone);

              return (
                <div
                  key={stop.id}
                  className={`bg-surface border rounded-2xl p-4 shadow-md space-y-3 transition-all ${
                    isFirstDrop
                      ? 'border-brand-cyan shadow-cyan-500/10'
                      : isLastDrop
                      ? 'border-brand-emerald/60'
                      : 'border-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-xl font-mono font-black text-sm shrink-0 mt-0.5 ${
                          isFirstDrop
                            ? 'bg-brand-cyan text-canvas'
                            : 'bg-inset border border-subtle text-primary'
                        }`}
                      >
                        #{stop.stopNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-primary text-sm tracking-tight truncate">
                          {stop.recipientName}
                        </h3>
                        <p className="text-xs text-secondary truncate">
                          {stop.addressLine1}, {stop.townCity}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="font-mono font-bold text-xs text-brand-cyan bg-inset px-2 py-0.5 rounded-lg border border-subtle whitespace-nowrap">
                        {stop.postcode}
                      </span>
                      <span className="text-[10px] text-secondary mt-0.5 font-mono whitespace-nowrap">
                        {stop.parcelSize}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-inset border border-subtle flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 text-xs font-mono">
                    <span className="text-secondary text-[10px] uppercase font-bold tracking-wider">
                      {isFirstDrop
                        ? '⚡ LOAD LAST: Rear Barn Doors'
                        : isLastDrop
                        ? '📦 LOAD FIRST: Deep Bulkhead'
                        : `Pack Step #${index + 1}`}
                    </span>
                    <span className="text-primary font-bold text-[11px] truncate">
                      {stop.trackingBarcode}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono font-bold text-secondary">
                      Assign Van Load Zone:
                    </label>
                    <select
                      value={stop.assignedZone}
                      onChange={(e) => {
                        triggerHapticFeedback('light');
                        onUpdateParcelZone(stop.id, e.target.value as VanCompartmentZone);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary font-semibold focus:border-brand-cyan focus:outline-none cursor-pointer"
                    >
                      {COMPARTMENT_ZONES.map((z) => (
                        <option key={z.zone} value={z.zone}>
                          {z.zone}
                        </option>
                      ))}
                    </select>
                    {currentZoneConfig && (
                      <p className="text-[11px] text-brand-cyan font-mono leading-relaxed flex items-start gap-1.5 mt-1.5">
                        <span className="shrink-0 mt-0.5">🎯</span>
                        <span className="flex-1 wrap-break-word">{currentZoneConfig.recommendedFor}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Manual Add Parcel */}
      {isAddModalOpen && (
        <div
          id="modal-manual-add-parcel"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-surface border border-brand-cyan/50 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-cyan" />
                <h2 className="text-base font-bold text-primary font-mono">
                  Add Parcel to Van Load
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-subtle cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualParcel} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-secondary font-bold mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Henderson"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-secondary font-bold mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 54 Church Lane"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-secondary font-bold mb-1">
                    UK Postcode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M3 4EG"
                    value={manualPostcode}
                    onChange={(e) => setManualPostcode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-secondary font-bold mb-1">
                    Parcel Size
                  </label>
                  <select
                    value={manualSize}
                    onChange={(e) => setManualSize(e.target.value as ParcelSize)}
                    className="w-full px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="Small Envelope">Small Envelope</option>
                    <option value="Standard Box">Standard Box</option>
                    <option value="Large Parcel">Large Parcel</option>
                    <option value="Heavy / XL Bulk">Heavy / XL Bulk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-secondary font-bold mb-1">
                    Van Zone Allocation
                  </label>
                  <select
                    value={manualZone}
                    onChange={(e) => setManualZone(e.target.value as VanCompartmentZone)}
                    className="w-full px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono cursor-pointer"
                  >
                    {COMPARTMENT_ZONES.map((z) => (
                      <option key={z.zone} value={z.zone}>
                        {z.zone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-secondary font-bold mb-1">
                    Gate Access Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. #4492"
                    value={manualGateCode}
                    onChange={(e) => setManualGateCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-secondary font-bold mb-1">
                    Delivery Note / Safe Place
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Leave in porch / Ring bell"
                    value={manualInstructions}
                    onChange={(e) => setManualInstructions(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-inset text-slate-300 text-xs font-bold hover:bg-subtle cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-cyan text-canvas text-xs font-bold hover:bg-brand-cyan/90 shadow-md cursor-pointer"
                >
                  Save &amp; Assign Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Camera Manifest OCR Scanner */}
      <CameraManifestScannerModal
        isOpen={isManifestModalOpen}
        onClose={() => setIsManifestModalOpen(false)}
        currentStopsCount={stops.length}
        onImportStops={(newStops) => {
          newStops.forEach((stop) => onAddScannedParcel(stop));
          triggerHapticFeedback('success');
        }}
      />
    </div>
  );
};