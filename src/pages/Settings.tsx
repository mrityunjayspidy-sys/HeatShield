import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, Moon, Bell, MapPin, Thermometer, Clock,
  Star, Send, CheckCircle2, MessageSquarePlus, Globe, ExternalLink,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import { scheduleHydrationReminders, cancelHydrationReminders } from '../lib/notifications';

const INTERVAL_OPTIONS = [15, 20, 30, 45, 60];

// ── Glass Toggle ──────────────────────────────────────────────────────────────
function GlassToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      style={{
        width: 52, height: 28, borderRadius: 14, padding: 3,
        background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
        border: `1.5px solid ${active ? '#FFFFFF' : 'rgba(255,255,255,0.2)'}`,
        cursor: 'pointer', position: 'relative',
        boxShadow: active ? '0 0 12px rgba(255,255,255,0.25)' : 'none',
        transition: 'all 0.3s',
      }}
    >
      <motion.div
        animate={{ x: active ? 24 : 0 }}
        transition={{ type: 'spring', damping: 20 }}
        style={{ width: 20, height: 20, borderRadius: '50%', background: active ? '#FFFFFF' : '#64748B' }}
      />
    </motion.button>
  );
}

// ── Feature wishlist options ──────────────────────────────────────────────────
const FEATURE_OPTIONS = [
  { id: 'wearable',    label: '⌚ Wearable Integration' },
  { id: 'ai_risk',     label: '🤖 AI Risk Prediction' },
  { id: 'family',      label: '👨‍👩‍👧 Family / Group Monitoring' },
  { id: 'sos',         label: '🆘 Emergency SOS Button' },
  { id: 'offline',     label: '📵 Offline Mode' },
  { id: 'medication',  label: '💊 Medication Reminders' },
  { id: 'doctor',      label: '🏥 Doctor Integration' },
  { id: 'heatmap',     label: '🗺️ City Heat Map' },
];

interface SettingsPageProps {
  tempUnit: 'C' | 'F';
  onTempUnitChange: (unit: 'C' | 'F') => void;
  onOpenWebPromo?: () => void;
}

export function SettingsPage({ tempUnit, onTempUnitChange, onOpenWebPromo }: SettingsPageProps) {
  // ── Existing settings ──────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation]         = useState(true);
  const [alertInterval, setAlertInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('heatwatch_hydration_interval') || '20', 10);
  });

  const handleSetAlertInterval = async (min: number) => {
    setAlertInterval(min);
    localStorage.setItem('heatwatch_hydration_interval', String(min));
    if (notifications) {
      await scheduleHydrationReminders(min, 3000, 0, 32, 'warning');
    }
  };

  const handleToggleNotifications = async () => {
    const next = !notifications;
    setNotifications(next);
    if (!next) {
      await cancelHydrationReminders();
    } else {
      await scheduleHydrationReminders(alertInterval, 3000, 0, 32, 'warning');
    }
  };

  // ── Feedback form ──────────────────────────────────────────────────────────
  const [rating, setRating]         = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [features, setFeatures]     = useState<string[]>([]);
  const [message, setMessage]       = useState('');
  const [submitted, setSubmitted]   = useState(false);

  const toggleFeature = (id: string) =>
    setFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload = {
      rating,
      requested_features: features,
      message,
      submitted_at: new Date().toISOString(),
      recipient: 'mrityunjay.spidy@gmail.com',
    };
    localStorage.setItem('heatwatch_feedback', JSON.stringify(payload));

    // Persist feedback submission into Supabase DB `feedback` table if configured
    try {
      await supabase.from('feedback').insert({
        rating,
        features,
        message,
        user_email: 'mrityunjay.spidy@gmail.com',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Feedback DB log note:', e);
    }

    // Trigger email mailto link to mrityunjay.spidy@gmail.com
    const subject = encodeURIComponent(`HeatWatch App Feedback (${rating} Stars)`);
    const bodyText = encodeURIComponent(
      `HeatWatch User Feedback Submission:\n\n` +
      `Rating: ${rating} / 5 Stars\n` +
      `Requested Features: ${features.join(', ') || 'None selected'}\n` +
      `User Notes:\n${message}\n\n` +
      `Submitted at: ${new Date().toLocaleString()}`
    );

    window.location.href = `mailto:mrityunjay.spidy@gmail.com?subject=${subject}&body=${bodyText}`;

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setRating(0);
      setFeatures([]);
      setMessage('');
    }, 4000);
  };

  const canSubmit = rating > 0;

  // ── Shared row renderer ────────────────────────────────────────────────────
  const SettingRow = ({
    icon: Icon, label, description, right,
  }: { icon: typeof Moon; label: string; description: string; right: React.ReactNode }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color="#94A3B8" />
        </div>
        <div>
          <div style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 14 }}>{label}</div>
          <div style={{ color: '#64748B', fontSize: 11 }}>{description}</div>
        </div>
      </div>
      {right}
    </div>
  );

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingsIcon size={22} color="#CBD5E1" />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>Settings</h1>
        </div>

        {/* ── Notifications & Location ── */}
        <GlassCard>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Notifications &amp; Location
          </h3>
          <SettingRow icon={Bell} label="Push Notifications" description="Heat alerts & hydration reminders"
            right={<GlassToggle active={notifications} onToggle={handleToggleNotifications} />} />
          <SettingRow icon={MapPin} label="Location Services" description="GPS-based weather monitoring"
            right={<GlassToggle active={location} onToggle={() => setLocation(!location)} />} />
          <SettingRow
            icon={Clock}
            label="Alert Interval"
            description={`Hydration reminder repeats every ${alertInterval} min`}
            right={
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {INTERVAL_OPTIONS.map((min) => (
                  <motion.button
                    key={min}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSetAlertInterval(min)}
                    style={{
                      padding: '5px 9px', borderRadius: 8, fontWeight: 800, fontSize: 11,
                      background: alertInterval === min ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${alertInterval === min ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}`,
                      color: alertInterval === min ? '#000000' : '#A1A1AA', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {min}m
                  </motion.button>
                ))}
              </div>
            }
          />
        </GlassCard>

        {/* ── Units ── */}
        <GlassCard>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Units
          </h3>
          <SettingRow icon={Thermometer} label="Temperature Unit" description="Display unit for readings"
            right={
              <div style={{ display: 'flex', gap: 4 }}>
                {(['C', 'F'] as const).map((u) => (
                  <motion.button key={u} whileTap={{ scale: 0.9 }} onClick={() => onTempUnitChange(u)}
                    style={{
                      padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                      background: tempUnit === u ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${tempUnit === u ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}`,
                      color: tempUnit === u ? '#FFFFFF' : '#64748B', cursor: 'pointer',
                    }}
                  >°{u}</motion.button>
                ))}
              </div>
            }
          />
        </GlassCard>

        {/* ── Web Application Section ── */}
        <GlassCard style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.25))',
              border: '1px solid rgba(245,158,11,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Globe size={18} color="#F59E0B" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
                Heat Prediction Web App
              </h3>
              <p style={{ fontSize: 11, color: '#A1A1AA', margin: 0 }}>
                Check out our web application online
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.35)', padding: '10px 14px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)', marginBottom: 14,
            fontSize: 12, color: '#F59E0B', fontWeight: 700, wordBreak: 'break-all'
          }}>
            https://heat-watch-beta.vercel.app/
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {onOpenWebPromo && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onOpenWebPromo}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 12,
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
                  color: '#F59E0B', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Globe size={14} />
                <span>Show Popup</span>
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => window.open('https://heat-watch-beta.vercel.app/', '_blank', 'noopener,noreferrer')}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 12,
                background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', border: 'none',
                color: '#FFFFFF', fontWeight: 900, fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
              }}
            >
              <span>Visit Website</span>
              <ExternalLink size={14} />
            </motion.button>
          </div>
        </GlassCard>

        {/* ── Feedback & Feature Survey ── */}
        <GlassCard>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.25))',
              border: '1px solid rgba(168,85,247,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquarePlus size={18} color="#C084FC" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
                Feedback &amp; Feature Requests
              </h3>
              <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                Help shape the future of HeatWatch
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ⭐ Star rating */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Overall Experience
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (hoverRating || rating);
                  return (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <Star
                        size={32}
                        fill={filled ? '#FBBF24' : 'none'}
                        color={filled ? '#FBBF24' : 'rgba(255,255,255,0.2)'}
                        style={{ transition: 'all 0.15s' }}
                      />
                    </motion.button>
                  );
                })}
              </div>
              {rating > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: 'center', fontSize: 12, color: '#FBBF24', fontWeight: 700, marginTop: 6 }}
                >
                  {['', '😕 Needs Work', '🙂 Getting There', '😊 Pretty Good', '😄 Really Liked It', '🔥 Absolutely Love It'][rating]}
                </motion.p>
              )}
            </div>

            {/* Feature wishlist */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Features I'd Love to See
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FEATURE_OPTIONS.map(({ id, label }) => {
                  const active = features.includes(id);
                  return (
                    <motion.button
                      key={id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => toggleFeature(id)}
                      type="button"
                      style={{
                        padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                        background: active ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)',
                        border: `1.5px solid ${active ? '#C084FC' : 'rgba(255,255,255,0.12)'}`,
                        color: active ? '#C084FC' : '#64748B',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Freeform feedback */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Your Thoughts
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us anything — bugs, ideas, or just a kind word…"
                rows={4}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#E2E8F0', fontSize: 13, outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
              />
            </div>

            {/* Submit button + success toast */}
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: '14px', borderRadius: 14,
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                    color: '#10B981', fontWeight: 800, fontSize: 14,
                  }}
                >
                  <CheckCircle2 size={20} /> Thank you! Your feedback was saved.
                </motion.div>
              ) : (
                <motion.button
                  key="submit"
                  whileHover={canSubmit ? { scale: 1.02 } : {}}
                  whileTap={canSubmit ? { scale: 0.96 } : {}}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  type="button"
                  style={{
                    width: '100%', padding: '14px', borderRadius: 14, fontWeight: 800, fontSize: 14,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    background: canSubmit
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.6), rgba(99,102,241,0.6))'
                      : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${canSubmit ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: canSubmit ? '#FFFFFF' : '#52525B',
                    boxShadow: canSubmit ? '0 4px 20px rgba(168,85,247,0.25)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.3s',
                  }}
                >
                  <Send size={16} /> Submit Feedback
                </motion.button>
              )}
            </AnimatePresence>

            {!canSubmit && (
              <p style={{ textAlign: 'center', fontSize: 11, color: '#52525B', marginTop: -12 }}>
                Please give a star rating to submit
              </p>
            )}
          </div>
        </GlassCard>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#52525B', fontSize: 12, marginTop: 4 }}>
          HeatWatch v1.0.0 — Built with ❤️ for heat safety
        </div>
      </div>
    </AnimatedGradientBackground>
  );
}
