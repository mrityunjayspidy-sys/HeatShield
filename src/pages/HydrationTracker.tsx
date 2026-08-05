import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Plus, RotateCcw, Target, Bell, BellOff, Clock, Trash2, GlassWater, CloudSun, Send, Check } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import { scheduleHydrationReminders, cancelHydrationReminders, sendLocalNotification } from '../lib/notifications';
import type { LiveWeatherData } from '../lib/weather';
import type { UserSession } from '../lib/supabase';
import { computeHeatScore } from '../lib/scoring';

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
  return parseInt(localStorage.getItem(INTERVAL_KEY) || '30', 10);
}

const PRESETS = [250, 500, 750];
const GOAL_OPTIONS = [2000, 2500, 3000, 3500, 4000, 4500];
const INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 90];

interface HydrationTrackerProps {
  userSession?: UserSession;
  weather?: LiveWeatherData | null;
}

export function HydrationTracker({ userSession, weather }: HydrationTrackerProps) {
  const [logs, setLogs] = useState<HydrationLog[]>(() => loadTodayLogs());
  const [userGoal, setUserGoal] = useState<number>(() => loadGoal());
  const [customMl, setCustomMl] = useState('');
  const [remindersOn, setRemindersOn] = useState(() => loadRemindersOn());
  const [intervalMin, setIntervalMin] = useState(() => loadInterval());
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // ── Calculate Weather-Respective Recommended Hydration Target ──
  const weightKg = userSession?.weightKg || 75;
  const currentTemp = weather ? weather.tempC : 32.0;
  const currentHumidity = weather ? weather.humidityPct : 60;
  const currentUv = weather ? weather.uvIndex : 7;

  const scoreResult = computeHeatScore({
    tempC: currentTemp,
    humidity: currentHumidity,
    uvIndex: currentUv,
    age: userSession?.age || 30,
    weightKg,
    heightCm: userSession?.heightCm || 175,
    conditions: userSession?.conditions || [],
    medicationsAffectingHeat: userSession?.medications || false,
    outdoorOccupation: userSession?.outdoor || false,
    sunExposureLevel: 'moderate',
  });

  const baseIntakeMl = Math.round(weightKg * 35); // baseline ~2625ml for 75kg
  let tempAdjustmentMl = 0;
  if (currentTemp >= 38) {
    tempAdjustmentMl = 1200;
  } else if (currentTemp >= 33) {
    tempAdjustmentMl = 800;
  } else if (currentTemp >= 28) {
    tempAdjustmentMl = 400;
  } else if (currentTemp >= 24) {
    tempAdjustmentMl = 200;
  }

  if (currentHumidity > 70) tempAdjustmentMl += 250;

  const weatherRecommendedGoal = baseIntakeMl + tempAdjustmentMl;

  // Active Target used for progress calculations (User Limit or Weather Target)
  const activeGoal = userGoal > 0 ? userGoal : weatherRecommendedGoal;

  const intakeMl = logs.reduce((sum, l) => sum + l.ml, 0);
  const pct = Math.min(100, Math.round((intakeMl / activeGoal) * 100));
  const remaining = Math.max(0, activeGoal - intakeMl);
  const glassesLeft = Math.ceil(remaining / 250);

  // Animated water ring
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  // Persist logs
  useEffect(() => { saveTodayLogs(logs); }, [logs]);

  // Schedule/cancel weather-adaptive mobile notifications when settings or weather change
  const syncReminders = useCallback(async () => {
    if (remindersOn) {
      await scheduleHydrationReminders(intervalMin, activeGoal, intakeMl, currentTemp, scoreResult.tier);
    } else {
      await cancelHydrationReminders();
    }
  }, [remindersOn, intervalMin, activeGoal, intakeMl, currentTemp, scoreResult.tier]);

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

  const handleSetUserGoal = (ml: number) => {
    setUserGoal(ml);
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

  const handleSendTestNotification = async () => {
    await sendLocalNotification(
      `Hydration Weather Alert (${currentTemp.toFixed(0)}°C)`,
      `Stay hydrated in ${currentTemp.toFixed(0)}°C heat! Drink 250ml water now. (${remaining}ml remaining to reach your goal)`,
      8888
    );
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <AnimatedGradientBackground tier={scoreResult.tier}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px calc(60px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Droplets size={20} color="#FFFFFF" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF', margin: 0 }}>Hydration Tracker</h1>
            <p style={{ fontSize: 11, color: '#A1A1AA', margin: 0 }}>Weather-adaptive fluid requirement system</p>
          </div>
        </div>

        {/* ── Weather & Hydration Target Overview Card ── */}
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CloudSun size={18} color="#FFFFFF" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                Weather Condition Impact ({currentTemp.toFixed(1)}°C)
              </span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#FFFFFF',
            }}>
              {scoreResult.tier.toUpperCase()} RISK
            </span>
          </div>

          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase' }}>
                  Weather-Recommended Target
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>
                  {weatherRecommendedGoal.toLocaleString()} ml <span style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 600 }}>(+{tempAdjustmentMl}ml for heat)</span>
                </div>
              </div>

              {userGoal !== weatherRecommendedGoal && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSetUserGoal(weatherRecommendedGoal)}
                  style={{
                    padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 800,
                    background: '#FFFFFF', color: '#000000', border: 'none', cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Apply Weather Target
                </motion.button>
              )}
            </div>

            <div style={{ fontSize: 11, color: '#A1A1AA', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
              PROMPT: Hydration content is dynamically calculated based on temperature ({currentTemp.toFixed(1)}°C) and user weight ({weightKg}kg).
            </div>
          </div>
        </GlassCard>

        {/* ── Water Ring Progress Card ── */}
        <GlassCard elevation="hero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24 }}>
          <div style={{ position: 'relative', width: 210, height: 210 }}>
            <svg width="210" height="210" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
              <motion.circle
                cx="120" cy="120" r={radius} fill="none"
                stroke={pct >= 100 ? '#FFFFFF' : 'url(#waterGrad)'}
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
                <div style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF' }}>Target Reached!</div>
              ) : (
                <>
                  <GlassWater size={24} color="#FFFFFF" />
                  <div style={{ fontSize: 34, fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>{pct}%</div>
                </>
              )}
              <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>{intakeMl.toLocaleString()} / {activeGoal.toLocaleString()} ml</div>
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
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.92 }}
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
              type="number" placeholder="Custom intake ml" value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
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

        {/* ── Set Daily Water Limit & Reminder Settings ── */}
        <GlassCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Set Daily Water Limit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={16} color="#FFFFFF" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#A1A1AA' }}>Set Daily Water Limit</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGoalPicker((p) => !p)}
                style={{
                  padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                  color: '#FFFFFF', cursor: 'pointer',
                }}
              >
                {userGoal.toLocaleString()} ml
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
                      onClick={() => handleSetUserGoal(g)}
                      style={{
                        padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                        background: userGoal === g ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${userGoal === g ? '#FFFFFF' : 'rgba(255,255,255,0.12)'}`,
                        color: userGoal === g ? '#000000' : '#A1A1AA', cursor: 'pointer',
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
                {remindersOn ? <Bell size={16} color="#FFFFFF" /> : <BellOff size={16} color="#52525B" />}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#A1A1AA' }}>Mobile Notifications</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleReminders}
                style={{
                  padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                  background: remindersOn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${remindersOn ? '#FFFFFF' : 'rgba(255,255,255,0.12)'}`,
                  color: remindersOn ? '#FFFFFF' : '#71717A', cursor: 'pointer',
                }}
              >
                {remindersOn ? 'ACTIVE' : 'OFF'}
              </motion.button>
            </div>

            {/* Reminder Interval */}
            {remindersOn && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#FFFFFF" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#A1A1AA' }}>Weather Reminder Interval</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowIntervalPicker((p) => !p)}
                    style={{
                      padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                      color: '#FFFFFF', cursor: 'pointer',
                    }}
                  >
                    Every {intervalMin} min
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
                            background: intervalMin === m ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${intervalMin === m ? '#FFFFFF' : 'rgba(255,255,255,0.12)'}`,
                            color: intervalMin === m ? '#000000' : '#A1A1AA', cursor: 'pointer',
                          }}
                        >
                          {m} min
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Test Mobile Push Notification Button ── */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSendTestNotification}
                  type="button"
                  style={{
                    padding: '12px', borderRadius: 14, cursor: 'pointer',
                    background: testSent ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#FFFFFF', fontWeight: 800, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 4,
                  }}
                >
                  {testSent ? <Check size={16} color="#FFFFFF" /> : <Send size={16} color="#FFFFFF" />}
                  {testSent ? 'Mobile Weather Notification Sent!' : 'Send Test Mobile Weather Notification'}
                </motion.button>

                <p style={{ fontSize: 11, color: '#A1A1AA', lineHeight: 1.4, margin: 0 }}>
                  PROMPT: Mobile push notifications automatically send weather alerts based on live temperature ({currentTemp.toFixed(1)}°C) every {intervalMin} minutes.
                </p>
              </>
            )}
          </div>
        </GlassCard>

        {/* ── Today's Log History ── */}
        <GlassCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, color: '#A1A1AA', fontSize: 14, margin: 0 }}>Today's Fluid Log</h3>
            <motion.button whileTap={{ scale: 0.9 }} onClick={resetToday}
              style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <RotateCcw size={12} /> Reset
            </motion.button>
          </div>
          {logs.length === 0 ? (
            <p style={{ fontSize: 13, color: '#52525B', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No water logged today. Tap a quick-log button above to record intake.
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
