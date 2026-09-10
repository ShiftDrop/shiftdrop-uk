import React, { useState } from 'react';
import { getSupabaseClient } from '../../services/supabase';

interface ProUpgradeProps {
  onUpgradeComplete: () => void;
}

export const ProUpgrade: React.FC<ProUpgradeProps> = ({ onUpgradeComplete }) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const client = getSupabaseClient();
      
      if (!client) {
        alert('Supabase client is not initialized.');
        setLoading(false);
        return;
      }

      const session = (await client.auth.getSession()).data.session;
      
      if (!session) {
        alert('Please log in to your account to upgrade to ShiftDrop PRO.');
        setLoading(false);
        return;
      }

      // Invoke your Supabase Edge Function to generate the Stripe session
      const { data, error } = await client.functions.invoke('create-checkout', {
        body: { 
          userId: session.user.id, 
          email: session.user.email 
        },
      });

      if (error || !data?.url) {
        console.error('Checkout creation error:', error || data);
        setLoading(false);
        return;
      }

      // Redirect the user to Stripe's hosted checkout page
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout failed:', err);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-canvas-card rounded-xl border border-border text-primary shadow-xl">
      <h2 className="text-2xl font-bold mb-2">Upgrade to ShiftDrop PRO</h2>
      <p className="text-secondary mb-6">
        Unlock advanced HMRC tax calculation vaults, automated mileage tracking, and real-time pay radar tools built for UK couriers.
      </p>
      
      <div className="bg-canvas p-4 rounded-lg border border-border mb-6">
        <div className="text-3xl font-extrabold text-brand-cyan mb-1">£6.99 <span className="text-sm font-normal text-secondary">/ month</span></div>
        <p className="text-sm text-secondary">Cancel anytime. Instant cross-platform sync across web and mobile.</p>
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3 px-4 bg-brand-cyan text-canvas font-semibold rounded-lg hover:opacity-95 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Redirecting to Secure Checkout...' : 'Upgrade Now via Stripe'}
      </button>
    </div>
  );
};