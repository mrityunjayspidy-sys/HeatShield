import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronRight } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import { type UserSession, saveUserSession } from '../lib/supabase';

interface OnboardingProps {
  onComplete: (session: UserSession) => void;
}

const STEPS = ['Personal Info', 'Health Conditions', 'Permissions'];

function GlassInput({
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.18)',
        color: '#FFF',
        fontSize: 15,
        outline: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#FFFFFF';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
      }}
    />
  );
}

function ConditionToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      type="button"
      style={{
        padding: '10px 16px',
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 700,
        background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${active ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}`,
        color: active ? '#FFFFFF' : '#A1A1AA',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </motion.button>
  );
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    conditions: [] as string[],
    medications: false,
    outdoor: false,
    sunExposure: 'moderate' as 'low' | 'moderate' | 'high',
  });

  const toggleCondition = (c: string) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(c)
        ? prev.conditions.filter((x) => x !== c)
        : [...prev.conditions, c],
    }));
  };

  const slideVariants = {
    enter: { x: 80, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -80, opacity: 0 },
  };

  const handleFinish = () => {
    const session: UserSession = {
      id: `usr_${Date.now()}`,
      email: `${(form.name || 'user').toLowerCase().replace(/\s+/g, '.')}@heatwatch.app`,
      name: form.name || 'User',
      age: parseInt(form.age) || 35,
      weightKg: parseFloat(form.weight) || 75,
      heightCm: parseFloat(form.height) || 175,
      conditions: form.conditions,
      medications: form.medications,
      outdoor: form.outdoor,
      emergencyContact: {
        name: 'Primary Emergency Contact',
        phone: '+1 555-019-2834',
        relationship: 'Contact',
      },
      createdAt: new Date().toISOString(),
    };
    saveUserSession(session);
    onComplete(session);
  };

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '40px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Shield size={40} color="#FFFFFF" />
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#FFF', marginTop: 8 }}>HeatWatch</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA' }}>Personal heat & hydration safety</p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === step ? 28 : 8, background: i <= step ? '#FFFFFF' : 'rgba(255,255,255,0.2)' }}
              style={{ height: 8, borderRadius: 4 }}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={{ flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <GlassCard elevation="hero">
                {step === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>About You</h2>
                    <p style={{ fontSize: 13, color: '#A1A1AA' }}>We use this to calculate your personal heat vulnerability.</p>
                    <GlassInput placeholder="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <GlassInput placeholder="Age" value={form.age} onChange={(v) => setForm({ ...form, age: v })} type="number" />
                      <GlassInput placeholder="Weight (kg)" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} type="number" />
                      <GlassInput placeholder="Height (cm)" value={form.height} onChange={(v) => setForm({ ...form, height: v })} type="number" />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Health Profile</h2>
                    <p style={{ fontSize: 13, color: '#A1A1AA' }}>Select any conditions that apply. This adjusts your risk score.</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['Diabetes', 'Cardiovascular', 'Kidney', 'Pregnant'].map((c) => (
                        <ConditionToggle key={c} label={c} active={form.conditions.includes(c.toLowerCase())} onToggle={() => toggleCondition(c.toLowerCase())} />
                      ))}
                    </div>
                    <ConditionToggle label="Heat-affecting medications" active={form.medications} onToggle={() => setForm({ ...form, medications: !form.medications })} />
                    <ConditionToggle label="Outdoor occupation" active={form.outdoor} onToggle={() => setForm({ ...form, outdoor: !form.outdoor })} />
                    <div>
                      <p style={{ fontSize: 12, color: '#A1A1AA', marginBottom: 8 }}>Sun exposure level</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['low', 'moderate', 'high'] as const).map((level) => (
                          <ConditionToggle key={level} label={level} active={form.sunExposure === level} onToggle={() => setForm({ ...form, sunExposure: level })} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Almost Ready</h2>
                    <p style={{ fontSize: 13, color: '#A1A1AA', maxWidth: 280 }}>
                      HeatWatch uses your location and sends notifications to keep you safe. Enable these for the full experience.
                    </p>
                    <ConditionToggle label="📍 Allow Location Access" active={true} onToggle={() => {}} />
                    <ConditionToggle label="🔔 Enable Push Notifications" active={true} onToggle={() => {}} />
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          {step > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep(step - 1)}
              type="button"
              style={{
                flex: 1, padding: '14px', borderRadius: 16,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#CBD5E1', fontWeight: 700, cursor: 'pointer', fontSize: 15,
              }}
            >
              Back
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => step < 2 ? setStep(step + 1) : handleFinish()}
            type="button"
            style={{
              flex: 2, padding: '14px', borderRadius: 16,
              background: '#FFFFFF', border: 'none',
              color: '#000000', fontWeight: 800, cursor: 'pointer', fontSize: 15,
              boxShadow: '0 4px 20px rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {step < 2 ? 'Continue' : 'Start HeatWatch'}
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </div>
    </AnimatedGradientBackground>
  );
}
