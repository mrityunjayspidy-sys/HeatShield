/**
 * YourWorkPage — "Your Work" tab in the dock.
 * Shows today's work plan, hourly heat risk timeline during work hours,
 * and personalised recommendations based on the daily check-in.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Clock, Sun, Thermometer, MapPin, Edit3,
  AlertTriangle, CheckCircle2, Droplets, Wind, Shield,
  TrendingUp,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import type { DailyCheckIn } from './DailyCheckIn';
import type { LiveWeatherData } from '../lib/weather';
import { computeHeatScore, type ScoringInput, type RiskTier, TIER_COLORS } from '../lib/scoring';

interface YourWorkPageProps {
  checkIn: DailyCheckIn | null;
  weather: LiveWeatherData | null;
  scoringBase: Omit<ScoringInput, 'tempC'>;
  tempUnit: 'C' | 'F';
  onEditCheckIn: () => void;
}

function formatTemp(c: number, unit: 'C' | 'F') {
  return unit === 'F' ? `${((c * 9) / 5 + 32).toFixed(0)}°F` : `${c.toFixed(0)}°C`;
}

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatHour(t: string) {
  const [h] = t.split(':').map(Number);
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

const TIER_ICON: Record<RiskTier, { icon: typeof CheckCircle2; color: string; label: string }> = {
  safe:    { icon: CheckCircle2,  color: '#10B981', label: 'Safe' },
  watch:   { icon: AlertTriangle, color: '#F59E0B', label: 'Watch' },
  warning: { icon: AlertTriangle, color: '#F97316', label: 'Warning' },
  danger:  { icon: AlertTriangle, color: '#EF4444', label: 'Danger' },
};

const ACTIVITY_HEAT_BONUS: Record<string, number> = {
  light: 0, moderate: 3, heavy: 7,
};

// Generate hourly slots between workStart and workEnd
function buildWorkTimeline(
  checkIn: DailyCheckIn,
  weather: LiveWeatherData | null,
  scoringBase: Omit<ScoringInput, 'tempC'>,
): { hour: string; label: string; tempC: number; score: number; tier: RiskTier }[] {
  const startMin = toMin(checkIn.workStart);
  const endMin   = toMin(checkIn.workEnd);
  const nowMin   = new Date().getHours() * 60 + new Date().getMinutes();

  const slots: { hour: string; label: string; tempC: number; score: number; tier: RiskTier }[] = [];

  for (let m = startMin; m <= endMin; m += 60) {
    const hourInt = Math.floor(m / 60);
    const hStr = `${String(hourInt).padStart(2, '0')}:00`;

    // Temp: try to match from hourlyTrend
    let tempC = weather?.tempC ?? 32;
    if (weather?.hourlyTrend.length) {
      const match = weather.hourlyTrend.find((h) => {
        const raw = h.hour.replace(' AM', '').replace(' PM', '').trim();
        const n = parseInt(raw);
        let hh = n;
        if (h.hour.includes('PM') && n !== 12) hh = n + 12;
        if (h.hour.includes('AM') && n === 12) hh = 0;
        return hh === hourInt || h.hour === 'Now';
      });
      if (match) tempC = match.tempC;
    }

    const actBonus = ACTIVITY_HEAT_BONUS[checkIn.activityLevel] ?? 0;
    const rawScore = computeHeatScore({ ...scoringBase, tempC });
    const score = Math.min(100, rawScore.totalScore + actBonus);
    const tier: RiskTier = score >= 75 ? 'danger' : score >= 50 ? 'warning' : score >= 25 ? 'watch' : 'safe';

    const isNow = Math.abs(hourInt * 60 - nowMin) < 60 && nowMin >= startMin && nowMin <= endMin;

    slots.push({
      hour: hStr,
      label: isNow ? 'Now' : formatHour(hStr),
      tempC,
      score,
      tier,
    });
  }

  return slots;
}

// Smart recommendations based on check-in data
function buildRecommendations(checkIn: DailyCheckIn, timeline: ReturnType<typeof buildWorkTimeline>) {
  const recs: { emoji: string; text: string; priority: 'high' | 'medium' | 'low' }[] = [];

  const dangerSlots = timeline.filter((s) => s.tier === 'danger' || s.tier === 'warning');
  const peakSlot    = timeline.reduce((a, b) => (a.score > b.score ? a : b), timeline[0]);

  if (dangerSlots.length > 0 && peakSlot) {
    recs.push({
      emoji: '🌡️',
      text: `Peak heat risk at ${peakSlot.label} (score ${peakSlot.score}). Take a 15-min cool break then.`,
      priority: 'high',
    });
  }

  if (checkIn.sunExposureHours > 4) {
    recs.push({
      emoji: '🧴',
      text: 'Apply SPF 50+ sunscreen every 2 hours — you have 4+ hours of sun exposure today.',
      priority: 'high',
    });
  }

  if (checkIn.activityLevel === 'heavy') {
    recs.push({
      emoji: '💧',
      text: 'Heavy activity: drink 500–750ml every 30 minutes. Salt tablets can help prevent cramps.',
      priority: 'high',
    });
  } else if (checkIn.activityLevel === 'moderate') {
    recs.push({
      emoji: '💧',
      text: 'Moderate activity: drink at least 500ml water every hour during work.',
      priority: 'medium',
    });
  } else {
    recs.push({
      emoji: '💧',
      text: 'Even light indoor work requires 250ml water per hour in hot conditions.',
      priority: 'low',
    });
  }

  const lunchHour = Math.floor((toMin(checkIn.workStart) + toMin(checkIn.workEnd)) / 2 / 60);
  if (lunchHour >= 11 && lunchHour <= 14) {
    recs.push({
      emoji: '🌿',
      text: `Try to have lunch indoors between ${formatHour(`${lunchHour}:00`)} — the midday sun is harshest.`,
      priority: 'medium',
    });
  }

  if (checkIn.workLocation === 'construction' || checkIn.workLocation === 'field') {
    recs.push({
      emoji: '👒',
      text: 'Wear a wide-brim hat and UPF clothing — outdoor site work means full sun exposure.',
      priority: 'medium',
    });
    recs.push({
      emoji: '🏠',
      text: 'Set up a shaded rest area. Take 10-minute breaks in shade every 50 minutes.',
      priority: 'medium',
    });
  }

  recs.push({
    emoji: '🌬️',
    text: 'Wear loose, light-coloured clothing to reflect heat and improve air circulation.',
    priority: 'low',
  });

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

function EmptyState({ onEditCheckIn }: { onEditCheckIn: () => void }) {
  return (
    <GlassCard elevation="hero">
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'rgba(255,214,64,0.12)', border: '1px solid rgba(255,214,64,0.25)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <Briefcase size={30} color="#FFD640" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFF', marginBottom: 8 }}>
          No work plan for today
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
          Fill in your daily check-in to get personalised heat protection for your work schedule.
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={onEditCheckIn}
          type="button"
          style={{
            padding: '13px 28px', borderRadius: 14,
            background: '#FFD640', border: 'none',
            color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(255,214,64,0.3)',
          }}
        >
          Set Up Today's Plan ✨
        </motion.button>
      </div>
    </GlassCard>
  );
}

export function YourWorkPage({
  checkIn, weather, scoringBase, tempUnit, onEditCheckIn,
}: YourWorkPageProps) {
  const [showAllRecs, setShowAllRecs] = useState(false);

  const timeline = checkIn ? buildWorkTimeline(checkIn, weather, scoringBase) : [];
  const recommendations = checkIn ? buildRecommendations(checkIn, timeline) : [];

  const workDurationH = checkIn
    ? ((toMin(checkIn.workEnd) - toMin(checkIn.workStart)) / 60).toFixed(1)
    : 0;

  const maxScore = timeline.length ? Math.max(...timeline.map((s) => s.score)) : 0;
  const overallTier: RiskTier = maxScore >= 75 ? 'danger' : maxScore >= 50 ? 'warning' : maxScore >= 25 ? 'watch' : 'safe';
  const tierColor = TIER_COLORS[overallTier];

  const visibleRecs = showAllRecs ? recommendations : recommendations.slice(0, 3);

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(255,214,64,0.15)', border: '1px solid rgba(255,214,64,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Briefcase size={20} color="#FFD640" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#FFF', margin: 0 }}>Your Work</h1>
              <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                {checkIn ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'No plan for today'}
              </p>
            </div>
          </div>
          {checkIn && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onEditCheckIn}
              type="button"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#94A3B8', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}
            >
              <Edit3 size={13} /> Edit
            </motion.button>
          )}
        </div>

        {/* Empty state */}
        {!checkIn && <EmptyState onEditCheckIn={onEditCheckIn} />}

        {checkIn && (
          <>
            {/* Work Summary Card */}
            <GlassCard elevation="hero">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Location + overall risk */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <MapPin size={15} color="#FFD640" />
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#FFF' }}>
                        {checkIn.workLocationLabel}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748B' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {checkIn.workStart} → {checkIn.workEnd}
                      </span>
                      <span>·</span>
                      <span>{workDurationH} hrs</span>
                    </div>
                  </div>

                  {/* Overall risk badge */}
                  <div style={{
                    padding: '8px 14px', borderRadius: 14,
                    background: `${tierColor.bg}22`,
                    border: `1.5px solid ${tierColor.bg}55`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>Work Risk</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: tierColor.bg }}>
                      {overallTier.charAt(0).toUpperCase() + overallTier.slice(1)}
                    </div>
                  </div>
                </div>

                {/* Stat pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  }}>
                    <Sun size={12} color="#FBBF24" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#E2E8F0' }}>
                      {checkIn.sunExposureHours === 0 ? 'No sun' : checkIn.sunExposureHours <= 0.5 ? '30 min sun' : `${checkIn.sunExposureHours} hrs sun`}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  }}>
                    <TrendingUp size={12} color="#A78BFA" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#E2E8F0' }}>
                      {checkIn.activityLevel.charAt(0).toUpperCase() + checkIn.activityLevel.slice(1)} activity
                    </span>
                  </div>
                  {weather && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    }}>
                      <Thermometer size={12} color="#F59E0B" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#E2E8F0' }}>
                        {formatTemp(weather.tempC, tempUnit)} now
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {checkIn.notes && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 12, color: '#A1A1AA', lineHeight: 1.6, fontStyle: 'italic',
                  }}>
                    📝 {checkIn.notes}
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Hourly Work Timeline */}
            {timeline.length > 0 && (
              <GlassCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Clock size={16} color="#FFD640" />
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
                    Hourly Heat Risk — Your Work Hours
                  </h3>
                </div>

                {/* Bar chart */}
                <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 80, marginBottom: 10 }}>
                  {timeline.map((slot, i) => {
                    const tc = TIER_COLORS[slot.tier];
                    const barH = Math.max((slot.score / 100) * 70, 6);
                    const isNow = slot.label === 'Now';
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: barH }}
                          transition={{ delay: i * 0.06, type: 'spring', damping: 18 }}
                          style={{
                            width: '100%', borderRadius: 6,
                            background: tc.bg,
                            opacity: isNow ? 1 : 0.6,
                            boxShadow: isNow ? `0 0 10px ${tc.glow}` : 'none',
                            position: 'relative',
                          }}
                        >
                          {isNow && (
                            <motion.div
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1.4 }}
                              style={{
                                position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)',
                                width: 6, height: 6, borderRadius: '50%', background: '#FFF',
                              }}
                            />
                          )}
                        </motion.div>
                        <span style={{
                          fontSize: 8, color: isNow ? '#FFD640' : '#52525B',
                          fontWeight: isNow ? 900 : 500,
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                        }}>
                          {slot.label}
                        </span>
                        <span style={{ fontSize: 8, color: tc.bg, fontWeight: 700 }}>
                          {slot.score}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline detail cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {timeline.map((slot, i) => {
                    const { icon: TierIcon, color, label } = TIER_ICON[slot.tier];
                    const isNow = slot.label === 'Now';
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 12,
                          background: isNow ? 'rgba(255,214,64,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isNow ? 'rgba(255,214,64,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <TierIcon size={15} color={color} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: isNow ? '#FFD640' : '#CBD5E1' }}>
                            {slot.label}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>
                            {formatTemp(slot.tempC, tempUnit)}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color }}>{label}</div>
                          <div style={{ fontSize: 10, color: '#52525B' }}>Score {slot.score}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* Recommendations */}
            <GlassCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Shield size={16} color="#10B981" />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
                  Personalised Protections for Today
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AnimatePresence>
                  {visibleRecs.map((rec, i) => {
                    const borderColor = rec.priority === 'high'
                      ? 'rgba(239,68,68,0.35)'
                      : rec.priority === 'medium'
                      ? 'rgba(245,158,11,0.3)'
                      : 'rgba(255,255,255,0.1)';
                    const bgColor = rec.priority === 'high'
                      ? 'rgba(239,68,68,0.08)'
                      : rec.priority === 'medium'
                      ? 'rgba(245,158,11,0.07)'
                      : 'rgba(255,255,255,0.04)';

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 14,
                          background: bgColor, border: `1px solid ${borderColor}`,
                        }}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{rec.emoji}</span>
                        <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                          {rec.text}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {recommendations.length > 3 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllRecs(!showAllRecs)}
                  type="button"
                  style={{
                    width: '100%', marginTop: 10, padding: '10px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94A3B8', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {showAllRecs ? '↑ Show Less' : `↓ Show All ${recommendations.length} Tips`}
                </motion.button>
              )}
            </GlassCard>

            {/* Hydration target for the day */}
            <GlassCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Droplets size={16} color="#38BDF8" />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
                  Hydration Target for Today
                </h3>
              </div>

              {(() => {
                const baseL = 2.5;
                const actAdd = checkIn.activityLevel === 'heavy' ? 2.0 : checkIn.activityLevel === 'moderate' ? 1.0 : 0.3;
                const sunAdd = checkIn.sunExposureHours * 0.25;
                const heatAdd = overallTier === 'danger' ? 1.0 : overallTier === 'warning' ? 0.5 : 0;
                const total = +(baseL + actAdd + sunAdd + heatAdd).toFixed(1);

                return (
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#38BDF8', marginBottom: 4 }}>
                      {total}L
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#64748B', marginLeft: 6 }}>today's target</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                      {[
                        { label: 'Base daily requirement', val: `${baseL}L` },
                        { label: `${checkIn.activityLevel} activity`, val: `+${actAdd}L` },
                        { label: `${checkIn.sunExposureHours} hrs sun exposure`, val: `+${sunAdd.toFixed(1)}L` },
                        ...(heatAdd > 0 ? [{ label: `${overallTier} heat conditions`, val: `+${heatAdd}L` }] : []),
                      ].map(({ label, val }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#64748B' }}>{label}</span>
                          <span style={{ color: '#38BDF8', fontWeight: 700 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      marginTop: 12, padding: '10px 14px', borderRadius: 12,
                      background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                      fontSize: 12, color: '#7DD3FC',
                    }}>
                      💧 Drink roughly <strong>{Math.round((total * 1000) / Math.max(1, parseFloat(workDurationH.toString())))}</strong>ml per hour during your {workDurationH}-hour workday.
                    </div>
                  </div>
                );
              })()}
            </GlassCard>

            {/* Wind-down tip */}
            <GlassCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Wind size={15} color="#A78BFA" />
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
                  End-of-Day Recovery
                </h3>
              </div>
              <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.7 }}>
                After {checkIn.workEnd}, take a cool shower or use a damp towel on your neck and wrists.
                Drink 500ml of water or electrolyte drink within 30 minutes of finishing work.
                Avoid heavy meals for the first hour — your body is still cooling down.
              </p>
            </GlassCard>
          </>
        )}
      </div>
    </AnimatedGradientBackground>
  );
}
