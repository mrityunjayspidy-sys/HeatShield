/**
 * DailyCheckIn — shown once per day on first app open.
 * Collects: work location, work hours (start/end), sun exposure estimate, activity type, notes.
 * Persists data to localStorage keyed by today's date.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, MapPin, Clock, ChevronRight, ChevronLeft,
  CheckCircle2, Building2, TreePine, Home, Hammer, ShoppingCart, Car,
} from 'lucide-react';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import { GlassCard } from '../components/ui/GlassCard';

// ── Storage helpers ────────────────────────────────────────────────────────────
export const DAILY_CHECKIN_KEY = 'heatwatch_daily_checkin';

export interface DailyCheckIn {
  date: string;                 // YYYY-MM-DD
  workLocation: string;         // id of location type
  workLocationLabel: string;
  workStart: string;            // "HH:MM"
  workEnd: string;              // "HH:MM"
  sunExposureHours: number;     // estimated hours in direct sun
  activityLevel: 'light' | 'moderate' | 'heavy';
  notes: string;
  savedAt: string;
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getTodayCheckIn(): DailyCheckIn | null {
  try {
    const raw = localStorage.getItem(DAILY_CHECKIN_KEY);
    if (!raw) return null;
    const parsed: DailyCheckIn = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) return null; // stale — different day
    return parsed;
  } catch {
    return null;
  }
}

export function saveDailyCheckIn(data: DailyCheckIn) {
  localStorage.setItem(DAILY_CHECKIN_KEY, JSON.stringify(data));
}

// ── Location options ───────────────────────────────────────────────────────────
const LOCATIONS = [
  { id: 'office',       label: 'Office / Indoor',      emoji: '🏢', icon: Building2,   outdoor: false },
  { id: 'field',        label: 'Field / Open Area',    emoji: '🌾', icon: TreePine,     outdoor: true  },
  { id: 'construction', label: 'Construction Site',    emoji: '🏗️', icon: Hammer,       outdoor: true  },
  { id: 'home',         label: 'Work from Home',       emoji: '🏠', icon: Home,         outdoor: false },
  { id: 'market',       label: 'Market / Bazaar',      emoji: '🛒', icon: ShoppingCart, outdoor: true  },
  { id: 'commute',      label: 'Travel / Commute',     emoji: '🚗', icon: Car,          outdoor: false },
  { id: 'mixed',        label: 'Mixed (In & Out)',      emoji: '🔄', icon: MapPin,       outdoor: true  },
];

const ACTIVITIES = [
  { id: 'light',    label: 'Light',    desc: 'Desk work, meetings, driving',        emoji: '💼' },
  { id: 'moderate', label: 'Moderate', desc: 'Walking, carrying light loads',        emoji: '🚶' },
  { id: 'heavy',    label: 'Heavy',    desc: 'Manual labour, farming, construction', emoji: '⛏️' },
] as const;

const STEPS = ['Where', 'When', 'Sun & Activity'];

interface DailyCheckInProps {
  onComplete: (data: DailyCheckIn) => void;
  userName?: string;
}

function GlassTimeInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.7 }}>{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '13px 14px', borderRadius: 14,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#FFF', fontSize: 16, fontWeight: 800, outline: 'none',
          colorScheme: 'dark',
        }}
      />
    </div>
  );
}

export function DailyCheckInScreen({ onComplete, userName = 'there' }: DailyCheckInProps) {
  const [step, setStep] = useState(0);

  const [workLocation, setWorkLocation] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [sunHours, setSunHours] = useState(2);
  const [activityLevel, setActivityLevel] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [notes, setNotes] = useState('');

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  const selectedLoc = LOCATIONS.find((l) => l.id === workLocation);

  // Work duration in hours
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const workDurationH = Math.max(0, (toMin(workEnd) - toMin(workStart)) / 60);

  const handleFinish = () => {
    const data: DailyCheckIn = {
      date: getTodayKey(),
      workLocation,
      workLocationLabel: selectedLoc?.label || workLocation,
      workStart,
      workEnd,
      sunExposureHours: sunHours,
      activityLevel,
      notes,
      savedAt: new Date().toISOString(),
    };
    saveDailyCheckIn(data);
    onComplete(data);
  };

  const canNext = [
    workLocation !== '',
    workStart && workEnd && workDurationH > 0,
    true,
  ];

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{
        maxWidth: 440, margin: '0 auto', padding: '40px 20px',
        minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{
              width: 60, height: 60, borderRadius: 20,
              background: 'rgba(255,220,80,0.15)',
              border: '1px solid rgba(255,210,60,0.3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}
          >
            <Briefcase size={30} color="#FFD640" />
          </motion.div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#FFF' }}>
            Good{' '}
            {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
            {' '}{userName.split(' ')[0]}! ☀️
          </h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 4 }}>
            Tell us about today so we can protect you better.
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {STEPS.map((s, i) => (
              <motion.div
                key={s}
                animate={{
                  width: i === step ? 32 : 8,
                  background: i <= step ? '#FFD640' : 'rgba(255,255,255,0.2)',
                }}
                style={{ height: 6, borderRadius: 3 }}
              />
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#64748B', marginTop: 8, fontWeight: 700 }}>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          >
            {/* ── STEP 0: Work Location ── */}
            {step === 0 && (
              <GlassCard elevation="hero">
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFF', marginBottom: 6 }}>
                  🗺️ Where are you working today?
                </h2>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
                  This helps us assess your heat exposure environment.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {LOCATIONS.map((loc) => {
                    const active = workLocation === loc.id;
                    return (
                      <motion.button
                        key={loc.id}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setWorkLocation(loc.id)}
                        type="button"
                        style={{
                          padding: '14px 12px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                          background: active ? 'rgba(255,214,64,0.18)' : 'rgba(255,255,255,0.05)',
                          border: `2px solid ${active ? '#FFD640' : 'rgba(255,255,255,0.1)'}`,
                          transition: 'all 0.2s',
                          display: 'flex', flexDirection: 'column', gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{loc.emoji}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: active ? '#FFD640' : '#CBD5E1' }}>
                          {loc.label}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: loc.outdoor ? 'rgba(239,68,68,0.8)' : 'rgba(16,185,129,0.8)',
                          background: loc.outdoor ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          padding: '2px 6px', borderRadius: 6, width: 'fit-content',
                        }}>
                          {loc.outdoor ? '☀️ Outdoor' : '🏠 Indoor'}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* ── STEP 1: Working Hours ── */}
            {step === 1 && (
              <GlassCard elevation="hero">
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFF', marginBottom: 6 }}>
                  🕐 What are your working hours?
                </h2>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 18 }}>
                  We'll map your heat risk through your work window.
                </p>

                <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                  <GlassTimeInput label="Work Start" value={workStart} onChange={setWorkStart} />
                  <GlassTimeInput label="Work End" value={workEnd} onChange={setWorkEnd} />
                </div>

                {/* Duration indicator */}
                {workDurationH > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '12px 16px', borderRadius: 14,
                      background: 'rgba(255,214,64,0.1)', border: '1px solid rgba(255,214,64,0.3)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <Clock size={16} color="#FFD640" />
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#FFD640' }}>
                        {workDurationH.toFixed(1)} hours
                      </span>
                      <span style={{ fontSize: 12, color: '#A1A1AA' }}> workday today</span>
                      <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                        {workStart} → {workEnd} {selectedLoc ? `at ${selectedLoc.label}` : ''}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Notes */}
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.7, display: 'block', marginBottom: 8 }}>
                    Any notes for today? (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. site inspection at 2pm, meeting outside..."
                    rows={3}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#E2E8F0', fontSize: 13, outline: 'none',
                      resize: 'none', fontFamily: 'inherit', lineHeight: 1.6,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,214,64,0.4)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
                  />
                </div>
              </GlassCard>
            )}

            {/* ── STEP 2: Sun Exposure + Activity ── */}
            {step === 2 && (
              <GlassCard elevation="hero">
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFF', marginBottom: 6 }}>
                  ☀️ Sun exposure & activity
                </h2>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 18 }}>
                  Helps personalise your heat risk score and alerts.
                </p>

                {/* Sun hours slider */}
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA' }}>
                      Estimated sun exposure
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#FFD640' }}>
                      {sunHours === 0 ? 'None' : sunHours === 0.5 ? '30 min' : `${sunHours} hrs`}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4,
                      width: `${(sunHours / 12) * 100}%`,
                      background: sunHours > 6
                        ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                        : sunHours > 3
                        ? 'linear-gradient(90deg, #FFD640, #F59E0B)'
                        : 'linear-gradient(90deg, #10B981, #FFD640)',
                    }} />
                    <input
                      type="range" min={0} max={12} step={0.5} value={sunHours}
                      onChange={(e) => setSunHours(Number(e.target.value))}
                      style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer', height: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#52525B', marginTop: 4 }}>
                    <span>None</span><span>6 hrs</span><span>12 hrs</span>
                  </div>
                  {sunHours > 6 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginTop: 6 }}
                    >
                      ⚠️ High sun exposure — we'll send extra heat alerts today.
                    </motion.p>
                  )}
                </div>

                {/* Activity level */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                    Physical Activity Level
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ACTIVITIES.map(({ id, label, desc, emoji }) => {
                      const active = activityLevel === id;
                      return (
                        <motion.button
                          key={id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setActivityLevel(id)}
                          type="button"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                            background: active ? 'rgba(255,214,64,0.15)' : 'rgba(255,255,255,0.05)',
                            border: `1.5px solid ${active ? '#FFD640' : 'rgba(255,255,255,0.1)'}`,
                            transition: 'all 0.2s',
                          }}
                        >
                          <span style={{ fontSize: 22 }}>{emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: active ? '#FFD640' : '#E2E8F0' }}>
                              {label}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>{desc}</div>
                          </div>
                          {active && <CheckCircle2 size={18} color="#FFD640" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {step > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep(step - 1)}
              type="button"
              style={{
                flex: 1, padding: '14px', borderRadius: 16,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#CBD5E1', fontWeight: 700, cursor: 'pointer', fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <ChevronLeft size={18} /> Back
            </motion.button>
          )}
          <motion.button
            whileHover={canNext[step] ? { scale: 1.02 } : {}}
            whileTap={canNext[step] ? { scale: 0.96 } : {}}
            onClick={() => {
              if (!canNext[step]) return;
              if (step < STEPS.length - 1) setStep(step + 1);
              else handleFinish();
            }}
            type="button"
            style={{
              flex: 2, padding: '14px', borderRadius: 16,
              background: canNext[step] ? '#FFD640' : 'rgba(255,255,255,0.06)',
              border: 'none', color: canNext[step] ? '#000' : '#52525B',
              fontWeight: 900, fontSize: 15, cursor: canNext[step] ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: canNext[step] ? '0 4px 20px rgba(255,214,64,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {step < STEPS.length - 1 ? 'Continue' : '🚀 Start My Day'}
            <ChevronRight size={18} />
          </motion.button>
        </div>

        {/* Skip */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onComplete({
            date: getTodayKey(), workLocation: 'office', workLocationLabel: 'Office / Indoor',
            workStart: '09:00', workEnd: '18:00', sunExposureHours: 1,
            activityLevel: 'light', notes: '', savedAt: new Date().toISOString(),
          })}
          type="button"
          style={{
            marginTop: 14, width: '100%', background: 'none', border: 'none',
            color: '#52525B', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}
        >
          Skip for today →
        </motion.button>
      </div>
    </AnimatedGradientBackground>
  );
}
