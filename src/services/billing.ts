import { Purchases, PurchasesPackage, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

// Set your public Google API key from RevenueCat (Project Settings > API Keys)
// Can also be set in your .env as VITE_REVENUECAT_GOOGLE_API_KEY
const REVENUECAT_GOOGLE_API_KEY =
  (import.meta as any).env?.VITE_REVENUECAT_GOOGLE_API_KEY || 'goog_YOUR_PUBLIC_KEY_HERE';

// Guard helper: verify whether a legitimate key exists
const isKeyConfigured = (): boolean => {
  return (
    typeof REVENUECAT_GOOGLE_API_KEY === 'string' &&
    REVENUECAT_GOOGLE_API_KEY.startsWith('goog_') &&
    !REVENUECAT_GOOGLE_API_KEY.includes('YOUR_PUBLIC_KEY')
  );
};

export async function setupRevenueCat(userId?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  if (!isKeyConfigured()) {
    console.info('RevenueCat: Skipped configuration (placeholder key detected).');
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({
      apiKey: REVENUECAT_GOOGLE_API_KEY,
      appUserID: userId || null,
    });
  } catch (error) {
    console.warn('RevenueCat initialisation skipped or failed:', error);
  }
}

export async function checkProStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  if (!isKeyConfigured()) {
    return false;
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active['pro'] !== 'undefined';
  } catch (err) {
    console.warn('Unable to query RevenueCat customer entitlements:', err);
    return false;
  }
}

export async function fetchProPackage(): Promise<PurchasesPackage | null> {
  if (!Capacitor.isNativePlatform()) return null;

  if (!isKeyConfigured()) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.monthly) {
      return offerings.current.monthly;
    }
  } catch (error) {
    console.error('Failed to retrieve RevenueCat offerings:', error);
  }
  return null;
}

export async function purchasePro(pkg: PurchasesPackage): Promise<boolean> {
  if (!isKeyConfigured()) {
    console.warn('Cannot initiate purchase: RevenueCat key not configured.');
    return false;
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return typeof customerInfo.entitlements.active['pro'] !== 'undefined';
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('Purchase transaction failed:', error);
    }
    return false;
  }
}