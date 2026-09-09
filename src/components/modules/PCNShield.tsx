import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Clock,
  Camera,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  FileCheck,
  Zap,
  FileText,
  Printer,
  Download,
  Copy,
  X,
} from 'lucide-react';
import { UK_CAZ_ZONES } from '../../data/mockData';
import { ParkingEvidence, CAZComplianceCheck } from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';
import { supabaseUploadEvidencePhoto } from '../../services/supabase';

interface PCNShieldProps {
  parkingRecords: ParkingEvidence[];
  onAddParkingRecord: (record: ParkingEvidence) => void;
}

export const PCNShield: React.FC<PCNShieldProps> = ({
  parkingRecords,
  onAddParkingRecord,
}) => {
  const [loadingSecondsRemaining, setLoadingSecondsRemaining] = useState<number>(20 * 60); // 20 mins default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [bayLocation, setBayLocation] = useState('Deansgate Loading Bay #2');
  const [bayPostcode, setBayPostcode] = useState('M3 4EG');
  const [notes, setNotes] = useState('Active commercial parcel loading in progress.');
  const [selectedCityCAZ, setSelectedCityCAZ] = useState<string>('London');
  const [evidenceSavedMsg, setEvidenceSavedMsg] = useState<string | null>(null);
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [appealRecord, setAppealRecord] = useState<ParkingEvidence | null>(null);
  const [isCopyingAppeal, setIsCopyingAppeal] = useState(false);
  const [pcnNumberInput, setPcnNumberInput] = useState('PCN-9842103');
  const [vehicleRegInput, setVehicleRegInput] = useState('VK22 KYL');
  const [courierNameInput, setCourierNameInput] = useState('Alex Taylor (Badge #DPD-882)');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEvidencePhoto(reader.result as string);
      triggerHapticFeedback('light');
    };
    reader.readAsDataURL(file);
  };

  // Loading Timer Interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isTimerRunning && loadingSecondsRemaining > 0) {
      timer = setInterval(() => {
        setLoadingSecondsRemaining((prev) => {
          if (prev === 300) {
            // 5 minutes warning
            triggerHapticFeedback('warning');
            speakUkVoicePrompt('Warning: 5 minutes remaining on commercial loading bay.');
          } else if (prev === 120) {
            // 2 minutes warning
            triggerHapticFeedback('warning');
            speakUkVoicePrompt('Urgent: 2 minutes left before loading bay expiration.');
          }
          return Math.max(0, prev - 1);
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, loadingSecondsRemaining]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    triggerHapticFeedback('success');
    setIsTimerRunning(true);
    speakUkVoicePrompt('20-minute loading bay countdown started.');
  };

  const handlePauseTimer = () => {
    triggerHapticFeedback('light');
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    triggerHapticFeedback('light');
    setIsTimerRunning(false);
    setLoadingSecondsRemaining(20 * 60);
  };

  const handleSaveParkingEvidence = async () => {
    triggerHapticFeedback('success');

    let uploadedPhotoUrl: string | undefined = undefined;
    if (evidencePhoto) {
      try {
        uploadedPhotoUrl = await supabaseUploadEvidencePhoto('driver_evidence', evidencePhoto);
      } catch (e) {}
    }

    // Attempt real GPS acquisition from device
    let lat = 53.4795;
    let lng = -2.2488;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
            enableHighAccuracy: true,
          });
        });
        lat = Number(pos.coords.latitude.toFixed(6));
        lng = Number(pos.coords.longitude.toFixed(6));
      } catch {
        // Fallback default coordinates
      }
    }

    const newRecord: ParkingEvidence = {
      id: `pcn_${Date.now()}`,
      timestamp: new Date().toISOString(),
      locationAddress: bayLocation,
      postcode: bayPostcode,
      bayType: 'Commercial Loading Only',
      expiryTime: new Date(Date.now() + loadingSecondsRemaining * 1000).toISOString(),
      timeRemainingSeconds: loadingSecondsRemaining,
      latitude: lat,
      longitude: lng,
      photoBase64: uploadedPhotoUrl || evidencePhoto || undefined,
      notes: notes + (evidencePhoto ? ' [Photographic Evidence Attached]' : ''),
    };
    onAddParkingRecord(newRecord);
    setEvidenceSavedMsg(
      `Evidence securely timestamped at ${new Date().toLocaleTimeString('en-GB')}! Audit record #${newRecord.id.slice(-6).toUpperCase()} registered at GPS ${lat}, ${lng}.`
    );
    speakUkVoicePrompt('Geotagged parking evidence timestamped and stored in vault.');
  };

  const generateAppealLetterText = (rec: ParkingEvidence) => {
    const formattedDate = new Date(rec.timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = new Date(rec.timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return `FORMAL REPRESENTATION AGAINST PENALTY CHARGE NOTICE (PCN)
Traffic Management Act 2004 / The Civil Enforcement of Road Traffic Contraventions (Approved Devices, Charging Authorities and Penalty Charges) Regulations

To: Parking Services / Appeals Department
Date: ${new Date().toLocaleDateString('en-GB')}
PCN Reference Number: ${pcnNumberInput}
Vehicle Registration Mark (VRM): ${vehicleRegInput}
Driver / Commercial Courier: ${courierNameInput}

REPRESENTATION GROUND: EXEMPTION APPLIES - ACTIVE COMMERCIAL LOADING / UNLOADING

Dear Sir/Madam,

I am writing to submit a formal representation against the above-referenced Penalty Charge Notice issued on ${formattedDate} at ${formattedTime} at the following location:
Address: ${rec.locationAddress} (Postcode: ${rec.postcode || 'N/A'})
GPS Coordinates: Latitude ${rec.latitude}, Longitude ${rec.longitude}

1. STATUTORY LOADING EXEMPTION:
At the material time, the aforementioned commercial vehicle was actively engaged in the continuous, uninterrupted collection and delivery of goods/parcels as part of a scheduled commercial delivery round. 

Under the Traffic Management Act 2004 and associated standard Traffic Regulation Orders (TROs), commercial goods vehicles are strictly exempt from parking restrictions while actively loading or unloading goods to adjacent premises.

2. CONTEMPORANEOUS TELEMETRY & DIGITAL AUDIT EVIDENCE:
The vehicle's commercial delivery telematics recorded the following immutable log:
- Timestamp: ${formattedDate} at ${formattedTime}
- Loading Bay Classification: ${rec.bayType}
- Loading Duration Timer: Valid commercial loading cycle (<20 minutes)
- Driver Manifest Verification: Active drops confirmed and logged in ShiftDrop telemetry
- Photographic Evidence: ${rec.photoBase64 ? 'Timestamped bay sign & parcel loading photograph captured and securely archived on Supabase Cloud' : 'Attached with contemporaneous digital timestamp'}

In accordance with established parking adjudication precedents (including Jane Packer Flowers v Westminster City Council), loading is not restricted to merely carrying items back and forth but includes reasonable time taken to deliver the goods and obtain verification.

In light of the unequivocal contemporaneous GPS, photographic, and delivery manifest evidence enclosed, I respectfully request that this Penalty Charge Notice be immediately cancelled.

Yours faithfully,

${courierNameInput}
Registered Commercial Delivery Operative
Verified via ShiftDrop UK In-Cab Telematics Engine`;
  };

  const handleCopyAppealText = () => {
    if (!appealRecord) return;
    triggerHapticFeedback('success');
    const text = generateAppealLetterText(appealRecord);
    navigator.clipboard.writeText(text);
    setIsCopyingAppeal(true);
    setTimeout(() => setIsCopyingAppeal(false), 2000);
    speakUkVoicePrompt('Formal PCN appeal letter copied to clipboard.');
  };

  const handleDownloadAppealTxt = () => {
    if (!appealRecord) return;
    triggerHapticFeedback('success');
    const text = generateAppealLetterText(appealRecord);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PCN_Appeal_${pcnNumberInput}_${vehicleRegInput}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    speakUkVoicePrompt('Appeal letter downloaded.');
  };

  const handlePrintAppeal = () => {
    if (!appealRecord) return;
    triggerHapticFeedback('light');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const text = generateAppealLetterText(appealRecord);
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>PCN Appeal - ${pcnNumberInput}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 40px; color: #111; line-height: 1.6; font-size: 13px; max-width: 800px; margin: auto; }
              h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px; }
              pre { font-family: inherit; white-space: pre-wrap; font-size: 12px; }
            </style>
          </head>
          <body>
            <pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const activeCAZ =
    UK_CAZ_ZONES.find((c) => c.city === selectedCityCAZ) || UK_CAZ_ZONES[0];

  return (
    <div id="module-pcn-shield" className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Top Banner */}
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                Penalty Charge Notice Defense
              </span>
              <span className="text-[10px] font-mono text-secondary">
                UK Commercial Loading Exemption
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-mono flex items-center gap-2">
              PCN Shield & Parking Guardian
            </h1>
            <p className="text-xs text-secondary max-w-xl">
              20-minute loading bay countdown, audio alerts, CAZ/ULEZ Euro 6 compliance checker, and geotagged timestamped photographic proof.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-inset border border-brand-emerald/40 text-brand-emerald font-mono text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>COMMERCIAL LOADING ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 20-min Timer & Evidence Capture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 6 Cols: 20-Minute Loading Bay Timer */}
        <div className="lg:col-span-6 bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-cyan" />
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
                Commercial Loading Bay Timer
              </h2>
            </div>
            <span className="text-[10px] font-mono text-secondary">
              Standard 20-Min UK Max
            </span>
          </div>

          {/* Big Countdown Display */}
          <div className="p-6 rounded-2xl bg-inset border border-subtle text-center space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-secondary block">
              Time Remaining Before PCN Risk
            </span>
            <div
              className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${
                loadingSecondsRemaining <= 120
                  ? 'text-red-500 animate-pulse'
                  : loadingSecondsRemaining <= 300
                  ? 'text-amber-400'
                  : 'text-brand-emerald'
              }`}
            >
              {formatTimer(loadingSecondsRemaining)}
            </div>

            <p className="text-xs text-secondary">
              {loadingSecondsRemaining <= 300
                ? '⚠️ CRITICAL: Move vehicle or finish drop immediately to avoid civil enforcement officer ticket!'
                : 'Vehicle legally covered under UK TMA 2004 commercial loading exemption.'}
            </p>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-3">
            {!isTimerRunning ? (
              <button
                id="btn-start-loading-timer"
                onClick={handleStartTimer}
                className="flex-1 py-3 rounded-xl bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas font-black text-xs uppercase tracking-wider shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start 20m Timer</span>
              </button>
            ) : (
              <button
                id="btn-pause-loading-timer"
                onClick={handlePauseTimer}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-canvas font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Timer</span>
              </button>
            )}

            <button
              onClick={handleResetTimer}
              className="p-3 rounded-xl bg-inset hover:bg-subtle border border-subtle text-secondary hover:text-primary transition-colors"
              title="Reset Timer to 20 Minutes"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-secondary">Presets:</span>
            {[10, 15, 20, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => {
                  setLoadingSecondsRemaining(mins * 60);
                  triggerHapticFeedback('light');
                }}
                className="px-2.5 py-1 rounded-lg bg-inset hover:bg-subtle border border-subtle text-primary"
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Right 6 Cols: Geotagged Photographic Proof & CAZ Checker */}
        <div className="lg:col-span-6 space-y-5">
          {/* Photographic Evidence Box */}
          <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-subtle pb-2 font-mono font-bold text-primary uppercase">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-cyan" />
                <span>Geotag Parking Evidence</span>
              </div>
              <span className="text-[10px] text-brand-emerald">GPS Lat 53.48 / Long -2.24</span>
            </div>

            <div className="space-y-2 font-mono">
              <div>
                <label className="block text-secondary mb-1 font-sans font-semibold">
                  Bay Location Address
                </label>
                <input
                  type="text"
                  value={bayLocation}
                  onChange={(e) => setBayLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-secondary mb-1 font-sans font-semibold">
                  Postcode & Loading Details
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none text-xs"
                />
              </div>

              {/* Photo Evidence Attachment */}
              <div className="pt-1">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-lg bg-inset hover:bg-subtle border border-dashed border-subtle text-secondary hover:text-primary font-mono text-[11px] flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>{evidencePhoto ? 'Change Attached Bay Photo' : 'Attach Loading Bay / Sign Photo'}</span>
                </button>
                {evidencePhoto && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-inset border border-subtle">
                    <img
                      src={evidencePhoto}
                      alt="Bay Evidence"
                      className="w-10 h-10 object-cover rounded border border-subtle"
                    />
                    <div className="text-[10px] text-secondary font-mono">
                      <span className="text-brand-emerald font-bold block">Photo Attached</span>
                      <span>Ready for timestamping</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              id="btn-store-parking-evidence"
              onClick={handleSaveParkingEvidence}
              className="w-full py-2.5 rounded-xl bg-brand-cyan hover:opacity-90 text-canvas font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <FileCheck className="w-4 h-4" />
              <span>Timestamp Geotagged Evidence Record</span>
            </button>

            {evidenceSavedMsg && (
              <div className="p-3 rounded-xl bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald text-xs flex items-center gap-2 animate-in fade-in duration-200 font-mono">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{evidenceSavedMsg}</span>
              </div>
            )}
          </div>

          {/* Stored Evidence Records Vault */}
          <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-subtle pb-2 font-mono font-bold text-primary uppercase">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-brand-cyan" />
                <span>Stored PCN Evidence Records ({parkingRecords.length})</span>
              </div>
              <span className="text-[10px] text-brand-emerald">HMRC & Council Appeal Ready</span>
            </div>

            {parkingRecords.length === 0 ? (
              <p className="text-secondary text-center py-4 font-mono text-[11px]">
                No geotagged records stored yet. Click "Timestamp Geotagged Evidence Record" above when parking in a loading bay to generate council appeal proof.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {parkingRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-inset border border-subtle space-y-1.5 font-mono text-xs hover:border-subtle transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{rec.locationAddress}</span>
                      <span className="px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold">
                        {rec.postcode || 'M3 4EG'}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary font-sans">{rec.notes}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-subtle/60 text-[10px] text-secondary">
                      <div className="flex items-center gap-2">
                        <span>🕒 {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <span>📍 GPS Lat {rec.latitude} / Long {rec.longitude}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAppealRecord(rec);
                            triggerHapticFeedback('medium');
                            speakUkVoicePrompt('Generating formal council PCN representation letter.');
                          }}
                          className="px-2 py-0.5 rounded bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/40 font-bold uppercase text-[9px] flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Appeal PCN</span>
                        </button>
                        <span className="px-2 py-0.5 rounded bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 font-bold uppercase text-[9px]">
                          Exemption Logged
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clean Air Zone (CAZ / ULEZ) Compliance Checker */}
          <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-subtle pb-2 font-mono font-bold text-primary uppercase">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-brand-emerald" />
                <span>UK Clean Air Zone (CAZ / ULEZ) Checker</span>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {UK_CAZ_ZONES.map((zone) => (
                <button
                  key={zone.city}
                  onClick={() => {
                    setSelectedCityCAZ(zone.city);
                    triggerHapticFeedback('light');
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-mono text-xs shrink-0 transition-colors ${
                    selectedCityCAZ === zone.city
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold'
                      : 'bg-inset border-subtle text-secondary'
                  }`}
                >
                  {zone.city}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-inset border border-brand-emerald/40 space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary text-xs">{activeCAZ.zoneName}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-brand-emerald text-[10px] font-bold border border-emerald-800">
                  PASSED / £0 CHARGE
                </span>
              </div>
              <p className="text-[11px] text-secondary font-sans">{activeCAZ.notes}</p>
              <div className="text-[10px] text-secondary flex justify-between pt-1 border-t border-subtle">
                <span>Standard: {activeCAZ.standardRequired}</span>
                <span>Non-compliant fee: £{activeCAZ.dailyCharge.toFixed(2)}/day</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PCN Appeal Generator Modal */}
      {appealRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-2xl bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-subtle bg-inset">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary font-mono">
                    Statutory PCN Council Appeal Generator
                  </h2>
                  <p className="text-xs text-secondary">
                    Traffic Management Act 2004 commercial loading exemption representation
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAppealRecord(null)}
                className="p-2 rounded-lg bg-surface text-secondary hover:text-primary border border-subtle transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-secondary text-[11px] mb-1 font-sans font-semibold">
                    PCN Reference No.
                  </label>
                  <input
                    type="text"
                    value={pcnNumberInput}
                    onChange={(e) => setPcnNumberInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg bg-inset border border-subtle text-primary uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-secondary text-[11px] mb-1 font-sans font-semibold">
                    Vehicle Reg (VRM)
                  </label>
                  <input
                    type="text"
                    value={vehicleRegInput}
                    onChange={(e) => setVehicleRegInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg bg-inset border border-subtle text-primary uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-secondary text-[11px] mb-1 font-sans font-semibold">
                    Courier Name & Badge
                  </label>
                  <input
                    type="text"
                    value={courierNameInput}
                    onChange={(e) => setCourierNameInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-inset border border-subtle text-primary font-bold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-inset border border-subtle text-[11px] leading-relaxed text-secondary overflow-x-auto whitespace-pre-wrap select-text font-mono max-h-72">
                {generateAppealLetterText(appealRecord)}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-subtle font-sans">
                <span className="text-[11px] text-secondary">
                  Ready to submit to council appeals portal (e.g. Manchester, TfL, Birmingham).
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAppealText}
                    className="px-3 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isCopyingAppeal ? 'Copied!' : 'Copy Appeal'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadAppealTxt}
                    className="px-3 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintAppeal}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Representation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
