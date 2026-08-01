import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { GLASS } from '../../lib/glass';

interface GlassChipProps {
  label: string;
  value?: string;
  icon?: LucideIcon;
  color?: string;
  onClick?: () => void;
}

/**
 * Pill-shaped translucent tag — used for risk factor pills and stat chips.
 */
export function GlassChip({ label, value, icon: Icon, color = '#94A3B8', onClick }: GlassChipProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      type="button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: value ? '8px 14px' : '6px 12px',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: GLASS.radius.pill,
        color: '#E2E8F0',
        fontSize: 13,
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        transition: 'border-color 0.3s',
      }}
    >
      {Icon && <Icon size={14} color={color} />}
      <span style={{ color: '#94A3B8', fontSize: 11 }}>{label}</span>
      {value && <span style={{ color, fontWeight: 800, fontSize: 15 }}>{value}</span>}
    </motion.button>
  );
}
