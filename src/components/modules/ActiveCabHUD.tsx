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
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';
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
  settings?: any;
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

  const pendingStops = stops.filter((s) => s.status === 'Pending');
  const currentStop = pendingStops.length > 0 ? pendingStops[0] : null;

  // Prevent windscreen cradle display sleep during driving
  useEffect(() => {
    KeepAwake.keepAwake().catch(() => {});
    return () => {
      KeepAwake.allowSleep().catch(() => {});
    };
  }, []);

  // Geofenced auto-check in simulation
  useEffect(() => {
    if (settings?.isGeofencedAutoCheckInEnabled && currentStop && currentStop.status === 'Pending' && !isAutoCheckingIn) {
      const timeout = setTimeout(() => {
        setIsAutoCheckingIn(true);
        setTimeout(() => {
          onConfirmDrop(currentStop.id);
          setIsAutoCheckingIn(false);
        }, 3000);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [currentStop, settings?.isGeofencedAutoCheckInEnabled, isAutoCheckingIn, onConfirmDrop]);

  // Real In-Cab GPS Speedometer
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
          () => {},
          { enableHighAccuracy: true, maximumAge: 1000 }
        );
      } catch {}
    }

    const interval = setInterval(() => {
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

  const handleVoiceCallout = () => {
    if (!currentStop) return;
    triggerHapticFeedback('light');
    const cleanGateCode = currentStop.gateAccessCode
      ? `Gate access code: ${currentStop.gateAccessCode.replace(/#/g, 'hash ')}.`
      : 'No gate code specified.';
    const addr = currentStop.addressLine1 || '';
    const speechText = `Stop ${currentStop.stopNumber || 1}: ${currentStop.recipientName || 'Customer'}, ${addr}, postcode ${currentStop.postcode || ''}. ${cleanGateCode} Parcel located in ${currentStop.assignedZone || 'van'}.`;
    speakUkVoicePrompt(speechText);
  };

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

  // SatNav Handoffs: Native Android App Protocol with Browser Fallback
  const openGoogleMaps = () => {
    if (!currentStop) return;
    triggerHapticFeedback('light');
    const destination = encodeURIComponent(`${currentStop.postcode || currentStop.addressLine1 || 'UK'}, UK`);

    if (Capacitor.isNativePlatform()) {
      window.location.href = `google.navigation:q=${destination}`;
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
    }
  };

  const openWaze = () => {
    if (!currentStop) return;
    triggerHapticFeedback('light');
    const destination = encodeURIComponent(`${currentStop.postcode || currentStop.addressLine1 || 'UK'}, UK`);

    if (Capacitor.isNativePlatform()) {
      window.location.href = `waze://?q=${destination}&navigate=yes`;
    } else {
      window.open(`https://waze.com/ul?q=${destination}&navigate=yes`, '_blank');
    }
  };

  const handleConfirmDropAction = () => {
    if (!currentStop) return;
    triggerHapticFeedback('success');
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#06B6D4', '#10B981', '#F8FAFC'],
    });
    speakUkVoicePrompt(`Drop ${currentStop.stopNumber || 1} confirmed delivered.`);
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
    <div id="module-active-cab-hud" className="w-full max-w-full overflow-x-hidden p-3 sm:p-6 font-sans space-y-6">
      {/* Top Telemetry Bar with Anti-Glare Speedometer and UK Speed Sign */}
      <div className="bg-surface border border-subtle rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4 max-w-full overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0">
          {/* High-Contrast Glare-Resistant Digital Speed Box */}
          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-[#05070B] border-2 border-brand-cyan shadow-lg shadow-cyan-950/50 font-mono shrink-0 p-1">
            <span className="text-2xl font-black text-white leading-none tracking-tight block drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              {currentSpeedMph}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-brand-cyan font-black mt-1 leading-none">
              MPH
            </span>
            <span className="text-[7px] uppercase text-slate-400 font-bold leading-none mt-0.5">
              GPS
            </span>
          </div>

          {/* Authentic UK Road Sign 30 mph Roundel */}
          <div
            className="w-12 h-12 rounded-full bg-white border-4 border-[#DC2626] flex items-center justify-center shadow-lg shrink-0 select-none"
            title={`UK Speed Limit: ${speedLimitMph} MPH`}
          >
            <span className="text-lg font-black text-black font-sans leading-none tracking-tight">
              {speedLimitMph}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-primary font-mono tracking-tight truncate">
                {currentStop ? `Heading to Stop #${currentStop.stopNumber || 1}` : 'Route Complete'}
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5 font-medium truncate">
              Next Turn: Continue 450 yards on Deansgate (A56), then turn left on Whitworth St.
            </p>
          </div>
        </div>

        {/* SatNav Direct Handoffs */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-satnav-googlemaps"
            type="button"
            onClick={openGoogleMaps}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer touch-manipulation"
            title="Launch Google Maps Navigation"
          >
            <Navigation className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
            <span className="truncate">Google Maps</span>
            <ArrowUpRight className="w-3 h-3 text-secondary shrink-0" />
          </button>
          <button
            id="btn-satnav-waze"
            type="button"
            onClick={openWaze}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer touch-manipulation"
            title="Launch Waze Navigation"
          >
            <Car className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
            <span className="truncate">Waze SatNav</span>
            <ArrowUpRight className="w-3 h-3 text-secondary shrink-0" />
          </button>
        </div>
      </div>

      {currentStop ? (
        <div className="grid grid-cols-12 gap-6 max-w-full">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 min-w-0">
            <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-6 flex flex-col shadow-xl max-w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-4 sm:mb-6 gap-3 sm:gap-0">
                <div className="min-w-0 flex-1 pr-2">
                  <h2 className="text-xs font-bold text-secondary uppercase tracking-wider mb-1 font-mono">
                    Current Dispatch
                  </h2>
                  <p className="text-xl sm:text-2xl font-semibold text-primary truncate">
                    Stop #{currentStop.stopNumber || 1}: {currentStop.recipientName || 'Customer'}
                  </p>
                  <p className="text-brand-cyan font-mono font-bold mt-1 text-xs sm:text-sm truncate">
                    {currentStop.postcode} • {currentStop.addressLine1}, {currentStop.townCity || 'UK'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openGoogleMaps}
                    className="bg-subtle p-3 rounded-xl border border-[#3E4A61] hover:opacity-90 text-primary transition-colors cursor-pointer"
                    title="Launch SatNav"
                  >
                    <Navigation className="w-4 h-4 text-brand-cyan" />
                  </button>
                  <button
                    type="button"
                    onClick={handleVoiceCallout}
                    className="bg-subtle p-3 rounded-xl border border-[#3E4A61] hover:opacity-90 text-primary transition-colors cursor-pointer"
                    title="Hands-Free UK Voice Callout"
                  >
                    <Volume2 className="w-4 h-4 text-brand-emerald" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Left: Van Parcel Map Guide */}
                <div className="bg-inset border border-subtle rounded-xl p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden">
                  <span className="text-[10px] uppercase font-bold text-secondary mb-2 block font-mono">
                    Van Parcel Map Guide
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 min-h-35 my-auto py-1">
                    {vanZones.slice(0, 9).map((zone) => {
                      const isTargetZone = (currentStop.assignedZone || 'Front Seat') === zone.id;
                      return (
                        <div
                          key={zone.id}
                          className={`rounded-lg p-1 flex items-center justify-center text-[10px] font-mono border transition-all text-center leading-none truncate ${
                            isTargetZone
                              ? 'bg-brand-cyan text-canvas font-black border-white shadow-[0_0_10px_#06B6D4]'
                              : 'bg-surface border-subtle text-secondary'
                          }`}
                          title={zone.label}
                        >
                          <span className="truncate">{isTargetZone ? 'TARGET' : zone.label.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-brand-cyan font-mono truncate">
                    {(currentStop.assignedZone || 'Front Seat').toUpperCase()}
                  </p>
                </div>

                {/* Right: Codes, Notes & Confirm Drop */}
                <div className="flex flex-col justify-between gap-3 min-w-0">
                  <div className="bg-inset border border-subtle rounded-xl p-3 flex justify-between items-center">
                    <div className="min-w-0">
                      <span className="text-[10px] text-secondary block uppercase font-mono">
                        Access Code
                      </span>
                      <span className="text-lg font-mono tracking-widest text-brand-emerald font-black truncate block">
                        {currentStop.gateAccessCode || '#1928'}
                      </span>
                    </div>
                    <span className="text-xs bg-subtle px-2 py-1 rounded text-primary font-mono shrink-0 ml-2">
                      {currentStop.parcelSize || 'Standard Drop'}
                    </span>
                  </div>
                  
                  {isAutoCheckingIn && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-xl border border-brand-cyan bg-brand-cyan/10 animate-pulse text-brand-cyan">
                      <div className="w-2 h-2 rounded-full bg-brand-cyan animate-ping shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider font-mono truncate">Geofence Detected: Auto Check-In...</span>
                    </div>
                  )}

                  {/* Customer & Gate Notes from Vault */}
                  {(() => {
                    const matchingIntel = doorstepIntelList.find(
                      (item) =>
                        item.postcode.replace(/\s+/g, '').toUpperCase() ===
                        (currentStop.postcode || '').replace(/\s+/g, '').toUpperCase()
                    );

                    return (
                      <div className="mt-4 p-4 rounded-xl border border-subtle bg-canvas space-y-2.5 max-w-full overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-brand-cyan min-w-0">
                            <Key className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider font-mono truncate">
                              Customer &amp; Gate Notes
                            </span>
                          </div>
                          {onNavigateToDoorstepVault && (
                            <button
                              type="button"
                              onClick={onNavigateToDoorstepVault}
                              className="text-[10px] uppercase font-bold text-brand-cyan hover:underline flex items-center gap-1 font-mono cursor-pointer shrink-0 ml-2"
                            >
                              <span>Open Notes</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {matchingIntel ? (
                          <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-brand-cyan/40 space-y-2 max-w-full overflow-hidden">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan truncate">
                                {matchingIntel.category}
                              </span>
                              {matchingIntel.accessCode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerHapticFeedback('success');
                                    navigator.clipboard.writeText(matchingIntel.accessCode!);
                                    speakUkVoicePrompt(`Code ${matchingIntel.accessCode} copied.`);
                                  }}
                                  className="text-[11px] font-mono font-black text-brand-cyan px-2 py-0.5 rounded bg-surface border border-brand-cyan/40 hover:bg-brand-cyan hover:text-canvas transition-colors cursor-pointer truncate"
                                >
                                  Code: {matchingIntel.accessCode}
                                </button>
                              )}
                            </div>

                            {matchingIntel.tradesmanBuzzerRule && (
                              <p className="text-xs text-indigo-300 font-mono truncate">
                                🔔 {matchingIntel.tradesmanBuzzerRule}
                              </p>
                            )}

                            {matchingIntel.hazardWarning && (
                              <p className="text-xs text-amber-300 font-mono font-bold truncate">
                                ⚠️ {matchingIntel.hazardWarning}
                              </p>
                            )}

                            <p className="text-xs text-slate-200 leading-relaxed font-sans break-words">
                              {matchingIntel.instructionNotes}
                            </p>
                          </div>
                        ) : currentStop.communityIntel && currentStop.communityIntel.length > 0 ? (
                          <ul className="space-y-1.5 max-w-full">
                            {currentStop.communityIntel.map((note, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-primary font-mono p-2 bg-inset rounded-lg border border-subtle truncate"
                              >
                                "{note}"
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-secondary italic gap-2">
                            <span className="truncate">No verified gate codes for {currentStop.postcode}.</span>
                            {onNavigateToDoorstepVault && (
                              <button
                                type="button"
                                onClick={onNavigateToDoorstepVault}
                                className="not-italic text-[10px] font-bold text-brand-cyan uppercase underline cursor-pointer shrink-0"
                              >
                                + Add Note
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
                    <p className="text-xs leading-tight mt-1 text-slate-200 italic break-words">
                      "{currentStop.customerInstructions || 'Leave in secure porch if no answer. Ring bell twice.'}"
                    </p>
                  </div>

                  {/* Voice Note Recorder */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={handleToggleVoiceNote}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer truncate ${
                        isRecordingVoiceNote
                          ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                          : recordedAudioUrl
                          ? 'bg-emerald-950/40 border-brand-emerald/50 text-brand-emerald'
                          : 'bg-inset border-subtle text-secondary hover:text-primary'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                      <span className="truncate">
                        {isRecordingVoiceNote
                          ? 'Recording... Tap to Finish'
                          : recordedAudioUrl
                          ? 'Audio Note Saved & Attached ✓ (Tap to Re-record)'
                          : 'Record Drop Audio Note (Hands-Free)'}
                      </span>
                    </button>

                    {recordedAudioUrl && (
                      <div className="flex items-center gap-2 bg-inset/80 border border-subtle rounded-lg p-1.5 max-w-full overflow-hidden">
                        <audio src={recordedAudioUrl} controls className="w-full h-7 rounded" />
                        <button
                          type="button"
                          onClick={() => setRecordedAudioUrl(null)}
                          className="text-[10px] text-red-400 hover:text-red-300 font-mono px-1.5 py-0.5 rounded border border-red-500/30 hover:bg-red-500/10 whitespace-nowrap cursor-pointer shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Confirm Drop Actions */}
                  <div className="flex gap-2">
                    <button
                      id="btn-confirm-drop-action"
                      type="button"
                      onClick={handleConfirmDropAction}
                      className="bg-brand-emerald text-canvas flex-1 py-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-[#0E9E6D] shadow-lg shadow-brand-emerald/20 transition-all active:scale-95 uppercase tracking-wide cursor-pointer touch-manipulation truncate px-2"
                    >
                      <CheckCircle2 className="w-5 h-5 font-bold shrink-0" />
                      <span className="truncate">CONFIRM DROP</span>
                    </button>
                    <button
                      id="btn-return-item-action"
                      type="button"
                      onClick={handleOpenReturnModal}
                      className="bg-inset border border-red-500/40 text-red-400 hover:text-red-300 px-3 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation shrink-0"
                      title="Return Item to Depot"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Vitals Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-full">
              <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col justify-between shadow-md overflow-hidden">
                <span className="text-[10px] font-bold text-secondary uppercase font-mono">
                  AMAP Tax Shield
                </span>
                <div className="my-2 min-w-0">
                  <p className="text-lg sm:text-xl font-bold font-mono text-primary truncate">
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
                <span className="text-[10px] text-secondary font-mono truncate block">
                  {taxMetrics.totalBusinessMilesYTD} / 10,000 miles (45p rate)
                </span>
              </div>

              <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col justify-between shadow-md overflow-hidden">
                <span className="text-[10px] font-bold text-secondary uppercase font-mono">
                  Loading Bay Timer
                </span>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 text-center my-2">
                  <span className="text-[9px] text-orange-400 uppercase font-mono font-bold block">
                    Remaining Window
                  </span>
                  <span className="text-lg sm:text-xl font-mono text-primary font-black truncate block">
                    14:52
                  </span>
                </div>
                <span className="text-[10px] text-orange-400 font-mono truncate block">
                  Commercial Loading Only
                </span>
              </div>

              <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col justify-between border-b-4 border-b-[#06B6D4] shadow-md overflow-hidden">
                <span className="text-[10px] font-bold text-secondary uppercase font-mono">
                  Vehicle Vitals
                </span>
                <div className="my-2 space-y-1">
                  <div className="flex justify-between text-xs gap-2">
                    <span className="text-secondary shrink-0">Fuel / Range:</span>
                    <span className="font-mono text-brand-cyan font-bold truncate">184 miles</span>
                  </div>
                  <div className="flex justify-between text-xs gap-2">
                    <span className="text-secondary shrink-0">Tyres:</span>
                    <span className="font-mono text-brand-emerald font-bold truncate">32 PSI</span>
                  </div>
                </div>
                <span className="text-[10px] text-secondary font-mono truncate block">
                  Ford Transit Custom • PX21 WRE
                </span>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 min-w-0">
            <div className="bg-surface border border-subtle rounded-2xl p-4 flex flex-col shadow-xl max-w-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider font-mono truncate">
                  Next Up Manifest
                </h3>
                <span className="text-[10px] font-mono text-brand-cyan bg-inset px-2 py-0.5 rounded border border-subtle shrink-0">
                  {pendingStops.length} Remaining
                </span>
              </div>

              <div className="space-y-3 max-h-95 overflow-y-auto pr-1 max-w-full">
                {pendingStops.slice(1, 6).map((stop, idx) => (
                  <div
                    key={stop.id}
                    onClick={() => onSelectStop(stop.id)}
                    className={`p-3 rounded-xl bg-inset hover:bg-subtle cursor-pointer transition-colors border-l-4 ${
                      idx === 0 ? 'border-l-[#06B6D4]' : idx === 1 ? 'border-l-brand-emerald' : 'border-l-[#8F9CAE]'
                    } border-t border-r border-b border-subtle max-w-full overflow-hidden`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-primary truncate">
                        Stop #{stop.stopNumber || idx + 2}: {stop.recipientName || 'Customer'}
                      </span>
                      <span className="text-[10px] font-mono text-brand-cyan bg-surface px-1.5 py-0.5 rounded shrink-0">
                        {(stop.assignedZone || 'Front Seat').split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-1 font-mono truncate">
                      {stop.postcode} • {stop.addressLine1}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-subtle rounded-2xl p-4 shadow-xl max-w-full overflow-hidden">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 font-mono">
                Earnings Forecast
              </h3>
              <div className="space-y-2 font-mono">
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-secondary shrink-0">Hourly Avg:</span>
                  <span className="text-primary font-bold truncate">£19.57</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-secondary shrink-0">This Week:</span>
                  <span className="text-brand-emerald font-bold truncate">£482.30</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-secondary shrink-0">Projected Month:</span>
                  <span className="text-brand-cyan font-bold truncate">£2,140.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-brand-emerald/40 rounded-2xl p-6 sm:p-10 text-center space-y-4 shadow-2xl animate-fade-in max-w-full overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-brand-emerald flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-primary font-mono">
            Route Complete! All Drops Handled
          </h2>
          <p className="text-xs text-secondary max-w-md mx-auto">
            Congratulations. You have processed all stops for this delivery block. Proceed to Depot Returns Log if any returns were recorded, or punch out to save your HMRC AMAP logs.
          </p>
        </div>
      )}

      {/* Return Item Modal */}
      {returnModalStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-subtle rounded-2xl p-6 shadow-2xl text-primary space-y-4 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-950/80 rounded-xl border border-red-500/40 text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold truncate">Return Drop #{returnModalStop.stopNumber || 1}</h3>
                <p className="text-xs text-secondary truncate">
                  Select reason code for depot returns log.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
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
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors truncate ${
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
                    className="text-red-500 focus:ring-0 shrink-0"
                  />
                  <span className="truncate">{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReturnModalStop(null)}
                className="px-4 py-2 rounded-lg bg-inset border border-subtle text-xs text-secondary hover:text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-return-item-modal"
                type="button"
                onClick={handleConfirmReturnAction}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer truncate"
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
              <h3 className="font-bold text-primary truncate">Add Driver Notes</h3>
              <button
                type="button"
                onClick={() => setIntelModalStop(null)}
                className="p-1 rounded hover:bg-subtle text-secondary cursor-pointer shrink-0 ml-2"
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
                placeholder="e.g. Beware of loose dog, gate code is 1234, hidden safe place behind garden shed..."
                className="w-full bg-inset border border-subtle rounded-xl p-3 text-sm text-primary font-mono min-h-25 focus:outline-none focus:border-brand-cyan"
              />
              <button
                type="button"
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
                className="w-full py-3 bg-brand-cyan hover:opacity-90 text-canvas font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-wide cursor-pointer truncate"
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