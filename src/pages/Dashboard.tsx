import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer, Eye, Droplets, Sun, MapPin, Plus, X, RotateCw, Radio,
  Search, Wind, CloudRain, Navigation, Globe, ExternalLink,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassChip } from '../components/ui/GlassChip';
import { ScoreGauge } from '../components/ScoreGauge';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import type { ScoringResult, ScoringInput } from '../lib/scoring';
import { computeHeatScore, TIER_COLORS } from '../lib/scoring';
import { type LiveWeatherData, searchCity, type GeoSearchResult } from '../lib/weather';
import type { UserSession } from '../lib/supabase';
import { predictMedicalConditions } from '../lib/medicalPrediction';
import { MedicalPredictionCard } from '../components/MedicalPredictionCard';
import { OutdoorTimeSuggestion } from '../components/OutdoorTimeSuggestion';
import { ClothingRecommendation } from '../components/ClothingRecommendation';
import { SosButton } from '../components/SosButton';
import { HydrationReminder } from '../components/HydrationReminder';

interface DashboardProps {
  userSession?: UserSession;
  tempUnit?: 'C' | 'F';
  weather: LiveWeatherData | null;
  loadingWeather?: boolean;
  onRefreshWeather?: () => void;
  onSelectLocation?: (result: GeoSearchResult) => void;
  onOpenWebPromo?: () => void;
}

// Default clean user profile fallback
const DEFAULT_HEALTH_PROFILE = {
  gender: 'other' as const,
  age: 28,
  weightKg: 68,
  heightCm: 170,
  conditions: [] as string[],
  medicationsAffectingHeat: false,
  outdoorOccupation: false,
  sunExposureLevel: 'moderate' as const,
};

export function Dashboard({
  userSession,
  tempUnit = 'C',
  weather,
  loadingWeather = false,
  onRefreshWeather,
  onSelectLocation,
  onOpenWebPromo,
}: DashboardProps) {
  const [selectedFactor, setSelectedFactor] = useState<ScoringResult['factors'][0] | null>(null);
  const [hydrationMl, setHydrationMl] = useState(1750);
  const [showHydrationFab, setShowHydrationFab] = useState(false);

  // ── Location search state ────────────────────────────────────────────────
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectCity = (result: GeoSearchResult) => {
    setShowLocationSearch(false);
    setLocationQuery('');
    setSearchResults([]);
    onSelectLocation?.(result);
  };

  // Debounced city search
  useEffect(() => {
    if (!locationQuery.trim()) { setSearchResults([]); return; }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      const results = await searchCity(locationQuery);
      setSearchResults(results);
      setSearchLoading(false);
    }, 420);
  }, [locationQuery]);

  // Compute live score using real-time API weather data + real user profile
  const currentTemp = weather ? weather.tempC : 38.5;
  const currentFeels = weather ? weather.feelsLikeC : 43.2;
  const currentHumidity = weather ? weather.humidityPct : 74;
  const currentUv = weather ? weather.uvIndex : 9.2;

  const realUserProfile = userSession ? {
    gender: userSession.gender,
    age: userSession.age,
    weightKg: userSession.weightKg,
    heightCm: userSession.heightCm,
    conditions: userSession.conditions || [],
    medicationsAffectingHeat: userSession.medications || false,
    outdoorOccupation: userSession.outdoor || false,
    sunExposureLevel: (userSession.sunSensitivity as 'low' | 'moderate' | 'high') || 'moderate',
  } : DEFAULT_HEALTH_PROFILE;

  const scoringInput: ScoringInput = {
    tempC: currentTemp,
    humidity: currentHumidity,
    uvIndex: currentUv,
    ...realUserProfile,
  };

  const result: ScoringResult = computeHeatScore(scoringInput);

  // Dynamic hourly trend chart based on API
  const trendData = weather?.hourlyTrend
    ? weather.hourlyTrend.map((item) => ({
        hour: item.hour,
        score: computeHeatScore({ ...scoringInput, tempC: item.tempC }).totalScore,
      }))
    : [
        { hour: '6 AM', score: 28 }, { hour: '8 AM', score: 42 },
        { hour: '10 AM', score: 65 }, { hour: '12 PM', score: 78 },
        { hour: '2 PM', score: 85 }, { hour: 'Now', score: result.totalScore },
      ];

  const formatTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return `${((celsius * 9) / 5 + 32).toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const hydrationTarget = 3200;
  const hydrationPct = Math.min(100, Math.round((hydrationMl / hydrationTarget) * 100));

  const tier = result.tier;
  const tierColor = TIER_COLORS[tier];

  const fallbackSession: UserSession = userSession || {
    id: 'usr_default',
    email: 'user@heatwatch.app',
    name: 'User',
    age: 35,
    weightKg: 75,
    heightCm: 175,
    conditions: ['cardiovascular'],
    medications: false,
    outdoor: true,
    emergencyContact: { name: 'Emergency Contact', phone: '+1 555-019-2834', relationship: 'Contact' },
    createdAt: new Date().toISOString(),
  };

  const medicalResult = predictMedicalConditions(
    fallbackSession,
    result.heatIndexC,
    currentUv,
    hydrationMl
  );

  return (
    <AnimatedGradientBackground tier={tier}>
      <div className="hw-container">

        {/* ── Top Header Controls & Centered Brand Title ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: 20, position: 'relative', minHeight: 56 }}>
          
          {/* Centered Brand Title & Live API badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <h1 style={{
              fontSize: 32, fontWeight: 900, color: '#FFFFFF',
              letterSpacing: '-0.03em', margin: 0,
              background: 'linear-gradient(180deg, #FFFFFF 0%, #E4E4E7 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              HeatWatch
            </h1>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              fontSize: 10, fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              <Radio size={10} color="#34D399" />
              Live API
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: '#A1A1AA', marginTop: 4 }}>
            <MapPin size={13} color="#A1A1AA" />
            <span style={{ fontWeight: 600, color: '#E4E4E7' }}>{weather ? weather.cityName : 'Detecting location...'}</span>
            {weather && <span style={{ color: '#71717A', fontSize: 12 }}>• {weather.updatedAt}</span>}
          </div>

          {/* Action buttons positioned top right */}
          <div style={{ position: 'absolute', right: 0, top: 2, display: 'flex', gap: 8 }}>
            {/* Web Promo Modal Trigger Button */}
            {onOpenWebPromo && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onOpenWebPromo}
                title="Web Application Info"
                style={{
                  width: 38, height: 38, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.18)',
                  backdropFilter: 'blur(12px)', border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: '#F59E0B', position: 'relative'
                }}
              >
                <Globe size={16} />
                <span style={{
                  position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%',
                  background: '#EF4444', boxShadow: '0 0 6px #EF4444'
                }} />
              </motion.button>
            )}

            {/* Location search toggle */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setShowLocationSearch((p) => !p)}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: showLocationSearch ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${showLocationSearch ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: '#FFF',
              }}
            >
              <Search size={16} />
            </motion.button>

            {/* Refresh / back to GPS */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onRefreshWeather}
              title="Refresh weather"
              style={{
                width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: '#FFF',
              }}
            >
              <RotateCw size={16} className={loadingWeather ? 'animate-spin' : ''} />
            </motion.button>
          </div>
        </div>

        {/* ── Location Search Panel ── */}
        <AnimatePresence>
          {showLocationSearch && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              style={{ overflow: 'hidden' }}
            >
              <GlassCard style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Search size={13} color="#FFFFFF" /> Check heat risk in another city
                </p>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={15} color="#A1A1AA" style={{ position: 'absolute', left: 12 }} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search city, e.g. Mumbai, Dubai, London…"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)',
                      color: '#FFF', fontSize: 13, outline: 'none',
                    }}
                  />
                  {locationQuery && (
                    <button
                      onClick={() => { setLocationQuery(''); setSearchResults([]); }}
                      style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search results */}
                <AnimatePresence>
                  {searchLoading && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
                      Searching…
                    </motion.p>
                  )}
                  {!searchLoading && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}
                    >
                      {searchResults.map((r, i) => (
                        <motion.button
                          key={i}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSelectCity(r)}
                          type="button"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                            borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.15s',
                          }}
                        >
                          <MapPin size={14} color="#A78BFA" />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#E2E8F0' }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>{[r.admin1, r.country].filter(Boolean).join(', ')}</div>
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                  {!searchLoading && locationQuery.length > 1 && searchResults.length === 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 12, color: '#64748B', marginTop: 10 }}>
                      No cities found. Try a different spelling.
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Back to GPS */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { onRefreshWeather?.(); setShowLocationSearch(false); }}
                  type="button"
                  style={{
                    marginTop: 12, width: '100%', padding: '10px', borderRadius: 12, fontSize: 12,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#94A3B8', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Navigation size={13} /> Back to my GPS location
                </motion.button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Responsive Grid ── */}
        <div className="hw-dashboard-grid">

          {/* ── LEFT COLUMN (Primary Focus on Desktop) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Dedicated SOS Emergency Bar */}
            <SosButton
              userSession={userSession}
              currentTempC={currentTemp}
              heatScore={result.totalScore}
              fullWidth
            />

            {/* Web Application Promo Banner Card */}
            <GlassCard
              onClick={onOpenWebPromo}
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.25)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Globe size={18} color="#F59E0B" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#FFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Heat Prediction Web App</span>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: '#F59E0B', color: '#000', fontWeight: 900 }}>
                      WEB
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#D4D4D8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Check out our web app at heat-watch-beta.vercel.app
                  </div>
                </div>
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <ExternalLink size={14} color="#FFF" />
              </div>
            </GlassCard>

            {/* Hero Score Gauge */}
            <GlassCard tier={tier} elevation="hero">
              <ScoreGauge score={result.totalScore} tier={tier} recommendedAction={result.recommendedAction} />
            </GlassCard>

            {/* Live Forecast Score Trend Chart */}
            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#A1A1AA' }}>Real-time Hourly Forecast Trend</h3>
                <span style={{ fontSize: 11, color: '#52525B', fontWeight: 600 }}>Open-Meteo API</span>
              </div>

              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
                      fontSize: 12, color: '#FFFFFF',
                    }}
                    labelStyle={{ color: '#A1A1AA' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#FFFFFF" strokeWidth={2.5} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Best time to go outside */}
            {weather && (
              <OutdoorTimeSuggestion
                hourlyTrend={weather.hourlyTrend}
                scoringBase={{
                  humidity: currentHumidity,
                  uvIndex: currentUv,
                  ...realUserProfile,
                }}
                tempUnit={tempUnit}
              />
            )}

            {/* Risk Factor Pills */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#A1A1AA', marginBottom: 10 }}>
                Risk Factors Contributing to Score
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.factors.map((f) => (
                  <GlassChip
                    key={f.label}
                    label={f.label}
                    value={`+${f.points}`}
                    color={tierColor.bg}
                    onClick={() => setSelectedFactor(f)}
                  />
                ))}
              </div>
            </div>

            {/* Factor explanation sheet */}
            <AnimatePresence>
              {selectedFactor && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ type: 'spring', damping: 25 }}
                >
                  <GlassCard tier={tier} style={{ position: 'relative' }}>
                    <button onClick={() => setSelectedFactor(null)} style={{
                      position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                      color: '#A1A1AA', cursor: 'pointer',
                    }}><X size={18} /></button>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: '#FFF', marginBottom: 4 }}>
                      {selectedFactor.label} — +{selectedFactor.points} pts
                    </h4>
                    <p style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.6 }}>{selectedFactor.reason}</p>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT COLUMN (Metrics & Analytics on Desktop) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Real-time Stat Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              <GlassChip icon={Thermometer} label="Temp" value={formatTemp(currentTemp)} color="#FFFFFF" />
              <GlassChip icon={Eye} label="Feels" value={formatTemp(currentFeels)} color="#A1A1AA" />
              <GlassChip icon={Droplets} label="Humidity" value={`${currentHumidity}%`} color="#FFFFFF" />
              <GlassChip icon={Sun} label="UV Index" value={`${currentUv}`} color="#FFFFFF" />
              {weather?.windSpeedKmh !== undefined && weather.windSpeedKmh > 0 && (
                <GlassChip icon={Wind} label="Wind" value={`${weather.windSpeedKmh} km/h`} color="#E4E4E7" />
              )}
              {weather?.precipMm !== undefined && weather.precipMm > 0 && (
                <GlassChip icon={CloudRain} label="Rain" value={`${weather.precipMm.toFixed(1)} mm`} color="#E4E4E7" />
              )}
            </div>

            {/* Predicted Medical Condition Risk Card */}
            <MedicalPredictionCard predictionResult={medicalResult} />

            {/* Clothing recommendation */}
            <ClothingRecommendation
              tempC={currentTemp}
              uvIndex={currentUv}
              tier={tier}
              skinType={userSession?.skinType}
              tempUnit={tempUnit}
              weatherCondition={weather?.weatherCondition}
              windSpeedKmh={weather?.windSpeedKmh}
              precipMm={weather?.precipMm}
              humidityPct={currentHumidity}
            />

            {/* Constant Hydration Reminder */}
            <HydrationReminder
              tempC={currentTemp}
              tier={tier}
              gender={userSession?.gender}
              weightKg={userSession?.weightKg}
            />

            {/* Hydration card */}
            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Droplets size={18} color="#FFFFFF" />
                  <span style={{ fontWeight: 700, color: '#FFF' }}>Hydration Target</span>
                </div>
                <span style={{ fontWeight: 900, color: '#FFFFFF', fontSize: 18 }}>{hydrationPct}%</span>
              </div>
              <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${hydrationPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ height: '100%', background: '#FFFFFF', borderRadius: 10 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#A1A1AA' }}>
                <span>{hydrationMl.toLocaleString()} ml / {hydrationTarget.toLocaleString()} ml</span>
              </div>
            </GlassCard>
          </div>

        </div>

      </div>

      {/* Floating Hydration FAB */}
      <div style={{ position: 'fixed', bottom: 90, right: 24, zIndex: 50 }}>
        <AnimatePresence>
          {showHydrationFab && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12,
              }}
            >
              {[250, 500, 750].map((ml) => (
                <motion.button
                  key={ml}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { setHydrationMl((prev) => prev + ml); setShowHydrationFab(false); }}
                  style={{
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 16,
                    padding: '10px 18px', color: '#FFFFFF', fontWeight: 800, fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  +{ml} ml
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowHydrationFab(!showHydrationFab)}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            boxShadow: '0 8px 24px rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#FFFFFF',
          }}
        >
          {showHydrationFab ? <X size={24} /> : <Plus size={24} />}
        </motion.button>
      </div>
    </AnimatedGradientBackground>
  );
}
