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
    return;
  }

  try {
    const isConfigured = await Purchases.isConfigured();
    if (!isConfigured.isConfigured) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: REVENUECAT_GOOGLE_API_KEY,
        appUserID: userId && userId.trim().length > 0 ? userId : undefined,
      });
    } else if (userId && userId.trim().length > 0) {
      // If already configured anonymously, associate with the authenticated user ID
      await Purchases.logIn({ appUserID: userId });
    }
  } catch (error) {
    // Graceful fallback if offline
  }
}

export async function checkProStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isKeyConfigured()) return false;

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch {
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
  } catch {}
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
    return false;
  }

  try {
    let targetPackage = pkg;
    if (!targetPackage) {
      targetPackage = await fetchProPackage();
    }

    if (!targetPackage) {
      return false;
    }

    const purchasePayload: any = {
      aPackage: targetPackage,
      packageToPurchase: targetPackage,
    };

    const { customerInfo } = await (Purchases as any).purchasePackage(purchasePayload);
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch (error: any) {
    return false;
  }
}

export async function restoreProPurchases(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isKeyConfigured()) return false;

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
  } catch {
    return false;
  }
}