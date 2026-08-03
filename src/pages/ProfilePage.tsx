import { useState } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Phone, ShieldCheck, Edit3, Save, LogOut } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import { type UserSession, saveUserSession, clearUserSession, upsertProfile } from '../lib/supabase';

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

  const [dbStatus, setDbStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async () => {
    setDbStatus(null);
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
    const res = await upsertProfile(updated);
    saveUserSession(updated);
    onUpdateSession(updated);
    setIsEditing(false);

    if (res.error) {
      setDbStatus({
        type: 'error',
        message: `Database sync note: ${res.error}. Saved locally.`,
      });
    } else {
      setDbStatus({
        type: 'success',
        message: 'Successfully saved and synced to Supabase Database!',
      });
      setTimeout(() => setDbStatus(null), 4000);
    }
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

        {/* Status Toast Banner */}
        {dbStatus && (
          <div style={{
            padding: '12px 16px', borderRadius: 14, fontSize: 13, fontWeight: 700,
            background: dbStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            border: `1.5px solid ${dbStatus.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: dbStatus.type === 'success' ? '#34D399' : '#FCA5A5',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{dbStatus.message}</span>
            <button
              onClick={() => setDbStatus(null)}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 900 }}
            >
              ✕
            </button>
          </div>
        )}

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

          <div style={{ width: '100%' }}>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Username</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter your name"
                  style={{
                    width: '80%', padding: '8px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.3)',
                    color: '#FFF', fontSize: 16, fontWeight: 800, textAlign: 'center', outline: 'none',
                  }}
                />
              </div>
            ) : (
              <div style={{ fontSize: 20, fontWeight: 900, color: '#FFF' }}>{form.name}</div>
            )}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 4px', borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>Age</div>
              {isEditing ? (
                <input
                  type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
                  style={{ width: '100%', background: 'none', border: '1px solid #FFF', color: '#FFF', textAlign: 'center', borderRadius: 6, fontWeight: 800, fontSize: 13 }}
                />
              ) : (
                <div style={{ fontSize: 13, fontWeight: 900, color: '#FFF', marginTop: 4, whiteSpace: 'nowrap' }}>{form.age} yrs</div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 4px', borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>Height</div>
              {isEditing ? (
                <input
                  type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                  style={{ width: '100%', background: 'none', border: '1px solid #FFF', color: '#FFF', textAlign: 'center', borderRadius: 6, fontWeight: 800, fontSize: 13 }}
                />
              ) : (
                <div style={{ fontSize: 13, fontWeight: 900, color: '#FFF', marginTop: 4, whiteSpace: 'nowrap' }}>{form.heightCm} cm</div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 4px', borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>Weight</div>
              {isEditing ? (
                <input
                  type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  style={{ width: '100%', background: 'none', border: '1px solid #FFF', color: '#FFF', textAlign: 'center', borderRadius: 6, fontWeight: 800, fontSize: 13 }}
                />
              ) : (
                <div style={{ fontSize: 13, fontWeight: 900, color: '#FFF', marginTop: 4, whiteSpace: 'nowrap' }}>{form.weightKg} kg</div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 4px', borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600 }}>BMI</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#FFF', marginTop: 4, whiteSpace: 'nowrap' }}>{bmi}</div>
            </div>
          </div>
        </GlassCard>

        {/* Health Conditions */}
        <GlassCard>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Pre-Existing Conditions & Diseases
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { id: 'cardiovascular', label: '🫀 Cardiovascular' },
              { id: 'diabetes', label: '🩸 Diabetes' },
              { id: 'kidney', label: '🫘 Kidney' },
              { id: 'respiratory', label: '🫁 Asthma' },
              { id: 'hypertension', label: '🩺 Hypertension' },
              { id: 'pregnant', label: '🤰 Pregnant' },
            ].map((d) => {
              const active = form.conditions.includes(d.id);
              return (
                <button
                  key={d.id}
                  disabled={!isEditing}
                  onClick={() => toggleCondition(d.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${active ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}`,
                    color: active ? '#FFFFFF' : '#A1A1AA',
                    cursor: isEditing ? 'pointer' : 'default', transition: 'all 0.2s',
                  }}
                >
                  {d.label}
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
