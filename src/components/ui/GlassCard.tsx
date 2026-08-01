import React from 'react';
import { motion } from 'framer-motion';
import { GLASS } from '../../lib/glass';
import type { RiskTier } from '../../lib/scoring';
import { TIER_COLORS } from '../../lib/scoring';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  tier?: RiskTier;
  elevation?: 'mid' | 'hero';
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function GlassCard({ children, className = '', tier, elevation = 'mid', onClick, style }: GlassCardProps) {
  const tierColor = tier ? TIER_COLORS[tier] : null;
  const isHero = elevation === 'hero';

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={className}
      style={{
        background: GLASS.dark,
        backdropFilter: isHero ? GLASS.blur.hero : GLASS.blur.base,
        WebkitBackdropFilter: isHero ? GLASS.blur.hero : GLASS.blur.base,
        border: `1px solid ${tierColor ? tierColor.glow : GLASS.borderDark}`,
        boxShadow: `${isHero ? GLASS.shadow.hero : GLASS.shadow.mid}${tierColor ? `, 0 0 20px ${tierColor.glow}` : ''}`,
        borderRadius: GLASS.radius.card,
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
