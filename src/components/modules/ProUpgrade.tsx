import React, { useState, useEffect } from 'react';
import {
  Crown,
  ShieldCheck,
  Zap,
  Key,
  Calculator,
  Radar,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { getSupabaseClient } from '../../services/supabase';
import { fetchProPackage, purchasePro } from '../../services/billing';

interface ProUpgradeProps {
  onUpgradeComplete: () => void;
}

const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/14A00m5HQcJNgzY0FL5os00';

export const ProUpgrade: React.FC<ProUpgradeProps> = ({ onUpgradeComplete }) => {
  const [loading, setLoading] = useState(false);
  const [proPackage, setProPackage] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    async function loadNativePackage() {
      if (Capacitor.isNativePlatform()) {
        try {
          const pkg = await fetchProPackage();
          if (pkg) setProPackage(pkg);
        } catch (err) {
          console.warn('Native billing package fetch deferred:', err);
        }
      }
    }
    loadNativePackage();
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // 1. If RevenueCat product package is loaded on Android, launch native Google Play sheet
      if (Capacitor.isNativePlatform() && proPackage) {
        const isSuccess = await purchasePro(proPackage);
        if (isSuccess) {
          onUpgradeComplete();
        }
        setLoading(false);
        return;
      }

      // 2. Fallback: Open Stripe Checkout via in-app browser
      const client = getSupabaseClient();
      const session = client ? (await client.auth.getSession()).data.session : null;

      let destinationUrl = STRIPE_CHECKOUT_URL;
      const params = new URLSearchParams();

      if (session?.user?.email) {
        params.append('prefilled_email', session.user.email);
      }
      if (session?.user?.id) {
        params.append('client_reference_id', session.user.id);
      }

      const queryString = params.toString();
      if (queryString) {
        destinationUrl += `?${queryString}`;
      }

      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: destinationUrl });
      } else {
        window.location.href = destinationUrl;
      }
    } catch (err) {
      console.error('Checkout failed, launching direct Stripe:', err);
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: STRIPE_CHECKOUT_URL });
      } else {
        window.location.href = STRIPE_CHECKOUT_URL;
      }
    } finally {
      setLoading(false);
    }
  };

  const displayPrice = proPackage ? proPackage.product.priceString : '£6.99';

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in font-sans">
      <div className="bg-surface border border-brand-cyan/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-amber-400/15 text-amber-400 border border-amber-400/30 font-bold">
              PRO VAULT UNLOCK
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-mono mt-0.5">
              ShiftDrop PRO
            </h1>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-secondary leading-relaxed mb-6">
          Equip your in-cab workstation with complete operational and tax tooling built specifically for multi-drop UK couriers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 font-mono text-xs">
          <div className="p-3 rounded-xl bg-inset border border-subtle flex items-center gap-2.5">
            <Key className="w-4 h-4 text-brand-cyan shrink-0" />
            <span className="text-primary">Doorstep & Gate Code Vault</span>
          </div>
          <div className="p-3 rounded-xl bg-inset border border-subtle flex items-center gap-2.5">
            <Calculator className="w-4 h-4 text-brand-emerald shrink-0" />
            <span className="text-primary">Real Shift Profit Engine</span>
          </div>
          <div className="p-3 rounded-xl bg-inset border border-subtle flex items-center gap-2.5">
            <Radar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-primary">UK Courier Pay Radar</span>
          </div>
          <div className="p-3 rounded-xl bg-inset border border-subtle flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-emerald shrink-0" />
            <span className="text-primary">PCN Shield & Appeal Toolkit</span>
          </div>
          <div className="p-3 rounded-xl bg-inset border border-subtle flex items-center gap-2.5 sm:col-span-2">
            <FileSpreadsheet className="w-4 h-4 text-brand-cyan shrink-0" />
            <span className="text-primary">HMRC AMAP Mileage Tax Vault (45p/mi)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-inset border border-subtle mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-3xl font-black text-brand-cyan font-mono tracking-tight">
              {displayPrice} <span className="text-xs font-normal text-secondary font-sans">/ month</span>
            </div>
            <p className="text-[11px] text-secondary mt-0.5">
              Cancel anytime online. Direct sync across web and mobile.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-brand-emerald font-bold font-mono">
            <Zap className="w-4 h-4 fill-current" />
            <span>INSTANT ACTIVATION</span>
          </div>
        </div>

        <button
          id="btn-stripe-checkout"
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
          ) : (
            <>
              <span>
                {Capacitor.isNativePlatform() && proPackage
                  ? 'Upgrade with Google Play'
                  : 'Upgrade to ShiftDrop PRO'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-secondary/70 mt-3 font-mono">
          Encrypted 256-bit payment processing
        </p>
      </div>
    </div>
  );
};