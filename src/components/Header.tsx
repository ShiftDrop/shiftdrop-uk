import React, { useState, useEffect } from 'react';
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
  WifiOff,
} from 'lucide-react';
import { Network, ConnectionStatus } from '@capacitor/network';
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
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const isFreezing = weather ? weather.isFrostWarning || weather.temperature <= 3 : false;

  useEffect(() => {
    Network.getStatus()
      .then((status: ConnectionStatus) => setIsOnline(status.connected))
      .catch(() => setIsOnline(true));

    const listenerPromise = Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      setIsOnline(status.connected);
    });

    return () => {
      listenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, []);

  return (
    <header
      id="top-telemetry-header"
      className="sticky top-0 z-30 h-14 sm:h-16 border-b border-subtle bg-surface/95 backdrop-blur-md px-2 sm:px-6 flex items-center justify-between shadow-lg transition-colors font-sans max-w-full overflow-hidden"
    >
      {/* Left: Hamburger, Brand, Driver Initials Pill, & CAZ/ULEZ Badge */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="p-1.5 -ml-1 rounded-lg text-secondary hover:text-primary hover:bg-subtle transition-colors lg:hidden cursor-pointer shrink-0"
            aria-label="Open Sidebar Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          className="flex items-center cursor-pointer select-none text-left bg-transparent border-0 p-0 min-w-0"
          onClick={() => onOpenPortal(null)}
          title="Return to In-Cab Workstation"
        >
          <h1 className="text-sm sm:text-xl font-bold tracking-tight text-brand-cyan font-mono truncate">
            ShiftDrop
          </h1>
        </button>

        {/* Initials Pill Badge */}
        {userProfile && (
          <div 
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan cursor-pointer hover:bg-brand-cyan/25 transition-all shadow-xs shrink-0"
            title={`Signed in as ${userProfile.fullName || userProfile.email}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-mono font-black tracking-wider uppercase truncate">
              {getInitials(userProfile.fullName, userProfile.email)}
            </span>
          </div>
        )}

        <span
          id="caz-compliance-badge"
          className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 bg-brand-emerald/15 text-brand-emerald text-[11px] font-bold rounded border border-brand-emerald shrink-0"
          title="Euro 6 UK CAZ / London ULEZ Compliant"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ULEZ</span>
        </span>
      </div>

      {/* Middle/Right: Telemetry, Offline Badge, Glowing Voice Pill & Quick Actions */}
      <div className="flex items-center gap-1 sm:gap-3 min-w-0 shrink">
        <PWAInstallButton compact />

        {/* Offline Badge Notification */}
        {!isOnline && (
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold animate-pulse select-none shrink-0"
            title="Offline Mode: All parcel drops & mileage logs are saved safely to local storage"
          >
            <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden md:inline">Offline (Local Vault)</span>
            <span className="md:hidden">Offline</span>
          </div>
        )}

        {/* Live Weather / Temp Telemetry */}
        <div className="hidden sm:flex items-center gap-2 bg-inset px-2.5 py-1.5 rounded-xl border border-subtle font-mono text-xs shrink-0">
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
        <div className="hidden xl:flex items-center gap-1 bg-inset p-1 rounded-lg border border-subtle shrink-0">
          <button
            id="btn-portal-landing"
            onClick={() => onOpenPortal(activePortal === 'landing' ? null : 'landing')}
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
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
            className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              activePortal === 'studio'
                ? 'bg-brand-emerald text-canvas font-bold'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>PixelNotch Studio</span>
          </button>
        </div>

        {/* High-Visibility In-Cab Voice Pill Button */}
        {onToggleVoice && (
          <button
            id="btn-header-voice"
            type="button"
            onClick={onToggleVoice}
            className={`h-8 sm:h-10 px-2.5 sm:px-3.5 rounded-full border-2 transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-md touch-manipulation shrink-0 ${
              isVoiceActive
                ? 'bg-brand-emerald text-canvas border-emerald-300 shadow-emerald-500/40 animate-pulse'
                : 'bg-brand-cyan/15 text-brand-cyan hover:bg-brand-cyan/25 border-brand-cyan shadow-cyan-500/20'
            }`}
            aria-label="Hands-Free UK Voice Assistant"
            title="Hands-Free UK Voice Assistant"
          >
            <Mic className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isVoiceActive ? 'animate-bounce' : 'text-brand-cyan'}`} />
            <span className="text-[11px] sm:text-xs font-mono font-black tracking-wider uppercase whitespace-nowrap">
              {isVoiceActive ? 'Listening...' : 'Voice'}
            </span>
          </button>
        )}

        {/* Driver Profile Badge */}
        <button
          type="button"
          id="btn-header-auth-profile"
          onClick={onOpenAuth}
          className="flex items-center gap-2 cursor-pointer select-none group bg-transparent border-0 p-0 text-left shrink-0"
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
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-subtle border border-brand-cyan flex items-center justify-center text-xs font-bold text-primary shadow-md overflow-hidden shrink-0">
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

        {/* Share Workstation Action */}
        {onOpenShare && (
          <button
            id="btn-header-share"
            onClick={onOpenShare}
            className="p-1.5 sm:p-2 rounded-xl bg-inset text-secondary hover:text-brand-cyan hover:bg-subtle border border-subtle transition-colors active:scale-95 cursor-pointer shrink-0 hidden sm:block"
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
          className="p-1.5 sm:p-2 rounded-xl bg-inset text-secondary hover:text-brand-cyan hover:bg-subtle border border-subtle transition-colors active:scale-95 cursor-pointer shrink-0"
          aria-label="Toggle Theme"
          title="Toggle Light/Dark Mode"
        >
          {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Quick Settings Action */}
        <button
          id="btn-header-settings"
          onClick={onOpenSettings}
          className="p-1.5 sm:p-2 rounded-xl bg-inset text-secondary hover:text-brand-cyan hover:bg-subtle border border-subtle transition-colors active:scale-95 cursor-pointer shrink-0"
          aria-label="Driver Settings Modal"
          title="Driver Settings & Cloud Storage"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};