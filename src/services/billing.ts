import { Purchases, PurchasesPackage, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const ENTITLEMENT_ID = 'shiftdrop_pro';

// Production Stripe Payment Link for Web Couriers
const STRIPE_WEB_CHECKOUT_URL = 'https://buy.stripe.com/14A00m5HQcJNgzY0FL5os00';

const REVENUECAT_GOOGLE_API_KEY =
  (import.meta as any).env?.VITE_REVENUECAT_GOOGLE_API_KEY || 'goog_zLvajYxphxaRVcaodDmKOMhzTGA';

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
    console.info('RevenueCat: Native configuration skipped (no active Google key).');
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({
      apiKey: REVENUECAT_GOOGLE_API_KEY,
      appUserID: userId && userId.trim().length > 0 ? userId : undefined,
    });
  } catch (error) {
    console.warn('RevenueCat initialisation failed:', error);
  }
}

export async function checkProStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isKeyConfigured()) return false;

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (err) {
    console.warn('Unable to query RevenueCat customer entitlements:', err);
    return false;
  }
}

export async function fetchProPackage(): Promise<PurchasesPackage | null> {
  if (!Capacitor.isNativePlatform() || !isKeyConfigured()) return null;

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.monthly) {
      return offerings.current.monthly;
    }
    console.warn('RevenueCat: Current offering or monthly package is missing.', offerings);
  } catch (error) {
    console.error('Failed to retrieve RevenueCat offerings:', error);
  }
  return null;
}

export async function purchasePro(
  pkg?: PurchasesPackage | null,
  userEmail?: string,
  userId?: string
): Promise<boolean> {
  // Web checkout: Route directly to Stripe Checkout
  if (!Capacitor.isNativePlatform()) {
    const checkoutUrl = new URL(STRIPE_WEB_CHECKOUT_URL);
    if (userEmail) checkoutUrl.searchParams.set('prefilled_email', userEmail);
    if (userId) checkoutUrl.searchParams.set('client_reference_id', userId);
    
    window.location.href = checkoutUrl.toString();
    return false;
  }

  // Native Android checkout: Google Play Billing via RevenueCat
  if (!isKeyConfigured()) {
    console.warn('Cannot initiate purchase: RevenueCat key not configured.');
    return false;
  }

  try {
    let targetPackage = pkg;
    if (!targetPackage) {
      console.info('No package passed to purchasePro, fetching active offering...');
      targetPackage = await fetchProPackage();
    }

    if (!targetPackage) {
      console.error('Purchase aborted: Unable to resolve a valid monthly package.');
      return false;
    }

    const purchasePayload: any = {
      aPackage: targetPackage,
      packageToPurchase: targetPackage,
    };

    const { customerInfo } = await (Purchases as any).purchasePackage(purchasePayload);
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('Purchase transaction failed:', error);
    }
    return false;
  }
}

export async function restoreProPurchases(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isKeyConfigured()) return false;

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    return false;
  }
}