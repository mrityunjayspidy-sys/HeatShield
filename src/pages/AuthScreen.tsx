import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Eye, EyeOff, Lock, Mail, User as UserIcon,
  CheckCircle2, AlertCircle, ArrowRight, Sun, Droplets,
  ChevronLeft, ChevronRight, Loader2, KeyRound,
  Activity, Scale, Pill,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import {
  signUpWithEmail, signInWithEmail, sendPasswordReset,
  upsertProfile, fetchProfile, saveUserSession,
  type UserSession,
} from '../lib/supabase';

interface AuthScreenProps {
  onAuthenticated: (session: UserSession) => void;
}

// ── Skin type data ────────────────────────────────────────────────────────────
const SKIN_TYPES = [
  { id: 'I',   label: 'Type I',   desc: 'Always burns, never tans',         color: '#FDDCB5' },
  { id: 'II',  label: 'Type II',  desc: 'Usually burns, tans minimally',    color: '#F5C49C' },
  { id: 'III', label: 'Type III', desc: 'Sometimes burns, tans uniformly',  color: '#D4956A' },
  { id: 'IV',  label: 'Type IV',  desc: 'Rarely burns, tans easily',        color: '#A97040' },
  { id: 'V',   label: 'Type V',   desc: 'Very rarely burns, tans darkly',   color: '#7B4A25' },
  { id: 'VI',  label: 'Type VI',  desc: 'Never burns, deeply pigmented',    color: '#4A2812' },
] as const;

type SkinTypeId = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

// ── Reusable chip toggle ──────────────────────────────────────────────────────
function ChipToggle({
  label, active, onToggle, color,
}: { label: string; active: boolean; onToggle: () => void; color?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      type="button"
      style={{
        padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700,
        background: active ? (color ? `${color}33` : 'rgba(255,255,255,0.18)') : 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${active ? (color || '#FFFFFF') : 'rgba(255,255,255,0.15)'}`,
        color: active ? (color || '#FFFFFF') : '#A1A1AA',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {label}
    </motion.button>
  );
}

// ── Horizontal slider ─────────────────────────────────────────────────────────
function GlassSlider({
  value, min, max, step, onChange, label, unit,
}: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; unit: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#A1A1AA' }}>
        <span>{label}</span>
        <span style={{ color: '#FFFFFF', fontWeight: 800 }}>{value} {unit}</span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
          width: `${pct}%`, background: 'linear-gradient(90deg, rgba(255,255,255,0.5), #FFFFFF)',
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer', height: '100%',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#52525B' }}>
        <span>{min} {unit}</span><span>{max} {unit}</span>
      </div>
    </div>
  );
}

// ── Glass text input ──────────────────────────────────────────────────────────
function GlassInput({
  type = 'text', placeholder, value, onChange, icon: Icon,
}: { type?: string; placeholder: string; value: string; onChange: (v: string) => void; icon?: React.ElementType }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {Icon && <Icon size={18} color="#A1A1AA" style={{ position: 'absolute', left: 14 }} />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: `12px 14px 12px ${Icon ? 42 : 14}px`,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#FFF', fontSize: 14, outline: 'none',
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  // Auth form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Wizard state: null = auth form, 'body' = Step 1 (Age/Height/Weight/Gender), 'diseases' = Step 2 (Conditions/Diseases), 'hydration' = Step 3 (Sun/Skin/Hydration)
  const [wizardStep, setWizardStep] = useState<null | 'body' | 'diseases' | 'hydration'>(null);

  // Temporary session built at auth submit, enriched through wizard
  const [pendingSession, setPendingSession] = useState<UserSession | null>(null);

  // Health profile form - Body Metrics
  const [age, setAge] = useState(28);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(68);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');

  // Health profile form - Diseases & Conditions
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState(false);
  const [outdoor, setOutdoor] = useState(false);
  const [pastHeatStroke, setPastHeatStroke] = useState(false);
  const [bloodPressure] = useState<'normal' | 'elevated' | 'high'>('normal');

  // Health profile form - Sun & Hydration
  const [skinType, setSkinType] = useState<SkinTypeId>('III');
  const [sunSensitivity] = useState<'very_sensitive' | 'moderate' | 'resistant'>('moderate');
  const [sunHours] = useState(4);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [waterIntake] = useState('2000');
  const [bodyWater] = useState('60');
  const [sweatRate, setSweatRate] = useState<'low' | 'normal' | 'heavy'>('normal');
  const [hydrationLevel, setHydrationLevel] = useState<'dehydrated' | 'normal' | 'well_hydrated'>('normal');

  // Password strength
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };
  const strength = getPasswordStrength(password);
  const strengthLabels = ['Too short', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['#52525B', '#EF4444', '#F59E0B', '#10B981', '#FFFFFF'];

  const validateForm = () => {
    setError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid email address.'); return false; }
    if (!isLogin && !name.trim()) { setError('Please enter your full name.'); return false; }
    if (password.length < 8) { setError('Password must be at least 8 characters long.'); return false; }
    if (!isLogin && password !== confirmPassword) { setError('Passwords do not match.'); return false; }
    return true;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setAuthLoading(true);
    setError(null);

    if (isLogin) {
      // ── Sign in ───────────────────────────────────────────────────────────
      const { user, error: authErr } = await signInWithEmail(email, password);
      setAuthLoading(false);
      if (authErr || !user) {
        if (authErr?.includes('Invalid login credentials')) {
          setError('No user found with this email/password in Supabase. Switch to Register tab to create this account, or use the 1-click test credentials.');
        } else {
          setError(authErr ?? 'Login failed. Please check your credentials.');
        }
        return;
      }

      // Try fetching existing health profile from Supabase DB or local storage
      const existingProfile = await fetchProfile(user.id);

      if (existingProfile) {
        // User already has a saved health profile! Cache it and go straight to Dashboard
        saveUserSession(existingProfile);
        onAuthenticated(existingProfile);
        return;
      } else {
        // No health profile found yet — prompt through 1-time setup wizard
        const session: UserSession = {
          id: user.id,
          email: user.email ?? email,
          name: (user.user_metadata?.name as string | undefined) || name || email.split('@')[0],
          age: 28, weightKg: 68, heightCm: 170,
          conditions: [], medications: false, outdoor: false,
          emergencyContact: { name: 'Primary Contact', phone: '', relationship: 'Contact' },
          createdAt: user.created_at,
        };
        setPendingSession(session);
        setWizardStep('body');
      }
    } else {
      // ── Sign up ───────────────────────────────────────────────────────────
      const { user, error: authErr } = await signUpWithEmail(email, password);
      setAuthLoading(false);
      if (authErr || !user) {
        if (authErr?.toLowerCase().includes('rate limit')) {
          setError('Supabase Email Rate Limit Exceeded (3 sign-ups/hr limit on free tier). Switch to "Sign In" tab if you already registered, or use ⚡ Auto-fill Test Credentials.');
        } else {
          setError(authErr ?? 'Sign up failed. Please try again.');
        }
        return;
      }
      const session: UserSession = {
        id: user.id,
        email: user.email ?? email,
        name: name || email.split('@')[0],
        age: 28, weightKg: 68, heightCm: 170,
        conditions: [], medications: false, outdoor: false,
        emergencyContact: { name: 'Primary Contact', phone: '', relationship: 'Contact' },
        createdAt: new Date().toISOString(),
      };
      setPendingSession(session);
      setWizardStep('body');
    }
  };

  const handleBodyNext = () => setWizardStep('diseases');
  const handleDiseasesNext = () => setWizardStep('hydration');

  const handleHydrationFinish = async () => {
    if (!pendingSession) return;
    const full: UserSession = {
      ...pendingSession,
      age,
      heightCm,
      weightKg,
      gender,
      conditions,
      medications,
      outdoor,
      pastHeatStrokeHistory: pastHeatStroke,
      bloodPressure,
      skinType,
      sunSensitivity,
      sunExposureHoursPerDay: sunHours,
      dailyWaterGoalMl: waterGoal,
      dailyWaterIntakeMl: parseInt(waterIntake) || 2000,
      bodyWaterPercent: parseFloat(bodyWater) || 60,
      sweatRate,
      currentHydrationLevel: hydrationLevel,
    };
    // Persist to Supabase (or localStorage fallback)
    await upsertProfile(full);
    onAuthenticated(full);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  // ── Auth Form ───────────────────────────────────────────────────────────────
  const renderAuthForm = () => (
    <motion.div key="auth" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>

      {/* ── Email verification notice ── */}
      <AnimatePresence>
        {showEmailVerification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Mail size={30} color="#10B981" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#FFF', marginBottom: 8 }}>Check your inbox!</h2>
            <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7, marginBottom: 20 }}>
              We sent a verification link to <strong style={{ color: '#FFF' }}>{email}</strong>.<br />
              Click the link in the email to activate your account, then come back and sign in.
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { setShowEmailVerification(false); setIsLogin(true); }}
              type="button"
              style={{
                padding: '13px 28px', borderRadius: 14,
                background: '#FFFFFF', border: 'none',
                color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              }}
            >
              Go to Sign In
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Password reset mini-form ── */}
      <AnimatePresence>
        {showResetPassword && !showEmailVerification && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <GlassCard elevation="hero">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <KeyRound size={20} color="#A78BFA" />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFF', margin: 0 }}>Reset Password</h3>
              </div>
              {resetSent ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <CheckCircle2 size={36} color="#10B981" style={{ marginBottom: 10 }} />
                  <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7 }}>
                    Reset link sent to <strong style={{ color: '#FFF' }}>{resetEmail}</strong>.
                    Check your email inbox.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>
                    Enter the email you registered with and we'll send a password reset link.
                  </p>
                  <GlassInput
                    type="email" placeholder="your@email.com"
                    value={resetEmail} onChange={setResetEmail} icon={Mail}
                  />
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <motion.button
                      whileTap={{ scale: 0.96 }} type="button"
                      onClick={() => setShowResetPassword(false)}
                      style={{
                        flex: 1, padding: '11px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                        color: '#94A3B8', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }} type="button"
                      disabled={resetLoading}
                      onClick={async () => {
                        if (!resetEmail.includes('@')) return;
                        setResetLoading(true);
                        await sendPasswordReset(resetEmail);
                        setResetLoading(false);
                        setResetSent(true);
                      }}
                      style={{
                        flex: 2, padding: '11px', borderRadius: 12,
                        background: '#A78BFA', border: 'none',
                        color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      {resetLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
                      Send Reset Link
                    </motion.button>
                  </div>
                </>
              )}
            </GlassCard>
            <motion.button
              whileTap={{ scale: 0.96 }} type="button"
              onClick={() => { setShowResetPassword(false); setResetSent(false); }}
              style={{
                width: '100%', marginTop: 10, background: 'none', border: 'none',
                color: '#52525B', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}
            >
              ← Back to Sign In
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hide main form when showing sub-screens */}
      {!showEmailVerification && !showResetPassword && (
      <>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 20, background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.25)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        }}>
          <Shield size={32} color="#FFFFFF" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFF' }}>HeatWatch Security</h1>
        <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 4 }}>
          {isLogin ? 'Sign in to access your heat safety profile' : 'Create a secure heat risk account'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 16,
        padding: 4, border: '1px solid rgba(255,255,255,0.15)', marginBottom: 20,
      }}>
        {[{ label: 'Sign In', val: true }, { label: 'Register', val: false }].map(({ label, val }) => (
          <button
            key={label}
            onClick={() => { setIsLogin(val); setError(null); }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
              background: isLogin === val ? '#FFFFFF' : 'transparent',
              color: isLogin === val ? '#000000' : '#A1A1AA',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Form Card */}
      <GlassCard elevation="hero">
        {/* Quick Demo Credentials shortcut */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 12, marginBottom: 14,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <span style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 600 }}>Test Account:</span>
          <button
            type="button"
            onClick={() => {
              setEmail('alex.morgan@example.com');
              setPassword('Password123!');
              setName('Alex Morgan');
            }}
            style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8, padding: '4px 10px', color: '#FFF', fontSize: 11, fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ⚡ Auto-fill Test Credentials
          </button>
        </div>

        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderRadius: 12, background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', fontSize: 13, fontWeight: 600,
                }}
              >
                <AlertCircle size={18} /><span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA' }}>Full Name</label>
              <GlassInput placeholder="Alex Morgan" value={name} onChange={setName} icon={UserIcon} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA' }}>Email Address</label>
            <GlassInput type="email" placeholder="alex.morgan@example.com" value={email} onChange={setEmail} icon={Mail} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color="#A1A1AA" style={{ position: 'absolute', left: 14 }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '12px 42px 12px 42px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
                  color: '#FFF', fontSize: 14, outline: 'none',
                }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: 14, background: 'none', border: 'none',
                color: '#A1A1AA', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && password && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#A1A1AA' }}>
                <span>Password Strength</span>
                <span style={{ color: strengthColors[strength], fontWeight: 700 }}>{strengthLabels[strength]}</span>
              </div>
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', display: 'flex', gap: 2 }}>
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} style={{
                    flex: 1, height: '100%', borderRadius: 1,
                    background: level <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
            </div>
          )}

          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA' }}>Confirm Password</label>
              <GlassInput type="password" placeholder="••••••••••••" value={confirmPassword} onChange={setConfirmPassword} icon={Lock} />
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} type="submit"
            disabled={authLoading}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, marginTop: 8,
              background: authLoading ? 'rgba(255,255,255,0.5)' : '#FFFFFF',
              border: 'none', color: '#000000',
              fontWeight: 800, fontSize: 15, cursor: authLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(255,255,255,0.25)',
              transition: 'all 0.2s',
            }}
          >
            {authLoading
              ? <><Loader2 size={18} className="animate-spin" /> {isLogin ? 'Signing in…' : 'Creating account…'}</>
              : <><span>{isLogin ? 'Sign In' : 'Create Account'}</span><ArrowRight size={18} /></>}
          </motion.button>

          {/* Forgot password */}
          {isLogin && (
            <button
              type="button"
              onClick={() => { setShowResetPassword(true); setResetEmail(email); setResetSent(false); }}
              style={{
                background: 'none', border: 'none', color: '#64748B', fontSize: 12,
                cursor: 'pointer', fontWeight: 600, marginTop: 4, textAlign: 'center', width: '100%',
              }}
            >
              Forgot your password?
            </button>
          )}
        </form>
      </GlassCard>

      {/* Security note */}
      <div style={{ textAlign: 'center', color: '#52525B', fontSize: 12, marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <CheckCircle2 size={14} color="#FFFFFF" />
        <span>Secured by Supabase Auth — end-to-end encrypted</span>
      </div>
      </>
      )}
    </motion.div>
  );

  // ── Wizard Step 1: Body Metrics & Age ───────────────────────────────────────
  const renderBodyStep = () => (
    <motion.div key="body" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18, background: 'rgba(167,139,250,0.15)',
          border: '1px solid rgba(167,139,250,0.3)', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: 10,
        }}>
          <Scale size={28} color="#A78BFA" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>Step 1: Body & Age</h1>
        <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 4 }}>
          Sets your baseline metabolic heat regulation & thermal stress capacity.
        </p>
        {/* Progress pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {['1. Body', '2. Diseases', '3. Hydration'].map((s, i) => (
            <motion.div key={s}
              animate={{ width: i === 0 ? 32 : 10, background: i === 0 ? '#A78BFA' : 'rgba(255,255,255,0.2)' }}
              style={{ height: 6, borderRadius: 3 }}
            />
          ))}
        </div>
      </div>

      <GlassCard elevation="hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Age Slider */}
          <GlassSlider
            label="Age"
            value={age} min={5} max={95} step={1}
            onChange={setAge} unit="yrs"
          />

          {/* Height Slider */}
          <GlassSlider
            label="Height"
            value={heightCm} min={100} max={220} step={1}
            onChange={setHeightCm} unit="cm"
          />

          {/* Weight Slider */}
          <GlassSlider
            label="Weight"
            value={weightKg} min={30} max={160} step={1}
            onChange={setWeightKg} unit="kg"
          />

          {/* BMI preview tag */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', fontSize: 12,
          }}>
            <span style={{ color: '#A1A1AA' }}>Calculated BMI:</span>
            <span style={{ color: '#FFF', fontWeight: 800 }}>
              {(weightKg / ((heightCm / 100) ** 2)).toFixed(1)} kg/m²
            </span>
          </div>

          {/* Biological Gender */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Biological Gender
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'male', label: '👨 Male', desc: '+20% sweat rate' },
                { id: 'female', label: '👩 Female', desc: 'Core temp storage' },
                { id: 'other', label: '👤 Other', desc: 'Standard model' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGender(g.id as 'male' | 'female' | 'other')}
                  style={{
                    flex: 1, padding: '10px 6px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                    background: gender === g.id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${gender === g.id ? '#FFFFFF' : 'rgba(255,255,255,0.12)'}`,
                    color: gender === g.id ? '#FFF' : '#A1A1AA',
                    fontSize: 12, fontWeight: 800, transition: 'all 0.15s',
                  }}
                >
                  <div>{g.label}</div>
                  <div style={{ fontSize: 9, color: gender === g.id ? '#FDE047' : '#64748B', fontWeight: 600, marginTop: 2 }}>{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
        onClick={handleBodyNext} type="button"
        style={{
          width: '100%', marginTop: 18, padding: '14px', borderRadius: 16,
          background: '#FFFFFF', border: 'none', color: '#000',
          fontWeight: 800, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(255,255,255,0.2)',
        }}
      >
        Next: Select Diseases & Conditions <ChevronRight size={18} />
      </motion.button>
    </motion.div>
  );

  // ── Wizard Step 2: Diseases & Medical Conditions ────────────────────────────
  const renderDiseasesStep = () => {
    const DISEASE_OPTIONS = [
      { id: 'cardiovascular', label: '🫀 Heart / Cardiovascular', desc: 'Limits blood pumping efficiency in heat' },
      { id: 'diabetes', label: '🩸 Diabetes', desc: 'Impairs sweating & blood vessel dilation' },
      { id: 'kidney', label: '🫘 Kidney Disease', desc: 'Impairs electrolyte & fluid regulation' },
      { id: 'respiratory', label: '🫁 Asthma / Respiratory', desc: 'Hot air triggers airway constriction' },
      { id: 'hypertension', label: '🩺 High Blood Pressure', desc: 'Increases heat strain on blood vessels' },
      { id: 'pregnant', label: '🤰 Pregnancy', desc: 'Raises baseline body core temperature' },
    ];

    const toggleCondition = (id: string) => {
      if (conditions.includes(id)) {
        setConditions(conditions.filter((c) => c !== id));
      } else {
        setConditions([...conditions, id]);
      }
    };

    return (
      <motion.div key="diseases" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 10,
          }}>
            <Activity size={28} color="#EF4444" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>Step 2: Diseases & Conditions</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 4 }}>
            Select any pre-existing conditions or medical factors.
          </p>
          {/* Progress pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
            {['1. Body', '2. Diseases', '3. Hydration'].map((s, i) => (
              <motion.div key={s}
                animate={{ width: i === 1 ? 32 : 10, background: i === 1 ? '#EF4444' : 'rgba(255,255,255,0.2)' }}
                style={{ height: 6, borderRadius: 3 }}
              />
            ))}
          </div>
        </div>

        <GlassCard elevation="hero">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Diseases selection */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Pre-existing Medical Conditions / Diseases
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {DISEASE_OPTIONS.map((d) => {
                  const active = conditions.includes(d.id);
                  return (
                    <motion.button
                      key={d.id}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => toggleCondition(d.id)}
                      style={{
                        padding: '10px 10px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                        background: active ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1.5px solid ${active ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: active ? '#FFF' : '#A1A1AA' }}>
                        {d.label}
                      </div>
                      <div style={{ fontSize: 9, color: active ? '#FCA5A5' : '#52525B', marginTop: 3, lineHeight: 1.2 }}>
                        {d.desc}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Additional Risk Factors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Medication & Work Exposure
              </p>

              {/* Medication toggle */}
              <button
                type="button"
                onClick={() => setMedications(!medications)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                  background: medications ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${medications ? '#A78BFA' : 'rgba(255,255,255,0.12)'}`,
                  color: medications ? '#FFF' : '#A1A1AA', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Pill size={18} color={medications ? '#A78BFA' : '#64748B'} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Heat-Affecting Medications</div>
                    <div style={{ fontSize: 10, color: medications ? '#DDD6FE' : '#52525B' }}>Diuretics, Beta-blockers, Antihistamines</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 900 }}>{medications ? 'YES' : 'NO'}</div>
              </button>

              {/* Outdoor Work toggle */}
              <button
                type="button"
                onClick={() => setOutdoor(!outdoor)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                  background: outdoor ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${outdoor ? '#F59E0B' : 'rgba(255,255,255,0.12)'}`,
                  color: outdoor ? '#FFF' : '#A1A1AA', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sun size={18} color={outdoor ? '#F59E0B' : '#64748B'} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Outdoor Occupation / High Exposure</div>
                    <div style={{ fontSize: 10, color: outdoor ? '#FDE68A' : '#52525B' }}>Extended work under direct sunlight</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 900 }}>{outdoor ? 'YES' : 'NO'}</div>
              </button>

              {/* Past heat stroke history */}
              <button
                type="button"
                onClick={() => setPastHeatStroke(!pastHeatStroke)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                  background: pastHeatStroke ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${pastHeatStroke ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
                  color: pastHeatStroke ? '#FFF' : '#A1A1AA', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Activity size={18} color={pastHeatStroke ? '#EF4444' : '#64748B'} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Past History of Heat Stroke / Exhaustion</div>
                    <div style={{ fontSize: 10, color: pastHeatStroke ? '#FECACA' : '#52525B' }}>Increases physiological recurrence risk</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 900 }}>{pastHeatStroke ? 'YES' : 'NO'}</div>
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setWizardStep('body')} type="button"
            style={{
              flex: 1, padding: '14px', borderRadius: 16,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#CBD5E1', fontWeight: 700, cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <ChevronLeft size={18} /> Back
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
            onClick={handleDiseasesNext} type="button"
            style={{
              flex: 2, padding: '14px', borderRadius: 16,
              background: '#FFFFFF', border: 'none', color: '#000',
              fontWeight: 800, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(255,255,255,0.2)',
            }}
          >
            Next: Hydration <ChevronRight size={18} />
          </motion.button>
        </div>
      </motion.div>
    );
  };

  // ── Wizard Step 3: Sun, Skin & Hydration ───────────────────────────────────
  const renderHydrationStep = () => (
    <motion.div key="hydration" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18, background: 'rgba(56,189,248,0.15)',
          border: '1px solid rgba(56,189,248,0.3)', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: 10,
        }}>
          <Droplets size={28} color="#38BDF8" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>Step 3: Sun & Hydration</h1>
        <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 4 }}>
          Fine-tunes UV vulnerability and water replenishment target.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {['1. Body', '2. Diseases', '3. Hydration'].map((s, i) => (
            <motion.div key={s}
              animate={{ width: i === 2 ? 32 : 10, background: i === 2 ? '#38BDF8' : 'rgba(255,255,255,0.2)' }}
              style={{ height: 6, borderRadius: 3 }}
            />
          ))}
        </div>
      </div>

      <GlassCard elevation="hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Skin type grid */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Skin Type (Fitzpatrick Scale)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {SKIN_TYPES.map((st) => (
                <motion.button
                  key={st.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSkinType(st.id)}
                  type="button"
                  style={{
                    padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                    background: skinType === st.id ? `${st.color}22` : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${skinType === st.id ? st.color : 'rgba(255,255,255,0.1)'}`,
                    transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: st.color,
                    boxShadow: skinType === st.id ? `0 0 10px ${st.color}99` : 'none',
                  }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: skinType === st.id ? '#FFF' : '#64748B' }}>{st.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Daily water goal slider */}
          <GlassSlider
            label="Daily Water Goal"
            value={waterGoal} min={500} max={5000} step={100}
            onChange={setWaterGoal} unit="ml"
          />

          {/* Current hydration level */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Current Hydration Level
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { val: 'dehydrated', label: '🔴 Dehydrated', color: '#EF4444' },
                { val: 'normal', label: '🟡 Normal', color: '#F59E0B' },
                { val: 'well_hydrated', label: '🟢 Well Hydrated', color: '#10B981' },
              ] as const).map(({ val, label, color }) => (
                <ChipToggle key={val} label={label} active={hydrationLevel === val} onToggle={() => setHydrationLevel(val)} color={color} />
              ))}
            </div>
          </div>

          {/* Sweat rate */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Sweat Rate
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { val: 'low', label: '💧 Low' },
                { val: 'normal', label: '💦 Normal' },
                { val: 'heavy', label: '🌊 Heavy' },
              ] as const).map(({ val, label }) => (
                <ChipToggle key={val} label={label} active={sweatRate === val} onToggle={() => setSweatRate(val)} />
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setWizardStep('diseases')} type="button"
          style={{
            flex: 1, padding: '14px', borderRadius: 16,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#CBD5E1', fontWeight: 700, cursor: 'pointer', fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <ChevronLeft size={18} /> Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          onClick={handleHydrationFinish} type="button"
          style={{
            flex: 2, padding: '14px', borderRadius: 16,
            background: '#FFFFFF', border: 'none', color: '#000',
            fontWeight: 800, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(255,255,255,0.2)',
          }}
        >
          Start HeatWatch <ArrowRight size={18} />
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <AnimatedGradientBackground tier="safe">
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '40px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {wizardStep === null && renderAuthForm()}
          {wizardStep === 'body' && renderBodyStep()}
          {wizardStep === 'diseases' && renderDiseasesStep()}
          {wizardStep === 'hydration' && renderHydrationStep()}
        </AnimatePresence>
      </div>
    </AnimatedGradientBackground>
  );
}
