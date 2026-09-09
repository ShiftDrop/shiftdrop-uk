import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
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
import {
  loadInitialDataFromSupabase,
  saveParcelStopsToSupabase,
  saveShiftToSupabase,
} from './services/db';
import { calculateHMRCTaxMetrics } from './services/hmrc';
import { fetchUkWeatherTelemetry, triggerHapticFeedback, speakUkVoicePrompt } from './services/telemetry';
import { onSupabaseAuthStateChange, getSupabaseClient } from './services/supabase';

export default function App() {
  // Navigation & Layout (Defaults to 'auth' if no profile is saved)
  const [activeModule, setActiveModule] = useState<ActiveModuleId>(() => {
    try {
      const saved = localStorage.getItem('shiftDrop_driver_profile');
      return saved ? 'hub' : 'auth';
    } catch (e) {
      return 'auth';
    }
  });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);
  const [activePortal, setActivePortal] = useState<'landing' | 'studio' | null>(null);

  // Authentication Profile
  const [userProfile, setUserProfile] = useState<UserSessionProfile | null>(() => {
    try {
      const saved = localStorage.getItem('shiftDrop_driver_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const handleUpdateUserProfile = (profile: UserSessionProfile | null) => {
    setUserProfile(profile);
    if (profile) {
      localStorage.setItem('shiftDrop_driver_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('shiftDrop_driver_profile');
    }
  };

  useEffect(() => {
    const unsubscribe = onSupabaseAuthStateChange((profile) => {
      if (profile) {
        handleUpdateUserProfile(profile);
      }
    });
    return () => unsubscribe();
  }, []);

  // Live Weather Telemetry
  const [weather, setWeather] = useState<WeatherTelemetry | null>(null);

  // Core Shifts & Parcels (Initialized empty for production use)
  const [stops, setStops] = useState<ParcelStop[]>([]);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<ActiveShift[]>([]);
  const [vehicles, setVehicles] = useState<RegisteredVehicle[]>([]);
  const [fuelExpenses, setFuelExpenses] = useState<FuelExpenseLog[]>([]);
  const [parkingRecords, setParkingRecords] = useState<ParkingEvidence[]>([]);
  const [doorstepIntelList, setDoorstepIntelList] = useState<DoorstepIntelItem[]>(() => {
    try {
      const saved = localStorage.getItem('shiftDrop_doorstep_intel');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const handleAddDoorstepIntel = (newItem: DoorstepIntelItem) => {
    setDoorstepIntelList((prev) => {
      const updated = [newItem, ...prev];
      localStorage.setItem('shiftDrop_doorstep_intel', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpvoteDoorstepIntel = (id: string) => {
    setDoorstepIntelList((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item
      );
      localStorage.setItem('shiftDrop_doorstep_intel', JSON.stringify(updated));
      return updated;
    });
  };

  // Settings & Share Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  // Only trigger the overlay splash screen if running natively on Android/iOS; skip entirely on web browsers
  const [showSplash, setShowSplash] = useState(() => Capacitor.isNativePlatform());
  const [settings, setSettings] = useState<DriverAppSettings>({
    isDarkMode: true,
    isVoiceGuidanceEnabled: true,
    isHapticFeedbackEnabled: true,
    isFrostWarningAlertActive: true,
    isAutoCloudSyncEnabled: false,
    preferredSatNavApp: 'Google Maps',
    soundVolume: 0.9,
    voiceGenderPreference: 'en-GB-Male',
    supabaseUrl: '',
    supabaseAnonKey: '',
    offlineVoiceNoteQueueCount: 0,
    isGeofencedAutoCheckInEnabled: true,
  });

  // Fetch live weather on startup
  useEffect(() => {
    async function loadWeather() {
      const data = await fetchUkWeatherTelemetry(53.4808, -2.2426, 'Manchester');
      setWeather(data);
    }
    loadWeather();
  }, []);

  // Load from Supabase Cloud Database
  useEffect(() => {
    async function initFromSupabase() {
      try {
        const stored = await loadInitialDataFromSupabase();
        if (stored.stops && stored.stops.length > 0) {
          setStops(stored.stops);
        }
        if (stored.shifts && stored.shifts.length > 0) {
          setShiftHistory(stored.shifts);
          const active = stored.shifts.find((s) => s.isActive);
          if (active) setActiveShift(active);
        }
        if (stored.vehicles && stored.vehicles.length > 0) {
          setVehicles(stored.vehicles);
        }
      } catch (err) {
        console.warn('Supabase initial load warning:', err);
      }
    }
    initFromSupabase();
  }, []);

  // Fetch live cloud data when userProfile becomes available
  useEffect(() => {
    if (!userProfile || !userProfile.id || userProfile.isDemoUser) return;

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
          .order('created_at', { ascending: false });

        if (!shiftError && remoteShifts && remoteShifts.length > 0) {
          const formattedShifts: ActiveShift[] = remoteShifts.map((s: any) => ({
            id: s.id,
            network: s.platform,
            startTime: s.clock_in_time,
            endTime: s.clock_out_time,
            startingOdometer: 0,
            currentOdometer: s.mileage_miles,
            agreedBlockRate: s.hourly_rate_gbp,
            bonusPay: 0,
            stops: [],
            isActive: s.status === 'Active',
            notes: `Depot: ${s.depot_location}`,
            totalMilesDriven: s.mileage_miles,
          }));
          setShiftHistory(formattedShifts);
          const active = formattedShifts.find((sh) => sh.isActive);
          if (active) setActiveShift(active);
        }

        const { data: remoteStops, error: stopError } = await client
          .from('parcel_stops')
          .select('*');

        if (!stopError && remoteStops && remoteStops.length > 0) {
          const formattedStops: ParcelStop[] = remoteStops.map((p: any) => ({
            id: p.id,
            trackingNumber: p.tracking_number,
            recipientName: p.recipient_name,
            address: `${p.address_line1 || ''}, ${p.city || ''}`,
            postcode: p.postcode,
            status: p.status,
            assignedZone: p.assigned_zone || 'Front Seat',
            voiceNoteUrl: p.voice_note_url,
            deliveryTimestamp: p.delivery_timestamp,
            returnReason: p.return_reason,
          } as unknown as ParcelStop));
          setStops(formattedStops);
        }
      } catch (err) {
        console.warn('Could not load live cloud data, using clean local state:', err);
      }
    }

    fetchCloudData();
  }, [userProfile]);

  // Save stops to Supabase on modification
  useEffect(() => {
    saveParcelStopsToSupabase(stops).catch(() => {});
  }, [stops]);

  // Tax calculations
  const taxMetrics = calculateHMRCTaxMetrics(shiftHistory);

  // Shift Management Handlers
  const handleStartShift = useCallback(
    (network: CourierNetwork, startOdo: number, agreedRate: number, bonus: number) => {
      triggerHapticFeedback('success');
      const newShift: ActiveShift = {
        id: `shift_${Date.now()}`,
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

  // Parcel Drop Handlers
  const handleConfirmDrop = useCallback(
    (stopId: string, voiceNoteUrl?: string) => {
      triggerHapticFeedback('success');
      setStops((prev) =>
        prev.map((s) => {
          if (s.id === stopId) {
            return {
              ...s,
              status: 'Delivered' as const,
              deliveryTimestamp: new Date().toISOString(),
              voiceNoteUrl: voiceNoteUrl || s.voiceNoteUrl,
            };
          }
          return s;
        })
      );
    },
    []
  );

  const handleReturnDrop = useCallback(
    (stopId: string, reason: ReturnReasonCode) => {
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
    },
    []
  );

  const handleUpdateParcelZone = useCallback(
    (stopId: string, zone: VanCompartmentZone) => {
      setStops((prev) =>
        prev.map((s) => (s.id === stopId ? { ...s, assignedZone: zone } : s))
      );
    },
    []
  );

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

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // If user is on the auth module, render ONLY the login portal full-screen
  if (activeModule === 'auth') {
    return (
      <div className="min-h-screen flex flex-col bg-canvas text-primary">
        <main className="flex-1 flex items-center justify-center p-4">
          <AuthPortal
            userProfile={userProfile}
            onUpdateUserProfile={handleUpdateUserProfile}
            onContinueToHub={() => setActiveModule('hub')}
          />
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
      {/* Top Telemetry & Weather Header */}
      <Header
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenSidebar={() => setIsOpenMobileSidebar(true)}
        weather={weather}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenPortal={(portal) => {
          setActivePortal(portal);
          if (portal === 'landing') setActiveModule('landing');
          else if (portal === 'studio') setActiveModule('studio');
        }}
        activePortal={activePortal}
        userProfile={userProfile}
        onOpenAuth={() => setActiveModule('auth')}
        onToggleVoice={() => setIsVoiceOpen((prev) => !prev)}
        isVoiceActive={isVoiceOpen}
      />

      {/* Active Shift Status Ribbon */}
      <ActiveShiftRibbon
        activeShift={activeShift}
        onEndShift={handleEndShift}
        onUpdateOdometer={handleUpdateOdometer}
      />

      {/* Main Layout: Responsive Sidebar + Content Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <SidebarNav
          activeModule={activeModule}
          onSelectModule={(mod) => {
            setActiveModule(mod);
            if (mod === 'landing' || mod === 'studio') {
              setActivePortal(mod);
            } else {
              setActivePortal(null);
            }
          }}
          isCollapsedDesktop={isCollapsedDesktop}
          onToggleCollapseDesktop={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
          pendingDropsCount={pendingCount}
          returnsCount={returnsCount}
          isOpenMobileSidebar={isOpenMobileSidebar}
          onCloseMobileSidebar={() => setIsOpenMobileSidebar(false)}
        />

        {/* Dynamic Main Workspace Container */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 pb-6 lg:pb-8">
          {activeModule === 'hub' && (
            <InCabHomeHub
              activeShift={activeShift}
              shiftHistory={shiftHistory}
              weather={weather}
              taxMetrics={taxMetrics}
              onStartShift={handleStartShift}
              onNavigateTo={(mod) => setActiveModule(mod)}
            />
          )}

          {activeModule === 'hud' && (
            <ActiveCabHUD
              stops={stops}
              taxMetrics={taxMetrics}
              settings={settings}
              doorstepIntelList={doorstepIntelList}
              onNavigateToDoorstepVault={() => setActiveModule('doorstep')}
              onConfirmDrop={handleConfirmDrop}
              onReturnDrop={handleReturnDrop}
              onSelectStop={() => {}}
            />
          )}

          {activeModule === 'realtime' && (
            <RealTimeEarningsStream
              stops={stops}
              activeShift={activeShift || { id: '', network: 'Amazon Flex', startTime: '', startingOdometer: 0, currentOdometer: 0, agreedBlockRate: 0, bonusPay: 0, stops: [], isActive: false, notes: '', totalMilesDriven: 0 }}
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
                setActiveModule('hud');
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
            <HMRCVault shifts={shiftHistory} taxMetrics={taxMetrics} />
          )}

          {activeModule === 'pro' && (
            <ProUpgrade onUpgradeComplete={() => setActiveModule('hub')} />
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
                setActiveModule('hub');
              }}
            />
          )}
        </main>
      </div>

      {/* Hands-Free UK Voice Assistant HUD */}
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

      {/* 1-Click Share & Preview Modal */}
      <ShareWorkstationModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        stops={stops}
        activeShift={activeShift || { id: '', network: 'Amazon Flex', startTime: '', startingOdometer: 0, currentOdometer: 0, agreedBlockRate: 0, bonusPay: 0, stops: [], isActive: false, notes: '', totalMilesDriven: 0 }}
      />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Driver Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onSyncOfflineQueue={handleSyncOfflineQueue}
      />

      {/* In-Cab Workstation Startup Splash Screen (Native Only) */}
      {showSplash && (
        <AppSplashScreen
          duration={1500}
          onComplete={() => setShowSplash(false)}
        />
      )}
    </div>
  );
}