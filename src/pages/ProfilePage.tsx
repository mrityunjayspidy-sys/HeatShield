import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Mail, Heart, Phone, ShieldCheck, Edit3, Save, LogOut, Activity, Flame } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassChip } from '../components/ui/GlassChip';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import { type UserSession, saveUserSession, clearUserSession } from '../lib/supabase';

interface ProfilePageProps {
  session: UserSession;
  onUpdateSession: (updated: UserSession) => void;
  onSignOut: () => void;
}

export function ProfilePage({ session, onUpdateSession, onSignOut }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: session.name,
    email: session.email,
    age: session.age.toString(),
    weightKg: session.weightKg.toString(),
    heightCm: session.heightCm.toString(),
    conditions: [...session.conditions],
    medications: session.medications,
    outdoor: session.outdoor,
    emergencyName: session.emergencyContact.name,
    emergencyPhone: session.emergencyContact.phone,
  });

  const bmi = (
    parseFloat(form.weightKg || '70') /
    ((parseFloat(form.heightCm || '175') / 100) ** 2)
  ).toFixed(1);

  const toggleCondition = (cond: string) => {
    const lower = cond.toLowerCase();
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(lower)
        ? prev.conditions.filter((c) => c !== lower)
        : [...prev.conditions, lower],
    }));
  };

  const handleSave = () => {
    const updated: UserSession = {
      ...session,
      name: form.name,
      email: form.email,
      age: parseInt(form.age) || 30,
      weightKg: parseFloat(form.weightKg) || 70,
      heightCm: parseFloat(form.heightCm) || 175,
      conditions: form.conditions,
      medications: form.medications,
      outdoor: form.outdoor,
      emergencyContact: {
        ...session.emergencyContact,
        name: form.emergencyName,
        phone: form.emergencyPhone,
      },
    };
    saveUserSession(updated);
    onUpdateSession(updated);
    setIsEditing(false);
  };

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserIcon size={22} color="#FFFFFF" />
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>User Profile</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12,
              background: isEditing ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
              color: isEditing ? '#000000' : '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.25)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}
          >
            {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
            <span>{isEditing ? 'Save' : 'Edit Profile'}</span>
          </motion.button>
        </div>

        {/* Profile Card Header */}
        <GlassCard elevation="hero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)', border: '2px solid rgba(255,255,255,0.4)',
            boxShadow: '0 8px 24px rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#FFFFFF',
          }}>
            {form.name ? form.name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFF' }}>{form.name}</div>
            <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>{form.email}</div>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
            borderRadius: 20, background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF', fontSize: 11, fontWeight: 700,
          }}>
            <ShieldCheck size={14} /> Verified Safety Profile
          </div>
        </GlassCard>

        {/* Biometrics & Personal Stats */}
        <GlassCard>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Biometric Data
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#A1A1AA' }}>Age</div>
              {isEditing ? (
                <input
                  type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
                  style={{ width: '100%', background: 'none', border: '1px solid #FFF', color: '#FFF', textAlign: 'center', borderRadius: 6, fontWeight: 800, fontSize: 16 }}
                />
              ) : (
                <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', marginTop: 4 }}>{form.age} yrs</div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#A1A1AA' }}>Weight</div>
              {isEditing ? (
                <input
                  type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  style={{ width: '100%', background: 'none', border: '1px solid #FFF', color: '#FFF', textAlign: 'center', borderRadius: 6, fontWeight: 800, fontSize: 16 }}
                />
              ) : (
                <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', marginTop: 4 }}>{form.weightKg} kg</div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#A1A1AA' }}>BMI</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', marginTop: 4 }}>{bmi}</div>
            </div>
          </div>
        </GlassCard>

        {/* Health Conditions */}
        <GlassCard>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Health Conditions & Risk Modifiers
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Diabetes', 'Cardiovascular', 'Kidney', 'Pregnant'].map((c) => {
              const active = form.conditions.includes(c.toLowerCase());
              return (
                <button
                  key={c}
                  disabled={!isEditing}
                  onClick={() => toggleCondition(c)}
                  style={{
                    padding: '8px 14px', borderRadius: 14, fontSize: 13, fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${active ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}`,
                    color: active ? '#FFFFFF' : '#A1A1AA',
                    cursor: isEditing ? 'pointer' : 'default', transition: 'all 0.2s',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Emergency Contact */}
        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Phone size={16} color="#FFFFFF" />
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1 }}>
              Emergency Medical Contact
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: '#A1A1AA' }}>Doctor / Emergency Contact Name</div>
              {isEditing ? (
                <input
                  type="text" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', padding: 8, borderRadius: 8, marginTop: 4 }}
                />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF', marginTop: 2 }}>{form.emergencyName}</div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#A1A1AA' }}>Phone Number</div>
              {isEditing ? (
                <input
                  type="text" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', padding: 8, borderRadius: 8, marginTop: 4 }}
                />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF', marginTop: 2 }}>{form.emergencyPhone}</div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Sign Out Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            clearUserSession();
            onSignOut();
          }}
          style={{
            width: '100%', padding: '14px', borderRadius: 16,
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#EF4444', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <LogOut size={18} />
          <span>Sign Out of Account</span>
        </motion.button>

      </div>
    </AnimatedGradientBackground>
  );
}
