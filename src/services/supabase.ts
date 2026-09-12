/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserSessionProfile } from '../types';

let supabaseClient: SupabaseClient | null = null;

export function normalizeSupabaseUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  if (url.endsWith('.supabase.')) {
    url += 'co';
  } else if (url.endsWith('.supabase')) {
    url += '.co';
  }
  
  url = url.replace(/\/+$/, '');
  return url;
}

let currentCachedUrl = '';
let currentCachedKey = '';

export function getSupabaseClient(url?: string, key?: string): SupabaseClient | null {
  const envUrl = typeof window !== 'undefined' ? (import.meta.env.VITE_SUPABASE_URL || '') : '';
  const envKey = typeof window !== 'undefined' ? (import.meta.env.VITE_SUPABASE_ANON_KEY || '') : '';

  // Direct fallbacks for ShiftDrop Android / Capacitor builds
  const FALLBACK_URL = 'https://quobnlitrvxoinptzqoz.supabase.co';
  const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1b2JubGl0cnZ4b2lucHR6cW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODMwNDksImV4cCI6MjEwNDI1OTA0OX0.lWSXYhaWKBWNh3f2BDEpdqETNP5o1p-fS0HEiTIdxKM';

  const finalUrl = normalizeSupabaseUrl(
    url || envUrl || (typeof window !== 'undefined' ? localStorage.getItem('shiftdrop_supabase_url') : '') || FALLBACK_URL
  );
  const finalKey = (
    key || envKey || (typeof window !== 'undefined' ? localStorage.getItem('shiftdrop_supabase_key') : '') || FALLBACK_KEY
  ).trim();

  if (!finalUrl || !finalKey) {
    return null;
  }

  if (!supabaseClient || currentCachedUrl !== finalUrl || currentCachedKey !== finalKey) {
    try {
      supabaseClient = createClient(finalUrl, finalKey);
      currentCachedUrl = finalUrl;
      currentCachedKey = finalKey;
    } catch {
      return null;
    }
  }
  return supabaseClient;
}

export function saveSupabaseConfig(url: string, key: string): { normalizedUrl: string; saved: boolean } {
  const normalized = normalizeSupabaseUrl(url);
  const trimmedKey = key.trim();
  
  if (typeof window !== 'undefined') {
    if (normalized && trimmedKey) {
      localStorage.setItem('shiftdrop_supabase_url', normalized);
      localStorage.setItem('shiftdrop_supabase_key', trimmedKey);
    } else {
      localStorage.removeItem('shiftdrop_supabase_url');
      localStorage.removeItem('shiftdrop_supabase_key');
    }
  }
  
  if (normalized && trimmedKey) {
    try {
      supabaseClient = createClient(normalized, trimmedKey);
      currentCachedUrl = normalized;
      currentCachedKey = trimmedKey;
      return { normalizedUrl: normalized, saved: true };
    } catch {
      supabaseClient = null;
      return { normalizedUrl: normalized, saved: false };
    }
  } else {
    supabaseClient = null;
    currentCachedUrl = '';
    currentCachedKey = '';
    return { normalizedUrl: '', saved: false };
  }
}

export async function testSupabaseConnection(url: string, key: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  normalizedUrl: string;
}> {
  const normalized = normalizeSupabaseUrl(url);
  const trimmedKey = key.trim();

  if (!normalized) {
    return {
      success: false,
      message: 'Please enter your Supabase Project URL.',
      normalizedUrl: '',
    };
  }

  if (!trimmedKey) {
    return {
      success: false,
      message: 'Please enter your Supabase anon/public key.',
      normalizedUrl: normalized,
    };
  }

  try {
    new URL(normalized);
  } catch {
    return {
      success: false,
      message: 'The URL entered is not a valid format. Ensure it starts with https:// and ends with .supabase.co',
      normalizedUrl: normalized,
    };
  }

  const startTime = Date.now();
  try {
    const testClient = createClient(normalized, trimmedKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await testClient.auth.getSession();
    const latency = Date.now() - startTime;

    if (error && error.message.toLowerCase().includes('apikey')) {
      return {
        success: false,
        message: `Invalid API Key: ${error.message}.`,
        normalizedUrl: normalized,
      };
    }

    saveSupabaseConfig(normalized, trimmedKey);

    return {
      success: true,
      message: `Successfully connected to Supabase Cloud! (${latency}ms ping)`,
      latencyMs: latency,
      normalizedUrl: normalized,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Could not reach Supabase: ${err?.message || 'Network error'}`,
      normalizedUrl: normalized,
    };
  }
}

// --------------------------------------------------------------------
// SUPABASE AUTHENTICATION
// --------------------------------------------------------------------

export async function supabaseSignIn(email: string, password: string): Promise<{ profile: UserSessionProfile | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, error: 'Database uninitialised. Please check your connection.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      return { profile: null, error: error.message };
    }

    if (data.user) {
      if (!data.user.email_confirmed_at) {
        await client.auth.signOut();
        return {
          profile: null,
          error: 'Your email address has not been confirmed yet. Please verify your email before signing in.',
        };
      }

      const meta = data.user.user_metadata || {};
      const derivedFullName = meta.full_name || meta.name || email.split('@')[0];
      const profile: UserSessionProfile = {
        id: data.user.id,
        email: data.user.email || email,
        fullName: derivedFullName,
        courierLicenceNumber: meta.courier_licence_number || 'UK-HERMES-8829',
        driverBadgeId: meta.driver_badge_id || 'GB-COURIER-2026',
        phone: meta.phone || '+44 7700 900077',
        isDemoUser: false,
        avatarUrl: meta.avatar_url,
      };
      return { profile, error: null };
    }

    return { profile: null, error: 'User session not found.' };
  } catch (err: any) {
    return { profile: null, error: err.message || 'Supabase authentication failed.' };
  }
}

export async function supabaseSignUp(
  email: string,
  password: string,
  metadata: {
    fullName: string;
    licenceNumber?: string;
    badgeId?: string;
    phone?: string;
    avatarUrl?: string;
  }
): Promise<{ profile: UserSessionProfile | null; error: string | null; isAwaitingVerification?: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, error: 'Database uninitialised.' };
  }

  try {
    // Strictly route email verification to your live production domain
    const redirectUrl = 'https://shiftdrop.co.uk/';

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: metadata.fullName,
          name: metadata.fullName,
          courier_licence_number: metadata.licenceNumber,
          driver_badge_id: metadata.badgeId,
          phone: metadata.phone,
          avatar_url: metadata.avatarUrl,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      return { profile: null, error: error.message };
    }

    // Force sign out immediately so unconfirmed sessions cannot bypass verification
    await client.auth.signOut();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('shiftDrop_driver_profile');
      localStorage.removeItem('shiftDrop_active_module');
    }

    return {
      profile: null,
      error: null,
      isAwaitingVerification: true,
    };
  } catch (err: any) {
    return { profile: null, error: err.message || 'Supabase registration failed.' };
  }
}

export async function supabaseSignOut(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch {}
  }
}

export async function supabaseSignInWithOAuth(provider: 'google' | 'apple'): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Please connect your Supabase project in Settings to use OAuth.' };
  }

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'OAuth initialisation failed' };
  }
}

export function onSupabaseAuthStateChange(callback: (profile: UserSessionProfile | null) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.user && session.user.email_confirmed_at) {
      const meta = session.user.user_metadata || {};
      const derivedFullName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Courier Driver';
      const profile: UserSessionProfile = {
        id: session.user.id,
        email: session.user.email || '',
        fullName: derivedFullName,
        courierLicenceNumber: meta.courier_licence_number || 'UK-HERMES-8829',
        driverBadgeId: meta.driver_badge_id || 'GB-COURIER-2026',
        phone: meta.phone || '+44 7700 900077',
        isDemoUser: false,
        avatarUrl: meta.avatar_url,
      };
      callback(profile);
    } else {
      callback(null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

// --------------------------------------------------------------------
// STORAGE HANDLERS
// --------------------------------------------------------------------

export async function supabaseUploadReceipt(
  userId: string,
  file: Blob | File | string,
  fileName?: string
): Promise<string> {
  const client = getSupabaseClient();
  const safeName = fileName || `receipt_${Date.now()}.jpg`;
  const storagePath = `${userId}/${safeName}`;

  if (client) {
    try {
      let uploadPayload: Blob | File;
      if (typeof file === 'string') {
        const res = await fetch(file);
        uploadPayload = await res.blob();
      } else {
        uploadPayload = file;
      }

      const { data, error } = await client.storage
        .from('fuel-receipts')
        .upload(storagePath, uploadPayload, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (!error && data) {
        const { data: publicUrlData } = client.storage
          .from('fuel-receipts')
          .getPublicUrl(storagePath);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn('Storage upload failed', e);
    }
  }

  return typeof file === 'string' ? file : URL.createObjectURL(file);
}

export async function supabaseUploadVoiceNote(
  userId: string,
  audioBlob: Blob,
  fileName?: string
): Promise<string> {
  const client = getSupabaseClient();
  const safeName = fileName || `voice_${Date.now()}.webm`;
  const storagePath = `${userId}/${safeName}`;

  if (client) {
    try {
      const { data, error } = await client.storage
        .from('drop-voice-notes')
        .upload(storagePath, audioBlob, {
          upsert: true,
          contentType: 'audio/webm',
        });

      if (!error && data) {
        const { data: publicUrlData } = client.storage
          .from('drop-voice-notes')
          .getPublicUrl(storagePath);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn('Voice note upload failed', e);
    }
  }

  return URL.createObjectURL(audioBlob);
}

export async function supabaseUploadEvidencePhoto(
  userId: string,
  photoData: Blob | File | string,
  fileName?: string
): Promise<string> {
  const client = getSupabaseClient();
  const safeName = fileName || `evidence_${Date.now()}.jpg`;
  const storagePath = `${userId}/${safeName}`;

  if (client) {
    try {
      let uploadPayload: Blob | File;
      if (typeof photoData === 'string') {
        const res = await fetch(photoData as string);
        uploadPayload = await res.blob();
      } else {
        uploadPayload = photoData as Blob | File;
      }

      const { data, error } = await client.storage
        .from('parking-evidence')
        .upload(storagePath, uploadPayload, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (!error && data) {
        const { data: publicUrlData } = client.storage
          .from('parking-evidence')
          .getPublicUrl(storagePath);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn('Evidence photo upload failed', e);
    }
  }

  return typeof photoData === 'string' ? photoData : URL.createObjectURL(photoData);
}

export async function seedSupabaseStorageBuckets(): Promise<{
  success: boolean;
  uploadedCount: number;
  files: string[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, uploadedCount: 0, files: [], error: 'Supabase client not initialised' };
  }

  const results: string[] = [];
  try {
    const voiceBlob = new Blob(['UK Courier Audio Note: Gate verified.'], { type: 'text/plain' });
    const { data: vData, error: vErr } = await client.storage
      .from('drop-voice-notes')
      .upload(`samples/voice_${Date.now()}.txt`, voiceBlob, { upsert: true });
    if (!vErr && vData) results.push('drop-voice-notes');

    const pcnBlob = new Blob(['PCN Exemption Loading Window verified.'], { type: 'text/plain' });
    const { data: pData, error: pErr } = await client.storage
      .from('parking-evidence')
      .upload(`samples/pcn_${Date.now()}.txt`, pcnBlob, { upsert: true });
    if (!pErr && pData) results.push('parking-evidence');

    const fuelBlob = new Blob(['Fuel receipt verified.'], { type: 'text/plain' });
    const { data: fData, error: fErr } = await client.storage
      .from('fuel-receipts')
      .upload(`samples/fuel_${Date.now()}.txt`, fuelBlob, { upsert: true });
    if (!fErr && fData) results.push('fuel-receipts');

    return {
      success: results.length > 0,
      uploadedCount: results.length,
      files: results,
    };
  } catch (err: any) {
    return { success: false, uploadedCount: 0, files: [], error: err.message };
  }
}

export const DEMO_USER_PROFILE: UserSessionProfile = {
  id: 'usr_demo_courier_99',
  email: 'driver.uk@shiftdrop.co.uk',
  fullName: 'Jack Davies',
  courierLicenceNumber: 'DAVI881029JK9UK',
  driverBadgeId: 'FLEX-MCR-4402',
  phone: '+44 7700 900551',
  isDemoUser: true,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

// --------------------------------------------------------------------
// SQL SCHEMA EXPORT (Required by DriverSettings.tsx)
// --------------------------------------------------------------------

export const SUPABASE_SQL_SCHEMA_WITH_RLS = `-- ====================================================================
-- ShiftDrop UK Courier Suite - PostgreSQL Database & Storage Schema
-- Zero-cost Supabase Free Tier Configuration
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  courier_licence_number TEXT,
  driver_badge_id TEXT,
  phone TEXT,
  preferred_satnav TEXT DEFAULT 'Google Maps',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Active Shifts Table
CREATE TABLE IF NOT EXISTS public.active_shifts (
  id TEXT PRIMARY KEY,
  courier_id TEXT NOT NULL DEFAULT 'uk_driver_1',
  platform TEXT NOT NULL,
  depot_location TEXT NOT NULL,
  shift_date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  hourly_rate_gbp NUMERIC(10,2) NOT NULL,
  planned_drops INT NOT NULL,
  completed_drops INT NOT NULL,
  undelivered_drops INT NOT NULL,
  gross_earnings_gbp NUMERIC(10,2) NOT NULL,
  mileage_miles NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Parcel Stops Table
CREATE TABLE IF NOT EXISTS public.parcel_stops (
  id TEXT PRIMARY KEY,
  shift_id TEXT,
  stop_number INT NOT NULL,
  tracking_number TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  status TEXT NOT NULL,
  time_slot TEXT,
  access_notes TEXT,
  safe_place_instructions TEXT,
  voice_note_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Registered Vehicles Table
CREATE TABLE IF NOT EXISTS public.registered_vehicles (
  id TEXT PRIMARY KEY,
  registration_plate TEXT NOT NULL,
  make_model TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  caz_compliant BOOLEAN NOT NULL DEFAULT true,
  mot_due_date DATE NOT NULL,
  insurance_due_date DATE NOT NULL,
  current_odometer_miles NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Fuel Expenses Table
CREATE TABLE IF NOT EXISTS public.fuel_expenses (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT,
  date DATE NOT NULL,
  fuel_type TEXT NOT NULL,
  litres_or_kwh NUMERIC(10,2) NOT NULL,
  unit_price_gbp NUMERIC(10,3) NOT NULL,
  total_cost_gbp NUMERIC(10,2) NOT NULL,
  odometer_reading NUMERIC,
  location_name TEXT,
  receipt_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS with Full Read/Write for Anon and Authenticated Couriers
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registered_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Profiles Policy" ON public.profiles;
CREATE POLICY "Public Profiles Policy" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Shifts Policy" ON public.active_shifts;
CREATE POLICY "Public Shifts Policy" ON public.active_shifts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Stops Policy" ON public.parcel_stops;
CREATE POLICY "Public Stops Policy" ON public.parcel_stops FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Vehicles Policy" ON public.registered_vehicles;
CREATE POLICY "Public Vehicles Policy" ON public.registered_vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Fuel Policy" ON public.fuel_expenses;
CREATE POLICY "Public Fuel Policy" ON public.fuel_expenses FOR ALL USING (true) WITH CHECK (true);

-- 7. Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('fuel-receipts', 'fuel-receipts', true),
  ('drop-voice-notes', 'drop-voice-notes', true),
  ('parking-evidence', 'parking-evidence', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 8. Storage RLS Policies: Allow Read, Insert, and Update for Public/Anon & Authenticated
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Storage Upload Access" ON storage.objects;
  DROP POLICY IF EXISTS "Public Storage Read Access" ON storage.objects;
  DROP POLICY IF EXISTS "Public Storage Update Access" ON storage.objects;

  CREATE POLICY "Public Storage Upload Access" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('drop-voice-notes', 'parking-evidence', 'fuel-receipts'));

  CREATE POLICY "Public Storage Read Access" ON storage.objects
    FOR SELECT USING (bucket_id IN ('drop-voice-notes', 'parking-evidence', 'fuel-receipts'));

  CREATE POLICY "Public Storage Update Access" ON storage.objects
    FOR UPDATE USING (bucket_id IN ('drop-voice-notes', 'parking-evidence', 'fuel-receipts'));
EXCEPTION WHEN others THEN
  NULL;
END $$;
`;