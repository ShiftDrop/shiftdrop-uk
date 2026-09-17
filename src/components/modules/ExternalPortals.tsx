import React, { useState } from 'react';
import {
  Globe,
  Zap,
  ArrowRight,
  ShieldCheck,
  Box,
  TrendingUp,
  Smartphone,
  CheckCircle2,
  Mail,
  Code,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { triggerHapticFeedback } from '../../services/telemetry';

interface ExternalPortalsProps {
  initialPortal?: 'landing' | 'studio';
  onReturnToApp: () => void;
}

export const ExternalPortals: React.FC<ExternalPortalsProps> = ({
  initialPortal = 'landing',
  onReturnToApp,
}) => {
  const [activePortal, setActivePortal] = useState<'landing' | 'studio'>(initialPortal);

  return (
    <div id="module-external-portals" className="max-w-6xl mx-auto p-3 sm:p-5 space-y-6">
      {/* Portal Switcher Bar */}
      <div className="bg-surface border border-subtle rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            id="btn-portal-tab-landing"
            onClick={() => {
              setActivePortal('landing');
              triggerHapticFeedback('light');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              activePortal === 'landing'
                ? 'bg-brand-cyan text-canvas shadow-md'
                : 'bg-inset text-secondary hover:text-primary border border-subtle'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>ShiftDrop.co.uk (Product Landing)</span>
          </button>

          <button
            id="btn-portal-tab-studio"
            onClick={() => {
              setActivePortal('studio');
              triggerHapticFeedback('light');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              activePortal === 'studio'
                ? 'bg-brand-emerald text-canvas shadow-md'
                : 'bg-inset text-secondary hover:text-primary border border-subtle'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>PixelNotchStudio.com (Agency Portfolio)</span>
          </button>
        </div>

        <button
          onClick={onReturnToApp}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs font-bold text-brand-cyan transition-colors"
        >
          <span>Return to In-Cab HUD</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* PORTAL 1: ShiftDrop.co.uk */}
      {activePortal === 'landing' && (
        <div className="space-y-6 animate-fade-in">
          {/* Hero Section */}
          <div className="bg-surface border border-subtle rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center sm:text-left">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-xs font-mono font-bold">
                <Truck className="w-3.5 h-3.5" />
                <span>ShiftDrop UK • Ultimate Courier Workstation</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-primary font-mono tracking-tight leading-tight">
                Deliver Faster. Claim Every Mile. Never Lose a Parcel.
              </h1>
              <p className="text-sm sm:text-base text-secondary leading-relaxed">
                The all-in-one cross-platform cockpit built exclusively for UK couriers on Amazon Flex, DPD, Evri, and Stuart. Features smart reverse-order van load-in, live HMRC 45p/25p AMAP tax deductions, and automated road telemetry.
              </p>

              {/* App Store Download Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-4">
                <button
                  onClick={onReturnToApp}
                  className="px-6 py-3 rounded-2xl bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas font-black text-sm shadow-xl shadow-cyan-500/20 hover:opacity-95 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Launch Web & In-Cab App</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 rounded-2xl bg-inset border border-subtle text-left">
                    <span className="text-[9px] uppercase tracking-wider text-secondary block">
                      Download on
                    </span>
                    <span className="text-xs font-bold text-primary font-mono flex items-center gap-1">
                      Apple App Store
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-inset border border-subtle text-left">
                    <span className="text-[9px] uppercase tracking-wider text-secondary block">
                      Get it on
                    </span>
                    <span className="text-xs font-bold text-primary font-mono flex items-center gap-1">
                      Google Play Store
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-surface border border-subtle space-y-3">
              <div className="p-3 bg-inset rounded-xl border border-brand-cyan/30 text-brand-cyan w-fit">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-primary font-mono">
                LIFO Spatial Van Load-In
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Reverse-order loading algorithms ensure Stop #1 is right at your rear barn doors, while final drops sit against the front bulkhead. Cut stop retrieval times by 65%.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-subtle space-y-3">
              <div className="p-3 bg-inset rounded-xl border border-brand-emerald/30 text-brand-emerald w-fit">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-primary font-mono">
                HMRC AMAP 45p/25p Shield
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Automatic GPS audit trail calculation for HMRC Simplified Mileage Scheme. Export 1-tap compliant CSVs directly into QuickBooks, Sage, and FreeAgent.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-subtle space-y-3">
              <div className="p-3 bg-inset rounded-xl border border-amber-500/30 text-amber-400 w-fit">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-primary font-mono">
                Pay Radar & PCN Guardian
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Live UK courier benchmark comparisons, 20-minute commercial loading bay countdown timers, and CAZ/ULEZ Euro 6 compliance verifiers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL 2: PixelNotchStudio.com */}
      {activePortal === 'studio' && (
        <div className="space-y-6 animate-fade-in">
          {/* Studio Hero */}
          <div className="bg-surface border border-subtle rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-emerald/15 border border-brand-emerald/30 text-brand-emerald text-xs font-mono font-bold">
              <Code className="w-3.5 h-3.5" />
              <span>PixelNotch Studio • Cross-Platform Engineering</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-primary font-mono tracking-tight">
              High-Performance Cross-Platform & Logistics Architecture
            </h1>
            <p className="text-sm text-secondary max-w-2xl leading-relaxed">
              PixelNotch Studio crafts specialized industrial, automotive, and logistics software for mobile (Capacitor/React Native) and modern web. We architect resilient offline-first systems, telemetry engines, and enterprise SaaS.
            </p>

            {/* Contact Box */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <a
                href="mailto:support@pixelnotchstudio.com"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-emerald hover:opacity-90 text-canvas font-black text-xs shadow-lg transition-all active:scale-95"
              >
                <Mail className="w-4 h-4 font-bold" />
                <span>support@pixelnotchstudio.com</span>
              </a>

              <span className="text-xs text-secondary font-mono">
                Manchester & London • United Kingdom
              </span>
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
            <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-2">
              <span className="font-mono text-brand-cyan font-bold block text-sm">
                01. Capacitor & Native
              </span>
              <p className="text-secondary">
                Single codebase deployment across iOS, Android, macOS, and responsive web with native hardware haptics and geolocation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-2">
              <span className="font-mono text-brand-emerald font-bold block text-sm">
                02. Offline-First Vaults
              </span>
              <p className="text-secondary">
                Resilient local IndexedDB/Dexie architecture synchronising seamlessly with PostgreSQL Supabase Row-Level Security backends.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-2">
              <span className="font-mono text-cyan-400 font-bold block text-sm">
                03. In-Cab Telemetry
              </span>
              <p className="text-secondary">
                Zero-latency Open-Meteo weather integration, Web Speech voice synthesis, and GPS speedometer calculations.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-2">
              <span className="font-mono text-amber-400 font-bold block text-sm">
                04. UK Domain Engines
              </span>
              <p className="text-secondary">
                HMRC AMAP tax computation, CAZ/ULEZ emission validation, and UK postcode geocoding services.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
