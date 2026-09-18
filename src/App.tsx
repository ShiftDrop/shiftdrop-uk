import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { ShieldCheck, CheckCircle2, KeyRound, Lock, AlertCircle } from 'lucide-react';
import {
  ActiveModuleId,
  ParcelStop,
  ActiveShift,
  RegisteredVehicle,
  FuelExpenseLog,
  ParkingEvidence,
  DriverAppSettings,
  VanCompartmentZone,
  CourierNetwork,
  WeatherTelemetry,
  UserSessionProfile,
  ReturnReasonCode,
  DoorstepIntelItem,
} from './types';
import { Header } from './components/Header';
import { ActiveShiftRibbon } from './components/ActiveShiftRibbon';
import { SidebarNav } from './components/SidebarNav';
import { AuthPortal } from './components/modules/AuthPortal';
import { InCabHomeHub } from './components/modules/InCabHomeHub';
import { ActiveCabHUD } from './components/modules/ActiveCabHUD';
import { RealTimeEarningsStream } from './components/modules/RealTimeEarningsStream';
import { SpatialLoadIn } from './components/modules/SpatialLoadIn';
import { DoorstepIntelVault } from './components/modules/DoorstepIntelVault';
import { ShiftProfitCalculator } from './components/modules/ShiftProfitCalculator';
import { DepotReturnsDebrief } from './components/modules/DepotReturnsDebrief';
import { PayRadar } from './components/modules/PayRadar';
import { VehicleGarage } from './components/modules/VehicleGarage';
import { PCNShield } from './components/modules/PCNShield';
import { HMRCVault } from './components/modules/HMRCVault';
import { DriverSettings } from './components/modules/DriverSettings';
import { ExternalPortals } from './components/modules/ExternalPortals';
import { SettingsModal } from './components/modules/SettingsModal';
import { ProUpgrade } from './components/modules/ProUpgrade';
import { VoiceAssistantHUD } from './components/VoiceAssistantHUD';
import { ShareWorkstationModal } from './components/ShareWorkstationModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppSplashScreen } from './components/AppSplashScreen';
import { useShiftStore } from './stores/shiftStore';
import {
  saveParcelStopsToSupabase,
  saveShiftToSupabase,
} from './services/db';
import { calculateHMRCTaxMetrics } from './services/hmrc';
import { fetchUkWeatherTelemetry, triggerHapticFeedback, speakUkVoicePrompt } from './services/telemetry';
import { 
  onSupabaseAuthStateChange, 
  getSupabaseClient,
  setupAppUrlListener,
} from './services/supabase';
import { setupRevenueCat, checkProStatus } from './services/billing';

const PRO_ONLY_MODULES: ActiveModuleId[] = [
  'doorstep',
  'calculator',
  'radar',
  'pcn',
  'hmrc',
];

const getScopedKey = (key: string, userId?: string) => {
  return userId ? `shiftDrop_${userId}_${key}` : `shiftDrop_anon_${key}`;
};

export default function App() {
  const [userProfile, setUserProfile] = useState<UserSessionProfile | null>(null);
  const [activeModule, setActiveModule] = useState<ActiveModuleId>('auth');

  // Hydrate local offline Zustand store on startup
  const loadShifts = useShiftStore((state) => state.loadShifts);
  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // MFA Challenge State
  const [isMfaChallenged, setIsMfaChallenged] = useState(false);
  const [mfaChallengeCode, setMfaChallengeCode] = useState('');
  const [mfaChallengeLoading, setMfaChallengeLoading] = useState(false);
  const [mfaChallengeError, setMfaChallengeError] = useState('');

  // PWA Install Prompt Listener
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  // Native Deep Link / URL Scheme Listener for Capacitor
  useEffect(() => {
    const cleanupDeepLinks = setupAppUrlListener();
    return () => {
      cleanupDeepLinks();
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (userProfile?.id && activeModule && activeModule !== 'auth' && activeModule !== 'pro') {
      localStorage.setItem(getScopedKey('active_module', userProfile.id), activeModule);
    }
  }, [activeModule, userProfile?.id]);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);
  const [activePortal, setActivePortal] = useState<'landing' | 'studio' | null>(null);

  const [isNativePro, setIsNativePro] = useState(() => {
    return localStorage.getItem('shiftDrop_isPro') === 'true';
  });

  const isProUser =
    isNativePro ||
    userProfile?.subscriptionTier === 'pro' ||
    (userProfile as any)?.subscription_tier === 'pro' ||
    (userProfile as any)?.is_pro === true ||
    localStorage.getItem('shiftDrop_isPro') === 'true' ||
    localStorage.getItem(getScopedKey('isPro', userProfile?.id)) === 'true';

  const [stops, setStops] = useState<ParcelStop[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<ActiveShift[]>([]);
  const [vehicles, setVehicles] = useState<RegisteredVehicle[]>([]);
  const [fuelExpenses, setFuelExpenses] = useState<FuelExpenseLog[]>([]);
  const [parkingRecords, setParkingRecords] = useState<ParkingEvidence[]>([]);
  const [doorstepIntelList, setDoorstepIntelList] = useState<DoorstepIntelItem[]>([]);

  const handleUpdateUserProfile = useCallback((newProfile: UserSessionProfile | null) => {
    const previousId = userProfile?.id;

    if (newProfile) {
      localStorage.setItem('shiftDrop_driver_profile', JSON.stringify(newProfile));

      const userIntel = localStorage.getItem(getScopedKey('doorstep_intel', newProfile.id));
      setDoorstepIntelList(userIntel ? JSON.parse(userIntel) : []);

      const userModule = localStorage.getItem(getScopedKey('active_module', newProfile.id));
      if (userModule && userModule !== 'auth' && userModule !== 'pro') {
        setActiveModule(userModule as ActiveModuleId);
      } else {
        setActiveModule('hub');
      }
    } else {
      if (previousId) {
        localStorage.removeItem(getScopedKey('doorstep_intel', previousId));
        localStorage.removeItem(getScopedKey('active_module', previousId));
        localStorage.removeItem(getScopedKey('isPro', previousId));
      }
      localStorage.removeItem('shiftDrop_driver_profile');
      localStorage.removeItem('shiftDrop_active_module');
      localStorage.removeItem('shiftDrop_doorstep_intel');
      localStorage.removeItem('shiftDrop_isPro');

      setStops([]);
      setActiveShift(null);
      setShiftHistory([]);
      setVehicles([]);
      setFuelExpenses([]);
      setParkingRecords([]);
      setDoorstepIntelList([]);
      setIsNativePro(false);
      setActiveModule('auth');
    }

    setUserProfile(newProfile);
  }, [userProfile?.id]);

  useEffect(() => {
    async function restoreSessionAndHandleVerification() {
      const client = getSupabaseClient();
      if (!client) return;

      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        const search = window.location.search;

        if (hash.includes('type=recovery')) {
          setIsResettingPassword(true);
          return;
        }

        if (hash.includes('access_token') || hash.includes('type=signup') || search.includes('code=')) {
          const { data, error } = await client.auth.getSession();
          if (!error && data.session?.user?.email_confirmed_at) {
            window.history.replaceState(null, '', window.location.pathname);
            triggerHapticFeedback('success');
            speakUkVoicePrompt('Email address verified successfully. Welcome to ShiftDrop.');
          }
        }
      }

      const { data } = await client.auth.getSession();
      if (data.session?.user && data.session.user.email_confirmed_at) {
        // Check if an unverified MFA challenge is pending
        const factors = await client.auth.mfa.listFactors();
        const verifiedFactor = factors.data?.totp.find((f) => f.status === 'verified');
        if (verifiedFactor) {
          const aal = client.auth.mfa.getAuthenticatorAssuranceLevel();
          if ((await aal).data?.currentLevel === 'aal1') {
            setIsMfaChallenged(true);
            return;
          }
        }

        const saved = localStorage.getItem('shiftDrop_driver_profile');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUserProfile(parsed);
            const userModule = localStorage.getItem(getScopedKey('active_module', parsed.id));
            setActiveModule((userModule as ActiveModuleId) || 'hub');
          } catch (e) {}
        }
      } else {
        setUserProfile(null);
        setActiveModule('auth');
      }
    }
    restoreSessionAndHandleVerification();
  }, []);

  // 15-Minute Background Inactivity Auto-Lock
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backgroundEpoch = Date.now();

    const checkLock = async () => {
      const isBioEnabled = localStorage.getItem('shiftDrop_biometrics_enabled') === 'true';
      if (!isBioEnabled) return;

      const elapsedMinutes = (Date.now() - backgroundEpoch) / (1000 * 60);
      if (elapsedMinutes >= 15) {
        try {
          const { authenticateWithBiometrics } = await import('./services/biometrics');
          await authenticateWithBiometrics('Session timed out. Re-authenticate to access ShiftDrop.');
        } catch {}
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        backgroundEpoch = Date.now();
      } else {
        checkLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const { data: { subscription } } = client.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSupabaseAuthStateChange(async (profile) => {
      if (profile) {
        const client = getSupabaseClient();
        if (client) {
          const { data } = await client.auth.getSession();
          if (data.session?.user && !data.session.user.email_confirmed_at) {
            setUserProfile(null);
            return;
          }
        }

        handleUpdateUserProfile(profile);
        await setupRevenueCat(profile.id);
        const hasNativePro = await checkProStatus();
        if (hasNativePro) setIsNativePro(true);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, [handleUpdateUserProfile]);

  useEffect(() => {
    async function syncNativeBilling() {
      if (userProfile?.id) {
        await setupRevenueCat(userProfile.id);
        const hasNativePro = await checkProStatus();
        if (hasNativePro) setIsNativePro(true);
      }
    }
    syncNativeBilling();
  }, [userProfile?.id]);

  // Handle Pro Upgrade Web Redirect and sync permanently with Supabase Auth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      setIsNativePro(true);
      localStorage.setItem('shiftDrop_isPro', 'true');

      let courierId = userProfile?.id;
      if (!courierId) {
        const saved = localStorage.getItem('shiftDrop_driver_profile');
        if (saved) {
          try {
            courierId = JSON.parse(saved).id;
          } catch {}
        }
      }

      if (courierId) {
        localStorage.setItem(getScopedKey('isPro', courierId), 'true');
      }

      const client = getSupabaseClient();
      if (client) {
        client.auth.updateUser({
          data: { subscription_tier: 'pro', is_pro: true },
        }).catch(() => {});
      }

      if (userProfile) {
        handleUpdateUserProfile({
          ...userProfile,
          subscriptionTier: 'pro',
        });
      }

      triggerHapticFeedback('success');
      speakUkVoicePrompt('ShiftDrop PRO activated! All vaults unlocked.');
      window.history.replaceState({}, document.title, window.location.pathname);
      setActiveModule('hub');
    } else if (params.get('upgrade') === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setActiveModule('hub');
    }
  }, [userProfile, handleUpdateUserProfile]);

  const handleNavigateToModule = useCallback(
    (mod: ActiveModuleId) => {
      const isProModule = PRO_ONLY_MODULES.includes(mod);

      if (isProModule && !isProUser) {
        setActiveModule('pro');
        setActivePortal(null);
      } else {
        setActiveModule(mod);
        if (mod === 'landing' || mod === 'studio') {
          setActivePortal(mod as 'landing' | 'studio');
        } else {
          setActivePortal(null);
        }
      }
    },
    [isProUser]
  );

  const [weather, setWeather] = useState<WeatherTelemetry | null>(null);

  const handleAddDoorstepIntel = (newItem: DoorstepIntelItem) => {
    setDoorstepIntelList((prev) => {
      const updated = [newItem, ...prev];
      if (userProfile?.id) {
        localStorage.setItem(getScopedKey('doorstep_intel', userProfile.id), JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleUpvoteDoorstepIntel = (id: string) => {
    setDoorstepIntelList((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item
      );
      if (userProfile?.id) {
        localStorage.setItem(getScopedKey('doorstep_intel', userProfile.id), JSON.stringify(updated));
      }
      return updated;
    });
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(() => Capacitor.isNativePlatform());
  const [settings, setSettings] = useState<DriverAppSettings>({
    isDarkMode: true,
    isVoiceGuidanceEnabled: true,
    isHapticFeedbackEnabled: true,
    isFrostWarningAlertActive: true,
    isAutoCloudSyncEnabled: true,
    preferredSatNavApp: 'Google Maps',
    soundVolume: 0.9,
    voiceGenderPreference: 'en-GB-Male',
    supabaseUrl: '',
    supabaseAnonKey: '',
    offlineVoiceNoteQueueCount: 0,
    isGeofencedAutoCheckInEnabled: true,
  });

  // Fetch Live Weather Telemetry with Cached Geo & Silent Fallback
  useEffect(() => {
    async function loadLiveWeather() {
      try {
        let lat = 53.4808;
        let lon = -2.2426;
        let city = 'UK Region';

        const cachedGeo = localStorage.getItem('shiftDrop_cached_geo');
        if (cachedGeo) {
          try {
            const parsed = JSON.parse(cachedGeo);
            lat = parsed.lat;
            lon = parsed.lon;
            city = parsed.city || 'Current Location';
          } catch {}
        }

        try {
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 12000,
            maximumAge: 600000,
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          city = 'Current Location';
          localStorage.setItem('shiftDrop_cached_geo', JSON.stringify({ lat, lon, city }));
        } catch {}

        const data = await fetchUkWeatherTelemetry(lat, lon, city);
        setWeather(data);
      } catch {}
    }
    loadLiveWeather();
  }, []);

  // Fetch Supabase Cloud Data strictly for the authenticated courier
  useEffect(() => {
    if (!userProfile || !userProfile.id || userProfile.isDemoUser) {
      setStops([]);
      setActiveShift(null);
      setShiftHistory([]);
      setVehicles([]);
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;
    const currentProfileId = userProfile.id;

    async function fetchCloudData() {
      if (!client) return;
      try {
        const { data: remoteShifts, error: shiftError } = await client
          .from('active_shifts')
          .select('*')
          .eq('courier_id', currentProfileId)
          .order('clock_in_time', { ascending: false });

        if (!shiftError && remoteShifts) {
          const formattedShifts: ActiveShift[] = remoteShifts.map((s: any) => {
            const isCurrentlyActive =
              String(s.status).toLowerCase() === 'active' && !s.clock_out_time;

            return {
              id: s.id,
              network: s.platform || 'Amazon Flex',
              startTime: s.clock_in_time,
              endTime: s.clock_out_time,
              startingOdometer: Number(s.starting_odometer) || 0,
              currentOdometer: Number(s.mileage_miles) || 0,
              agreedBlockRate: Number(s.hourly_rate_gbp) || 0,
              bonusPay: 0,
              stops: [],
              isActive: isCurrentlyActive,
              notes: s.depot_location ? `Depot: ${s.depot_location}` : '',
              totalMilesDriven: Number(s.mileage_miles) || 0,
            };
          });

          setShiftHistory(formattedShifts);
          const active = formattedShifts.find((sh) => sh.isActive);
          if (active) setActiveShift(active);
          else setActiveShift(null);
        }

        const { data: remoteStops, error: stopError } = await client
          .from('parcel_stops')
          .select('*')
          .eq('user_id', currentProfileId);

        if (!stopError && remoteStops) {
          const formattedStops: ParcelStop[] = remoteStops.map((p: any, idx: number) => ({
            id: p.id,
            stopNumber: idx + 1,
            trackingNumber: p.tracking_number,
            recipientName: p.recipient_name,
            address: `${p.address_line1 || ''}, ${p.city || ''}`,
            addressLine1: p.address_line1 || '',
            townCity: p.city || 'UK',
            postcode: p.postcode,
            status: p.status,
            assignedZone: p.assigned_zone || 'Front Seat',
            voiceNoteUrl: p.voice_note_url,
            deliveryTimestamp: p.delivery_timestamp,
            returnReason: p.return_reason,
            parcelSize: p.parcel_size || 'Medium Box',
            gateAccessCode: p.gate_code || p.gate_access_code || '',
            customerInstructions: p.customer_instructions || p.instructions || '',
          } as unknown as ParcelStop));
          setStops(formattedStops);
        }
      } catch {}
    }

    fetchCloudData();
  }, [userProfile]);

  // Supabase Postgres Realtime Subscription for parcel_stops
  useEffect(() => {
    if (!userProfile?.id) return;
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel(`public:parcel_stops:${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcel_stops',
          filter: `user_id=eq.${userProfile.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const p: any = payload.new;
            const newStop: ParcelStop = {
              id: p.id,
              stopNumber: stops.length + 1,
              trackingNumber: p.tracking_number,
              recipientName: p.recipient_name,
              address: `${p.address_line1 || ''}, ${p.city || ''}`,
              addressLine1: p.address_line1 || '',
              townCity: p.city || 'UK',
              postcode: p.postcode,
              status: p.status,
              assignedZone: p.assigned_zone || 'Front Seat',
              voiceNoteUrl: p.voice_note_url,
              deliveryTimestamp: p.delivery_timestamp,
              returnReason: p.return_reason,
              parcelSize: p.parcel_size || 'Medium Box',
              gateAccessCode: p.gate_code || p.gate_access_code || '',
              customerInstructions: p.customer_instructions || p.instructions || '',
            } as unknown as ParcelStop;

            setStops((prev) => [newStop, ...prev.filter((s) => s.id !== newStop.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const p: any = payload.new;
            setStops((prev) =>
              prev.map((s) =>
                s.id === p.id
                  ? ({
                      ...s,
                      status: p.status,
                      deliveryTimestamp: p.delivery_timestamp,
                      voiceNoteUrl: p.voice_note_url,
                      returnReason: p.return_reason,
                      assignedZone: p.assigned_zone || s.assignedZone,
                    } as ParcelStop)
                  : s
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setStops((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userProfile?.id, stops.length]);

  useEffect(() => {
    if (userProfile?.id && stops.length > 0) {
      saveParcelStopsToSupabase(stops).catch(() => {});
    }
  }, [stops, userProfile?.id]);

  const taxMetrics = calculateHMRCTaxMetrics(shiftHistory);

  const handleStartShift = useCallback(
    (network: CourierNetwork, startOdo: number, agreedRate: number, bonus: number) => {
      triggerHapticFeedback('success');
      const newShift: ActiveShift = {
        id: crypto.randomUUID(),
        network,
        startTime: new Date().toISOString(),
        startingOdometer: startOdo,
        currentOdometer: startOdo,
        agreedBlockRate: agreedRate,
        bonusPay: bonus,
        stops,
        isActive: true,
        notes: `${network} active delivery block`,
        totalMilesDriven: 0,
      };

      setActiveShift(newShift);
      saveShiftToSupabase(newShift).catch(() => {});
      speakUkVoicePrompt(`Shift initiated for ${network}. Stay safe out on the road!`);
      setActiveModule('hud');
    },
    [stops]
  );

  const handleEndShift = useCallback(() => {
    if (!activeShift) return;
    triggerHapticFeedback('success');
    const finished: ActiveShift = {
      ...activeShift,
      isActive: false,
      endTime: new Date().toISOString(),
    };

    setShiftHistory((prev) => [finished, ...prev]);
    setActiveShift(null);
    saveShiftToSupabase(finished).catch(() => {});
    speakUkVoicePrompt('Shift completed! Great job today.');
    setActiveModule('hub');
  }, [activeShift]);

  const handleDeleteShiftFromState = useCallback((shiftId: string) => {
    setShiftHistory((prev) => prev.filter((s) => s.id !== shiftId));
  }, []);

  const handleUpdateOdometer = useCallback(
    (newOdo: number) => {
      if (!activeShift) return;
      const miles = Math.max(0, newOdo - activeShift.startingOdometer);
      const updated: ActiveShift = {
        ...activeShift,
        currentOdometer: newOdo,
        totalMilesDriven: miles,
      };
      setActiveShift(updated);
    },
    [activeShift]
  );

  const handleConfirmDrop = useCallback(async (stopId: string, voiceNoteUrl?: string) => {
    triggerHapticFeedback('success');
    const now = new Date().toISOString();

    setStops((prev) =>
      prev.map((s) => {
        if (s.id === stopId) {
          return {
            ...s,
            status: 'Delivered' as const,
            deliveryTimestamp: now,
            voiceNoteUrl: voiceNoteUrl || s.voiceNoteUrl,
          };
        }
        return s;
      })
    );

    const client = getSupabaseClient();
    if (client && userProfile?.id) {
      try {
        const { error } = await client
          .from('parcel_stops')
          .update({
            status: 'Delivered',
            delivery_timestamp: now,
            voice_note_url: voiceNoteUrl || null,
          })
          .eq('id', stopId)
          .eq('user_id', userProfile.id);

        if (!error) {
          speakUkVoicePrompt('Drop confirmed delivered.');
        }
      } catch {}
    }
  }, [userProfile?.id]);

  const handleReturnDrop = useCallback(async (stopId: string, reason: ReturnReasonCode) => {
    triggerHapticFeedback('warning');

    setStops((prev) =>
      prev.map((s) => {
        if (s.id === stopId) {
          return {
            ...s,
            status: 'Returned' as const,
            returnReason: reason,
          };
        }
        return s;
      })
    );

    const client = getSupabaseClient();
    if (client && userProfile?.id) {
      try {
        await client
          .from('parcel_stops')
          .update({
            status: 'Returned',
            return_reason: reason,
          })
          .eq('id', stopId)
          .eq('user_id', userProfile.id);
      } catch {}
    }
  }, [userProfile?.id]);

  const handleUpdateParcelZone = useCallback((stopId: string, zone: VanCompartmentZone) => {
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, assignedZone: zone } : s))
    );
  }, []);

  const handleAddScannedParcel = useCallback((parcel: Partial<ParcelStop>) => {
    setStops((prev) => [parcel as ParcelStop, ...prev]);
  }, []);

  const handleCheckInReturn = useCallback((stopId: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, status: 'Delivered' as const } : s))
    );
  }, []);

  const handleClearAllReturns = useCallback(() => {
    setStops((prev) =>
      prev.map((s) => (s.status === 'Returned' ? { ...s, status: 'Pending' as const } : s))
    );
  }, []);

  const handleAddVehicle = useCallback((veh: RegisteredVehicle) => {
    setVehicles((prev) => [veh, ...prev]);
  }, []);

  const handleAddExpense = useCallback((exp: FuelExpenseLog) => {
    setFuelExpenses((prev) => [exp, ...prev]);
  }, []);

  const handleAddParkingRecord = useCallback((rec: ParkingEvidence) => {
    setParkingRecords((prev) => [rec, ...prev]);
  }, []);

  const handleSyncOfflineQueue = useCallback(() => {
    setSettings((prev) => ({ ...prev, offlineVoiceNoteQueueCount: 0 }));
  }, []);

  const pendingCount = stops.filter((s) => s.status === 'Pending').length;
  const returnsCount = stops.filter((s) => s.status === 'Returned').length;

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle Setting New Password from Recovery Flow
  const handleUpdateNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setResetPasswordError('Password must be at least 6 characters long.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    setResetPasswordLoading(true);
    setResetPasswordError('');

    try {
      const { error } = await client.auth.updateUser({
        password: newPasswordInput,
      });

      if (error) throw error;

      setIsResettingPassword(false);
      setNewPasswordInput('');
      triggerHapticFeedback('success');
      speakUkVoicePrompt('Password updated successfully. Session active.');
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err: any) {
      setResetPasswordError(err.message || 'Unable to update password.');
      triggerHapticFeedback('warning');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // MFA Challenge Overlay Submit Handler
  const handleVerifyMfaChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaChallengeCode.trim().length !== 6) {
      setMfaChallengeError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    setMfaChallengeLoading(true);
    setMfaChallengeError('');

    try {
      const factors = await client.auth.mfa.listFactors();
      const verified = factors.data?.totp.find((f) => f.status === 'verified');
      if (!verified) throw new Error('No verified authenticator factor found.');

      const challenge = await client.auth.mfa.challenge({ factorId: verified.id });
      if (challenge.error) throw challenge.error;

      const verify = await client.auth.mfa.verify({
        factorId: verified.id,
        challengeId: challenge.data.id,
        code: mfaChallengeCode.trim(),
      });

      if (verify.error) throw verify.error;

      setIsMfaChallenged(false);
      triggerHapticFeedback('success');
      window.location.reload();
    } catch (err: any) {
      setMfaChallengeError(err.message || 'Invalid code. Please try again.');
    } finally {
      setMfaChallengeLoading(false);
    }
  };

  // Dedicated Password Recovery Overlay
  if (isResettingPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-canvas text-primary font-sans">
        <div className="bg-surface border border-brand-cyan/40 rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">Set New Password</h3>
              <p className="text-xs text-secondary">
                Enter a secure new password for your ShiftDrop account.
              </p>
            </div>
          </div>

          {resetPasswordError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetPasswordError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateNewPassword} className="space-y-4">
            <div className="relative">
              <Lock className="w-5 h-5 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                autoFocus
                placeholder="New Password (min 6 chars)"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full bg-inset border border-subtle rounded-xl py-3 pl-10 pr-4 text-sm text-primary focus:outline-none focus:border-brand-cyan"
              />
            </div>

            <button
              type="submit"
              disabled={resetPasswordLoading || newPasswordInput.length < 6}
              className="w-full py-3 rounded-xl bg-brand-cyan text-canvas font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-md shadow-cyan-500/20"
            >
              {resetPasswordLoading ? 'Updating Password...' : 'Save & Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (activeModule === 'auth' || !userProfile || !userProfile.id || isMfaChallenged) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas text-primary font-sans">
        <main className="flex-1 flex items-center justify-center p-4">
          {isMfaChallenged ? (
            <div className="bg-surface border border-brand-cyan/40 rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Two-Factor Authentication</h3>
                  <p className="text-xs text-secondary">
                    Enter the 6-digit verification code from your authenticator app
                  </p>
                </div>
              </div>

              {mfaChallengeError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                  {mfaChallengeError}
                </div>
              )}

              <form onSubmit={handleVerifyMfaChallenge} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  pattern="[0-9]*"
                  required
                  autoFocus
                  placeholder="000000"
                  value={mfaChallengeCode}
                  onChange={(e) => setMfaChallengeCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-inset border border-subtle rounded-xl py-3 px-4 text-center font-mono text-xl tracking-widest text-primary focus:outline-none focus:border-brand-cyan"
                />

                <button
                  type="submit"
                  disabled={mfaChallengeLoading || mfaChallengeCode.length !== 6}
                  className="w-full py-3 rounded-xl bg-brand-cyan text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {mfaChallengeLoading ? 'Verifying Code...' : 'Authenticate'}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const client = getSupabaseClient();
                    if (client) await client.auth.signOut();
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full text-center text-xs text-secondary hover:text-primary transition-colors pt-2 cursor-pointer"
                >
                  Cancel &amp; Sign Out
                </button>
              </form>
            </div>
          ) : (
            <AuthPortal
              userProfile={userProfile}
              onUpdateUserProfile={handleUpdateUserProfile}
              onContinueToHub={() => setActiveModule('hub')}
            />
          )}
        </main>
        {showSplash && (
          <AppSplashScreen
            duration={1500}
            onComplete={() => setShowSplash(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors selection:bg-brand-cyan selection:text-canvas bg-canvas text-primary"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Header
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenSidebar={() => setIsOpenMobileSidebar(true)}
        weather={weather}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenPortal={(portal) => {
          setActivePortal(portal);
          if (portal === 'landing') handleNavigateToModule('landing');
          else if (portal === 'studio') handleNavigateToModule('studio');
        }}
        activePortal={activePortal}
        userProfile={userProfile}
        onOpenAuth={() => setActiveModule('auth')}
        onToggleVoice={() => setIsVoiceOpen((prev) => !prev)}
        isVoiceActive={isVoiceOpen}
      />

      <ActiveShiftRibbon
        activeShift={activeShift}
        onEndShift={handleEndShift}
        onUpdateOdometer={handleUpdateOdometer}
      />

      <div className="flex-1 flex overflow-hidden">
        <SidebarNav
          activeModule={activeModule}
          onSelectModule={handleNavigateToModule}
          isCollapsedDesktop={isCollapsedDesktop}
          onToggleCollapseDesktop={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
          pendingDropsCount={pendingCount}
          returnsCount={returnsCount}
          isOpenMobileSidebar={isOpenMobileSidebar}
          onCloseMobileSidebar={() => setIsOpenMobileSidebar(false)}
          isProUser={isProUser}
        />

        <main className="flex-1 overflow-y-auto p-2 sm:p-4 pb-6 lg:pb-8">
          {activeModule === 'hub' && (
            <InCabHomeHub
              activeShift={activeShift}
              shiftHistory={shiftHistory}
              weather={weather}
              taxMetrics={taxMetrics}
              onStartShift={handleStartShift}
              onNavigateTo={handleNavigateToModule}
              isProUser={isProUser}
            />
          )}

          {activeModule === 'hud' && (
            <ActiveCabHUD
              stops={stops}
              taxMetrics={taxMetrics}
              settings={settings}
              doorstepIntelList={doorstepIntelList}
              onNavigateToDoorstepVault={() => handleNavigateToModule('doorstep')}
              onConfirmDrop={handleConfirmDrop}
              onReturnDrop={handleReturnDrop}
              onSelectStop={() => {}}
            />
          )}

          {activeModule === 'realtime' && (
            <RealTimeEarningsStream
              stops={stops}
              activeShift={
                activeShift || {
                  id: '',
                  network: 'Amazon Flex',
                  startTime: '',
                  startingOdometer: 0,
                  currentOdometer: 0,
                  agreedBlockRate: 0,
                  bonusPay: 0,
                  stops: [],
                  isActive: false,
                  notes: '',
                  totalMilesDriven: 0,
                }
              }
              taxMetrics={taxMetrics}
              onConfirmDrop={handleConfirmDrop}
            />
          )}

          {activeModule === 'loadin' && (
            <SpatialLoadIn
              stops={stops}
              onUpdateParcelZone={handleUpdateParcelZone}
              onAddScannedParcel={handleAddScannedParcel}
            />
          )}

          {activeModule === 'doorstep' && (
            <DoorstepIntelVault
              intelList={doorstepIntelList}
              onAddIntel={handleAddDoorstepIntel}
              onUpvoteIntel={handleUpvoteDoorstepIntel}
            />
          )}

          {activeModule === 'returns' && (
            <DepotReturnsDebrief
              stops={stops}
              onCheckInReturn={handleCheckInReturn}
              onClearAllReturns={handleClearAllReturns}
            />
          )}

          {activeModule === 'calculator' && (
            <ShiftProfitCalculator
              onLaunchShiftFromCalculator={(network, rate, bonus) => {
                handleStartShift(network, activeShift?.currentOdometer || 0, rate, bonus);
                handleNavigateToModule('hud');
              }}
            />
          )}

          {activeModule === 'radar' && <PayRadar />}

          {activeModule === 'garage' && (
            <VehicleGarage
              vehicles={vehicles}
              onAddVehicle={handleAddVehicle}
              onUpdateTyres={() => {}}
              onAddExpense={handleAddExpense}
              fuelExpenses={fuelExpenses}
            />
          )}

          {activeModule === 'pcn' && (
            <PCNShield
              parkingRecords={parkingRecords}
              onAddParkingRecord={handleAddParkingRecord}
            />
          )}

          {activeModule === 'hmrc' && (
            <HMRCVault
              shifts={shiftHistory}
              taxMetrics={taxMetrics}
              onDeleteShift={handleDeleteShiftFromState}
            />
          )}

          {activeModule === 'pro' && (
            isProUser ? (
              <div className="max-w-xl mx-auto my-12 p-8 bg-surface border border-brand-emerald/40 rounded-3xl text-center space-y-5 shadow-2xl font-mono animate-fade-in">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-emerald/15 border border-brand-emerald/30 flex items-center justify-center text-brand-emerald">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 font-bold">
                    PRO SUBSCRIPTION ACTIVE
                  </span>
                  <h2 className="text-2xl font-black text-primary mt-2">ShiftDrop PRO Membership</h2>
                  <p className="text-xs text-secondary font-sans max-w-sm mx-auto">
                    Your account is fully activated. All in-cab tools, HMRC AMAP tax shields, Doorstep Intel, and Pay Radar benchmarks are unlocked.
                  </p>
                </div>
                <div className="p-4 bg-inset rounded-2xl border border-subtle text-left space-y-2 text-xs font-sans">
                  <div className="flex items-center gap-2 text-brand-emerald font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>HMRC AMAP Mileage Vault (45p/mi)</span>
                  </div>
                  <div className="flex items-center gap-2 text-brand-emerald font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Doorstep Intel &amp; Gate Code Vault</span>
                  </div>
                  <div className="flex items-center gap-2 text-brand-emerald font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Shift Profit &amp; Real Hourly Rate Engine</span>
                  </div>
                  <div className="flex items-center gap-2 text-brand-emerald font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>UK Courier Pay Radar Benchmarks</span>
                  </div>
                  <div className="flex items-center gap-2 text-brand-emerald font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PCN Shield &amp; Loading Exemption Proofs</span>
                  </div>
                </div>
                <button
                  onClick={() => handleNavigateToModule('hub')}
                  className="w-full py-3.5 rounded-xl bg-linear-to-r from-brand-cyan to-brand-emerald text-canvas font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-lg cursor-pointer"
                >
                  Return to Workstation Hub
                </button>
              </div>
            ) : (
              <ProUpgrade
                onUpgradeComplete={() => {
                  setIsNativePro(true);
                  localStorage.setItem('shiftDrop_isPro', 'true');
                  if (userProfile?.id) {
                    localStorage.setItem(getScopedKey('isPro', userProfile.id), 'true');
                  }
                  handleNavigateToModule('hub');
                }}
              />
            )
          )}

          {activeModule === 'settings' && (
            <DriverSettings
              settings={settings}
              onUpdateSettings={setSettings}
              onSyncOfflineQueue={handleSyncOfflineQueue}
            />
          )}

          {(activeModule === 'landing' || activeModule === 'studio') && (
            <ExternalPortals
              initialPortal={activeModule === 'studio' ? 'studio' : 'landing'}
              onReturnToApp={() => {
                setActivePortal(null);
                handleNavigateToModule('hub');
              }}
            />
          )}
        </main>
      </div>

      <VoiceAssistantHUD
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        stops={stops}
        currentStop={stops.find((s) => s.status === 'Pending')}
        activeShift={activeShift || undefined}
        taxMetrics={taxMetrics}
        onConfirmDrop={handleConfirmDrop}
        onEndShift={handleEndShift}
      />

      <ShareWorkstationModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        stops={stops}
        activeShift={
          activeShift || {
            id: '',
            network: 'Amazon Flex',
            startTime: '',
            startingOdometer: 0,
            currentOdometer: 0,
            agreedBlockRate: 0,
            bonusPay: 0,
            stops: [],
            isActive: false,
            notes: '',
            totalMilesDriven: 0,
          }
        }
      />

      <OfflineIndicator />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onSyncOfflineQueue={handleSyncOfflineQueue}
      />

      {showSplash && (
        <AppSplashScreen
          duration={1500}
          onComplete={() => setShowSplash(false)}
        />
      )}
    </div>
  );
}