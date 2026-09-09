import React, { useState } from 'react';
import { ShieldCheck, Zap, Users, Receipt, Lock, CheckCircle2, ChevronRight, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProUpgradeProps {
  onUpgradeComplete: () => void;
}

export const ProUpgrade: React.FC<ProUpgradeProps> = ({ onUpgradeComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = (plan: 'monthly' | 'yearly') => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#0284C7', '#10B981']
      });
      setIsProcessing(false);
      onUpgradeComplete();
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-4 pt-6 pb-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-amber to-brand-amber/40 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 border border-brand-amber/30">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-primary font-mono tracking-tight">
          ShiftDrop <span className="text-brand-amber">Premium</span>
        </h1>
        <p className="text-secondary max-w-lg mx-auto text-sm sm:text-base">
          Unlock the ultimate toolkit for UK couriers. Reclaim your time, protect your income from PCNs, and automate your HMRC AMAP returns.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free Tier */}
        <div className="p-6 rounded-2xl bg-inset border border-subtle flex flex-col opacity-75">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-primary font-mono">Basic</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-primary">£0</span>
              <span className="text-secondary text-sm">/ forever</span>
            </div>
            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-2 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>Basic Stop List & Routing</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>Manual Earnings Tracking</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>Standard Telemetry</span>
              </li>
            </ul>
          </div>
          <button disabled className="mt-8 w-full py-3 rounded-xl bg-subtle text-secondary font-bold text-sm">
            Current Plan
          </button>
        </div>

        {/* PRO Tier */}
        <div className="p-6 rounded-2xl bg-surface border-2 border-brand-amber relative shadow-xl shadow-amber-500/5 flex flex-col">
          <div className="absolute top-0 right-6 -translate-y-1/2">
            <span className="bg-brand-amber text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
              Most Popular
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-brand-amber font-mono">PRO</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-primary">£7.99</span>
              <span className="text-secondary text-sm">/ month</span>
            </div>
            <p className="text-xs text-secondary mt-1">Tax-deductible business expense.</p>
            
            <ul className="mt-6 space-y-4">
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-brand-cyan/10 text-brand-cyan shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-primary block">Spatial Load-In & Voice</span>
                  <span className="text-xs text-secondary block mt-0.5">Organize your van visually and command hands-free.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-brand-emerald/10 text-brand-emerald shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-primary block">HMRC Tax Vault & Auto-AMAP</span>
                  <span className="text-xs text-secondary block mt-0.5">Automated 45p/25p mileage logs & Smart Receipt OCR.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-primary block">PCN Shield Generator</span>
                  <span className="text-xs text-secondary block mt-0.5">Automated parking fine appeal packs.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-brand-amber/10 text-brand-amber shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-primary block">Driver Intel Network</span>
                  <span className="text-xs text-secondary block mt-0.5">Crowdsourced gate codes and safe places.</span>
                </div>
              </li>
            </ul>
          </div>
          <div className="mt-8 space-y-3">
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-brand-amber hover:opacity-90 text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {isProcessing ? 'Processing...' : 'Subscribe Monthly - £7.99'}
            </button>
            <button
              onClick={() => handleUpgrade('yearly')}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-inset hover:bg-subtle text-primary font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Subscribe Yearly - £69.99 (Save 27%)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
