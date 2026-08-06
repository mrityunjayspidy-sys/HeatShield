import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ExternalLink, Copy, Check, Sparkles, X } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface WebPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WEBSITE_URL = 'https://heat-watch-beta.vercel.app/';

export function WebPromoModal({ isOpen, onClose }: WebPromoModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(WEBSITE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWeb = () => {
    window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.88, y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <GlassCard
              elevation="hero"
              style={{
                position: 'relative',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                padding: '28px 24px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.15)',
                overflow: 'hidden',
              }}
            >
              {/* Background Ambient Glow */}
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(239,68,68,0.15) 50%, transparent 70%)',
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                }}
              />

              {/* Close Button */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#A1A1AA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <X size={18} />
              </button>

              {/* Icon Header */}
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2))',
                  border: '1.5px solid rgba(245, 158, 11, 0.5)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
                }}
              >
                <Globe size={32} color="#F59E0B" />
              </div>

              {/* Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#F59E0B',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 12,
                }}
              >
                <Sparkles size={12} color="#F59E0B" />
                Web Application
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  marginBottom: 10,
                  lineHeight: 1.3,
                  letterSpacing: '-0.3px',
                }}
              >
                Check out our Web Application on Heat Prediction!
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: '#D4D4D8',
                  lineHeight: 1.6,
                  marginBottom: 20,
                  padding: '0 4px',
                }}
              >
                Experience live heat index tracking, AI risk scoring, personalized hydration advice, and weather safety tools directly on your browser!
              </p>

              {/* URL Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 14,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#F59E0B',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {WEBSITE_URL}
                </span>

                <button
                  onClick={handleCopy}
                  title="Copy link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                    color: copied ? '#4ADE80' : '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={13} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleOpenWeb}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 900,
                    fontSize: 15,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'transform 0.2s',
                  }}
                >
                  <span>Visit Website</span>
                  <ExternalLink size={18} />
                </button>

                <button
                  onClick={onClose}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#A1A1AA',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
