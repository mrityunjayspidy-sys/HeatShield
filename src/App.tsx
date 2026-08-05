import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { App as CapacitorApp } from '@capacitor/app';
import { Home, Bell, Droplets, User, Settings, Briefcase, LogOut, MapPinOff } from 'lucide-react';
import { GlassCard } from './components/ui/GlassCard';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { AuthScreen } from './pages/AuthScreen';
import { ProfilePage } from './pages/ProfilePage';
import { AlertsHistory } from './pages/AlertsHistory';
import { HydrationTracker } from './pages/HydrationTracker';
import { SettingsPage } from './pages/Settings';
import { DailyCheckInScreen, getTodayCheckIn, getTodayKey, type DailyCheckIn } from './pages/DailyCheckIn';
import { YourWorkPage } from './pages/YourWork';
import Dock, { type DockItemData } from './components/ui/Dock';
import { supabase, getCachedProfile, cacheProfile, signOut, fetchProfile, type UserSession } from './lib/supabase';
import { fetchLiveWeather, getCachedWeather, cacheWeather, type LiveWeatherData } from './lib/weather';
import { getCurrentCoordinates } from './lib/location';
import { requestNotificationPermission } from './lib/notifications';

type Tab = 'home' | 'alerts' | 'hydration' | 'profile' | 'settings' | 'work';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -12 },
};

// Key used to track if check-in was done today
const CHECKIN_SHOWN_KEY = 'heatwatch_checkin_shown_date';

export default function App() {
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return localStorage.getItem('heatwatch_welcome_seen') !== 'true';
  });
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    return getCachedProfile();
  });
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('heatwatch_onboarded') === 'true';
  });
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>(() => {
    return (localStorage.getItem('heatwatch_temp_unit') as 'C' | 'F') || 'C';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('heatwatch_dark_mode');
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
    }
    localStorage.setItem('heatwatch_dark_mode', String(darkMode));
  }, [darkMode]);

  // Always default to Home tab when opening/resuming the app
  const [tab, setTab] = useState<Tab>('home');
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  // Single global weather state initialized with instant local cache
  const [weather, setWeather] = useState<LiveWeatherData | null>(() => getCachedWeather());
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  const loadWeather = async (customCoords?: { latitude: number; longitude: number; cityName?: string }) => {
    setLoadingWeather(true);
    try {
      const coords = customCoords || await getCurrentCoordinates();
      const data = await fetchLiveWeather(coords.latitude, coords.longitude);
      if (customCoords?.cityName) {
        data.cityName = customCoords.cityName;
      }
      cacheWeather(data);
      setWeather(data);
    } catch (e) {
      console.warn('Weather load note:', e);
    } finally {
      setLoadingWeather(false);
    }
  };

  // ── Bulletproof History Trap & Back Button Interceptor ──
  useEffect(() => {
    // Push dummy history entry so Android WebView never exits on back press without JS control
    window.history.pushState({ page: 'heatwatch' }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      // Re-push history entry so back button can be trapped again
      window.history.pushState({ page: 'heatwatch' }, '', window.location.href);

      if (tab !== 'home') {
        setTab('home');
      } else {
        setShowExitModal(true);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Capacitor native back button listener
    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      if (tab !== 'home') {
        setTab('home');
      } else {
        setShowExitModal(true);
      }
    });

    // App resume listener — ALWAYS reset tab to 'home' when app is opened/resumed
    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        setTab('home');
        setShowExitModal(false);
      }
    });

    // Also listen to visibilitychange for web/PWA resumes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTab('home');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      backButtonListener.then((h) => h.remove());
      appStateListener.then((h) => h.remove());
    };
  }, [tab]);

  // ── Supabase auth state listener ───────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            cacheProfile(profile);
            setUserSession(profile);
            localStorage.setItem('heatwatch_onboarded', 'true');
            setOnboarded(true);
          }
        }
        if (event === 'SIGNED_OUT') {
          setUserSession(null);
          setOnboarded(false);
        }
        if (event === 'PASSWORD_RECOVERY') {
          setOnboarded(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Daily check-in state
  const [showDailyCheckIn, setShowDailyCheckIn] = useState<boolean>(false);
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn | null>(() => getTodayCheckIn());

  useEffect(() => {
    if (!onboarded) return;
    const shownDate = localStorage.getItem(CHECKIN_SHOWN_KEY);
    const today = getTodayKey();
    if (shownDate !== today) {
      setShowDailyCheckIn(true);
    }
  }, [onboarded]);

  // Load weather once on app startup + check location + request notification permission
  useEffect(() => {
    if (!onboarded) return;

    // Request notification permission on startup
    requestNotificationPermission().catch(() => {});

    // Try to load weather — if location fails, show location modal
    (async () => {
      try {
        const coords = await getCurrentCoordinates();
        // If we got the default fallback coords (Delhi), location might be off
        if (coords.latitude === 28.6139 && coords.longitude === 77.2090) {
          setShowLocationModal(true);
        }
        const data = await fetchLiveWeather(coords.latitude, coords.longitude);
        cacheWeather(data);
        setWeather(data);
      } catch {
        setShowLocationModal(true);
      }
    })();
  }, [onboarded]);

  const handleStartWelcome = () => {
    localStorage.setItem('heatwatch_welcome_seen', 'true');
    setShowWelcome(false);
  };

  const handleAuthenticated = (session: UserSession) => {
    setUserSession(session);
    localStorage.setItem('heatwatch_onboarded', 'true');
    setOnboarded(true);
  };

  const handleOnboardComplete = () => {
    localStorage.setItem('heatwatch_onboarded', 'true');
    setOnboarded(true);
  };

  const handleTempUnitChange = (unit: 'C' | 'F') => {
    localStorage.setItem('heatwatch_temp_unit', unit);
    setTempUnit(unit);
  };

  const handleDailyCheckInComplete = (data: DailyCheckIn) => {
    setDailyCheckIn(data);
    localStorage.setItem(CHECKIN_SHOWN_KEY, getTodayKey());
    setShowDailyCheckIn(false);
  };

  // ── Gate rendering ───────────────────────────────────────────────────────
  if (showWelcome) {
    return <WelcomeScreen onStart={handleStartWelcome} />;
  }

  if (!userSession && !onboarded) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardComplete} />;
  }

  // Daily check-in gate (first open of the day)
  if (showDailyCheckIn) {
    return (
      <DailyCheckInScreen
        onComplete={handleDailyCheckInComplete}
        userName={userSession?.name}
      />
    );
  }

  const activeSession: UserSession = userSession || {
    id: 'usr_guest',
    email: '',
    name: 'Guest User',
    gender: 'other',
    age: 28,
    weightKg: 68,
    heightCm: 170,
    conditions: [],
    medications: false,
    outdoor: false,
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
    createdAt: new Date().toISOString(),
  };

  // Scoring base for YourWork (mirrors Dashboard logic)
  const scoringBase = {
    humidity: weather?.humidityPct ?? 60,
    uvIndex: weather?.uvIndex ?? 6,
    age: activeSession.age ?? 35,
    weightKg: activeSession.weightKg ?? 75,
    heightCm: activeSession.heightCm ?? 175,
    conditions: activeSession.conditions ?? [],
    medicationsAffectingHeat: activeSession.medications ?? false,
    outdoorOccupation: activeSession.outdoor ?? false,
    sunExposureLevel: 'moderate' as const,
  };

  const dockItems: DockItemData[] = [
    { icon: <Home size={22} />,     label: 'Home',     onClick: () => setTab('home'),      isActive: tab === 'home' },
    { icon: <Bell size={22} />,     label: 'Alerts',   onClick: () => setTab('alerts'),    isActive: tab === 'alerts' },
    { icon: <Droplets size={22} />, label: 'Hydrate',  onClick: () => setTab('hydration'), isActive: tab === 'hydration' },
    { icon: <Briefcase size={22} />,label: 'Your Work',onClick: () => setTab('work'),      isActive: tab === 'work' },
    { icon: <User size={22} />,     label: 'Profile',  onClick: () => setTab('profile'),   isActive: tab === 'profile' },
    { icon: <Settings size={22} />, label: 'Settings', onClick: () => setTab('settings'),  isActive: tab === 'settings' },
  ];

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}
        >
          {tab === 'home' && (
            <Dashboard
              userSession={activeSession}
              tempUnit={tempUnit}
              weather={weather}
              loadingWeather={loadingWeather}
              onRefreshWeather={() => loadWeather()}
              onSelectLocation={(r) => loadWeather({ latitude: r.latitude, longitude: r.longitude, cityName: r.displayName })}
            />
          )}
          {tab === 'alerts' && <AlertsHistory userSession={activeSession} weather={weather} />}
          {tab === 'hydration' && <HydrationTracker userSession={activeSession} weather={weather} />}
          {tab === 'work' && (
            <YourWorkPage
              checkIn={dailyCheckIn}
              weather={weather}
              scoringBase={scoringBase}
              tempUnit={tempUnit}
              onEditCheckIn={() => setShowDailyCheckIn(true)}
            />
          )}
          {tab === 'profile' && (
            <ProfilePage
              session={activeSession}
              onUpdateSession={(updated) => setUserSession(updated)}
              onSignOut={async () => {
                await signOut();
                setUserSession(null);
                setOnboarded(false);
              }}
            />
          )}
          {tab === 'settings' && (
            <SettingsPage
              tempUnit={tempUnit}
              onTempUnitChange={handleTempUnitChange}
              darkMode={darkMode}
              onDarkModeChange={(val) => setDarkMode(val)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <Dock
        items={dockItems}
        panelHeight={64}
        baseItemSize={42}
        magnification={62}
        distance={160}
      />

      {/* ── Native Exit Confirmation Modal ── */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ width: '100%', maxWidth: 360 }}
            >
              <GlassCard elevation="hero" style={{ border: '1.5px solid rgba(255,255,255,0.25)', textAlign: 'center', padding: '24px 20px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)', border: '1.5px solid rgba(239, 68, 68, 0.4)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <LogOut size={26} color="#EF4444" />
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#FFF', marginBottom: 8 }}>
                  Exit HeatWatch?
                </h3>
                <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.5, marginBottom: 22 }}>
                  Are you sure you want to close the app? Your heat monitoring and safety data will stay saved.
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowExitModal(false)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#FFF', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowExitModal(false);
                      setTab('home');
                      CapacitorApp.exitApp();
                    }}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 14,
                      background: '#EF4444', border: 'none',
                      color: '#FFF', fontWeight: 900, fontSize: 14, cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                    }}
                  >
                    Exit App
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Location Access Required Modal ── */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ width: '100%', maxWidth: 360 }}
            >
              <GlassCard elevation="hero" style={{ border: '1.5px solid rgba(255,255,255,0.25)', textAlign: 'center', padding: '28px 20px' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)', border: '1.5px solid rgba(245, 158, 11, 0.4)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <MapPinOff size={28} color="#F59E0B" />
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#FFF', marginBottom: 8 }}>
                  Enable Location Access
                </h3>
                <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.6, marginBottom: 22 }}>
                  HeatWatch needs your location to provide real-time heat risk data, weather alerts, and safety recommendations for your area.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={async () => {
                      try {
                        const coords = await getCurrentCoordinates();
                        if (coords.latitude !== 28.6139 || coords.longitude !== 77.2090) {
                          setShowLocationModal(false);
                          const data = await fetchLiveWeather(coords.latitude, coords.longitude);
                          cacheWeather(data);
                          setWeather(data);
                        }
                      } catch {
                        // Still can't get location
                      }
                    }}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 14,
                      background: '#F59E0B', border: 'none',
                      color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                    }}
                  >
                    📍 Enable Location
                  </button>
                  <button
                    onClick={() => setShowLocationModal(false)}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                      color: '#52525B', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Skip for now
                  </button>
                </div>

                <p style={{ fontSize: 10, color: '#3F3F46', marginTop: 14, lineHeight: 1.4 }}>
                  You can change this later in your device Settings → Location.
                </p>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
