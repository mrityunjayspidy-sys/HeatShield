import { motion } from 'framer-motion';
import type { RiskTier } from '../../lib/scoring';
import { TIER_BG_GRADIENTS } from '../../lib/glass';

interface Props {
  tier: RiskTier;
  children: React.ReactNode;
}

/**
 * Full-screen animated gradient background — Black & White Monochrome Edition.
 */
export function AnimatedGradientBackground({ tier, children }: Props) {
  const isDanger = tier === 'danger';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#000000' }}>
      {/* Ambient blobs — furthest depth layer */}
      <motion.div
        key={tier}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          background: TIER_BG_GRADIENTS[tier],
        }}
      />

      {/* Blob 1 — slow drift monochrome highlight */}
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'fixed', top: '10%', left: '15%',
          width: 340, height: 340, borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)',
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />

      {/* Blob 2 — counter-drift monochrome contrast */}
      <motion.div
        animate={{ x: [0, -30, 25, 0], y: [0, 25, -15, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'fixed', bottom: '10%', right: '10%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'rgba(200, 200, 200, 0.05)',
          filter: 'blur(90px)',
          zIndex: 0,
        }}
      />

      {/* Danger pulse overlay (Monochrome bright white flash) */}
      {isDanger && (
        <motion.div
          animate={{ opacity: [0, 0.12, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.4), transparent 70%)',
          }}
        />
      )}

      {/* Content above blobs */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
