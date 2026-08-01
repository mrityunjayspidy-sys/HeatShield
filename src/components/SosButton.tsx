/**
 * SosButton — Emergency Heat Alert Trigger.
 * Allows user to send immediate emergency heat alerts to their designated emergency contact.
 * Options:
 * 1. Direct SMS (`sms:` protocol) with pre-filled distress message + GPS location.
 * 2. Immediate Phone Call (`tel:` protocol).
 * 3. Copy SOS alert payload to clipboard for instant WhatsApp/Telegram sharing.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, PhoneCall, MessageSquare, Copy, Check, X, ShieldAlert, MapPin } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import type { UserSession } from '../lib/supabase';
import { getCurrentCoordinates } from '../lib/location';

interface SosButtonProps {
  userSession?: UserSession | null;
  currentTempC?: number;
  heatScore?: number;
  fullWidth?: boolean;
}

export function SosButton({ userSession, currentTempC = 38, heatScore = 75, fullWidth = false }: SosButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const contactName = userSession?.emergencyContact?.name || 'Emergency Contact';
  const contactPhone = userSession?.emergencyContact?.phone || '';
  const userName = userSession?.name || 'User';

  // Fetch coordinates when SOS modal opens
  useEffect(() => {
    if (isOpen) {
      getCurrentCoordinates()
        .then((c) => setCoords({ lat: c.latitude, lon: c.longitude }))
        .catch(() => {});
    }
  }, [isOpen]);

  // 3-second safety countdown before auto-triggering SMS
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      triggerSms();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const mapLink = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lon}` : 'GPS unavailable';

  const sosMessage = `🚨 EMERGENCY HEAT STRESS ALERT!\nThis is ${userName}. I am experiencing severe heat exhaustion/stress symptoms.\nTemp: ${currentTempC}°C | Heat Score: ${heatScore}/100 (HIGH RISK)\nMy Location: ${mapLink}\nPlease check on me or contact medical services immediately!`;

  const triggerSms = () => {
    const cleanPhone = contactPhone.replace(/[^\d+]/g, '');
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(sosMessage)}`;
    window.location.href = smsUrl;
  };

  const triggerCall = () => {
    const cleanPhone = contactPhone.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(sosMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Red SOS Button (Full-width bar or compact button) */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => { setIsOpen(true); setCountdown(3); }}
        type="button"
        title="SOS Emergency Heat Alert"
        style={{
          width: fullWidth ? '100%' : 'auto',
          padding: fullWidth ? '14px 20px' : '10px 18px',
          borderRadius: fullWidth ? 18 : 30,
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          border: '1.5px solid rgba(255,255,255,0.4)',
          boxShadow: '0 6px 24px rgba(239,68,68,0.45)',
          color: '#FFF', fontWeight: 900, fontSize: fullWidth ? 14 : 13,
          letterSpacing: fullWidth ? 1 : 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: fullWidth ? 'center' : 'flex-start', gap: 10,
          zIndex: 60, transition: 'all 0.2s',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          <AlertOctagon size={fullWidth ? 20 : 18} color="#FFF" />
        </motion.div>
        <span>{fullWidth ? '🚨 SOS EMERGENCY HEAT ALERT' : 'SOS EMERGENCY'}</span>
      </motion.button>

      {/* Emergency Overlay Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ width: '100%', maxWidth: 420 }}
            >
              <GlassCard elevation="hero" style={{ border: '2px solid #EF4444', position: 'relative' }}>
                <button
                  onClick={() => { setIsOpen(false); setCountdown(null); }}
                  style={{
                    position: 'absolute', top: 14, right: 14, background: 'none', border: 'none',
                    color: '#94A3B8', cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{
                      width: 64, height: 64, borderRadius: 22,
                      background: 'rgba(239,68,68,0.2)', border: '2px solid #EF4444',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                    }}
                  >
                    <ShieldAlert size={34} color="#EF4444" />
                  </motion.div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFF', margin: 0 }}>
                    EMERGENCY HEAT ALERT
                  </h2>
                  <p style={{ fontSize: 13, color: '#F87171', marginTop: 4, fontWeight: 700 }}>
                    Sending SOS alert to {contactName} ({contactPhone || 'No phone set'})
                  </p>
                </div>

                {/* Safety Countdown */}
                {countdown !== null && countdown > 0 && (
                  <div style={{
                    textAlign: 'center', padding: '12px', borderRadius: 14,
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    marginBottom: 18,
                  }}>
                    <p style={{ fontSize: 12, color: '#FCA5A5', margin: 0, fontWeight: 600 }}>
                      Auto-sending SMS in <strong style={{ fontSize: 18, color: '#FFF' }}>{countdown}s</strong>…
                    </p>
                    <button
                      onClick={() => setCountdown(null)}
                      style={{
                        background: 'none', border: 'none', color: '#FFF', textDecoration: 'underline',
                        fontSize: 11, cursor: 'pointer', marginTop: 4, fontWeight: 700,
                      }}
                    >
                      Cancel Countdown
                    </button>
                  </div>
                )}

                {/* GPS Location preview */}
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  fontSize: 12, color: '#CBD5E1', marginBottom: 18,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <MapPin size={16} color="#EF4444" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#FFF' }}>GPS Location Included</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{mapLink}</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* SMS Action */}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    onClick={triggerSms}
                    type="button"
                    style={{
                      padding: '14px', borderRadius: 14,
                      background: '#EF4444', border: 'none',
                      color: '#FFF', fontWeight: 900, fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 18px rgba(239,68,68,0.4)',
                    }}
                  >
                    <MessageSquare size={18} /> Send Instant SOS SMS
                  </motion.button>

                  {/* Call Action */}
                  {contactPhone && (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                      onClick={triggerCall}
                      type="button"
                      style={{
                        padding: '14px', borderRadius: 14,
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                        color: '#FFF', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <PhoneCall size={18} color="#34D399" /> Call {contactName} ({contactPhone})
                    </motion.button>
                  )}

                  {/* Copy Link / Payload */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={copyPayload}
                    type="button"
                    style={{
                      padding: '11px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94A3B8', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {copied ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                    {copied ? 'Copied SOS payload to clipboard!' : 'Copy SOS Message & Location Link'}
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
