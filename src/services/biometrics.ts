import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';

export async function isBiometricsAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const info = await BiometricAuth.checkBiometry();
    return info.isAvailable;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(reason = 'Unlock ShiftDrop Workstation'): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancel',
      allowDeviceCredential: true, // Allows PIN/Pattern fallback
    });
    return true;
  } catch {
    return false;
  }
}