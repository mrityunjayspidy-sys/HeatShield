import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, AlertTriangle, Flame } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import type { RiskTier } from '../lib/scoring';
import { TIER_COLORS } from '../lib/scoring';

interface Alert {
  id: string;
  tier: RiskTier;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

const DEMO_ALERTS: Alert[] = [
  { id: '1', tier: 'danger', message: 'Heat risk CRITICAL — move indoors immediately. Drink cold water.', timestamp: '2:15 PM', acknowledged: false },
  { id: '2', tier: 'warning', message: 'UV Index reached 9.2 — apply SPF 50 sunscreen and seek shade.', timestamp: '1:40 PM', acknowledged: false },
  { id: '3', tier: 'warning', message: 'Hydration reminder — drink 500ml water now.', timestamp: '12:30 PM', acknowledged: true },
  { id: '4', tier: 'watch', message: 'Heat risk rising — currently Watch tier. Monitor conditions.', timestamp: '10:15 AM', acknowledged: true },
  { id: '5', tier: 'safe', message: 'Morning conditions comfortable. Stay hydrated as usual.', timestamp: '7:00 AM', acknowledged: true },
];

export function AlertsHistory() {
  const [alerts, setAlerts] = useState(DEMO_ALERTS);

  const acknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const iconForTier = (tier: RiskTier) => {
    switch (tier) {
      case 'danger': return <Flame size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      default: return <Bell size={16} />;
    }
  };

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Bell size={22} color="#CBD5E1" />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>Alerts & History</h1>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: 7, top: 0, bottom: 0, width: 2,
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
                  transition={{ delay: i * 0.06 }}
                  style={{ marginBottom: 16, position: 'relative' }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: -21, top: 22, width: 12, height: 12, borderRadius: '50%',
                    background: color.bg, boxShadow: `0 0 10px ${color.glow}`,
                  }} />

                  <GlassCard style={{ borderLeft: `3px solid ${color.bg}`, opacity: alert.acknowledged ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: color.bg, marginBottom: 6 }}>
                        {iconForTier(alert.tier)}
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
