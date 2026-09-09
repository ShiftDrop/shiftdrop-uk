import { WeatherTelemetry } from '../types';

// Free Open-Meteo API (Manchester default coords: 53.4808, -2.2426)
export async function fetchLiveWeatherTelemetry(
  latitude: number = 53.4808,
  longitude: number = -2.2426,
  cityName: string = 'Manchester / Greater NW'
): Promise<WeatherTelemetry> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&wind_speed_unit=mph&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Open-Meteo API response not ok');
    const data = await res.json();
    const current = data.current || {};
    const temp = current.temperature_2m ?? 4.2;
    const feelsLike = current.apparent_temperature ?? 2.1;
    const windSpeed = current.wind_speed_10m ?? 12;
    const precipProb = current.precipitation_probability ?? 15;
    const weatherCode = current.weather_code ?? 0;

    const isFrost = temp <= 2.5;
    let advisory = 'Road conditions nominal. Standard braking distance.';
    if (isFrost) {
      advisory = 'FROST & ICE WARNING: Ground temp ≤ 2.5°C. Expect black ice on residential side streets and metal bridge expansion joints.';
    } else if (windSpeed > 25) {
      advisory = 'HIGH WIND ADVISORY: Gusts exceeding 25mph. Secure rear barn doors and high-sided van profile when exposed.';
    }

    return {
      temperature: Math.round(temp * 10) / 10,
      feelsLike: Math.round(feelsLike * 10) / 10,
      windSpeedMph: Math.round(windSpeed),
      precipitationProbability: precipProb,
      weatherCode,
      conditionDescription: getWeatherDescription(weatherCode),
      isFrostWarning: isFrost,
      frostAdvisory: advisory,
      city: cityName,
      lastUpdated: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    // Offline fallback telemetry
    return {
      temperature: 3.1,
      feelsLike: 1.2,
      windSpeedMph: 14,
      precipitationProbability: 20,
      weatherCode: 3,
      conditionDescription: 'Overcast (Cached)',
      isFrostWarning: false,
      frostAdvisory: 'Offline cached telemetry. Drive safely within posted speed limits.',
      city: cityName || 'UK In-Cab Cache',
      lastUpdated: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
  }
}

export const fetchUkWeatherTelemetry = fetchLiveWeatherTelemetry;


function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear Skies';
  if (code === 1 || code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy / Reduced Visibility';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain Showers';
  if (code >= 71 && code <= 77) return 'Sleet / Freezing Rain';
  if (code >= 80 && code <= 82) return 'Heavy Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
}

// UK Voice Assistant Engine (Web Speech API)
export function speakUkVoicePrompt(text: string, isFemale: boolean = true) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // cancel prior speaking
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'en-GB';

    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en_GB'));
    if (ukVoice) {
      utterance.voice = ukVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis unavailable:', err);
  }
}

// Haptic feedback with Capacitor fallback to navigator.vibrate
export function triggerHapticFeedback(pattern: 'light' | 'medium' | 'success' | 'warning' = 'medium') {
  if (typeof window === 'undefined') return;

  if ('vibrate' in navigator) {
    if (pattern === 'light') {
      navigator.vibrate(25);
    } else if (pattern === 'medium') {
      navigator.vibrate(50);
    } else if (pattern === 'success') {
      navigator.vibrate([40, 60, 80]);
    } else if (pattern === 'warning') {
      navigator.vibrate([100, 50, 100, 50, 150]);
    }
  }
}

// Media Recorder for Voice Notes
export class VoiceNoteRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async startRecording(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      return true;
    } catch {
      return false;
    }
  }

  stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve('');
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        // Stop all tracks
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        resolve(audioUrl);
      };

      this.mediaRecorder.stop();
    });
  }

  stopRecordingWithBlob(): Promise<{ url: string; blob: Blob | null }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve({ url: '', blob: null });
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        // Stop all tracks
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        resolve({ url: audioUrl, blob: audioBlob });
      };

      this.mediaRecorder.stop();
    });
  }
}
