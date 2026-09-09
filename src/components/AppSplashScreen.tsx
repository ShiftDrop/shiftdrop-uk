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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0D13] transition-opacity duration-400 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient radial glow */}
      <div className="absolute w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center px-6">
        {/* Animated Courier Silhouette Icon */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 mb-6 animate-pulse">
          <div className="absolute inset-0 rounded-3xl bg-cyan-500/20 blur-xl" />
          <img
            src="/icon.png"
            alt="ShiftDrop Pro Logo"
            className="w-full h-full object-contain drop-shadow-[0_0_24px_rgba(6,182,212,0.6)]"
          />
        </div>

        {/* Brand Title */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono flex items-center gap-2">
          ShiftDrop <span className="text-brand-cyan">PRO</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-sans tracking-wide mt-1">
          UK HMRC In-Cab Courier Workstation
        </p>

        {/* Loading / Ready Indicator */}
        <div className="mt-8 flex items-center gap-2 text-[11px] font-mono text-brand-cyan/80">
          <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
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