import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Key,
  Volume2,
  Mic,
  Square,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  ArrowUpRight,
  Package,
  Car,
  AlertTriangle,
  Sparkles,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ParcelStop, VanCompartmentZone, ReturnReasonCode, HMRCTaxCalculations, DoorstepIntelItem } from '../../types';
import {
  triggerHapticFeedback,
  speakUkVoicePrompt,
  VoiceNoteRecorder,
} from '../../services/telemetry';
import { supabaseUploadVoiceNote } from '../../services/supabase';

interface ActiveCabHUDProps {
  stops: ParcelStop[];
  taxMetrics?: HMRCTaxCalculations | any;
  settings?: any; // For Geofence toggle
  doorstepIntelList?: DoorstepIntelItem[];
  onNavigateToDoorstepVault?: () => void;
  onConfirmDrop: (stopId: string, voiceNoteUrl?: string) => void;
  onReturnDrop: (stopId: string, reason: ReturnReasonCode) => void;
  onSelectStop: (stopId: string) => void;
}

export const ActiveCabHUD: React.FC<ActiveCabHUDProps> = ({
  stops,
  taxMetrics = {
    totalBusinessMilesYTD: 316,
    firstTierMiles: 316,
    secondTierMiles: 0,
    totalAmapMileageDeduction: 142.2,
    totalFuelExpensesClaimed: 0,
    estimatedIncomeTaxSaved: 28.44,
    estimatedNationalInsuranceSaved: 12.8,
    totalCombinedTaxShield: 41.24,
    effectiveHourlyRate: 21.5,
  },
  settings,
  doorstepIntelList = [],
  onNavigateToDoorstepVault,
  onConfirmDrop,
  onReturnDrop,
  onSelectStop,
}) => {
  const [currentSpeedMph, setCurrentSpeedMph] = useState<number>(24);
  const [speedLimitMph] = useState<number>(30);
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [returnModalStop, setReturnModalStop] = useState<ParcelStop | null>(null);
  const [selectedReturnReason, setSelectedReturnReason] = useState<ReturnReasonCode>(
    'Access Blocked / Gate Code Invalid'
  );
  const [intelModalStop, setIntelModalStop] = useState<ParcelStop | null>(null);
  const [newIntelText, setNewIntelText] = useState('');
  const [isAutoCheckingIn, setIsAutoCheckingIn] = useState(false);

  const voiceRecorderRef = useRef<VoiceNoteRecorder>(new VoiceNoteRecorder());

  // Pending stops in order
  const pendingStops = stops.filter((s) => s.status === 'Pending');
  const currentStop = pendingStops[0] || stops[stops.length - 1] || null;

  // Auto-check in logic
  useEffect(() => {
    if (settings?.isGeofencedAutoCheckInEnabled && currentStop && currentStop.status === 'Pending' && !isAutoCheckingIn) {
      // Simulate GPS approach after 5 seconds
      const timeout = setTimeout(() => {
        setIsAutoCheckingIn(true);
        // Simulate auto-confirm after 3 more seconds
        setTimeout(() => {
          onConfirmDrop(currentStop.id);
          setIsAutoCheckingIn(false);
        }, 3000);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [currentStop, settings?.isGeofencedAutoCheckInEnabled, isAutoCheckingIn, onConfirmDrop]);

  // Real In-Cab GPS Speedometer with fallback telemetry
  useEffect(() => {
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (pos.coords.speed !== null && pos.coords.speed >= 0) {
              const mph = Math.round(pos.coords.speed * 2.236936);
              setCurrentSpeedMph(mph);
            }
          },
          () => {
            // Location permission denied or stationary fallback
          },
          { enableHighAccuracy: true, maximumAge: 1000 }
        );
      } catch {
        // Fallback
      }
    }

    const interval = setInterval(() => {
      // Only simulate subtle speed variations if not actively streaming real speed
      setCurrentSpeedMph((prev) => {
        if (watchId !== null && prev > 0) return prev;
        const delta = (Math.random() - 0.48) * 3;
        const next = Math.max(0, Math.min(45, prev + delta));
        return Math.round(next);
      });
    }, 1500);

    return () => {
      clearInterval(interval);
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Hands-free Voice Assistant Callout
  const handleVoiceCallout = () => {
    if (!currentStop) return;
    triggerHapticFeedback('light');
    const cleanGateCode = currentStop.gateAccessCode
      ? `Gate access code: ${currentStop.gateAccessCode.replace(/#/g, 'hash ')}.`
      : 'No gate code specified.';
    const speechText = `Stop ${currentStop.stopNumber}: ${currentStop.recipientName}, ${currentStop.addressLine1}, postcode ${currentStop.postcode}. ${cleanGateCode} Parcel located in ${currentStop.assignedZone}.`;
    speakUkVoicePrompt(speechText);
  };

  // Voice Note Recording
  const handleToggleVoiceNote = async () => {
    if (!isRecordingVoiceNote) {
      triggerHapticFeedback('medium');
      const started = await voiceRecorderRef.current.startRecording();
      if (started) {
        setIsRecordingVoiceNote(true);
        speakUkVoicePrompt('Recording voice note.');
      }
    } else {
      triggerHapticFeedback('success');
      const res = await voiceRecorderRef.current.stopRecordingWithBlob();
      setIsRecordingVoiceNote(false);
      setRecordedAudioUrl(res.url);

      if (res.blob) {
        try {
          const uploadedUrl = await supabaseUploadVoiceNote(currentStop?.id || 'stop_note', res.blob);
          if (uploadedUrl) {
            setRecordedAudioUrl(uploadedUrl);
          }
        } catch (e) {}
      }
      speakUkVoicePrompt('Voice note captured and linked.');
    }
  };

  // SatNav Handoffs
  const openGoogleMaps = () => {
    if (!currentStop) return;
    triggerHapticFeedback('light');
    const query = encodeURIComponent(`${currentStop.addressLine1}, ${currentStop.postcode}, UK`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  const openWaze = () => {
    if (!currentStop) return;
    triggerHapticFeedback('light');
    const query = encodeURIComponent(`${currentStop.addressLine1}, ${currentStop.postcode}, UK`);
    window.open(`https://waze.com/ul?q=${query}&navigate=yes`, '_blank');
  };

  // Confirm Drop with haptic & visual celebration
  const handleConfirmDropAction = () => {
    if (!currentStop) return;
    triggerHapticFeedback('success');
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#06B6D4', '#10B981', '#F8FAFC'],
    });
    speakUkVoicePrompt(`Drop ${currentStop.stopNumber} confirmed delivered.`);
    onConfirmDrop(currentStop.id, recordedAudioUrl || undefined);
    setRecordedAudioUrl(null);
  };

  const handleOpenReturnModal = () => {
    if (!currentStop) return;
    triggerHapticFeedback('warning');
    setReturnModalStop(currentStop);
  };

  const handleConfirmReturnAction = () => {
    if (!returnModalStop) return;
    triggerHapticFeedback('medium');
    speakUkVoicePrompt(`Drop marked as returned to depot.`);
    onReturnDrop(returnModalStop.id, selectedReturnReason);
    setReturnModalStop(null);
  };

  // Van Compartment Visualiser Zones
  const vanZones: { id: VanCompartmentZone; label: string; gridArea: string }[] = [
    { id: 'Bulkhead Upper', label: 'Bulkhead Upper', gridArea: 'col-span-6 bg-blue-950/60' },
    { id: 'Bulkhead Lower', label: 'Bulkhead Lower', gridArea: 'col-span-6 bg-indigo-950/60' },
    { id: 'Left Shelf Mid', label: 'Left Shelf Mid', gridArea: 'col-span-4 bg-teal-950/60' },
    { id: 'Sliding Door Zone', label: 'Sliding Side Door', gridArea: 'col-span-4 bg-emerald-950/60' },
    { id: 'Right Shelf Mid', label: 'Right Shelf Mid', gridArea: 'col-span-4 bg-cyan-950/60' },
    { id: 'Passenger Footwell', label: 'Passenger Footwell', gridArea: 'col-span-4 bg-purple-950/60' },
    { id: 'Underfloor Vault', label: 'Underfloor Vault', gridArea: 'col-span-4 bg-slate-800/60' },
    { id: 'Rear Fast-Access Zone', label: 'Rear Barn Doors (Fast-Drop)', gridArea: 'col-span-4 bg-amber-950/60' },
  ];

  return (
    <div id="module-active-cab-hud" className="w-full p-4 sm:p-6 font-sans space-y-6">
      {/* Top Telemetry Bar with Speedometer and SatNav */}
      <div className="bg-surface border border-subtle rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-inset border-2 border-brand-cyan/70 shadow-md font-mono shrink-0 px-1 py-1">
            <span className="text-xl sm:text-2xl font-black text-primary leading-none tracking-tight block">
              {currentSpeedMph}
            </span>
            <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-brand-cyan font-bold mt-1 leading-none">
              MPH
            </span>
            <span className="text-[7px] uppercase text-secondary font-medium leading-none mt-0.5">
              GPS
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary font-mono">
                {currentStop ? `Heading to Stop #${currentStop.stopNumber}` : 'All Drops Handled'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-inset border border-subtle text-secondary font-mono">
                Speed Limit {speedLimitMph} mph
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Next Turn: Continue 450 yards on Deansgate (A56), then turn left on Whitworth St.
            </p>
          </div>
        </div>

        {/* SatNav Direct Handoffs */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-satnav-googlemaps"
            onClick={openGoogleMaps}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Launch Google Maps Navigation"
          >
            <Navigation className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Google Maps</span>
            <ArrowUpRight className="w-3 h-3 text-secondary" />
          </button>
          <button
            id="btn-satnav-waze"
            onClick={openWaze}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Launch Waze Navigation with Police / Camera Alerts"
          >
            <Car className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Waze SatNav</span>
            <ArrowUpRight className="w-3 h-3 text-secondary" />
          </button>
        </div>
      </div>

      {currentStop ? (
        <div className="grid grid-cols-12 gap-6">
          {/* Main 8 Columns Container */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            {/* Current Dispatch Hero Card */}
            <div className="bg-surface border border-subtle rounded-2xl p-6 flex flex-col shadow-xl">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start mb-4 sm:mb-6 gap-3 sm:gap-0">
                <div>
                  <h2 className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">
                    Current Dispatch
                  </h2>
                  <p className="text-2xl font-semibold text-primary">
                    Stop #{currentStop.stopNumber}: {currentStop.recipientName}
                  </p>
                  <p className="text-brand-cyan font-mono font-bold mt-1">
                    {currentStop.postcode} • {currentStop.addressLine1}, {currentStop.townCity}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={openGoogleMaps}
                    className="bg-subtle p-3 rounded-xl border border-[#3E4A61] hover:opacity-90 text-primary transition-colors"
                    title="Launch SatNav"
                  >
                    <Navigation className="w-4 h-4 text-brand-cyan" />
                  </button>
                  <button
                    onClick={handleVoiceCallout}
                    className="bg-subtle p-3 rounded-xl border border-[#3E4A61] hover:opacity-90 text-primary transition-colors"
                    title="Hands-Free UK Voice Callout"
                  >
                    <Volume2 className="w-4 h-4 text-brand-emerald" />
                  </button>
                </div>
              </div>

              {/* Inner 2-Column Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Left: Spatial Load-In Guide */}
                <div className="bg-inset border border-subtle rounded-xl p-3.5 sm:p-4 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-secondary mb-2 block font-mono">
                    Spatial Load-In Guide
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 min-h-[140px] my-auto py-1">
                    {vanZones.slice(0, 9).map((zone) => {
                      const isTargetZone = currentStop.assignedZone === zone.id;
                      return (
                        <div
                          key={zone.id}
                          className={`rounded-lg p-1 flex items-center justify-center text-[10px] font-mono border transition-all text-center leading-none ${
                            isTargetZone
                              ? 'bg-brand-cyan text-canvas font-black border-white shadow-[0_0_10px_#06B6D4]'
                              : 'bg-surface border-subtle text-secondary'
                          }`}
                          title={zone.label}
                        >
                          {isTargetZone ? 'TARGET' : zone.label.split(' ')[0]}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-brand-cyan font-mono truncate">
                    {currentStop.assignedZone.toUpperCase()}
                  </p>
                </div>

                {/* Right: Codes, Instructions & Action */}
                <div className="flex flex-col justify-between gap-3">
                  <div className="bg-inset border border-subtle rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-secondary block uppercase font-mono">
                        Access Code
                      </span>
                      <span className="text-lg font-mono tracking-widest text-brand-emerald font-black">
                        {currentStop.gateAccessCode || '#1928'}
                      </span>
                    </div>
                    <span className="text-xs bg-subtle px-2 py-1 rounded text-primary font-mono">
                      {currentStop.parcelSize}
                    </span>
                  </div>
                  
                  {isAutoCheckingIn && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-xl border border-brand-cyan bg-brand-cyan/10 animate-pulse text-brand-cyan">
                      <div className="w-2 h-2 rounded-full bg-brand-cyan animate-ping shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider font-mono">Geofence Detected: Auto Check-In in progress...</span>
                    </div>
                  )}

                  {/* Crowdsourced Drop Intel & Gate Code Vault */}
                  {(() => {
                    const matchingIntel = doorstepIntelList.find(
                      (item) =>
                        item.postcode.replace(/\s+/g, '').toUpperCase() ===
                        currentStop.postcode.replace(/\s+/g, '').toUpperCase()
                    );

                    return (
                      <div className="mt-4 p-4 rounded-xl border border-subtle bg-canvas space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-brand-cyan">
                            <Key className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider font-mono">
                              Doorstep Intel &amp; Gate Code Vault
                            </span>
                          </div>
                          {onNavigateToDoorstepVault && (
                            <button
                              onClick={onNavigateToDoorstepVault}
                              className="text-[10px] uppercase font-bold text-brand-cyan hover:underline flex items-center gap-1 font-mono"
                            >
                              <span>Open Vault</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {matchingIntel ? (
                          <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-brand-cyan/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan">
                                {matchingIntel.category}
                              </span>
                              {matchingIntel.accessCode && (
                                <button
                                  onClick={() => {
                                    triggerHapticFeedback('success');
                                    navigator.clipboard.writeText(matchingIntel.accessCode!);
                                    speakUkVoicePrompt(`Code ${matchingIntel.accessCode} copied.`);
                                  }}
                                  className="text-xs font-mono font-black text-brand-cyan px-2 py-0.5 rounded bg-surface border border-brand-cyan/40 hover:bg-brand-cyan hover:text-canvas transition-colors"
                                >
                                  Code: {matchingIntel.accessCode} (Tap to Copy)
                                </button>
                              )}
                            </div>

                            {matchingIntel.tradesmanBuzzerRule && (
                              <p className="text-xs text-indigo-300 font-mono">
                                🔔 {matchingIntel.tradesmanBuzzerRule}
                              </p>
                            )}

                            {matchingIntel.hazardWarning && (
                              <p className="text-xs text-amber-300 font-mono font-bold">
                                ⚠️ {matchingIntel.hazardWarning}
                              </p>
                            )}

                            <p className="text-xs text-slate-200 leading-relaxed font-sans">
                              {matchingIntel.instructionNotes}
                            </p>
                          </div>
                        ) : currentStop.communityIntel && currentStop.communityIntel.length > 0 ? (
                          <ul className="space-y-1.5">
                            {currentStop.communityIntel.map((note, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-primary font-mono p-2 bg-inset rounded-lg border border-subtle"
                              >
                                "{note}"
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-secondary italic">
                            <span>No verified gate codes logged yet for {currentStop.postcode}.</span>
                            {onNavigateToDoorstepVault && (
                              <button
                                onClick={onNavigateToDoorstepVault}
                                className="not-italic text-[10px] font-bold text-brand-cyan uppercase ml-2 underline"
                              >
                                + Add Code
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="bg-inset border border-subtle rounded-xl p-3 mt-4">
                    <span className="text-[10px] text-secondary block uppercase font-mono">
                      Drop Instructions
                    </span>
                    <p className="text-xs leading-tight mt-1 text-slate-200 italic">
                      "{currentStop.customerInstructions || 'Leave in secure porch if no answer. Ring bell twice.'}"
                    </p>
                  </div>

                  {/* Voice note button & player */}
                  <div className="space-y-1.5">
                    <button
                      onClick={handleToggleVoiceNote}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                        isRecordingVoiceNote
                          ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                          : recordedAudioUrl
                          ? 'bg-emerald-950/40 border-brand-emerald/50 text-brand-emerald'
                          : 'bg-inset border-subtle text-secondary hover:text-primary'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5 text-brand-emerald" />
                      <span>
                        {isRecordingVoiceNote
                          ? 'Recording... Tap to Finish'
                          : recordedAudioUrl
                          ? 'Audio Note Saved & Attached ✓ (Tap to Re-record)'
                          : 'Record Drop Audio Note (Hands-Free)'}
                      </span>
                    </button>

                    {recordedAudioUrl && (
                      <div className="flex items-center gap-2 bg-inset/80 border border-subtle rounded-lg p-1.5">
                        <audio src={recordedAudioUrl} controls className="w-full h-7 rounded" />
                        <button
                          type="button"
                          onClick={() => setRecordedAudioUrl(null)}
                          className="text-[10px] text-red-400 hover:text-red-300 font-mono px-1.5 py-0.5 rounded border border-red-500/30 hover:bg-red-500/10 whitespace-nowrap"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Big Confirm Drop Button */}
                  <div className="flex gap-2">
                    <button
                      id="btn-confirm-drop-action"
                      onClick={handleConfirmDropAction}
                      className="bg-brand-emerald text-canvas flex-1 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#0E9E6D] shadow-lg shadow-[#10B981]/20 transition-all active:scale-95 uppercase tracking-wide"
                    >
                      <CheckCircle2 className="w-5 h-5 font-bold" />
                      <span>CONFIRM DROP</span>
                    </button>
                    <button
                      id="btn-return-item-action"
                      onClick={handleOpenReturnModal}
                      className="bg-inset border border-red-500/40 text-red-400 hover:text-red-300 px-3 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Return Item to Depot"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Vitals Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1: AMAP Tax Shield */}
              <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col justify-between shadow-md">
                <span className="text-[10px] font-bold text-secondary uppercase font-mono">
                  AMAP Tax Shield
                </span>
                <div className="my-2">
                  <p className="text-xl font-bold font-mono text-primary">
                    £{taxMetrics.totalAmapMileageDeduction.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-brand-emerald font-mono font-bold">
                    OFF TAXABLE
                  </p>
                </div>
                <div className="w-full bg-inset h-1.5 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-brand-emerald h-full transition-all"
                    style={{
                      width: `${Math.min(100, (taxMetrics.totalBusinessMilesYTD / 10000) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-secondary font-mono">
                  {taxMetrics.totalBusinessMilesYTD} / 10,000 miles (45p rate)
                </span>
              </div>

              {/* Card 2: PCN Guardian */}
              <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col justify-between shadow-md">
                <span className="text-[10px] font-bold text-secondary uppercase font-mono">
                  PCN Guardian
                </span>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 text-center my-2">
                  <span className="text-[9px] text-orange-400 uppercase font-mono font-bold block">
                    Loading Window
                  </span>
                  <span className="text-xl font-mono text-primary font-black">
                    14:52
                  </span>
                </div>
                <span className="text-[10px] text-orange-400 font-mono">
                  Commercial Loading Only
                </span>
              </div>

              {/* Card 3: Vehicle Vitals */}
              <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col justify-between border-b-4 border-b-[#06B6D4] shadow-md">
                <span className="text-[10px] font-bold text-secondary uppercase font-mono">
                  Vehicle Vitals
                </span>
                <div className="my-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary">Fuel / Range:</span>
                    <span className="font-mono text-brand-cyan font-bold">184 miles</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary">Tyres:</span>
                    <span className="font-mono text-brand-emerald font-bold">32 PSI</span>
                  </div>
                </div>
                <span className="text-[10px] text-secondary font-mono truncate">
                  Ford Transit Custom • PX21 WRE
                </span>
              </div>
            </div>
          </div>

          {/* Right 4 Columns Container */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Next Up Manifest */}
            <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider font-mono">
                  Next Up Manifest
                </h3>
                <span className="text-[10px] font-mono text-brand-cyan bg-inset px-2 py-0.5 rounded border border-subtle">
                  {pendingStops.length} Remaining
                </span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {pendingStops.slice(1, 6).map((stop, idx) => (
                  <div
                    key={stop.id}
                    onClick={() => onSelectStop(stop.id)}
                    className={`p-3 rounded-xl bg-inset hover:bg-subtle cursor-pointer transition-colors border-l-4 ${
                      idx === 0 ? 'border-l-[#06B6D4]' : idx === 1 ? 'border-l-[#10B981]' : 'border-l-[#8F9CAE]'
                    } border-t border-r border-b border-subtle`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-primary">
                        Stop #{stop.stopNumber}: {stop.recipientName}
                      </span>
                      <span className="text-[10px] font-mono text-brand-cyan bg-surface px-1.5 py-0.5 rounded">
                        {stop.assignedZone.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-1 font-mono">
                      {stop.postcode} • {stop.addressLine1}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings Forecast */}
            <div className="bg-surface border border-subtle rounded-2xl p-4 shadow-xl">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 font-mono">
                Earnings Forecast
              </h3>
              <div className="space-y-2 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Hourly Avg:</span>
                  <span className="text-primary font-bold">£19.57</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">This Week:</span>
                  <span className="text-brand-emerald font-bold">£482.30</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Projected Month:</span>
                  <span className="text-brand-cyan font-bold">£2,140.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-brand-emerald/40 rounded-2xl p-10 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-brand-emerald flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-primary font-mono">
            Route Complete! All Drops Handled
          </h2>
          <p className="text-xs text-secondary max-w-md mx-auto">
            Congratulations. You have processed all stops for this delivery block. Proceed to Depot Returns Debrief if any returns were recorded, or punch out to save your HMRC AMAP logs.
          </p>
        </div>
      )}

      {/* Return Item Reason Modal */}
      {returnModalStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-subtle rounded-2xl p-6 shadow-2xl text-primary space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-950/80 rounded-xl border border-red-500/40 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Return Drop #{returnModalStop.stopNumber}</h3>
                <p className="text-xs text-secondary">
                  Select reason code for depot returns debrief manifest.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {[
                'Access Blocked / Gate Code Invalid',
                'Customer Unavailable / No Safe Place',
                'Damaged Parcel / Leaking',
                'Address Incomplete / Incorrect Postcode',
                'Business Closed',
                'Delivery Timed Out / Exceeded Shift Limit',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedReturnReason === reason
                      ? 'bg-red-950/40 border-red-500 text-white font-bold'
                      : 'bg-inset border-subtle text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="return_reason"
                    checked={selectedReturnReason === reason}
                    onChange={() => setSelectedReturnReason(reason as ReturnReasonCode)}
                    className="text-red-500 focus:ring-0"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReturnModalStop(null)}
                className="px-4 py-2 rounded-lg bg-inset border border-subtle text-xs text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-return-item-modal"
                onClick={handleConfirmReturnAction}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
              >
                Mark as Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Intel Modal */}
      {intelModalStop && (
        <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-subtle flex items-center justify-between bg-inset">
              <h3 className="font-bold text-primary">Add Driver Intel</h3>
              <button
                onClick={() => setIntelModalStop(null)}
                className="p-1 rounded hover:bg-subtle text-secondary"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-secondary">
                Add a helpful note about this location. It will be shared anonymously with the ShiftDrop driver network.
              </p>
              <textarea
                value={newIntelText}
                onChange={(e) => setNewIntelText(e.target.value)}
                placeholder="e.g. Beware of aggressive dog, access code is 1234, hidden safe place behind bins..."
                className="w-full bg-inset border border-subtle rounded-xl p-3 text-sm text-primary font-mono min-h-[100px] focus:outline-none focus:border-brand-cyan"
              />
              <button
                onClick={() => {
                  if (newIntelText.trim()) {
                    if (!intelModalStop.communityIntel) {
                      intelModalStop.communityIntel = [];
                    }
                    intelModalStop.communityIntel.push(newIntelText);
                    setNewIntelText('');
                    setIntelModalStop(null);
                  }
                }}
                className="w-full py-3 bg-brand-cyan hover:opacity-90 text-canvas font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-wide"
              >
                Share with Network
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
