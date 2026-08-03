import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Bell, Droplets, User, Settings, Briefcase } from 'lucide-react';
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
  const [tab, setTab] = useState<Tab>('home');

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

  // Load weather once on app startup (or use instant cached weather)
  useEffect(() => {
    if (onboarded) {
      loadWeather();
    }
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
          {tab === 'hydration' && <HydrationTracker />}
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
            <SettingsPage tempUnit={tempUnit} onTempUnitChange={handleTempUnitChange} />
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
    </>
  );
}
