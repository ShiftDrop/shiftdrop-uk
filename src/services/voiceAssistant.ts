/**
 * ShiftDrop - Advanced UK Voice Assistant Engine (Web Speech API)
 * Zero API Keys / 100% Free Native Browser Speech Recognition & Synthesis
 * Optimized for UK English accents and in-cab hands-free driving workflows.
 */

import { ParcelStop, ActiveShift, HMRCTaxCalculations } from '../types';
import { speakUkVoicePrompt, triggerHapticFeedback } from './telemetry';

export interface VoiceCommandResult {
  transcript: string;
  intent: 'earnings' | 'route_summary' | 'next_stop' | 'gate_code' | 'end_shift' | 'confirm_drop' | 'nav_waze' | 'nav_google' | 'unknown';
  spokenResponse: string;
  confidence: number;
}

export type VoiceStateChangeCallback = (state: {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  lastResponse: string;
  intent?: string;
  error?: string;
}) => void;

// Web Speech Recognition Type Polyfill
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

class UkVoiceAssistantService {
  private recognition: any = null;
  private isListening = false;
  private onStateChange: VoiceStateChangeCallback | null = null;
  private commandHandler: ((result: VoiceCommandResult) => void) | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition API is not supported in this browser environment.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-GB'; // Strict UK English
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.notifyState({ isListening: true, transcript: '', interimTranscript: '', lastResponse: '' });
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptPiece;
          } else {
            interim += transcriptPiece;
          }
        }

        this.notifyState({
          isListening: true,
          transcript: final || interim,
          interimTranscript: interim,
          lastResponse: '',
        });

        if (final.trim()) {
          this.processCommand(final.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Voice recognition error:', event.error);
        if (event.error !== 'no-speech') {
          this.notifyState({
            isListening: false,
            transcript: '',
            interimTranscript: '',
            lastResponse: '',
            error: `Voice error: ${event.error}`,
          });
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.notifyState({ isListening: false, transcript: '', interimTranscript: '', lastResponse: '' });
      };
    } catch (err) {
      console.warn('Failed to initialise SpeechRecognition:', err);
    }
  }

  public registerCallbacks(
    onStateChange: VoiceStateChangeCallback,
    commandHandler: (result: VoiceCommandResult) => void
  ) {
    this.onStateChange = onStateChange;
    this.commandHandler = commandHandler;
  }

  public startListening() {
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) {
      speakUkVoicePrompt('Speech recognition is not supported on this device.', true);
      return;
    }

    if (!this.isListening) {
      try {
        this.recognition.start();
        triggerHapticFeedback('light');
      } catch (err) {
        console.warn('Recognition start caught:', err);
      }
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        triggerHapticFeedback('light');
      } catch (err) {
        console.warn('Recognition stop caught:', err);
      }
    }
  }

  public toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public parseAndExecute(
    text: string,
    context: {
      stops: ParcelStop[];
      currentStop?: ParcelStop;
      activeShift?: ActiveShift;
      taxMetrics?: HMRCTaxCalculations;
      onConfirmDrop?: (stopId: string) => void;
      onEndShift?: () => void;
    }
  ): VoiceCommandResult {
    const raw = text.toLowerCase().trim();
    let intent: VoiceCommandResult['intent'] = 'unknown';
    let spokenResponse = '';

    const pendingStops = context.stops.filter((s) => s.status === 'Pending');
    const deliveredCount = context.stops.filter((s) => s.status === 'Delivered').length;
    const returnedCount = context.stops.filter((s) => s.status === 'Returned').length;
    const totalCount = context.stops.length;

    // 1. Earnings Query
    if (
      raw.includes('earning') ||
      raw.includes('money') ||
      raw.includes('pay') ||
      raw.includes('how much') ||
      raw.includes('gross') ||
      raw.includes('wages') ||
      raw.includes('income')
    ) {
      intent = 'earnings';
      const gross = context.activeShift
        ? context.activeShift.agreedBlockRate + (context.activeShift.bonusPay || 0)
        : 84.0;
      const taxShield = context.taxMetrics?.totalAmapMileageDeduction || 24.5;
      const hourly = gross > 0 ? gross / 4 : 21.5;

      spokenResponse = `You have earned £${gross.toFixed(2)} so far today across ${deliveredCount} deliveries. Your HMRC AMAP tax shield is currently £${taxShield.toFixed(2)}, giving an effective rate of £${hourly.toFixed(2)} per hour.`;
    }
    // 2. Route Summary Query
    else if (
      raw.includes('route summary') ||
      raw.includes('how many stops') ||
      raw.includes('drops left') ||
      raw.includes('progress') ||
      raw.includes('summary') ||
      raw.includes('overview') ||
      raw.includes('eta')
    ) {
      intent = 'route_summary';
      const remaining = pendingStops.length;
      const nextPostcode = context.currentStop?.postcode || 'No pending stops';
      const estMinutes = remaining * 3.5; // ~3.5 min per drop estimate
      const estHours = Math.floor(estMinutes / 60);
      const estMins = Math.round(estMinutes % 60);
      const timeStr = estHours > 0 ? `${estHours} hours and ${estMins} minutes` : `${estMins} minutes`;

      spokenResponse = `Route summary: You have delivered ${deliveredCount} of ${totalCount} parcels, with ${remaining} stops remaining. At your current pace, estimated finish time is in approximately ${timeStr}. Next delivery is at ${nextPostcode}.`;
    }
    // 3. Gate Code / Access PIN
    else if (
      raw.includes('gate code') ||
      raw.includes('intercom') ||
      raw.includes('access code') ||
      raw.includes('pin code') ||
      raw.includes('key code') ||
      raw.includes('code')
    ) {
      intent = 'gate_code';
      if (context.currentStop?.gateAccessCode) {
        spokenResponse = `Gate and intercom code for ${context.currentStop.recipientName} is ${context.currentStop.gateAccessCode}.`;
      } else if (context.currentStop?.customerInstructions) {
        spokenResponse = `No PIN registered. Customer instruction says: ${context.currentStop.customerInstructions}`;
      } else {
        spokenResponse = `No gate code required for Stop #${context.currentStop?.stopNumber || '1'}. Standard front porch delivery.`;
      }
    }
    // 4. Next Stop / Parcel Location Query
    else if (
      raw.includes('next stop') ||
      raw.includes('where to') ||
      raw.includes('current stop') ||
      raw.includes('where is the parcel') ||
      raw.includes('which slot') ||
      raw.includes('zone')
    ) {
      intent = 'next_stop';
      if (context.currentStop) {
        spokenResponse = `Next stop is number ${context.currentStop.stopNumber} for ${context.currentStop.recipientName} at ${context.currentStop.addressLine1}, postcode ${context.currentStop.postcode}. Loaded in ${context.currentStop.assignedZone}.`;
      } else {
        spokenResponse = 'You have completed all scheduled deliveries on your manifest.';
      }
    }
    // 5. Confirm Drop Action
    else if (
      raw.includes('confirm drop') ||
      raw.includes('delivered') ||
      raw.includes('drop confirmed') ||
      raw.includes('drop parcel') ||
      raw.includes('mark delivered')
    ) {
      intent = 'confirm_drop';
      if (context.currentStop) {
        if (context.onConfirmDrop) {
          context.onConfirmDrop(context.currentStop.id);
        }
        spokenResponse = `Drop confirmed for stop number ${context.currentStop.stopNumber}. Advancing to next parcel.`;
      } else {
        spokenResponse = 'No active stop to confirm.';
      }
    }
    // 6. End Shift Action
    else if (
      raw.includes('end shift') ||
      raw.includes('clock off') ||
      raw.includes('finish shift') ||
      raw.includes('punch out') ||
      raw.includes('stop shift')
    ) {
      intent = 'end_shift';
      if (context.onEndShift) {
        context.onEndShift();
      }
      spokenResponse = 'Opening shift conclusion and HMRC tax debrief summary.';
    }
    // 7. Navigation Launch
    else if (raw.includes('waze') || raw.includes('google maps') || raw.includes('navigate')) {
      intent = raw.includes('waze') ? 'nav_waze' : 'nav_google';
      const targetPostcode = context.currentStop?.postcode || 'M14 5QH';
      if (intent === 'nav_waze') {
        window.open(`https://waze.com/ul?q=${encodeURIComponent(targetPostcode)}&navigate=yes`, '_blank');
        spokenResponse = `Launching Waze navigation to ${targetPostcode}.`;
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targetPostcode)}`, '_blank');
        spokenResponse = `Launching Google Maps to ${targetPostcode}.`;
      }
    }
    // Fallback
    else {
      intent = 'unknown';
      spokenResponse = `I heard: "${text}". You can ask: "What are my earnings?", "Give me a route summary", "What's the gate code?", or "Confirm drop".`;
    }

    // Speak British auditory response
    speakUkVoicePrompt(spokenResponse, true);
    triggerHapticFeedback('success');

    const result: VoiceCommandResult = {
      transcript: text,
      intent,
      spokenResponse,
      confidence: 0.95,
    };

    this.notifyState({
      isListening: this.isListening,
      transcript: text,
      interimTranscript: '',
      lastResponse: spokenResponse,
      intent,
    });

    if (this.commandHandler) {
      this.commandHandler(result);
    }

    return result;
  }

  private processCommand(text: string) {
    if (this.commandHandler) {
      this.commandHandler({
        transcript: text,
        intent: 'unknown',
        spokenResponse: '',
        confidence: 0.9,
      });
    }
  }

  private notifyState(state: {
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    lastResponse: string;
    intent?: string;
    error?: string;
  }) {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }
}

export const ukVoiceAssistant = new UkVoiceAssistantService();
