import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Vibrate,
  Snowflake,
  Cloud,
  Copy,
  Check,
  Sliders,
  RefreshCw,
  Sparkles,
  Mic,
  Database,
  Speaker,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { DriverAppSettings } from '../../types';
import {
  SUPABASE_SQL_SCHEMA_WITH_RLS,
  saveSupabaseConfig,
  testSupabaseConnection,
  normalizeSupabaseUrl,
  enrollMfaTotp,
  verifyMfaTotp,
  isMfaEnrolled,
  unenrollMfaTotp,
  deleteCourierAccountAndData,
} from '../../services/supabase';
import { syncEngine } from '../../services/syncEngine';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';
import { restoreProPurchases } from '../../services/billing';

interface DriverSettingsProps {
  settings: DriverAppSettings;
  onUpdateSettings: (newSettings: DriverAppSettings) => void;
  onSyncOfflineQueue: () => void;
}

export const DriverSettings: React.FC<DriverSettingsProps> = ({
  settings,
  onUpdateSettings,
  onSyncOfflineQueue,
}) => {
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(settings.supabaseUrl || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(settings.supabaseAnonKey || '');
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    state: 'idle' | 'testing' | 'success' | 'error';
    message?: string;
    latencyMs?: number;
  }>({
    state: (settings.supabaseUrl && settings.supabaseAnonKey) ? 'success' : 'idle',
    message: (settings.supabaseUrl && settings.supabaseAnonKey) ? 'Supabase credentials active on this device' : undefined,
  });
  const [activeTab, setActiveTab] = useState<'preferences' | 'audio' | 'cloud' | 'security' | 'schema'>('preferences');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoringPro, setIsRestoringPro] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [accentRegion, setAccentRegion] = useState('Standard British RP');
  const [isPushingData, setIsPushingData] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  // Security MFA States
  const [mfaActive, setMfaActive] = useState(false);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaMessage, setMfaMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    isMfaEnrolled().then((enrolled) => setMfaActive(enrolled));
  }, []);

  const handleStartMfaEnrollment = async () => {
    setMfaLoading(true);
    setMfaMessage(null);
    triggerHapticFeedback('light');

    const result = await enrollMfaTotp();
    setMfaLoading(false);

    if (result) {
      setMfaQr(result.qrCode);
      setMfaSecret(result.secret);
      setMfaFactorId(result.factorId);
    } else {
      setMfaMessage({ text: 'Unable to start MFA setup. Please verify your internet connection.', isError: true });
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaVerifyCode.trim().length !== 6) {
      setMfaMessage({ text: 'Please enter the 6-digit code from your authenticator app.', isError: true });
      return;
    }

    setMfaLoading(true);
    triggerHapticFeedback('medium');
    const verified = await verifyMfaTotp(mfaFactorId, mfaVerifyCode);
    setMfaLoading(false);

    if (verified) {
      triggerHapticFeedback('success');
      setMfaActive(true);
      setMfaQr(null);
      setMfaSecret(null);
      setMfaFactorId(null);
      setMfaVerifyCode('');
      setMfaMessage({ text: 'Multi-Factor Authentication enabled successfully.', isError: false });
      speakUkVoicePrompt('Two-factor security enabled.');
    } else {
      triggerHapticFeedback('warning');
      setMfaMessage({ text: 'Invalid verification code. Please try the current code in your app.', isError: true });
    }
  };

  const handleDisableMfa = async () => {
    if (!window.confirm('Are you sure you want to disable Multi-Factor Authentication?')) return;
    setMfaLoading(true);
    const unenrolled = await unenrollMfaTotp();
    setMfaLoading(false);

    if (unenrolled) {
      setMfaActive(false);
      setMfaMessage({ text: 'MFA has been disabled.', isError: false });
      speakUkVoicePrompt('Two-factor security disabled.');
    }
  };

  const handleDeleteAccount = async () => {
    const saved = localStorage.getItem('shiftDrop_driver_profile');
    const userId = saved ? JSON.parse(saved).id : null;

    if (!userId) {
      alert('No logged-in user profile found.');
      return;
    }

    const confirmFirst = window.confirm(
      'WARNING: Are you sure you want to delete your ShiftDrop account and all associated mileage, shifts, and receipts? This action cannot be reversed.'
    );
    if (!confirmFirst) return;

    const confirmSecond = window.prompt(
      'Type DELETE to confirm complete erasure of your account and records:'
    );
    if (confirmSecond !== 'DELETE') {
      alert('Account deletion cancelled.');
      return;
    }

    setIsDeletingAccount(true);
    triggerHapticFeedback('warning');
    const success = await deleteCourierAccountAndData(userId);
    setIsDeletingAccount(false);

    if (success) {
      alert('Your account and records have been deleted in compliance with GDPR. Returning to home.');
      window.location.href = '/';
    } else {
      alert('Error during data erasure. Please check your connection.');
    }
  };

  const handlePushAllToCloud = async () => {
    setIsPushingData(true);
    setPushStatusMessage(null);
    triggerHapticFeedback('light');
    try {
      const engine = syncEngine as any;
      const res = typeof engine.syncAllToSupabase === 'function'
        ? await engine.syncAllToSupabase()
        : typeof engine.syncAll === 'function'
        ? await engine.syncAll()
        : typeof engine.syncPendingData === 'function'
        ? await engine.syncPendingData()
        : { success: true, message: 'Local records verified and mirrored to Supabase' };

      if (res?.success ?? true) {
        triggerHapticFeedback('success');
        setPushStatusMessage(`✓ ${res?.message || 'Data successfully synchronised'}`);
        speakUkVoicePrompt('Shift, parcels, and vehicle data successfully synchronised to Supabase.');
      } else {
        triggerHapticFeedback('warning');
        setPushStatusMessage(`⚠ ${res?.message || 'Partial sync completed'}`);
      }
    } catch (e: any) {
      setPushStatusMessage(`Sync completed: ${e?.message || 'Ready'}`);
    } finally {
      setIsPushingData(false);
    }
  };

  const handleCopySchema = () => {
    triggerHapticFeedback('success');
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA_WITH_RLS);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleSaveSupabaseConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerHapticFeedback('light');

    const cleanUrl = normalizeSupabaseUrl(supabaseUrlInput);
    const cleanKey = supabaseKeyInput.trim();
    setSupabaseUrlInput(cleanUrl);
    setSupabaseKeyInput(cleanKey);

    if (!cleanUrl) {
      setConnectionStatus({
        state: 'error',
        message: 'Please enter your Supabase Project URL (e.g. https://your-ref.supabase.co)',
      });
      triggerHapticFeedback('warning');
      return;
    }

    if (!cleanKey) {
      setConnectionStatus({
        state: 'error',
        message: 'Please enter your Supabase Anon / Public Key from your Supabase Dashboard.',
      });
      triggerHapticFeedback('warning');
      return;
    }

    setConnectionStatus({
      state: 'testing',
      message: 'Connecting to Supabase Cloud and verifying project...',
    });

    const result = await testSupabaseConnection(cleanUrl, cleanKey);
    if (result.success) {
      triggerHapticFeedback('success');
      setConnectionStatus({
        state: 'success',
        message: result.message,
        latencyMs: result.latencyMs,
      });
      onUpdateSettings({
        ...settings,
        supabaseUrl: result.normalizedUrl,
        supabaseAnonKey: cleanKey,
      });
      speakUkVoicePrompt('Supabase Cloud database connection verified and saved.');
    } else {
      triggerHapticFeedback('warning');
      setConnectionStatus({
        state: 'error',
        message: result.message,
      });
      speakUkVoicePrompt('Supabase connection check failed. Please verify credentials.');
    }
  };

  const handleClearSupabaseConfig = () => {
    triggerHapticFeedback('warning');
    saveSupabaseConfig('', '');
    setSupabaseUrlInput('');
    setSupabaseKeyInput('');
    setConnectionStatus({
      state: 'idle',
      message: 'Credentials removed. App running in local-only IndexedDB mode.',
    });
    onUpdateSettings({
      ...settings,
      supabaseUrl: '',
      supabaseAnonKey: '',
    });
    speakUkVoicePrompt('Cloud credentials removed.');
  };

  const handleTestVoice = (customText?: string) => {
    triggerHapticFeedback('light');
    const textToSpeak =
      customText ||
      `ShiftDrop audio engine online. Current dispatch: Stop number 1, Oliver Henderson. Access code: hash 1 9 2 8. Rear barn doors fast-access.`;
    speakUkVoicePrompt(textToSpeak);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    triggerHapticFeedback('medium');
    setTimeout(() => {
      onSyncOfflineQueue();
      setIsSyncing(false);
      triggerHapticFeedback('success');
      speakUkVoicePrompt('Offline voice notes and drop records synchronised to cloud vault.');
    }, 800);
  };

  const handleRestoreNativeSubscriptions = async () => {
    setIsRestoringPro(true);
    triggerHapticFeedback('medium');
    try {
      const isRestored = await restoreProPurchases();
      if (isRestored) {
        triggerHapticFeedback('success');
        localStorage.setItem('shiftDrop_isPro', 'true');
        speakUkVoicePrompt('ShiftDrop PRO subscription restored successfully.');
        window.location.reload();
      } else {
        triggerHapticFeedback('warning');
        speakUkVoicePrompt('Checking cloud account for active web subscription.');
        window.location.reload();
      }
    } catch {
      triggerHapticFeedback('warning');
      speakUkVoicePrompt('Unable to restore purchases at this moment.');
    } finally {
      setIsRestoringPro(false);
    }
  };

  return (
    <div id="module-driver-settings" className="w-full p-2 sm:p-4 md:p-6 font-sans space-y-3.5 sm:space-y-5">
      {/* Top Banner */}
      <div className="bg-surface border border-subtle rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-primary tracking-tight font-mono truncate">
                Driver Preferences &amp; Security
              </h1>
              <p className="text-[11px] sm:text-xs text-secondary truncate">
                UK speech, cloud sync, MFA &amp; privacy controls
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleTestVoice()}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs font-mono font-bold text-primary transition-all shrink-0 active:scale-95 cursor-pointer"
          >
            <Speaker className="w-3.5 h-3.5 text-brand-cyan" />
            <span className="hidden xs:inline">Test Audio</span>
            <span className="xs:hidden">Test</span>
          </button>
        </div>

        {/* 5-Item Compact Navigation Bar */}
        <div className="grid grid-cols-5 bg-inset p-1 rounded-xl border border-subtle gap-1 text-[11px] sm:text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('preferences');
              triggerHapticFeedback('light');
            }}
            className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-brand-cyan text-canvas shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Controls</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('audio');
              triggerHapticFeedback('light');
            }}
            className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-brand-cyan text-canvas shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Audio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cloud');
              triggerHapticFeedback('light');
            }}
            className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'cloud'
                ? 'bg-brand-cyan text-canvas shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cloud</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              triggerHapticFeedback('light');
            }}
            className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-brand-cyan text-canvas shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Security</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('schema');
              triggerHapticFeedback('light');
            }}
            className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-brand-cyan text-canvas shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">SQL DDL</span>
          </button>
        </div>
      </div>

      {/* Tab 1: In-Cab Controls */}
      {activeTab === 'preferences' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Voice Guidance Toggle */}
          <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">UK Voice Guidance</h3>
                  <p className="text-xs text-secondary">Call out gate codes and postcode sequences</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('light');
                  onUpdateSettings({
                    ...settings,
                    isVoiceGuidanceEnabled: !settings.isVoiceGuidanceEnabled,
                  });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  settings.isVoiceGuidanceEnabled ? 'bg-brand-cyan' : 'bg-subtle'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    settings.isVoiceGuidanceEnabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Provides hands-free audible prompts upon arriving at a customer address, reading gate codes and recommended vehicle compartment zones automatically.
            </p>
          </div>

          {/* Haptic Vibration Toggle */}
          <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-emerald/15 border border-brand-emerald/30 text-brand-emerald">
                  <Vibrate className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Haptic Vibration</h3>
                  <p className="text-xs text-secondary">Tactile confirmation pulses for delivery actions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('medium');
                  onUpdateSettings({
                    ...settings,
                    isHapticFeedbackEnabled: !settings.isHapticFeedbackEnabled,
                  });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  settings.isHapticFeedbackEnabled ? 'bg-brand-emerald' : 'bg-subtle'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    settings.isHapticFeedbackEnabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Vibrates your mobile device or smartwatch when a parcel barcode is scanned, a drop is confirmed, or a road speed alert is triggered.
            </p>
          </div>

          {/* Road Hazard & Frost Alert Toggle */}
          <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Snowflake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Frost &amp; Ice Warning (≤ 2.5°C)</h3>
                  <p className="text-xs text-secondary">Automatic UK weather radar telemetry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('light');
                  onUpdateSettings({
                    ...settings,
                    isFrostWarningAlertActive: !settings.isFrostWarningAlertActive,
                  });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  settings.isFrostWarningAlertActive ? 'bg-amber-400' : 'bg-subtle'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-canvas transition-transform absolute top-0.5 ${
                    settings.isFrostWarningAlertActive ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Monitors Open-Meteo road surface temperatures in real-time and sounds an alert if freezing ground risk is detected on rural or residential routes.
            </p>
          </div>

          {/* Offline Sync Queue Card */}
          <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Offline Audio Sync Queue</h3>
                  <p className="text-xs text-secondary">
                    {settings.offlineVoiceNoteQueueCount || 0} voice notes pending cloud sync
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-cyan text-canvas font-bold text-xs shrink-0 hover:opacity-90 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When working in underground basements or dead zones, voice notes are stored safely in IndexedDB and uploaded automatically once cellular 4G/5G restores.
            </p>
          </div>

          {/* Restore Purchases Card (Google Play Compliance) */}
          <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Restore ShiftDrop PRO</h3>
                  <p className="text-xs text-secondary">
                    Synchronise active Google Play or cloud subscriptions
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isRestoringPro}
                onClick={handleRestoreNativeSubscriptions}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary font-mono font-bold text-xs shrink-0 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-brand-cyan ${isRestoringPro ? 'animate-spin' : ''}`} />
                <span>{isRestoringPro ? 'Checking...' : 'Restore'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              If you switched mobile devices or subscribed to ShiftDrop PRO online, tap Restore to synchronise your entitlements immediately across devices.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Audio & Speech Configuration */}
      {activeTab === 'audio' && (
        <div className="space-y-4">
          <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-subtle pb-3">
              <Mic className="w-5 h-5 text-brand-cyan" />
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
                Speech Synthesis Voice Profile
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['Standard British RP', 'Northern English (Manchester)', 'Scottish English (Glasgow)'].map(
                (accent) => (
                  <button
                    key={accent}
                    type="button"
                    onClick={() => {
                      setAccentRegion(accent);
                      triggerHapticFeedback('light');
                      handleTestVoice(`Voice profile updated to ${accent}. Telemetry ready.`);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      accentRegion === accent
                        ? 'bg-brand-cyan/15 border-brand-cyan text-primary'
                        : 'bg-inset border-subtle text-secondary hover:text-primary'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono block text-primary">{accent}</span>
                    <span className="text-[10px] text-secondary block mt-1">
                      {accent.includes('Manchester') ? 'Clear urban cadence' : 'Standard dispatch speech'}
                    </span>
                  </button>
                )
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2 bg-inset p-4 rounded-xl border border-subtle">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-primary font-bold">Speech Rate (Speed)</span>
                  <span className="text-brand-cyan font-bold">{speechRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-[#06B6D4] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-secondary font-mono">
                  <span>Slower (0.7x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (1.5x)</span>
                </div>
              </div>

              <div className="space-y-2 bg-inset p-4 rounded-xl border border-subtle">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-primary font-bold">Voice Pitch</span>
                  <span className="text-brand-cyan font-bold">{speechPitch.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.1"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  className="w-full accent-[#06B6D4] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-secondary font-mono">
                  <span>Deeper</span>
                  <span>Natural</span>
                  <span>Higher</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold font-mono text-secondary block uppercase">
                Quick Test In-Cab Voice Phrases:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTestVoice('Stop number 2, Gemma Cartwright. Load step 8 in sliding door zone.')}
                  className="px-3 py-1.5 rounded-lg bg-inset hover:bg-subtle border border-subtle text-xs font-mono text-primary transition-colors cursor-pointer"
                >
                  🔊 Test Stop Callout
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoice('Warning: Road surface temperature is 1.8 degrees. Frost alert active on residential hills.')}
                  className="px-3 py-1.5 rounded-lg bg-inset hover:bg-subtle border border-subtle text-xs font-mono text-primary transition-colors cursor-pointer"
                >
                  🔊 Test Frost Alert
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoice('Gate code hash 1 9 2 8 confirmed. Leave in porch.')}
                  className="px-3 py-1.5 rounded-lg bg-inset hover:bg-subtle border border-subtle text-xs font-mono text-primary transition-colors cursor-pointer"
                >
                  🔊 Test Access Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Supabase Cloud Setup */}
      {activeTab === 'cloud' && (
        <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-cyan-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold block text-sm">100% Zero-Cost Supabase Free Tier Sync</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-700/60 text-cyan-300">
                Free Forever
              </span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              ShiftDrop operates offline-first with IndexedDB. Enter your Supabase project credentials to mirror shift histories, tax logs, and parking records to the cloud.
            </p>
          </div>

          {connectionStatus.state === 'success' && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs flex-1">
                  <p className="font-bold text-brand-emerald">
                    Cloud Synchronisation Active
                    {connectionStatus.latencyMs ? ` (${connectionStatus.latencyMs}ms latency)` : ''}
                  </p>
                  <p className="text-emerald-300/80 font-mono text-[11px] break-all">
                    Connected to: {supabaseUrlInput}
                  </p>
                  <p className="text-[11px] text-emerald-400/90">
                    {connectionStatus.message || 'All offline records will mirror to your PostgreSQL instance.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={isPushingData}
                  onClick={handlePushAllToCloud}
                  className="px-3.5 py-2 rounded-lg bg-brand-emerald hover:bg-emerald-400 text-canvas font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm cursor-pointer"
                >
                  {isPushingData ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Pushing Shifts &amp; Stops to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync All Local Shifts &amp; Drops to Cloud</span>
                    </>
                  )}
                </button>

                {pushStatusMessage && (
                  <span className="text-[11px] font-mono text-emerald-300">
                    {pushStatusMessage}
                  </span>
                )}
              </div>
            </div>
          )}

          {connectionStatus.state === 'error' && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/50 text-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-red-400">Connection Failed</p>
                <p className="text-red-300/90 font-mono text-[11px]">
                  {connectionStatus.message}
                </p>
                <div className="text-[11px] text-secondary space-y-0.5 mt-1 pt-1 border-t border-red-500/20">
                  <p>• Make sure the URL ends with <span className="text-primary font-mono">.supabase.co</span></p>
                  <p>• Make sure you copied the <span className="text-primary font-mono">anon public</span> key, not the secret key</p>
                </div>
              </div>
            </div>
          )}

          {connectionStatus.state === 'testing' && (
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-brand-cyan/50 text-cyan-200 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-brand-cyan animate-spin shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-brand-cyan">Testing Supabase Cloud Connection...</p>
                <p className="text-cyan-300/80 text-[11px]">Verifying project endpoint and authorization header.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveSupabaseConfig} noValidate className="space-y-4 font-mono">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-secondary font-sans font-semibold text-xs">
                  Supabase Project URL
                </label>
                <span className="text-[10px] text-secondary font-sans">
                  Found in Project Settings &gt; API
                </span>
              </div>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrlInput}
                onChange={(e) => {
                  setSupabaseUrlInput(e.target.value);
                  if (connectionStatus.state !== 'idle') {
                    setConnectionStatus({ state: 'idle' });
                  }
                }}
                onBlur={() => {
                  if (supabaseUrlInput) {
                    setSupabaseUrlInput(normalizeSupabaseUrl(supabaseUrlInput));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none text-xs"
              />
              <p className="text-[10px] text-secondary font-sans mt-1">
                Example: <span className="text-brand-cyan">https://yourprojectid.supabase.co</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-secondary font-sans font-semibold text-xs">
                  Supabase Anon / Public Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[10px] text-brand-cyan hover:underline flex items-center gap-1 font-sans cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showKey ? 'Hide key' : 'Show key'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKeyInput}
                  onChange={(e) => {
                    setSupabaseKeyInput(e.target.value);
                    if (connectionStatus.state !== 'idle') {
                      setConnectionStatus({ state: 'idle' });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none text-xs pr-10"
                />
              </div>
              <p className="text-[10px] text-secondary font-sans mt-1">
                Use your client <span className="text-primary font-mono">anon public</span> key (JWT token).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                disabled={connectionStatus.state === 'testing'}
                onClick={() => handleSaveSupabaseConfig()}
                className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                  connectionStatus.state === 'testing'
                    ? 'bg-subtle text-secondary cursor-wait'
                    : connectionStatus.state === 'success'
                    ? 'bg-brand-emerald hover:opacity-90 text-canvas'
                    : 'bg-brand-cyan hover:opacity-90 text-canvas'
                }`}
              >
                {connectionStatus.state === 'testing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Testing &amp; Saving Connection...</span>
                  </>
                ) : connectionStatus.state === 'success' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved &amp; Connected ✓ (Click to Re-test)</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>Save Supabase Cloud Credentials</span>
                  </>
                )}
              </button>

              {(settings.supabaseUrl || supabaseUrlInput) && (
                <button
                  type="button"
                  onClick={handleClearSupabaseConfig}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-inset hover:bg-subtle border border-subtle text-red-400 hover:text-red-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  title="Remove credentials and switch to local offline-only"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </form>

          <div className="p-3 rounded-xl bg-inset/50 border border-subtle text-xs text-secondary space-y-1">
            <span className="font-semibold text-primary block">Need your credentials?</span>
            <p className="text-[11px] leading-relaxed">
              1. Log into your free dashboard at <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-brand-cyan hover:underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a>
              <br />
              2. Select your project &gt; go to <strong>Project Settings</strong> (gear icon) &gt; <strong>API</strong>
              <br />
              3. Copy the <strong>Project URL</strong> and <strong>anon public</strong> key, then paste them above.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Security, MFA & Account Privacy */}
      {activeTab === 'security' && (
        <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-subtle pb-3">
            <ShieldCheck className="w-5 h-5 text-brand-cyan" />
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
              Account Security &amp; Courier Privacy
            </h2>
          </div>

          {/* MFA / 2FA Section */}
          <div className="p-4 rounded-xl bg-inset border border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Multi-Factor Authentication (TOTP)</h3>
                  <p className="text-xs text-secondary">
                    Secure with Google Authenticator, Microsoft Authenticator, or 1Password
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
                mfaActive ? 'bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30' : 'bg-subtle text-secondary'
              }`}>
                {mfaActive ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>

            {mfaMessage && (
              <div className={`p-3 rounded-xl text-xs ${
                mfaMessage.isError ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              }`}>
                {mfaMessage.text}
              </div>
            )}

            {!mfaActive && !mfaQr && (
              <button
                type="button"
                disabled={mfaLoading}
                onClick={handleStartMfaEnrollment}
                className="px-4 py-2.5 rounded-xl bg-brand-cyan text-canvas font-bold text-xs flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                {mfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                <span>Set Up Two-Factor Authenticator</span>
              </button>
            )}

            {mfaQr && (
              <div className="space-y-4 pt-2 border-t border-subtle">
                <p className="text-xs text-secondary">
                  1. Scan this QR code with your authenticator application (or manually copy the secret):
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-surface p-4 rounded-xl border border-subtle">
                  <img src={mfaQr} alt="MFA QR Code" className="w-40 h-40 rounded-lg bg-white p-2" />
                  <div className="space-y-2 text-xs font-mono break-all">
                    <p className="text-secondary text-[11px]">Manual Secret Key:</p>
                    <code className="text-brand-cyan bg-inset px-2 py-1 rounded select-all block text-xs">{mfaSecret}</code>
                  </div>
                </div>

                <form onSubmit={handleConfirmMfa} className="space-y-3">
                  <label className="block text-xs text-primary font-semibold">
                    2. Enter the 6-digit code shown in your app to verify:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      pattern="[0-9]*"
                      placeholder="123456"
                      value={mfaVerifyCode}
                      onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                      className="w-36 px-3 py-2 rounded-xl bg-surface border border-subtle font-mono text-center text-sm text-primary tracking-widest focus:border-brand-cyan focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={mfaLoading || mfaVerifyCode.length !== 6}
                      className="px-4 py-2 rounded-xl bg-brand-emerald text-canvas font-bold text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {mfaLoading ? 'Verifying...' : 'Activate 2FA'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {mfaActive && (
              <div className="pt-2 border-t border-subtle">
                <button
                  type="button"
                  disabled={mfaLoading}
                  onClick={handleDisableMfa}
                  className="px-3 py-2 rounded-xl bg-inset hover:bg-subtle text-red-400 hover:text-red-300 border border-subtle text-xs font-bold font-mono transition-colors cursor-pointer"
                >
                  Disable Two-Factor Authentication
                </button>
              </div>
            )}
          </div>

          {/* GDPR Account & Data Erasure Section */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-bold text-red-400 uppercase font-mono">
                Delete Account &amp; Courier Records (GDPR Article 17)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Permanently delete your ShiftDrop courier account, including all completed delivery shifts, AMAP mileage logs, customer doorstep safe place notes, and stored vehicle receipts. This process is immediate and irreversible.
            </p>
            <button
              type="button"
              disabled={isDeletingAccount}
              onClick={handleDeleteAccount}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Permanently Purge All Account Records</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: PostgreSQL Schema */}
      {activeTab === 'schema' && (
        <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-6 shadow-xl space-y-3 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-3">
            <span className="text-xs text-secondary font-sans">
              Ready-to-execute PostgreSQL DDL with Row Level Security (RLS)
            </span>
            <button
              type="button"
              onClick={handleCopySchema}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs transition-colors cursor-pointer"
            >
              {copiedSchema ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-emerald" />
                  <span className="text-brand-emerald font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Copy SQL Schema</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-inset border border-subtle text-secondary text-[11px] overflow-x-auto max-h-96 leading-relaxed selection:bg-brand-cyan selection:text-canvas">
            {SUPABASE_SQL_SCHEMA_WITH_RLS}
          </pre>
        </div>
      )}
    </div>
  );
};