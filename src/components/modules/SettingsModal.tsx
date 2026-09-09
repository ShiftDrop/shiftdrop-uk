import React, { useState } from 'react';
import {
  Settings,
  X,
  Volume2,
  Vibrate,
  Snowflake,
  Cloud,
  Database,
  Copy,
  Check,
  Radio,
  Sliders,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { DriverAppSettings } from '../../types';
import {
  SUPABASE_SQL_SCHEMA_WITH_RLS,
  saveSupabaseConfig,
  testSupabaseConnection,
  normalizeSupabaseUrl,
} from '../../services/supabase';
import { syncEngine } from '../../services/syncEngine';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DriverAppSettings;
  onUpdateSettings: (newSettings: DriverAppSettings) => void;
  onSyncOfflineQueue: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
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
  const [activeTab, setActiveTab] = useState<'preferences' | 'cloud' | 'schema'>('preferences');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushingData, setIsPushingData] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  const handlePushAllToCloud = async () => {
    setIsPushingData(true);
    setPushStatusMessage(null);
    triggerHapticFeedback('light');
    try {
      const res = await syncEngine.syncAllToSupabase();
      if (res.success) {
        triggerHapticFeedback('success');
        setPushStatusMessage(`✓ ${res.message}`);
        speakUkVoicePrompt('Data successfully synchronized to Supabase tables.');
      } else {
        triggerHapticFeedback('warning');
        setPushStatusMessage(`⚠ ${res.message}`);
      }
    } catch (e: any) {
      setPushStatusMessage(`Sync failed: ${e.message}`);
    } finally {
      setIsPushingData(false);
    }
  };

  if (!isOpen) return null;

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
        message: 'Please enter your Supabase Anon / Public Key.',
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
      speakUkVoicePrompt('Supabase connection check failed.');
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

  const handleTestVoice = () => {
    triggerHapticFeedback('light');
    speakUkVoicePrompt(
      'ShiftDrop audio telemetry online. British English voice guidance is functioning correctly.'
    );
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-2xl bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-subtle bg-inset">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary font-mono">
                Driver Workstation Settings
              </h2>
              <p className="text-xs text-secondary">
                Configure UK In-Cab telemetry, speech synthesis, and Supabase RLS Cloud
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

        {/* Modal Navigation Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-subtle bg-surface px-3 sm:px-4 text-xs font-mono font-bold whitespace-nowrap">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-2.5 sm:px-3 border-b-2 transition-colors shrink-0 ${
              activeTab === 'preferences'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            Driver Controls & Haptics
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-2.5 sm:px-3 border-b-2 transition-colors shrink-0 ${
              activeTab === 'cloud'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            Supabase Cloud Setup
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-2.5 sm:px-3 border-b-2 transition-colors shrink-0 ${
              activeTab === 'schema'
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            PostgreSQL RLS Schema
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              {/* Voice Guidance */}
              <div className="p-4 rounded-xl bg-inset border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <Volume2 className="w-4 h-4 text-brand-cyan" />
                    <span>UK English Voice Guidance & Callouts</span>
                  </div>
                  <p className="text-secondary">
                    Speak out parcel postcode, customer gate codes, and assigned van slot automatically.
                  </p>
                </div>
                <button
                  onClick={() => {
                    triggerHapticFeedback('light');
                    onUpdateSettings({
                      ...settings,
                      isVoiceGuidanceEnabled: !settings.isVoiceGuidanceEnabled,
                    });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
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

              {/* Test Voice Readout */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                <span className="text-secondary">Preview In-Cab Speech Synthesis:</span>
                <button
                  onClick={handleTestVoice}
                  className="px-3 py-1.5 rounded-lg bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-semibold"
                >
                  🔊 Test UK Voice Engine
                </button>
              </div>

              {/* Haptic Feedback */}
              <div className="p-4 rounded-xl bg-inset border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <Vibrate className="w-4 h-4 text-brand-emerald" />
                    <span>Capacitor & Web Haptic Vibration</span>
                  </div>
                  <p className="text-secondary">
                    Tactile confirmation pulses when scanning barcodes, confirming drops, and warning alerts.
                  </p>
                </div>
                <button
                  onClick={() => {
                    triggerHapticFeedback('medium');
                    onUpdateSettings({
                      ...settings,
                      isHapticFeedbackEnabled: !settings.isHapticFeedbackEnabled,
                    });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
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

              {/* Frost Warning Alert */}
              <div className="p-4 rounded-xl bg-inset border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <Snowflake className="w-4 h-4 text-amber-400" />
                    <span>Automated Frost & Ice Warnings (≤ 2.5°C)</span>
                  </div>
                  <p className="text-secondary">
                    Trigger audible and visual alerts when Open-Meteo detects freezing ground temperatures.
                  </p>
                </div>
                <button
                  onClick={() => {
                    triggerHapticFeedback('light');
                    onUpdateSettings({
                      ...settings,
                      isFrostWarningAlertActive: !settings.isFrostWarningAlertActive,
                    });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
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

              {/* Offline Voice Notes Queue */}
              <div className="p-4 rounded-xl bg-inset border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <Cloud className="w-4 h-4 text-brand-cyan" />
                    <span>Offline Audio Sync Queue</span>
                  </div>
                  <p className="text-secondary">
                    {settings.offlineVoiceNoteQueueCount || 0} drop voice notes awaiting cloud bucket sync.
                  </p>
                </div>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan text-canvas font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-cyan-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold block text-sm">100% Zero-Cost Supabase Free Tier Sync</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-700/60 text-cyan-300">
                    Free Forever
                  </span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  ShiftDrop operates offline-first with IndexedDB. Enter your Supabase project credentials to mirror shift histories, tax logs, and parking records to the cloud.
                </p>
              </div>

              {/* Status Banner */}
              {connectionStatus.state === 'success' && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs flex-1">
                      <p className="font-bold text-brand-emerald">
                        Cloud Synchronization Active
                        {connectionStatus.latencyMs ? ` (${connectionStatus.latencyMs}ms latency)` : ''}
                      </p>
                      <p className="text-emerald-300/80 font-mono text-[11px] break-all">
                        Connected to: {supabaseUrlInput}
                      </p>
                      <p className="text-[11px] text-emerald-400/90">
                        {connectionStatus.message || 'Records are being mirrored to your cloud database.'}
                      </p>
                    </div>
                  </div>

                  {/* Push All Local Data Button */}
                  <div className="pt-2 border-t border-emerald-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={isPushingData}
                      onClick={handlePushAllToCloud}
                      className="px-3.5 py-2 rounded-lg bg-brand-emerald hover:bg-emerald-400 text-canvas font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
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

              <form onSubmit={handleSaveSupabaseConfig} noValidate className="space-y-3 font-mono">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-secondary font-sans font-semibold text-xs">
                      Supabase Project URL
                    </label>
                    <span className="text-[10px] text-secondary font-sans">
                      Project Settings &gt; API
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
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none text-xs"
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
                      className="text-[10px] text-brand-cyan hover:underline flex items-center gap-1 font-sans"
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
                      className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none text-xs pr-10"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={connectionStatus.state === 'testing'}
                    onClick={() => handleSaveSupabaseConfig()}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 ${
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
                      className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-inset hover:bg-subtle border border-subtle text-red-400 hover:text-red-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                      title="Clear credentials and revert to local IndexedDB"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </form>

              {/* Help box */}
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

          {activeTab === 'schema' && (
            <div className="space-y-3 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-secondary font-sans">
                  Ready-to-execute PostgreSQL DDL with Row Level Security (RLS)
                </span>
                <button
                  onClick={handleCopySchema}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-inset hover:bg-subtle border border-subtle text-primary text-xs transition-colors"
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

              <pre className="p-4 rounded-xl bg-inset border border-subtle text-secondary text-[11px] overflow-x-auto max-h-72 leading-relaxed selection:bg-brand-cyan selection:text-canvas">
                {SUPABASE_SQL_SCHEMA_WITH_RLS}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-subtle bg-inset flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-cyan text-canvas font-bold text-xs hover:opacity-90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
