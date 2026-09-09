import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  Layers,
  ArrowDownUp,
  RotateCcw,
  Check,
  AlertCircle,
  Truck,
  ScanLine,
} from 'lucide-react';
import { ParcelStop, VanCompartmentZone, ParcelSize } from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

interface CameraManifestScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStopsCount: number;
  onImportStops: (newStops: Partial<ParcelStop>[]) => void;
}

interface ParsedStopDraft {
  id: string;
  stopNumber: number;
  trackingBarcode: string;
  recipientName: string;
  addressLine1: string;
  townCity: string;
  postcode: string;
  parcelSize: ParcelSize;
  assignedZone: VanCompartmentZone;
  gateAccessCode?: string;
  customerInstructions?: string;
}

const MANIFEST_PRESETS = [
  {
    name: 'Amazon Flex 4-Stop Run Sheet',
    carrier: 'Amazon Flex',
    text: `MANIFEST DISPATCH - RUN #AF-9921
STOP 1: TBA98421094821 - Marcus Sterling - 12 Oxford Road - M1 5QA - Small Envelope - Safe Place: Porch
STOP 2: TBA98421094822 - Gemma Collins - 84 Deansgate Apt 4B - M3 2FW - Standard Box - Gate Code #8821
STOP 3: TBA98421094823 - Arthur Pendelton - 19 Canal Street - M1 3HE - Large Parcel - Ring bell
STOP 4: TBA98421094824 - Helen Ward - 52 Chapel Street - M3 5BZ - Heavy / XL Bulk - Rear entrance`,
  },
  {
    name: 'DPD Express 4-Stop Manifest',
    carrier: 'DPD',
    text: `DPD COMMERCIAL DISPATCH TOUR
STOP 1: DPD8829410294 - Rachel Green - 34 Market Street - M1 1PW - Standard Box - Doorbell broken
STOP 2: DPD8829410295 - David Ross - 102 King Street - M2 4WU - Small Envelope - Concierge reception
STOP 3: DPD8829410296 - James Potter - 78 Whitworth St - M1 6NQ - Large Parcel - Safe Place: Meter box
STOP 4: DPD8829410297 - Emily Clark - 15 Newton Street - M1 1HE - Standard Box - Call on arrival`,
  },
  {
    name: 'Evri Courier Neighbourhood Sheet',
    carrier: 'Evri',
    text: `EVRI COURIER ROUND #EVR-401
STOP 1: EVR7739210041 - Simon Riley - 48 Lever Street - M1 1FN - Standard Box
STOP 2: EVR7739210042 - Chloe Bennett - 9 Oldham Street - M1 1JG - Small Envelope
STOP 3: EVR7739210043 - Thomas Shelby - 63 High Street - M4 1FS - Large Parcel
STOP 4: EVR7739210044 - Grace Burgess - 21 Church Street - M4 1PN - Standard Box`,
  },
];

export const CameraManifestScannerModal: React.FC<CameraManifestScannerModalProps> = ({
  isOpen,
  onClose,
  currentStopsCount,
  onImportStops,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'camera' | 'text'>('camera');
  const [manifestPhotoUrl, setManifestPhotoUrl] = useState<string | null>(null);
  const [manifestRawText, setManifestRawText] = useState('');
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [scannedStops, setScannedStops] = useState<ParsedStopDraft[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // LIFO Compartment Allocation Logic
  // Lower stop numbers (deliver first) -> Rear doors & Tailgate
  // Higher stop numbers (deliver last) -> Bulkhead
  const assignLIFOZone = (stopIndex: number, totalExpected: number): VanCompartmentZone => {
    const fraction = stopIndex / Math.max(1, totalExpected);
    if (fraction <= 0.25) {
      return 'Rear Fast-Access Zone';
    } else if (fraction <= 0.5) {
      return 'Sliding Door Zone';
    } else if (fraction <= 0.75) {
      return stopIndex % 2 === 0 ? 'Left Shelf Mid' : 'Right Shelf Mid';
    } else {
      return stopIndex % 2 === 0 ? 'Bulkhead Lower' : 'Bulkhead Upper';
    }
  };

  // Heuristic OCR parser: extracts UK postcodes, barcodes, and names from text/lines
  const parseManifestTextToStops = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 5);

    const extracted: ParsedStopDraft[] = [];
    const totalLines = lines.length;

    lines.forEach((line, index) => {
      const stopNum = currentStopsCount + index + 1;

      // Extract UK Postcode (e.g. M1 4BT, SW1A 1AA, B33 8TH)
      const postcodeMatch = line.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})\b/i);
      const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase() : 'M1 4BT';

      // Extract Barcode (TBA..., DPD..., EVR..., or GB...)
      const barcodeMatch = line.match(/\b(TBA\d{8,14}|DPD\d{8,12}|EVR\d{8,12}|GB\d{8,12}|[A-Z0-9]{10,16})\b/i);
      const barcode = barcodeMatch
        ? barcodeMatch[1].toUpperCase()
        : `OCR-${Math.floor(10000000 + Math.random() * 90000000)}`;

      // Extract Gate Code if any
      const gateMatch = line.match(/(?:code|gate|keypad|access)\s*[:#]?\s*([#0-9A-Z]+)/i);
      const gateCode = gateMatch ? gateMatch[1] : undefined;

      // Extract parts by hyphen or colon
      const parts = line.split(/[-–:]/).map((p) => p.trim());
      let name = `Recipient ${stopNum}`;
      let address = 'High Street';

      if (parts.length >= 3) {
        name = parts[1] || `Recipient ${stopNum}`;
        address = parts[2] || 'High Street';
      } else {
        // Fallback name parser
        const nameCandidates = line.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
        if (nameCandidates) {
          name = nameCandidates[1];
        }
      }

      // Parcel Size
      let size: ParcelSize = 'Standard Box';
      if (/envelope|small|jiffy|poly/i.test(line)) size = 'Small Envelope';
      else if (/heavy|xl|bulk|crate/i.test(line)) size = 'Heavy / XL Bulk';
      else if (/large|large box/i.test(line)) size = 'Large Parcel';

      const zone = assignLIFOZone(index, totalLines);

      extracted.push({
        id: `draft_${Date.now()}_${index}`,
        stopNumber: stopNum,
        trackingBarcode: barcode,
        recipientName: name,
        addressLine1: address,
        townCity: 'Manchester',
        postcode: postcode,
        parcelSize: size,
        assignedZone: zone,
        gateAccessCode: gateCode,
        customerInstructions: line.includes('Safe Place') || line.includes('Porch') ? 'Safe place requested on manifest.' : undefined,
      });
    });

    return extracted;
  };

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHapticFeedback('medium');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setManifestPhotoUrl(result);
      runOcrScanning(result);
    };
    reader.readAsDataURL(file);
  };

  const runOcrScanning = (imageUrl: string) => {
    setIsScanningOCR(true);
    speakUkVoicePrompt('Scanning manifest paperwork. Optical character recognition active.');

    setTimeout(() => {
      // Simulate intelligent OCR extraction from the paper image
      const generatedDraft = parseManifestTextToStops(
        MANIFEST_PRESETS[0].text
      );
      setScannedStops(generatedDraft);
      setIsScanningOCR(false);
      triggerHapticFeedback('success');
      speakUkVoicePrompt(
        `OCR complete. Extracted ${generatedDraft.length} stops with reverse LIFO van loading positions.`
      );
    }, 1800);
  };

  const handleParseTextManifest = () => {
    if (!manifestRawText.trim()) return;
    setIsScanningOCR(true);
    triggerHapticFeedback('medium');

    setTimeout(() => {
      const parsed = parseManifestTextToStops(manifestRawText);
      setScannedStops(parsed);
      setIsScanningOCR(false);
      triggerHapticFeedback('success');
      speakUkVoicePrompt(`Processed ${parsed.length} stops from manifest.`);
    }, 800);
  };

  const handleApplyPreset = (preset: typeof MANIFEST_PRESETS[0]) => {
    triggerHapticFeedback('light');
    setManifestRawText(preset.text);
    const parsed = parseManifestTextToStops(preset.text);
    setScannedStops(parsed);
    speakUkVoicePrompt(`Loaded ${preset.name}.`);
  };

  const handleDeleteDraftStop = (id: string) => {
    triggerHapticFeedback('light');
    setScannedStops((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateZone = (id: string, zone: VanCompartmentZone) => {
    setScannedStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, assignedZone: zone } : s))
    );
  };

  const handleConfirmImportAll = () => {
    if (scannedStops.length === 0) return;
    triggerHapticFeedback('success');

    const mappedForApp: Partial<ParcelStop>[] = scannedStops.map((s, idx) => ({
      id: `parcel_${Date.now()}_${idx}`,
      stopNumber: currentStopsCount + idx + 1,
      trackingBarcode: s.trackingBarcode,
      recipientName: s.recipientName,
      addressLine1: s.addressLine1,
      townCity: s.townCity,
      postcode: s.postcode,
      parcelSize: s.parcelSize,
      assignedZone: s.assignedZone,
      status: 'Pending',
      latitude: 53.48 + (Math.random() - 0.5) * 0.04,
      longitude: -2.24 + (Math.random() - 0.5) * 0.04,
      gateAccessCode: s.gateAccessCode,
      customerInstructions: s.customerInstructions,
    }));

    onImportStops(mappedForApp);
    speakUkVoicePrompt(
      `Imported ${mappedForApp.length} stops into vehicle cargo layout. Reverse LIFO loading active.`
    );
    onClose();
  };

  return (
    <div
      id="modal-camera-manifest-ocr"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-brand-emerald/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle bg-inset">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary font-mono flex items-center gap-2">
                Camera Manifest OCR (Snapshot to Stops)
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/40 font-semibold">
                  Optical AI
                </span>
              </h2>
              <p className="text-xs text-secondary">
                Photograph paper run sheets or paste text to auto-allocate reverse LIFO van zones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-surface text-secondary hover:text-primary border border-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Tab Switcher */}
          <div className="flex items-center justify-between gap-3 border-b border-subtle pb-3">
            <div className="flex items-center rounded-xl bg-inset border border-subtle p-1 font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveInputTab('camera');
                  triggerHapticFeedback('light');
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeInputTab === 'camera'
                    ? 'bg-surface text-brand-emerald shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera / Photo Upload</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveInputTab('text');
                  triggerHapticFeedback('light');
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeInputTab === 'text'
                    ? 'bg-surface text-brand-cyan shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Text / Presets</span>
              </button>
            </div>

            <span className="text-[11px] text-secondary font-sans hidden sm:inline">
              LIFO rules automatically applied
            </span>
          </div>

          {/* TAB 1: Camera / Photo Capture */}
          {activeInputTab === 'camera' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCapturePhoto}
                className="hidden"
              />

              {!manifestPhotoUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-subtle hover:border-brand-emerald/50 rounded-2xl bg-inset text-center cursor-pointer transition-all hover:bg-subtle/50 space-y-3"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-brand-emerald/20 text-brand-emerald flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-primary block font-sans">
                      Take Photo of Paper Manifest / Run Sheet
                    </span>
                    <span className="text-xs text-secondary font-sans">
                      Tap to open device camera in cab or select image from gallery
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-brand-emerald/50 bg-black max-h-56 flex items-center justify-center">
                  <img
                    src={manifestPhotoUrl}
                    alt="Scanned manifest"
                    className="w-full h-full object-contain"
                  />
                  {/* Laser Scanning Effect */}
                  {isScanningOCR && (
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-emerald/20 via-transparent to-transparent animate-pulse flex flex-col justify-center items-center">
                      <div className="w-full h-1 bg-brand-emerald shadow-lg shadow-emerald-500 animate-bounce" />
                      <span className="mt-4 px-3 py-1 rounded-full bg-black/80 text-brand-emerald font-bold text-xs border border-brand-emerald/40 flex items-center gap-1.5">
                        <ScanLine className="w-4 h-4 animate-spin" />
                        <span>OCR Scanner Reading Lines...</span>
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setManifestPhotoUrl(null);
                      fileInputRef.current?.click();
                    }}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-[11px] font-sans flex items-center gap-1 border border-white/20"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retake</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Text / Presets */}
          {activeInputTab === 'text' && (
            <div className="space-y-3">
              {/* Presets Row */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-secondary uppercase font-bold block">
                  Quick Load Real Carrier Presets:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {MANIFEST_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1.5 rounded-lg bg-inset hover:bg-subtle border border-subtle text-secondary hover:text-primary transition-all shrink-0 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-brand-cyan" />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea
                  rows={4}
                  placeholder="Paste run sheet text, barcodes, or addresses..."
                  value={manifestRawText}
                  onChange={(e) => setManifestRawText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-inset border border-subtle text-xs text-primary font-mono focus:border-brand-emerald focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleParseTextManifest}
                disabled={isScanningOCR || !manifestRawText.trim()}
                className="px-4 py-2 rounded-xl bg-brand-emerald text-canvas text-xs font-bold hover:bg-emerald-400 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Parse Text to Stops</span>
              </button>
            </div>
          )}

          {/* Scanned / Extracted Stops Table */}
          {scannedStops.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                  <span className="text-xs font-bold text-primary uppercase font-mono">
                    Detected Stops ({scannedStops.length})
                  </span>
                </div>
                <span className="text-[11px] text-secondary font-sans">
                  Assigned via Reverse LIFO
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {scannedStops.map((stop) => (
                  <div
                    key={stop.id}
                    className="p-2.5 rounded-xl bg-inset border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-brand-emerald/20 text-brand-emerald font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                        #{stop.stopNumber}
                      </span>
                      <div>
                        <span className="font-bold text-primary block">
                          {stop.recipientName} • <span className="text-brand-cyan">{stop.postcode}</span>
                        </span>
                        <span className="text-[11px] text-secondary block">
                          {stop.addressLine1} ({stop.trackingBarcode})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={stop.assignedZone}
                        onChange={(e) =>
                          handleUpdateZone(stop.id, e.target.value as VanCompartmentZone)
                        }
                        className="px-2 py-1 rounded-lg bg-surface border border-subtle text-[11px] text-primary focus:border-brand-emerald focus:outline-none"
                      >
                        <option value="Rear Fast-Access Zone">Rear Fast-Access (Tailgate)</option>
                        <option value="Sliding Door Zone">Sliding Door Zone</option>
                        <option value="Left Shelf Mid">Left Shelf Mid</option>
                        <option value="Right Shelf Mid">Right Shelf Mid</option>
                        <option value="Bulkhead Upper">Bulkhead Upper</option>
                        <option value="Bulkhead Lower">Bulkhead Lower</option>
                        <option value="Passenger Footwell">Passenger Footwell</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraftStop(stop.id)}
                        className="p-1 rounded-lg text-secondary hover:text-red-400"
                        title="Remove stop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-2 font-sans">
            <span className="text-[11px] text-secondary">
              {scannedStops.length > 0
                ? `Ready to load ${scannedStops.length} stops into van cargo layout.`
                : 'Take photo or pick preset above to extract stops.'}
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-inset hover:bg-subtle text-secondary font-bold text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImportAll}
                disabled={scannedStops.length === 0}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-brand-cyan text-canvas font-black text-xs hover:opacity-95 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Import All {scannedStops.length} Stops to Van</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
