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
  safe:    { label: 'Cool ✓',  color: '#10B981', bg: 'rgba(16,185,129,0.15)',  icon: CheckCircle2 },
  watch:   { label: 'Warm',    color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',   icon: Minus },
  warning: { label: 'Hot ⚠',   color: '#F97316', bg: 'rgba(249,115,22,0.15)',  icon: TrendingUp },
  danger:  { label: 'Danger',  color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   icon: AlertTriangle },
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
  const trendColor = trendDir === 'rising' ? '#EF4444' : trendDir === 'cooling' ? '#10B981' : '#A1A1AA';
  const trendLabel = trendDir === 'rising' ? 'Heat is rising through the day' : trendDir === 'cooling' ? 'Temperature is cooling down' : 'Fairly stable temperatures';

  return (
    <GlassCard>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock size={18} color="#10B981" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
            Best Time to Go Outside
          </h3>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
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
          const badge = TIER_BADGE[slot.tier];
          const pct = (slot.score / 100) * 100;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct * 0.44, 4)}px` }}
                transition={{ delay: i * 0.05, type: 'spring', damping: 18 }}
                style={{
                  width: '100%', borderRadius: 4,
                  background: badge.color,
                  opacity: slot.hour === 'Now' ? 1 : 0.65,
                  boxShadow: slot.hour === 'Now' ? `0 0 8px ${badge.color}` : 'none',
                }}
              />
              <span style={{
                fontSize: 8, color: slot.hour === 'Now' ? '#FFF' : '#52525B',
                fontWeight: slot.hour === 'Now' ? 800 : 500, whiteSpace: 'nowrap',
              }}>
                {slot.hour.replace(' ', '\n')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Best windows */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
          ✅ Recommended Windows
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {bestWindows.map((slot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              style={{
                flex: 1, minWidth: 110, padding: '10px 14px', borderRadius: 14,
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: '#10B981' }}>{slot.hour}</div>
              <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>
                {formatTemp(slot.tempC, tempUnit)} · Score {slot.score}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
                {TIER_BADGE[slot.tier].label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Worst windows */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
          ⚠️ Avoid Going Out
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {worstWindows.map((slot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              style={{
                flex: 1, minWidth: 110, padding: '10px 14px', borderRadius: 14,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: '#EF4444' }}>{slot.hour}</div>
              <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>
                {formatTemp(slot.tempC, tempUnit)} · Score {slot.score}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', marginTop: 4 }}>
                {TIER_BADGE[slot.tier].label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
