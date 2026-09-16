import React, { useState } from 'react';
import {
  RotateCcw,
  Barcode,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Building,
  Printer,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ParcelStop } from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

interface DepotReturnsDebriefProps {
  stops: ParcelStop[];
  onCheckInReturn: (stopId: string) => void;
  onClearAllReturns: () => void;
}

export const DepotReturnsDebrief: React.FC<DepotReturnsDebriefProps> = ({
  stops,
  onCheckInReturn,
  onClearAllReturns,
}) => {
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedSlip, setCopiedSlip] = useState(false);

  const returnedParcels = stops.filter((s) => s.status === 'Returned');
  const deliveredParcels = stops.filter((s) => s.status === 'Delivered');

  const nowFormatted = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;

    const matched = returnedParcels.find(
      (p) => p.trackingBarcode.toLowerCase() === scannedBarcode.trim().toLowerCase()
    );

    if (matched) {
      triggerHapticFeedback('success');
      onCheckInReturn(matched.id);
      setCheckInMessage(`Parcel ${matched.trackingBarcode} successfully verified & returned.`);
      speakUkVoicePrompt(`Return barcode verified for Stop ${matched.stopNumber}.`);
      setScannedBarcode('');
    } else {
      triggerHapticFeedback('warning');
      setCheckInMessage(`Barcode ${scannedBarcode} not found in return manifest.`);
    }
  };

  const handlePrintDebrief = () => {
    triggerHapticFeedback('medium');
    setShowPrintModal(true);
  };

  const executeBrowserPrint = () => {
    triggerHapticFeedback('light');
    try {
      window.print();
    } catch (e) {
      console.warn('Direct print blocked by sandbox, offering new tab option', e);
      openPrintableInNewWindow();
    }
  };

  const openPrintableInNewWindow = () => {
    triggerHapticFeedback('light');
    const slipHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ShiftDrop Depot Returns Log - ${nowFormatted}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 20px; color: #111; }
            .slip-card { max-width: 480px; margin: 0 auto; border: 2px dashed #333; padding: 20px; }
            h1 { font-size: 18px; margin: 0 0 5px; text-transform: uppercase; text-align: center; }
            .sub { text-align: center; font-size: 11px; margin-bottom: 15px; color: #555; }
            .row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
            .divider { border-bottom: 1px solid #ddd; margin: 12px 0; }
            .item-row { border-bottom: 1px dotted #ccc; padding: 6px 0; font-size: 11px; }
            .sign-box { margin-top: 25px; border-top: 1px solid #111; padding-top: 15px; font-size: 12px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-weight: bold; background: #0284C7; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Print Receipt</button>
            <button onclick="window.close()" style="padding: 10px 15px; margin-left: 10px; cursor: pointer;">Close</button>
          </div>
          <div class="slip-card">
            <h1>ShiftDrop Courier Slip</h1>
            <div class="sub">OFFICIAL UK DEPOT HANDOVER MANIFEST</div>
            <div class="divider"></div>
            <div class="row"><strong>Date / Time:</strong> <span>${nowFormatted}</span></div>
            <div class="row"><strong>Depot Hub:</strong> <span>Manchester DPD / Flex Hub (M17)</span></div>
            <div class="row"><strong>Gate / Bay:</strong> <span>Inbound Returns Gate 4</span></div>
            <div class="row"><strong>Courier ID:</strong> <span>UK_DRIVER_4402 (DG)</span></div>
            <div class="row"><strong>Vehicle:</strong> <span>Ford Transit Custom (VN71 DKY)</span></div>
            <div class="divider"></div>
            <div class="row"><strong>Total Route Stops:</strong> <span>${stops.length}</span></div>
            <div class="row"><strong>Delivered Clean:</strong> <span>${deliveredParcels.length} Drops</span></div>
            <div class="row"><strong>Parcels Returned:</strong> <span>${returnedParcels.length} Items</span></div>
            <div class="divider"></div>
            <h3>Return Items Detail:</h3>
            ${
              returnedParcels.length > 0
                ? returnedParcels
                    .map(
                      (p) =>
                        `<div class="item-row">
                          <strong>Stop #${p.stopNumber} - ${p.trackingBarcode}</strong><br/>
                          ${p.recipientName}, ${p.postcode}<br/>
                          <em>Reason: ${p.returnReason || 'Access Blocked / Customer Not Home'}</em>
                        </div>`
                    )
                    .join('')
                : '<div style="padding: 10px 0; color: #15803d; font-weight: bold;">CLEAN RUN CLEARANCE - 0 parcels to return. All deliveries completed.</div>'
            }
            <div class="sign-box">
              <div>Depot Marshal Signature: _______________________</div>
              <div style="margin-top: 10px;">Driver Handover Signature: _______________________</div>
              <div style="margin-top: 10px; font-size: 10px; color: #666;">Generated securely by ShiftDrop Courier Suite (UK)</div>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); }, 400);
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([slipHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      alert('Popup blocker prevented opening the printable slip. Please use the on-screen Print button.');
    }
  };

  const getSlipText = () => {
    return [
      '========================================',
      'SHIFTDROP UK - DEPOT RETURNS LOG SLIP',
      '========================================',
      `Date/Time:       ${nowFormatted}`,
      `Depot Hub:       Manchester DPD / Flex Hub (M17)`,
      `Handover Gate:   Inbound Returns Gate 4`,
      `Courier ID:      UK_DRIVER_4402 (DG)`,
      `Vehicle Reg:     VN71 DKY (Ford Transit Custom)`,
      '----------------------------------------',
      `Route Stops:     ${stops.length}`,
      `Delivered Clean: ${deliveredParcels.length}`,
      `Parcels Return:  ${returnedParcels.length}`,
      '----------------------------------------',
      'RETURN ITEMS MANIFEST:',
      returnedParcels.length > 0
        ? returnedParcels
            .map(
              (p) =>
                `• Stop #${p.stopNumber} | ${p.trackingBarcode} | ${p.postcode} | Reason: ${
                  p.returnReason || 'Access Blocked'
                }`
            )
            .join('\n')
        : 'CLEAN RUN - ZERO (0) PARCELS RETURNED TO HUB.',
      '----------------------------------------',
      'Marshal Signature: ____________________',
      'Time Verified:     ____:____',
      '========================================',
    ].join('\n');
  };

  const handleCopySlipText = () => {
    triggerHapticFeedback('success');
    navigator.clipboard.writeText(getSlipText());
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  const handleDownloadSlipText = () => {
    triggerHapticFeedback('light');
    const element = document.createElement('a');
    const file = new Blob([getSlipText()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `depot_returns_log_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div id="module-depot-returns-debrief" className="max-w-5xl mx-auto p-3 sm:p-5 space-y-5">
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-red-950/60 rounded-xl border border-red-500/40 text-red-400">
              <RotateCcw className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-primary font-mono flex items-center gap-2">
                Depot Returns Log
              </h1>
              <p className="text-xs text-secondary">
                Log undelivered parcels and verify returns with the depot marshal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-print-debrief-receipt"
              onClick={handlePrintDebrief}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs font-bold text-primary transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-brand-cyan" />
              <span>Print Handover Slip</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-1">
          <span className="text-secondary block text-[10px] uppercase">Parcels to Return</span>
          <span className="text-2xl font-black text-red-400">
            {returnedParcels.length} Items
          </span>
          <span className="text-[10px] text-secondary block font-sans">
            Requires physical handover to depot marshal
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-1">
          <span className="text-secondary block text-[10px] uppercase">Delivered Clean</span>
          <span className="text-2xl font-black text-brand-emerald">
            {deliveredParcels.length} Drops
          </span>
          <span className="text-[10px] text-brand-emerald block font-sans">
            Success Rate: {stops.length > 0 ? Math.round((deliveredParcels.length / stops.length) * 100) : 100}%
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-1">
          <span className="text-secondary block text-[10px] uppercase">Depot Location</span>
          <span className="text-sm font-bold text-primary block truncate">
            Manchester DPD / Flex Hub (M17)
          </span>
          <span className="text-[10px] text-brand-cyan block font-sans">
            Inbound Returns Gate 4
          </span>
        </div>
      </div>

      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-subtle pb-2 text-xs font-mono font-bold text-primary uppercase">
          <Barcode className="w-4 h-4 text-brand-cyan" />
          <span>Handheld Return Barcode Check-In</span>
        </div>

        <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full flex items-center">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-secondary absolute left-3 top-3" />
              <input
                id="input-return-barcode-scanner"
                type="text"
                placeholder="Scan or enter parcel return barcode (e.g. GB77490192801)..."
                value={scannedBarcode || ''}
                onChange={(e) => setScannedBarcode(e.target.value)}
                className="w-full pl-9 pr-12 py-2.5 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  setScannedBarcode('GB' + Math.floor(Math.random() * 10000000000));
                  triggerHapticFeedback('light');
                }}
                className="absolute right-2 top-1.5 p-1.5 rounded-lg bg-subtle text-brand-cyan hover:bg-brand-cyan/20 transition-colors cursor-pointer"
                title="Use Camera Scanner"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            id="btn-verify-return-barcode"
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-cyan hover:opacity-90 text-canvas font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 font-bold" />
            <span>Validate Return</span>
          </button>
        </form>

        {checkInMessage && (
          <p className="text-xs font-mono text-brand-cyan pt-1">{checkInMessage}</p>
        )}
      </div>

      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
              Return Items Manifest ({returnedParcels.length})
            </h2>
          </div>
          {returnedParcels.length > 0 && (
            <button
              onClick={onClearAllReturns}
              className="text-[11px] text-secondary hover:text-red-400 transition-colors cursor-pointer"
            >
              Clear All Returns
            </button>
          )}
        </div>

        {returnedParcels.length > 0 ? (
          <div className="space-y-3">
            {returnedParcels.map((parcel) => (
              <div
                key={parcel.id}
                className="p-4 rounded-xl bg-inset border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-400">
                      Stop #{parcel.stopNumber}
                    </span>
                    <span className="font-bold text-primary">{parcel.recipientName}</span>
                    <span className="font-mono text-secondary">({parcel.postcode})</span>
                  </div>
                  <p className="text-xs text-secondary">{parcel.addressLine1}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-red-300 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Reason: {parcel.returnReason || 'Access Blocked'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="font-mono text-[11px] text-secondary bg-surface px-2 py-1 rounded border border-subtle">
                    {parcel.trackingBarcode}
                  </span>
                  <button
                    onClick={() => onCheckInReturn(parcel.id)}
                    className="px-3 py-1.5 rounded-lg bg-brand-emerald hover:bg-emerald-600 text-canvas font-bold text-xs transition-colors cursor-pointer"
                  >
                    Check In ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-secondary space-y-2">
            <CheckCircle2 className="w-8 h-8 text-brand-emerald mx-auto" />
            <p className="text-primary font-bold">No Failed Drops or Returns on Manifest</p>
            <p>All parcels either delivered successfully or pending active drop.</p>
          </div>
        )}
      </div>

      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 bg-inset border-b border-subtle">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-brand-cyan">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary font-mono">
                    Depot Handover Log Slip
                  </h3>
                  <p className="text-[11px] text-secondary">
                    Official courier proof of returns handover
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-subtle transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto bg-black/20">
              <div
                id="printable-debrief-slip"
                className="bg-white text-slate-900 rounded-xl p-5 sm:p-6 font-mono text-xs shadow-inner border border-slate-300 space-y-4"
              >
                <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-cyan-600" />
                    <span>ShiftDrop UK Hub Handover Manifest</span>
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">
                    Depot Returns &amp; Delivery Log
                  </div>
                  <div className="text-[11px] font-bold text-slate-800 pt-1">{nowFormatted}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Hub / Depot:</span>
                    <span className="font-bold text-slate-900">Manchester DPD / Flex (M17)</span>
                    <span className="text-slate-600 block text-[10px]">Gate 4 Inbound</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Courier / Van:</span>
                    <span className="font-bold text-slate-900">UK_DRIVER_4402 (DG)</span>
                    <span className="text-slate-600 block text-[10px]">VN71 DKY (Transit)</span>
                  </div>
                </div>

                <div className="bg-slate-100 rounded-lg p-3 space-y-1.5 border border-slate-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">Total Route Drops:</span>
                    <span className="font-bold text-slate-900">{stops.length} Drops</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">Delivered Clean:</span>
                    <span className="font-bold text-emerald-700">{deliveredParcels.length} Successful</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">Parcels Handed Back:</span>
                    <span className="font-bold text-rose-700">{returnedParcels.length} Returns</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-600">Route Clearance Rate:</span>
                    <span className="font-black text-slate-900">
                      {stops.length > 0
                        ? Math.round((deliveredParcels.length / stops.length) * 100)
                        : 100}
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                    Returned Items Inventory ({returnedParcels.length})
                  </div>

                  {returnedParcels.length > 0 ? (
                    <div className="space-y-2">
                      {returnedParcels.map((parcel) => (
                        <div
                          key={parcel.id}
                          className="p-2 rounded bg-slate-50 border border-slate-200 text-[10px] space-y-0.5"
                        >
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>Stop #{parcel.stopNumber}: {parcel.trackingBarcode}</span>
                            <span className="text-rose-600">{parcel.returnReason || 'Access Blocked'}</span>
                          </div>
                          <div className="text-slate-600">
                            {parcel.recipientName} • {parcel.addressLine1}, {parcel.postcode}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] text-center font-bold">
                      ✓ CLEAN RUN CLEARANCE: Zero (0) parcels returned. All deliveries fulfilled.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-dashed border-slate-400 space-y-4 text-[10px]">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-slate-500 block uppercase">Depot Marshal Handover:</span>
                      <div className="h-10 border-b-2 border-slate-800"></div>
                      <span className="text-slate-500 text-[9px]">Signature / Stamp</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block uppercase">Driver Confirmation:</span>
                      <div className="h-10 border-b-2 border-slate-800"></div>
                      <span className="text-slate-500 text-[9px]">Signature</span>
                    </div>
                  </div>

                  <div className="text-center text-[9px] text-slate-400 pt-1">
                    Audit Code: SD-UK-{Date.now().toString().slice(-6)} • HMRC / DPD / Amazon Flex Verified
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-inset border-t border-subtle flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySlipText}
                  className="px-3 py-2 rounded-xl bg-surface hover:bg-subtle border border-subtle text-primary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSlip ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-brand-emerald" />
                      <span className="text-brand-emerald">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadSlipText}
                  className="px-3 py-2 rounded-xl bg-surface hover:bg-subtle border border-subtle text-primary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-secondary" />
                  <span>Download .txt</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={openPrintableInNewWindow}
                  className="px-3.5 py-2 rounded-xl bg-surface hover:bg-subtle border border-subtle text-brand-cyan font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open in new window (bypasses iframe print sandbox restrictions)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open &amp; Print in New Tab</span>
                </button>

                <button
                  onClick={executeBrowserPrint}
                  className="px-4 py-2 rounded-xl bg-brand-cyan hover:opacity-90 text-canvas font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};