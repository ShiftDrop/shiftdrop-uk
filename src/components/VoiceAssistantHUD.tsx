import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  X,
  Zap,
  TrendingUp,
  MapPin,
  HelpCircle,
  Radio,
} from 'lucide-react';
import { ParcelStop, ActiveShift, HMRCTaxCalculations } from '../types';
import { ukVoiceAssistant, VoiceCommandResult } from '../services/voiceAssistant';

interface VoiceAssistantHUDProps {
  stops: ParcelStop[];
  currentStop?: ParcelStop;
  activeShift?: ActiveShift;
  taxMetrics?: HMRCTaxCalculations;
  onConfirmDrop?: (stopId: string) => void;
  onEndShift?: () => void;
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void;
}

export const VoiceAssistantHUD: React.FC<VoiceAssistantHUDProps> = ({
  stops,
  currentStop,
  activeShift,
  taxMetrics,
  onConfirmDrop,
  onEndShift,
  isOpen,
  onClose,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [activeIntent, setActiveIntent] = useState<string>('');

  useEffect(() => {
    ukVoiceAssistant.registerCallbacks(
      (state) => {
        setIsListening(state.isListening);
        if (state.transcript) setTranscript(state.transcript);
        if (state.lastResponse) setLastResponse(state.lastResponse);
        if (state.intent) setActiveIntent(state.intent);
      },
      (result: VoiceCommandResult) => {
        setTranscript(result.transcript);
        setLastResponse(result.spokenResponse);
        setActiveIntent(result.intent);
      }
    );
  }, []);

  // When modal is opened, optionally start listening
  useEffect(() => {
    if (isOpen) {
      ukVoiceAssistant.startListening();
    } else {
      ukVoiceAssistant.stopListening();
    }
  }, [isOpen]);

  const handleToggleListening = () => {
    ukVoiceAssistant.toggleListening();
  };

  const handleExecutePrompt = (promptText: string) => {
    setTranscript(promptText);
    ukVoiceAssistant.parseAndExecute(promptText, {
      stops,
      currentStop,
      activeShift,
      taxMetrics,
      onConfirmDrop,
      onEndShift,
    });
  };

  if (!isOpen) {
    return null; // Do not render any floating overlay to keep the screen 100% unobstructed!
  }

  return (
    <div
      id="voice-assistant-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="voice-assistant-modal-card"
        className="w-full max-w-md bg-surface border border-brand-cyan/50 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-cyan/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/50 flex items-center justify-center text-brand-cyan">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary font-mono uppercase tracking-wider">
                UK Voice Assistant
              </h2>
              <p className="text-[11px] text-secondary">
                Hands-Free In-Cab Audio Telemetry
              </p>
            </div>
          </div>

          <button
            id="btn-close-voice-assistant"
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-subtle transition-colors border border-transparent hover:border-subtle"
            aria-label="Close Voice Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Audio Visualizer & Waveform */}
        <div className="bg-inset border border-subtle rounded-xl p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 h-10">
            {isListening ? (
              <>
                <div className="w-1.5 bg-brand-cyan h-4 animate-bounce rounded" />
                <div className="w-1.5 bg-brand-cyan h-8 animate-bounce rounded delay-75" />
                <div className="w-1.5 bg-brand-emerald h-10 animate-bounce rounded delay-150" />
                <div className="w-1.5 bg-brand-cyan h-7 animate-bounce rounded delay-200" />
                <div className="w-1.5 bg-brand-cyan h-3 animate-bounce rounded delay-300" />
              </>
            ) : (
              <span className="text-xs text-secondary font-mono">
                Microphone paused • Tap mic button below to talk
              </span>
            )}
          </div>

          {/* Transcript / Spoken query */}
          {transcript ? (
            <p className="text-sm font-mono font-bold text-brand-cyan bg-surface p-2 rounded-lg border border-brand-cyan/30">
              "{transcript}"
            </p>
          ) : (
            <p className="text-xs text-secondary italic">
              Try saying: "What are my earnings today?" or "Give me a route summary"
            </p>
          )}
        </div>

        {/* Last Audio Response */}
        {lastResponse && (
          <div className="p-3 rounded-xl bg-inset border border-brand-emerald/40 text-xs text-slate-200 flex items-start gap-2.5">
            <Volume2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-brand-emerald font-bold block">
                ShiftDrop Audio Response:
              </span>
              <p className="text-xs leading-relaxed text-primary">{lastResponse}</p>
            </div>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-secondary font-mono uppercase font-bold block">
            Quick In-Cab Voice Commands:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleExecutePrompt('What are my earnings today?')}
              className="px-3 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs text-slate-200 hover:text-primary transition-colors text-left font-medium"
            >
              💰 Earnings Today
            </button>
            <button
              onClick={() => handleExecutePrompt('Give me a route summary')}
              className="px-3 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs text-slate-200 hover:text-primary transition-colors text-left font-medium"
            >
              📦 Route Summary
            </button>
            <button
              onClick={() => handleExecutePrompt("What's the gate code?")}
              className="px-3 py-2 rounded-xl bg-inset hover:bg-subtle border border-subtle text-xs text-slate-200 hover:text-primary transition-colors text-left font-medium"
            >
              🔑 Gate Code
            </button>
            <button
              onClick={() => handleExecutePrompt('Confirm drop')}
              className="px-3 py-2 rounded-xl bg-brand-emerald/15 hover:bg-brand-emerald/30 border border-brand-emerald/40 text-xs text-brand-emerald font-bold transition-colors text-left"
            >
              ✓ Confirm Drop
            </button>
          </div>
        </div>

        {/* Big Interactive Mic Toggle Button */}
        <div className="pt-2">
          <button
            id="btn-voice-modal-mic-toggle"
            onClick={handleToggleListening}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 border ${
              isListening
                ? 'bg-brand-cyan text-canvas border-white shadow-cyan-500/30'
                : 'bg-subtle hover:opacity-90 text-primary border-subtle'
            }`}
          >
            {isListening ? (
              <>
                <Mic className="w-5 h-5 animate-pulse" />
                <span>Listening (Tap to Pause)</span>
              </>
            ) : (
              <>
                <MicOff className="w-5 h-5 text-brand-cyan" />
                <span>Microphone Paused (Tap to Speak)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
