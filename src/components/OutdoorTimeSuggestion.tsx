/**
 * OutdoorTimeSuggestion
 * Analyses the hourly forecast to recommend the best & worst windows to go outside.
 * Uses heat-score per hour to classify windows as "Cool", "Warm", or "Hot".
 */
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { computeHeatScore, type ScoringInput, type RiskTier } from '../lib/scoring';

interface HourSlot {
  hour: string;
  tempC: number;
}

interface OutdoorTimeSuggestionProps {
  hourlyTrend: HourSlot[];
  scoringBase: Omit<ScoringInput, 'tempC'>;
  tempUnit: 'C' | 'F';
}

function formatTemp(c: number, unit: 'C' | 'F') {
  return unit === 'F' ? `${((c * 9) / 5 + 32).toFixed(0)}°F` : `${c.toFixed(0)}°C`;
}

const TIER_BADGE: Record<RiskTier, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  safe:    { label: 'Cool / Safe',     color: '#FFFFFF', bg: 'rgba(255,255,255,0.15)', icon: CheckCircle2 },
  watch:   { label: 'Moderate',        color: '#E4E4E7', bg: 'rgba(255,255,255,0.12)', icon: Minus },
  warning: { label: 'High Heat Risk',  color: '#A1A1AA', bg: 'rgba(255,255,255,0.08)', icon: TrendingUp },
  danger:  { label: 'Extreme Hazard',  color: '#71717A', bg: 'rgba(255,255,255,0.05)', icon: AlertTriangle },
};

export function OutdoorTimeSuggestion({
  hourlyTrend, scoringBase, tempUnit,
}: OutdoorTimeSuggestionProps) {
  if (!hourlyTrend.length) return null;

  // Score every hour slot
  const scored = hourlyTrend.map((slot) => {
    const score = computeHeatScore({ ...scoringBase, tempC: slot.tempC });
    return { ...slot, score: score.totalScore, tier: score.tier };
  });

  // Best (lowest score) & worst (highest score) windows
  const sorted = [...scored].sort((a, b) => a.score - b.score);
  const bestWindows  = sorted.slice(0, Math.min(2, sorted.length));
  const worstWindows = sorted.slice(-Math.min(2, sorted.length)).reverse();

  // Overall trend: first half vs second half average
  const half = Math.floor(scored.length / 2);
  const firstHalfAvg  = scored.slice(0, half).reduce((s, x) => s + x.score, 0) / (half || 1);
  const secondHalfAvg = scored.slice(half).reduce((s, x) => s + x.score, 0) / ((scored.length - half) || 1);
  const trendDir = secondHalfAvg > firstHalfAvg + 5 ? 'rising' : secondHalfAvg < firstHalfAvg - 5 ? 'cooling' : 'stable';

  const TrendIcon = trendDir === 'rising' ? TrendingUp : trendDir === 'cooling' ? TrendingDown : Minus;
  const trendColor = '#FFFFFF';
  const trendLabel = trendDir === 'rising' ? 'Heat is rising through the day' : trendDir === 'cooling' ? 'Temperature is cooling down' : 'Fairly stable temperatures';

  return (
    <GlassCard>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock size={18} color="#FFFFFF" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Outdoor Time Schedule & Thermal Windows
          </h3>
          <p style={{ fontSize: 11, color: '#A1A1AA', margin: 0 }}>
            Based on today's hourly forecast
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendIcon size={14} color={trendColor} />
          <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>{trendLabel}</span>
        </div>
      </div>

      {/* Hourly mini bar chart */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginBottom: 16, height: 60 }}>
        {scored.map((slot, i) => {
          const pct = (slot.score / 100) * 100;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct * 0.44, 4)}px` }}
                transition={{ delay: i * 0.05, type: 'spring', damping: 18 }}
                style={{
                  width: '100%', borderRadius: 4,
                  background: slot.hour === 'Now' ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  opacity: slot.hour === 'Now' ? 1 : 0.65,
                  boxShadow: slot.hour === 'Now' ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                }}
              />
              <span style={{
                fontSize: 8, color: slot.hour === 'Now' ? '#FFF' : '#71717A',
                fontWeight: slot.hour === 'Now' ? 800 : 500, whiteSpace: 'nowrap',
              }}>
                {slot.hour.replace(' ', '\n')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Best windows */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <CheckCircle2 size={15} color="#FFFFFF" />
          <p style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.7, margin: 0 }}>
            RECOMMENDED OUTDOOR WINDOWS — LOW THERMAL STRESS
          </p>
        </div>
        <p style={{ fontSize: 11, color: '#A1A1AA', margin: '0 0 10px 0', lineHeight: 1.4 }}>
          PROMPT: Optimal window for outdoor movement and activities. Thermal load and heat index are minimal.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {bestWindows.map((slot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              style={{
                flex: 1, minWidth: 110, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF' }}>{slot.hour}</div>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#000000', background: '#FFFFFF', padding: '2px 6px', borderRadius: 4 }}>
                  RECOMMENDED
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 4 }}>
                {formatTemp(slot.tempC, tempUnit)} · Score {slot.score}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} color="#FFFFFF" /> {TIER_BADGE[slot.tier].label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Worst windows */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <AlertTriangle size={15} color="#FFFFFF" />
          <p style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.7, margin: 0 }}>
            AVOID GOING OUT WINDOWS — HIGH THERMAL STRESS
          </p>
        </div>
        <p style={{ fontSize: 11, color: '#A1A1AA', margin: '0 0 10px 0', lineHeight: 1.4 }}>
          PROMPT: High heat risk and extreme temperature hazard. Restrict outdoor exposure and remain in shaded or climate-controlled spaces.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {worstWindows.map((slot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              style={{
                flex: 1, minWidth: 110, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF' }}>{slot.hour}</div>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#FFFFFF', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: 4 }}>
                  AVOID OUTDOORS
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 4 }}>
                {formatTemp(slot.tempC, tempUnit)} · Score {slot.score}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={12} color="#FFFFFF" /> {TIER_BADGE[slot.tier].label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
