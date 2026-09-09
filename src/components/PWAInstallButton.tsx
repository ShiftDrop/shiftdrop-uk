import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA on device, hide button
  if (isInstalled) {
    return null;
  }

  // Android / Chromium / Desktop PWA Install flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install-app"
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-brand-cyan text-canvas font-bold text-xs hover:opacity-90 transition-all active:scale-95 shadow-md ${
          compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'
        }`}
        title="Install ShiftDrop as a native App on your device"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit doesn't trigger beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl bg-inset text-slate-200 hover:text-primary border border-subtle font-medium text-xs hover:bg-subtle transition-all active:scale-95 ${
            compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'
          }`}
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
          <span>Add to iOS Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-surface border border-subtle p-5 shadow-2xl space-y-4 font-sans text-left">
              <div className="flex items-center justify-between border-b border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-brand-cyan" />
                  <h3 className="text-sm font-bold text-primary font-mono">
                    Install on iPhone / iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-subtle"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-secondary leading-relaxed">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-inset border border-subtle">
                  <span className="w-5 h-5 rounded-full bg-brand-cyan text-canvas font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <div>
                    Tap the <strong className="text-primary">Share</strong> icon{' '}
                    <Share className="w-3.5 h-3.5 inline text-brand-cyan mx-1" /> in the bottom Safari toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-inset border border-subtle">
                  <span className="w-5 h-5 rounded-full bg-brand-emerald text-canvas font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <div>
                    Scroll down and tap{' '}
                    <strong className="text-primary">"Add to Home Screen"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-inset border border-subtle">
                  <span className="w-5 h-5 rounded-full bg-cyan-400 text-canvas font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <div>
                    Launch <strong className="text-primary">ShiftDrop</strong> in full-screen standalone mode with offline storage.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-brand-cyan text-canvas font-bold text-xs hover:opacity-90 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
