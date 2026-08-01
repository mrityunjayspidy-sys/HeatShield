import { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Plus, RotateCcw } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';

const PRESETS = [250, 500, 750];

export function HydrationTracker() {
  const [intakeMl, setIntakeMl] = useState(1750);
  const [customMl, setCustomMl] = useState('');
  const target = 3200;
  const pct = Math.min(100, Math.round((intakeMl / target) * 100));
  const logs = [
    { time: '2:10 PM', ml: 500 },
    { time: '12:45 PM', ml: 250 },
    { time: '10:30 AM', ml: 500 },
    { time: '8:00 AM', ml: 500 },
  ];

  // Animated water ring
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Droplets size={22} color="#FFFFFF" />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>Hydration Tracker</h1>
        </div>

        {/* Water Ring */}
        <GlassCard elevation="hero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32 }}>
          <div style={{ position: 'relative', width: 240, height: 240 }}>
            <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
              <motion.circle
                cx="120" cy="120" r={radius} fill="none"
                stroke="url(#waterGrad)"
                strokeWidth="16" strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#71717A" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center content */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <Droplets size={28} color="#FFFFFF" />
              <div style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF', marginTop: 4 }}>{pct}%</div>
              <div style={{ fontSize: 12, color: '#A1A1AA' }}>{intakeMl.toLocaleString()} / {target.toLocaleString()} ml</div>
            </div>
          </div>
        </GlassCard>

        {/* Quick-log presets */}
        <div style={{ display: 'flex', gap: 10 }}>
          {PRESETS.map((ml) => (
            <motion.button
              key={ml}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIntakeMl((prev) => prev + ml)}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 18, fontWeight: 800, fontSize: 15,
                background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Plus size={16} /> {ml}ml
            </motion.button>
          ))}
        </div>

        {/* Custom entry */}
        <GlassCard>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="number" placeholder="Custom ml" value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFF', fontSize: 14, outline: 'none',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { if (customMl) { setIntakeMl((prev) => prev + parseInt(customMl)); setCustomMl(''); } }}
              style={{
                padding: '12px 20px', borderRadius: 14, background: '#FFFFFF', border: 'none',
                color: '#000000', fontWeight: 800, cursor: 'pointer',
              }}
            >
              Log
            </motion.button>
          </div>
        </GlassCard>

        {/* History */}
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, color: '#A1A1AA', fontSize: 14 }}>Today's Log</h3>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIntakeMl(0)}
              style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <RotateCcw size={12} /> Reset
            </motion.button>
          </div>
          {logs.map((log, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 0',
              borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>+{log.ml} ml</span>
              <span style={{ color: '#71717A', fontSize: 12 }}>{log.time}</span>
            </div>
          ))}
        </GlassCard>
      </div>
    </AnimatedGradientBackground>
  );
}
