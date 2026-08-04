import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Plus, RotateCcw, Target, Bell, BellOff, Clock, Trash2, GlassWater } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import { scheduleHydrationReminders, cancelHydrationReminders } from '../lib/notifications';

// ── Persistence helpers ───────────────────────────────────────────────────────
const getTodayKey = () => new Date().toISOString().slice(0, 10);
const GOAL_KEY = 'heatwatch_hydration_goal';
const REMINDER_KEY = 'heatwatch_hydration_reminders_on';
const INTERVAL_KEY = 'heatwatch_hydration_interval';

interface HydrationLog {
  ml: number;
  time: string; // HH:MM AM/PM
  timestamp: number;
}

function getStorageKey() {
  return `heatwatch_hydration_${getTodayKey()}`;
}

function loadTodayLogs(): HydrationLog[] {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTodayLogs(logs: HydrationLog[]) {
  localStorage.setItem(getStorageKey(), JSON.stringify(logs));
}

function loadGoal(): number {
  return parseInt(localStorage.getItem(GOAL_KEY) || '3000', 10);
}

function saveGoal(ml: number) {
  localStorage.setItem(GOAL_KEY, String(ml));
}

function loadRemindersOn(): boolean {
  return localStorage.getItem(REMINDER_KEY) !== 'false';
}

function loadInterval(): number {
  return parseInt(localStorage.getItem(INTERVAL_KEY) || '45', 10);
}

const PRESETS = [250, 500, 750];
const GOAL_OPTIONS = [2000, 2500, 3000, 3500, 4000];
const INTERVAL_OPTIONS = [30, 45, 60, 90, 120];

export function HydrationTracker() {
  const [logs, setLogs] = useState<HydrationLog[]>(() => loadTodayLogs());
  const [goal, setGoal] = useState<number>(() => loadGoal());
  const [customMl, setCustomMl] = useState('');
  const [remindersOn, setRemindersOn] = useState(() => loadRemindersOn());
  const [intervalMin, setIntervalMin] = useState(() => loadInterval());
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  const intakeMl = logs.reduce((sum, l) => sum + l.ml, 0);
  const pct = Math.min(100, Math.round((intakeMl / goal) * 100));
  const remaining = Math.max(0, goal - intakeMl);
  const glassesLeft = Math.ceil(remaining / 250);

  // Animated water ring
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  // Persist logs
  useEffect(() => { saveTodayLogs(logs); }, [logs]);

  // Schedule/cancel reminders when settings change
  const syncReminders = useCallback(async () => {
    if (remindersOn) {
      await scheduleHydrationReminders(intervalMin, goal, intakeMl);
    } else {
      await cancelHydrationReminders();
    }
  }, [remindersOn, intervalMin, goal, intakeMl]);

  useEffect(() => { syncReminders(); }, [syncReminders]);

  const addWater = (ml: number) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setLogs((prev) => [{ ml, time: timeStr, timestamp: now.getTime() }, ...prev]);
  };

  const removeLog = (index: number) => {
    setLogs((prev) => prev.filter((_, i) => i !== index));
  };

  const resetToday = () => {
    setLogs([]);
  };

  const handleSetGoal = (ml: number) => {
    setGoal(ml);
    saveGoal(ml);
    setShowGoalPicker(false);
  };

  const handleToggleReminders = async () => {
    const next = !remindersOn;
    setRemindersOn(next);
    localStorage.setItem(REMINDER_KEY, String(next));
  };

  const handleSetInterval = (min: number) => {
    setIntervalMin(min);
    localStorage.setItem(INTERVAL_KEY, String(min));
    setShowIntervalPicker(false);
  };

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px calc(60px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Droplets size={22} color="#FFFFFF" />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>Hydration Tracker</h1>
        </div>

        {/* ── Water Ring ── */}
        <GlassCard elevation="hero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 28 }}>
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            <svg width="220" height="220" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
              <motion.circle
                cx="120" cy="120" r={radius} fill="none"
                stroke={pct >= 100 ? '#10B981' : 'url(#waterGrad)'}
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
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              {pct >= 100 ? (
                <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981' }}>🎉 Goal!</div>
              ) : (
                <>
                  <GlassWater size={24} color="#FFFFFF" />
                  <div style={{ fontSize: 34, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>{pct}%</div>
                </>
              )}
              <div style={{ fontSize: 12, color: '#A1A1AA' }}>{intakeMl.toLocaleString()} / {goal.toLocaleString()} ml</div>
            </div>
          </div>

          {/* Progress summary */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#FFF' }}>{glassesLeft}</div>
              <div style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>glasses left</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#FFF' }}>{remaining}</div>
              <div style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>ml to go</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#FFF' }}>{logs.length}</div>
              <div style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>entries</div>
            </div>
          </div>
        </GlassCard>

        {/* ── Quick-log presets ── */}
        <div style={{ display: 'flex', gap: 10 }}>
          {PRESETS.map((ml) => (
            <motion.button
              key={ml}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => addWater(ml)}
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

        {/* ── Custom entry ── */}
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
              onClick={() => {
                const val = parseInt(customMl);
                if (val > 0) { addWater(val); setCustomMl(''); }
              }}
              style={{
                padding: '12px 20px', borderRadius: 14, background: '#FFFFFF', border: 'none',
                color: '#000000', fontWeight: 800, cursor: 'pointer',
              }}
            >
              Log
            </motion.button>
          </div>
        </GlassCard>

        {/* ── Goal & Reminder Settings ── */}
        <GlassCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Daily Goal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={16} color="#A78BFA" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#A1A1AA' }}>Daily Goal</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGoalPicker((p) => !p)}
                style={{
                  padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                  background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)',
                  color: '#A78BFA', cursor: 'pointer',
                }}
              >
                {goal.toLocaleString()} ml
              </motion.button>
            </div>

            <AnimatePresence>
              {showGoalPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                >
                  {GOAL_OPTIONS.map((g) => (
                    <motion.button
                      key={g} whileTap={{ scale: 0.95 }}
                      onClick={() => handleSetGoal(g)}
                      style={{
                        padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                        background: goal === g ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${goal === g ? '#A78BFA' : 'rgba(255,255,255,0.12)'}`,
                        color: goal === g ? '#A78BFA' : '#A1A1AA', cursor: 'pointer',
                      }}
                    >
                      {g.toLocaleString()} ml
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reminder Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {remindersOn ? <Bell size={16} color="#10B981" /> : <BellOff size={16} color="#52525B" />}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#A1A1AA' }}>Water Reminders</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleReminders}
                style={{
                  padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                  background: remindersOn ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${remindersOn ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  color: remindersOn ? '#10B981' : '#52525B', cursor: 'pointer',
                }}
              >
                {remindersOn ? 'ON' : 'OFF'}
              </motion.button>
            </div>

            {/* Reminder Interval */}
            {remindersOn && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#F59E0B" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#A1A1AA' }}>Remind every</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowIntervalPicker((p) => !p)}
                    style={{
                      padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                      background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
                      color: '#F59E0B', cursor: 'pointer',
                    }}
                  >
                    {intervalMin} min
                  </motion.button>
                </div>

                <AnimatePresence>
                  {showIntervalPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                    >
                      {INTERVAL_OPTIONS.map((m) => (
                        <motion.button
                          key={m} whileTap={{ scale: 0.95 }}
                          onClick={() => handleSetInterval(m)}
                          style={{
                            padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                            background: intervalMin === m ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${intervalMin === m ? '#F59E0B' : 'rgba(255,255,255,0.12)'}`,
                            color: intervalMin === m ? '#F59E0B' : '#A1A1AA', cursor: 'pointer',
                          }}
                        >
                          {m} min
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p style={{ fontSize: 11, color: '#52525B', lineHeight: 1.4 }}>
                  💡 You'll receive notifications on your phone reminding you to drink water every {intervalMin} minutes between 7 AM — 10 PM.
                </p>
              </>
            )}
          </div>
        </GlassCard>

        {/* ── Today's Log History ── */}
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, color: '#A1A1AA', fontSize: 14 }}>Today's Log</h3>
            <motion.button whileTap={{ scale: 0.9 }} onClick={resetToday}
              style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <RotateCcw size={12} /> Reset
            </motion.button>
          </div>
          {logs.length === 0 ? (
            <p style={{ fontSize: 13, color: '#52525B', textAlign: 'center', padding: '16px 0' }}>
              No water logged today. Tap a button above to start! 💧
            </p>
          ) : (
            logs.map((log, i) => (
              <div key={log.timestamp} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0',
                borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>+{log.ml} ml</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#71717A', fontSize: 12 }}>{log.time}</span>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => removeLog(i)}
                    style={{ background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </AnimatedGradientBackground>
  );
}
