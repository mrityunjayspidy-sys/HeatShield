import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, AlertTriangle, Flame, Droplets, Sun, Wind, Thermometer, Heart } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import type { RiskTier } from '../lib/scoring';
import { TIER_COLORS, computeHeatScore, type ScoringInput } from '../lib/scoring';
import type { UserSession } from '../lib/supabase';
import type { LiveWeatherData } from '../lib/weather';

interface Alert {
  id: string;
  tier: RiskTier;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  icon?: 'flame' | 'droplets' | 'sun' | 'wind' | 'heart' | 'thermometer';
}

interface AlertsHistoryProps {
  userSession?: UserSession;
  weather?: LiveWeatherData | null;
}

/**
 * Generate real-time alerts based on actual weather data and user health profile.
 */
function generateRealTimeAlerts(user?: UserSession, weather?: LiveWeatherData | null): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const fmt = (offset: number) => {
    const d = new Date(now.getTime() - offset * 60000);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (!weather) {
    alerts.push({
      id: 'no-weather',
      tier: 'safe',
      message: 'Weather data loading... Alerts will update when location data is available.',
      timestamp: fmt(0),
      acknowledged: false,
      icon: 'thermometer',
    });
    return alerts;
  }

  const temp = weather.tempC;
  const feelsLike = weather.feelsLikeC;
  const humidity = weather.humidityPct;
  const uv = weather.uvIndex;
  const windSpeed = weather.windSpeedKmh;

  // Build scoring input from real user data
  const scoringInput: ScoringInput = {
    tempC: temp,
    humidity,
    uvIndex: uv,
    age: user?.age ?? 28,
    weightKg: user?.weightKg ?? 68,
    heightCm: user?.heightCm ?? 170,
    conditions: user?.conditions ?? [],
    medicationsAffectingHeat: user?.medications ?? false,
    outdoorOccupation: user?.outdoor ?? false,
    sunExposureLevel: 'moderate',
  };
  const score = computeHeatScore(scoringInput);

  // ── Temperature-based alerts ──────────────────────────────────────
  if (temp >= 42) {
    alerts.push({
      id: 'temp-extreme',
      tier: 'danger',
      message: `EXTREME HEAT: ${temp.toFixed(1)}°C (feels like ${feelsLike.toFixed(1)}°C). Stay indoors, drink cold water immediately, and avoid all outdoor activity.`,
      timestamp: fmt(2),
      acknowledged: false,
      icon: 'flame',
    });
  } else if (temp >= 38) {
    alerts.push({
      id: 'temp-high',
      tier: 'warning',
      message: `High temperature: ${temp.toFixed(1)}°C (feels like ${feelsLike.toFixed(1)}°C). Limit outdoor exposure and stay hydrated.`,
      timestamp: fmt(5),
      acknowledged: false,
      icon: 'thermometer',
    });
  } else if (temp >= 33) {
    alerts.push({
      id: 'temp-elevated',
      tier: 'watch',
      message: `Temperature rising: ${temp.toFixed(1)}°C. Monitor conditions and keep water nearby.`,
      timestamp: fmt(15),
      acknowledged: false,
      icon: 'thermometer',
    });
  }

  // ── UV-based alerts ───────────────────────────────────────────────
  if (uv >= 11) {
    alerts.push({
      id: 'uv-extreme',
      tier: 'danger',
      message: `UV Index at ${uv.toFixed(1)} (EXTREME). Avoid sun exposure entirely. Apply SPF 50+ if you must go outside.`,
      timestamp: fmt(8),
      acknowledged: false,
      icon: 'sun',
    });
  } else if (uv >= 8) {
    alerts.push({
      id: 'uv-very-high',
      tier: 'warning',
      message: `UV Index: ${uv.toFixed(1)} (Very High). Wear sunscreen, hat, and sunglasses. Seek shade during peak hours.`,
      timestamp: fmt(12),
      acknowledged: false,
      icon: 'sun',
    });
  } else if (uv >= 6) {
    alerts.push({
      id: 'uv-high',
      tier: 'watch',
      message: `UV Index: ${uv.toFixed(1)} (High). Sunscreen recommended for extended outdoor time.`,
      timestamp: fmt(20),
      acknowledged: false,
      icon: 'sun',
    });
  }

  // ── Humidity-based alerts ─────────────────────────────────────────
  if (humidity >= 80 && temp >= 32) {
    alerts.push({
      id: 'humidity-danger',
      tier: 'warning',
      message: `Humidity at ${humidity}% combined with ${temp.toFixed(1)}°C severely reduces your body's ability to cool through sweat. Risk of heat exhaustion is elevated.`,
      timestamp: fmt(10),
      acknowledged: false,
      icon: 'droplets',
    });
  } else if (humidity >= 70) {
    alerts.push({
      id: 'humidity-high',
      tier: 'watch',
      message: `Humidity: ${humidity}%. Sweating is less effective — drink extra water and take breaks in air conditioning.`,
      timestamp: fmt(25),
      acknowledged: false,
      icon: 'droplets',
    });
  }

  // ── Wind alerts ───────────────────────────────────────────────────
  if (windSpeed <= 5 && temp >= 35) {
    alerts.push({
      id: 'wind-calm',
      tier: 'watch',
      message: `Very low wind (${windSpeed.toFixed(0)} km/h) with high heat. No breeze to aid cooling — seek shade or AC.`,
      timestamp: fmt(18),
      acknowledged: false,
      icon: 'wind',
    });
  }

  // ── Health-condition-based alerts ─────────────────────────────────
  const conditions = user?.conditions ?? [];

  if (conditions.includes('cardiovascular') && score.totalScore >= 50) {
    alerts.push({
      id: 'health-cardio',
      tier: 'warning',
      message: `Your cardiovascular condition increases heat risk. Current heat score: ${score.totalScore}/100. Avoid strenuous activity and stay cool.`,
      timestamp: fmt(3),
      acknowledged: false,
      icon: 'heart',
    });
  }

  if (conditions.includes('diabetes') && temp >= 33) {
    alerts.push({
      id: 'health-diabetes',
      tier: 'watch',
      message: `Heat can affect blood sugar levels. Monitor glucose more frequently in current ${temp.toFixed(1)}°C conditions.`,
      timestamp: fmt(22),
      acknowledged: false,
      icon: 'heart',
    });
  }

  if (conditions.includes('kidney') && temp >= 32) {
    alerts.push({
      id: 'health-kidney',
      tier: 'warning',
      message: `Kidney conditions require extra hydration in heat. Drink at least ${(user?.dailyWaterGoalMl ?? 2500)} ml today.`,
      timestamp: fmt(7),
      acknowledged: false,
      icon: 'droplets',
    });
  }

  if (conditions.includes('respiratory') && (humidity >= 70 || temp >= 35)) {
    alerts.push({
      id: 'health-respiratory',
      tier: 'watch',
      message: `High heat/humidity can worsen respiratory symptoms. Stay in well-ventilated areas.`,
      timestamp: fmt(30),
      acknowledged: false,
      icon: 'heart',
    });
  }

  if (conditions.includes('hypertension') && score.totalScore >= 55) {
    alerts.push({
      id: 'health-bp',
      tier: 'watch',
      message: `Heat may affect blood pressure. Monitor BP and avoid sudden exertion. Current risk score: ${score.totalScore}/100.`,
      timestamp: fmt(14),
      acknowledged: false,
      icon: 'heart',
    });
  }

  if (conditions.includes('pregnant') && temp >= 32) {
    alerts.push({
      id: 'health-pregnant',
      tier: 'warning',
      message: `Pregnant individuals are more vulnerable to heat. Stay hydrated, rest often, and avoid temperatures above 32°C.`,
      timestamp: fmt(6),
      acknowledged: false,
      icon: 'heart',
    });
  }

  // ── Age-based alerts ──────────────────────────────────────────────
  const age = user?.age ?? 28;
  if (age >= 65 && score.totalScore >= 45) {
    alerts.push({
      id: 'age-elderly',
      tier: 'warning',
      message: `Adults over 65 are more susceptible to heat illness. Current risk score: ${score.totalScore}/100. Check on elderly family members.`,
      timestamp: fmt(9),
      acknowledged: false,
      icon: 'heart',
    });
  }
  if (age <= 5 && temp >= 30) {
    alerts.push({
      id: 'age-child',
      tier: 'warning',
      message: `Young children cannot regulate body temperature as effectively. Never leave children in vehicles.`,
      timestamp: fmt(11),
      acknowledged: false,
      icon: 'heart',
    });
  }

  // ── Hydration reminder (always shown) ─────────────────────────────
  const waterGoal = user?.dailyWaterGoalMl ?? 2500;
  if (temp >= 30) {
    alerts.push({
      id: 'hydration-reminder',
      tier: 'safe',
      message: `Hydration reminder: Aim for ${waterGoal} ml of water today. Drink 250 ml every 30 minutes if outdoors.`,
      timestamp: fmt(35),
      acknowledged: true,
      icon: 'droplets',
    });
  }

  // ── Overall heat score summary ────────────────────────────────────
  alerts.push({
    id: 'score-summary',
    tier: score.tier,
    message: `Current heat risk score: ${score.totalScore}/100 (${score.tier.toUpperCase()}). ${score.recommendedAction}`,
    timestamp: fmt(0),
    acknowledged: false,
    icon: 'thermometer',
  });

  // Sort by tier severity (danger first) then by time
  const tierOrder: Record<RiskTier, number> = { danger: 0, warning: 1, watch: 2, safe: 3 };
  alerts.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  return alerts;
}

const ALERT_ICONS: Record<string, React.ElementType> = {
  flame: Flame,
  droplets: Droplets,
  sun: Sun,
  wind: Wind,
  heart: Heart,
  thermometer: Thermometer,
};

export function AlertsHistory({ userSession, weather }: AlertsHistoryProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Re-generate alerts when weather or user session changes
  useEffect(() => {
    const generated = generateRealTimeAlerts(userSession, weather);
    setAlerts(generated);
  }, [userSession, weather]);

  const acknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const iconForAlert = (alert: Alert) => {
    if (alert.icon && ALERT_ICONS[alert.icon]) {
      const IconComp = ALERT_ICONS[alert.icon];
      return <IconComp size={16} />;
    }
    switch (alert.tier) {
      case 'danger': return <Flame size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Bell size={22} color="#CBD5E1" />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>Alerts & History</h1>
        </div>

        {/* Live status indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          fontSize: 12, color: '#A1A1AA',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: weather ? '#10B981' : '#F59E0B',
            boxShadow: weather ? '0 0 8px #10B981' : '0 0 8px #F59E0B',
          }} />
          <span>
            {weather
              ? `Live — ${weather.cityName || 'Current location'} · ${weather.tempC.toFixed(1)}°C · UV ${weather.uvIndex.toFixed(1)}`
              : 'Connecting to weather service…'
            }
          </span>
          {unacknowledgedCount > 0 && (
            <span style={{
              marginLeft: 'auto', padding: '2px 8px', borderRadius: 10,
              background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#EF4444', fontSize: 11, fontWeight: 800,
            }}>
              {unacknowledgedCount} active
            </span>
          )}
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative', paddingLeft: 22 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: 5, top: 0, bottom: 0, width: 2,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
          }} />

          <AnimatePresence>
            {alerts.map((alert, i) => {
              const color = TIER_COLORS[alert.tier];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ marginBottom: 16, position: 'relative' }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: -22, top: 22, width: 12, height: 12, borderRadius: '50%',
                    background: color.bg, boxShadow: `0 0 10px ${color.glow}`,
                  }} />

                  <GlassCard style={{ borderLeft: `3px solid ${color.bg}`, opacity: alert.acknowledged ? 0.6 : 1, userSelect: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: color.bg, marginBottom: 6 }}>
                        {iconForAlert(alert)}
                        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {alert.tier}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748B' }}>{alert.timestamp}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#E2E8F0', lineHeight: 1.5, marginBottom: 10 }}>
                      {alert.message}
                    </p>
                    {!alert.acknowledged && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => acknowledge(alert.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 12,
                          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                          color: '#CBD5E1', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        <Check size={14} /> Acknowledge
                      </motion.button>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </AnimatedGradientBackground>
  );
}
