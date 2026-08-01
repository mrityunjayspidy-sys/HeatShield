import { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type { RiskTier } from '../lib/scoring';
import { TIER_COLORS } from '../lib/scoring';

interface ScoreGaugeProps {
  score: number;
  tier: RiskTier;
  recommendedAction: string;
}

/**
 * Hero score gauge — animated circular arc (0–100) with tier-colored glow.
 * Uses Framer Motion spring physics for smooth updates.
 */
export function ScoreGauge({ score, tier, recommendedAction }: ScoreGaugeProps) {
  const tierColor = TIER_COLORS[tier];
  const springScore = useSpring(0, { stiffness: 60, damping: 20 });
  const displayScore = useTransform(springScore, (v) => Math.round(v));

  useEffect(() => {
    springScore.set(score);
  }, [score, springScore]);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270° arc
  const offset = useTransform(springScore, (v) => arcLength - (v / 100) * arcLength);

  const ScoreDisplay = () => {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
      const unsub = displayScore.on('change', (v) => {
        if (ref.current) ref.current.textContent = String(v);
      });
      return unsub;
    }, []);
    return <span ref={ref} style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>0</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 240, height: 240 }}>
        <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: 'rotate(135deg)' }}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tierColor.gradient[0]} />
              <stop offset="100%" stopColor={tierColor.gradient[1]} />
            </linearGradient>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14"
            strokeDasharray={arcLength} strokeDashoffset={0} strokeLinecap="round"
            style={{ transformOrigin: 'center' }} />
          {/* Active arc */}
          <motion.circle cx="120" cy="120" r={radius} fill="none" stroke="url(#gaugeGrad)" strokeWidth="14"
            strokeDasharray={arcLength} style={{ strokeDashoffset: offset, transformOrigin: 'center', filter: 'url(#gaugeGlow)' }}
            strokeLinecap="round" />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#94A3B8', textTransform: 'uppercase' }}>
            Heat Risk
          </span>
          <motion.div style={{ color: tierColor.bg }}>
            <ScoreDisplay />
          </motion.div>
          <motion.span
            key={tier}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: tierColor.bg,
              background: `${tierColor.bg}22`,
              border: `1.5px solid ${tierColor.bg}`,
            }}
          >
            {tier}
          </motion.span>
        </div>
      </div>
      <p style={{ fontSize: 14, color: '#CBD5E1', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
        {recommendedAction}
      </p>
    </div>
  );
}
