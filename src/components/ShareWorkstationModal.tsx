import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Shield,
  Smartphone,
  Cloud,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { ParcelStop, ActiveShift } from '../types';

interface ShareWorkstationModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: ParcelStop[];
  activeShift: ActiveShift;
}

export const ShareWorkstationModal: React.FC<ShareWorkstationModalProps> = ({
  isOpen,
  onClose,
  stops,
  activeShift,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedData, setCopiedData] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://shiftdrop.co.uk';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      shift: activeShift,
      stopsCount: stops.length,
      stops,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShiftDrop_Manifest_${activeShift.network}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = 'Stop,Recipient,Postcode,Address,City,Zone,Status,Size,Barcode\n';
    const rows = stops
      .map(
        (s) =>
          `${s.stopNumber},"${s.recipientName}","${s.postcode}","${s.addressLine1}","${s.townCity}","${s.assignedZone}","${s.status}","${s.parcelSize}","${s.trackingBarcode}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShiftDrop_Route_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-lg bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary font-mono">
                Share & Export Workstation
              </h2>
              <p className="text-xs text-secondary">
                1-Click Live Preview • Offline Manifest Export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Live Preview Link */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary font-mono uppercase tracking-wider block">
              Shareable Live Applet Link
            </label>
            <div className="flex items-center gap-2 bg-inset p-2 rounded-xl border border-subtle">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="bg-transparent border-none text-xs text-secondary font-mono flex-1 outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan text-canvas font-bold text-xs hover:opacity-90 transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-secondary">
              Share this URL to test the app in any browser or mobile phone with instant full functionality.
            </p>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary font-mono uppercase tracking-wider block">
              Offline Manifest & Tax Data Exports
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportCsv}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs font-bold text-primary transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-brand-emerald" />
                <span>Export CSV Route</span>
              </button>
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs font-bold text-primary transition-colors"
              >
                <Download className="w-4 h-4 text-brand-cyan" />
                <span>Export JSON Vault</span>
              </button>
            </div>
          </div>

          {/* Sync & Vault Status */}
          <div className="p-3.5 rounded-xl bg-inset border border-brand-emerald/30 text-xs text-brand-emerald flex items-center gap-2.5 font-mono">
            <Shield className="w-4 h-4 shrink-0" />
            <span>IndexedDB Vault active • All data persists locally when offline.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle bg-inset flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-subtle hover:opacity-90 text-primary text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
