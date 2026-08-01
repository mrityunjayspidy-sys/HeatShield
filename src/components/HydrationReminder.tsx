/**
 * HydrationReminder
 * Displays real-time hourly drinking recommendations based on temperature, heat tier, and gender.
 * Features an interactive "Drink Water Timer" with audible/browser reminders.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Bell, BellOff, Volume2, Clock, ShieldCheck, Flame } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import type { RiskTier } from '../lib/scoring';
import { TIER_COLORS } from '../lib/scoring';

interface HydrationReminderProps {
  tempC: number;
  tier: RiskTier;
  gender?: 'male' | 'female' | 'other';
  weightKg?: number;
}

export function HydrationReminder({
  tempC, tier, gender = 'male', weightKg = 75,
}: HydrationReminderProps) {
  const [timerActive, setTimerActive] = useState(false);
  const [intervalMins, setIntervalMins] = useState(20);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [alertTriggered, setAlertTriggered] = useState(false);

  // ── Calculate dynamic intake based on heat, temperature, and gender ───────────
  // Males lose ~20% more fluid under high thermal stress; higher temps increase sweat exponent
  const baseMlPerHour = (weightKg * 35) / 16; // baseline daily rate per waking hour
  const heatMultiplier =
    tier === 'danger' ? 2.5 :
    tier === 'warning' ? 1.8 :
    tier === 'watch' ? 1.4 : 1.0;
  const genderFactor = gender === 'male' ? 1.15 : 1.0;

  const recommendedMlPerHour = Math.round(baseMlPerHour * heatMultiplier * genderFactor);

  // Per intake dose (divided by frequency)
  const dosesPerHour = 60 / intervalMins;
  const mlPerDose = Math.round(recommendedMlPerHour / dosesPerHour);

  // Timer Countdown logic
  useEffect(() => {
    if (!timerActive) return;
    if (secondsLeft <= 0) {
      setAlertTriggered(true);
      // Play web audio alert sound
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 587.33; // D5 pitch
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch {
        // audio context fallback
      }
      setSecondsLeft(intervalMins * 60);
      return;
    }
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive, secondsLeft, intervalMins]);

  const toggleTimer = () => {
    if (!timerActive) {
      setSecondsLeft(intervalMins * 60);
      setAlertTriggered(false);
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const tierColor = TIER_COLORS[tier];

  return (
    <GlassCard>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Droplets size={18} color="#38BDF8" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
            Constant Hydration Rate
          </h3>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
            Calculated for {tempC}°C {tier.toUpperCase()} risk · {gender.toUpperCase()} profile
          </p>
        </div>
      </div>

      {/* Recommended Hourly Intake Box */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px', borderRadius: 14,
        background: 'rgba(56,189,248,0.1)', border: '1.5px solid rgba(56,189,248,0.3)',
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7DD3FC', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Recommended Rate
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#38BDF8' }}>
            {recommendedMlPerHour} ml <span style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>/ hour</span>
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
            💧 Drink <strong style={{ color: '#FFF' }}>{mlPerDose} ml</strong> every <strong style={{ color: '#FFF' }}>{intervalMins} minutes</strong>
          </div>
        </div>

        <motion.div
          animate={{ scale: tier === 'danger' ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            padding: '8px 12px', borderRadius: 12,
            background: `${tierColor.bg}22`, border: `1px solid ${tierColor.bg}55`,
            textAlign: 'center',
          }}
        >
          <Flame size={16} color={tierColor.bg} />
          <div style={{ fontSize: 10, fontWeight: 800, color: tierColor.bg, marginTop: 2 }}>
            {tier.toUpperCase()}
          </div>
        </motion.div>
      </div>

      {/* Trigger alert notification toast */}
      <AnimatePresence>
        {alertTriggered && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: '12px 14px', borderRadius: 12,
              background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)',
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            }}
          >
            <Volume2 size={20} color="#F59E0B" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>Time to drink water!</div>
              <div style={{ fontSize: 11, color: '#FCD34D' }}>Drink {mlPerDose} ml now to maintain hydration in {tempC}°C heat.</div>
            </div>
            <button
              onClick={() => setAlertTriggered(false)}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
            >
              OK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA' }}>
            Reminder Interval:
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[15, 20, 30].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setIntervalMins(m); setSecondsLeft(m * 60); setTimerActive(false); }}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: intervalMins === m ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${intervalMins === m ? '#38BDF8' : 'rgba(255,255,255,0.12)'}`,
                  color: intervalMins === m ? '#38BDF8' : '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={toggleTimer}
          type="button"
          style={{
            padding: '12px', borderRadius: 14, cursor: 'pointer',
            background: timerActive ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.2)',
            border: `1.5px solid ${timerActive ? '#EF4444' : '#38BDF8'}`,
            color: timerActive ? '#EF4444' : '#38BDF8',
            fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {timerActive ? (
            <>
              <BellOff size={16} /> Stop Reminder ({formatSecs(secondsLeft)} left)
            </>
          ) : (
            <>
              <Bell size={16} /> Start Hydration Alarm ({intervalMins}m loop)
            </>
          )}
        </motion.button>
      </div>
    </GlassCard>
  );
}
