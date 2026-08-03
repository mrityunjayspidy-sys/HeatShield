import { motion } from 'framer-motion';
import type { RiskTier } from '../../lib/scoring';
import { TIER_BG_GRADIENTS } from '../../lib/glass';

interface Props {
  tier: RiskTier;
  children: React.ReactNode;
}

/**
 * Full-screen ambient gradient background — Hardware-accelerated for ultra-smooth mobile scrolling.
 */
export function AnimatedGradientBackground({ tier, children }: Props) {
  const isDanger = tier === 'danger';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#000000' }}>
      {/* Ambient base layer */}
      <motion.div
        key={tier}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: TIER_BG_GRADIENTS[tier],
          willChange: 'opacity',
          transform: 'translateZ(0)',
        }}
      />

      {/* Blob 1 — Static hardware-accelerated highlight */}
      <div
        style={{
          position: 'fixed', top: '5%', left: '10%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translateZ(0)',
        }}
      />

      {/* Blob 2 — Static hardware-accelerated depth glow */}
      <div
        style={{
          position: 'fixed', bottom: '10%', right: '5%',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200, 200, 200, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translateZ(0)',
        }}
      />

      {/* Danger pulse overlay */}
      {isDanger && (
        <motion.div
          animate={{ opacity: [0, 0.12, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.4), transparent 70%)',
            willChange: 'opacity',
            transform: 'translateZ(0)',
          }}
        />
      )}

      {/* Content above background */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

