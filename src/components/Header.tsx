import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  CloudRain,
  ShieldCheck,
  Settings,
  Globe,
  Zap,
  Share2,
  Mic,
} from 'lucide-react';
import { WeatherTelemetry, UserSessionProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSidebar?: () => void;
  weather: WeatherTelemetry | null;
  onOpenSettings: () => void;
  onOpenPortal: (portal: 'landing' | 'studio' | null) => void;
  activePortal: 'landing' | 'studio' | null;
  userProfile: UserSessionProfile | null;
  onOpenAuth: () => void;
  onOpenShare?: () => void;
  onToggleVoice?: () => void;
  isVoiceActive?: boolean;
}

function getInitials(fullName?: string, email?: string): string {
  if (fullName && fullName.trim().length > 0) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
  if (email && email.includes('@')) {
    const namePart = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
    return namePart.substring(0, 2).toUpperCase() || 'SD';
  }
  return 'SD';
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleTheme,
  onOpenSidebar,
  weather,
  onOpenSettings,
  onOpenPortal,
  activePortal,
  userProfile,
  onOpenAuth,
  onOpenShare,
  onToggleVoice,
  isVoiceActive,
}) => {
  const isFreezing = weather ? weather.isFrostWarning || weather.temperature <= 3 : false;

  return (
    <header
      id="top-telemetry-header"
      className="sticky top-0 z-30 h-14 sm:h-16 border-b border-subtle bg-surface/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shadow-lg transition-colors font-sans"
    >
      {/* Left: Hamburger, Brand, Driver Initials Pill, & CAZ/ULEZ Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="p-1.5 -ml-1.5 rounded-lg text-secondary hover:text-primary hover:bg-subtle transition-colors lg:hidden"
            aria-label="Open Sidebar Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-2 cursor-pointer select-none text-left bg-transparent border-0 p-0"
          onClick={() => onOpenPortal(null)}
          title="Return to In-Cab Workstation"
        >
          <div className="w-8 h-8 rounded-lg bg-black border border-brand-cyan/40 p-1 flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
            <img
              src="/icon.png"
              alt="ShiftDrop Courier Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-brand-cyan font-mono whitespace-nowrap">
            ShiftDrop
          </h1>
        </button>

        {/* Initials Pill Badge directly next to ShiftDrop */}
        {userProfile && (
          <div 
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan cursor-pointer hover:bg-brand-cyan/25 transition-all shadow-xs"
            title={`Signed in as ${userProfile.fullName || userProfile.email}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse shrink-0" />
            <span className="text-[11px] font-mono font-black tracking-wider uppercase">
              {getInitials(userProfile.fullName, userProfile.email)}
            </span>
          </div>
        )}

        <span
          id="caz-compliance-badge"
          className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 bg-brand-emerald/15 text-brand-emerald text-[11px] font-bold rounded border border-brand-emerald"
          title="Euro 6 UK CAZ / London ULEZ Compliant"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ULEZ</span>
        </span>
      </div>

      {/* Middle/Right: GPS, Weather Telemetry, Driver Profile & Settings */}
      <div className="flex items-center gap-1.5 sm:gap-4">
        <PWAInstallButton compact />

        {/* Live Weather / Temp Telemetry */}
        <div className="hidden sm:flex items-center gap-2 bg-inset px-2.5 py-1.5 rounded-xl border border-subtle font-mono text-xs">
          <div className="flex items-center gap-1.5 text-brand-cyan">
            <CloudRain className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-primary">
              {weather ? `${weather.temperature}°C` : '--°C'}
            </span>
            {isFreezing && (
              <span className="text-[9px] bg-red-900/40 text-red-400 px-1 rounded animate-pulse font-bold">
                ICE
              </span>
            )}
          </div>
        </div>

        {/* External Portals Switcher */}
        <div className="hidden xl:flex items-center gap-1 bg-inset p-1 rounded-lg border border-subtle">
          <button
            id="btn-portal-landing"
            onClick={() => onOpenPortal(activePortal === 'landing' ? null : 'landing')}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
              activePortal === 'landing'
                ? 'bg-brand-cyan text-canvas font-bold'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>ShiftDrop.co.uk</span>
          </button>
          <button
            id="btn-portal-studio"
            onClick={() => onOpenPortal(activePortal === 'studio' ? null : 'studio')}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
              activePortal === 'studio'
                ? 'bg-brand-emerald text-canvas font-bold'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>PixelNotch Studio</span>
          </button>
        </div>

        {/* Driver Profile Badge */}
        <button
          type="button"
          id="btn-header-auth-profile"
          onClick={onOpenAuth}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group bg-transparent border-0 p-0 text-left"
          title="Courier ID & Account Profile"
        >
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-primary group-hover:text-brand-cyan transition-colors">
              {userProfile?.fullName || 'Courier Driver'}
            </p>
            <p className="text-[10px] text-secondary font-mono">
              ID: {userProfile ? userProfile.id.slice(0, 8).toUpperCase() : 'OFFLINE'}
            </p>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-subtle border border-brand-cyan flex items-center justify-center text-xs font-bold text-primary shadow-md overflow-hidden">
            {userProfile?.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              getInitials(userProfile?.fullName, userProfile?.email)
            )}
          </div>
        </button>

        {/* Hands-Free UK Voice Assistant Button */}
        {onToggleVoice && (
          <button
            id="btn-header-voice"
            onClick={onToggleVoice}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 ${
              isVoiceActive
                ? 'bg-brand-cyan text-canvas border-white shadow-lg shadow-cyan-500/30 animate-pulse'
                : 'bg-inset text-brand-cyan hover:text-primary hover:bg-subtle border-brand-cyan/40'
            }`}
            aria-label="Hands-Free UK Voice Assistant"
            title="UK Hands-Free Voice Assistant (Earnings, Route, Drops)"
          >
            <Mic className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline text-xs font-mono font-bold">
              {isVoiceActive ? 'Listening...' : 'Voice'}
            </span>
          </button>
        )}

        {/* Share Workstation Action */}
        {onOpenShare && (
          <button
            id="btn-header-share"
            onClick={onOpenShare}
            className="p-1.5 sm:p-2 rounded-xl bg-inset text-secondary hover:text-brand-cyan hover:bg-subtle border border-subtle transition-colors active:scale-95"
            aria-label="Share & Export Workstation"
            title="1-Click Share & Export"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          id="btn-header-theme"
          onClick={onToggleTheme}
          className="p-1.5 sm:p-2 rounded-xl bg-inset text-secondary hover:text-brand-cyan hover:bg-subtle border border-subtle transition-colors active:scale-95"
          aria-label="Toggle Theme"
          title="Toggle Light/Dark Mode"
        >
          {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Quick Settings Action */}
        <button
          id="btn-header-settings"
          onClick={onOpenSettings}
          className="p-1.5 sm:p-2 rounded-xl bg-inset text-secondary hover:text-brand-cyan hover:bg-subtle border border-subtle transition-colors active:scale-95"
          aria-label="Driver Settings Modal"
          title="Driver Settings & Cloud Storage"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};