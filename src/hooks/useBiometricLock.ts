import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';

export const useBiometricLock = (isLoggedIn: boolean) => {
  const [isLocked, setIsLocked] = useState(false);
  const backgroundTimestamp = useRef<number | null>(null);
  const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isLoggedIn) return;

    const listener = App.addListener('appStateChange', async (state) => {
      if (!state.isActive) {
        // App sent to background
        backgroundTimestamp.current = Date.now();
      } else {
        // App foregrounded
        if (
          backgroundTimestamp.current &&
          Date.now() - backgroundTimestamp.current > LOCK_TIMEOUT_MS
        ) {
          setIsLocked(true);
          await promptBiometricUnlock();
        }
      }
    });

    return () => {
      listener.then((sub) => sub.remove());
    };
  }, [isLoggedIn]);

  const promptBiometricUnlock = async () => {
    try {
      const available = await BiometricAuth.checkBiometry();
      if (available.isAvailable) {
        await BiometricAuth.authenticate({
          reason: 'Scan fingerprint or Face to resume ShiftDrop session',
          cancelTitle: 'Sign Out',
          allowDeviceCredential: true,
        });
        setIsLocked(false);
      } else {
        setIsLocked(false);
      }
    } catch {
      // If cancelled or failed, keep locked or trigger sign-out
      setIsLocked(true);
    }
  };

  return { isLocked, promptBiometricUnlock };
};