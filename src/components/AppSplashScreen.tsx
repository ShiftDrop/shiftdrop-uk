import React, { useEffect, useState } from 'react';

interface AppSplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  isPreview?: boolean;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onComplete,
  duration = 1600,
  isPreview = false,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, duration - 400);

    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div
      id="app-splash-screen"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-400 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle ambient cyan glow matching the branding */}
      <div className="absolute w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center px-6">
        {/* Central Brand Emblem */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-4">
          <img
            src="/icon.png"
            alt="ShiftDrop Logo"
            className="w-full h-full object-contain drop-shadow-[0_0_28px_rgba(6,182,212,0.45)]"
          />
        </div>

        <p className="text-xs sm:text-sm text-slate-400 font-sans tracking-wide">
          UK HMRC In-Cab Courier Workstation
        </p>

        {/* Loading / Ready Indicator */}
        <div className="mt-8 flex items-center gap-2 text-[11px] font-mono text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{isPreview ? 'Splash Screen Preview' : 'Initialising Cab HUD & Telemetry...'}</span>
        </div>
      </div>

      {isPreview && (
        <button
          onClick={onComplete}
          className="absolute top-6 right-6 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors"
        >
          Close Preview
        </button>
      )}
    </div>
  );
};