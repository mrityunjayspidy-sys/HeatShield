import { motion } from 'framer-motion';
import { ArrowRight, Sun, Activity, Droplets } from 'lucide-react';
import SideRays from '../components/ui/SideRays';
import BlurText from '../components/ui/BlurText';
import { GlassCard } from '../components/ui/GlassCard';
import { HWLogo } from '../components/ui/HWLogo';

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      background: '#000000',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      padding: '40px 20px',
    }}>
      {/* Background SideRays Component */}
      <SideRays
        speed={2.0}
        rayColor1="#FFFFFF"
        rayColor2="#666666"
        intensity={2.2}
        spread={2.5}
        origin="top-right"
        tilt={5}
        saturation={0.0}
        blend={0.65}
        falloff={1.4}
        opacity={0.85}
      />

      {/* Main Glass Content Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="hw-split-hero"
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          margin: 'auto 0',
        }}
      >
        {/* Animated HW App Icon */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <HWLogo size={76} />
        </motion.div>

        {/* BlurText Title & Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <BlurText
            text="Welcome to HeatWatch"
            delay={120}
            animateBy="words"
            direction="top"
            className="text-3xl font-black text-white justify-center tracking-tight"
          />
          <BlurText
            text="Personalized Heat Risk & Hydration Intelligence"
            delay={80}
            animateBy="words"
            direction="bottom"
            className="text-sm font-medium text-zinc-400 justify-center max-w-xs leading-relaxed"
          />
        </div>

        {/* Feature Highlights Glass Card */}
        <GlassCard elevation="hero" style={{ width: '100%', textAlign: 'left', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <Sun size={20} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>Real-time Weather & UV</div>
                <div style={{ fontSize: 12, color: '#A1A1AA' }}>Live Open-Meteo temperature & UV index monitoring</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <Activity size={20} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>NOAA Heat Vulnerability Engine</div>
                <div style={{ fontSize: 12, color: '#A1A1AA' }}>Calculates personal risk score based on health profile</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <Droplets size={20} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>Smart Hydration Tracker</div>
                <div style={{ fontSize: 12, color: '#A1A1AA' }}>Proactive water intake target calculations</div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Enter HeatWatch Call to Action Button */}
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(255, 255, 255, 0.4)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 18,
            background: '#FFFFFF',
            color: '#000000',
            fontWeight: 800,
            fontSize: 16,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 8px 24px rgba(255, 255, 255, 0.25)',
          }}
        >
          <span>Get Started</span>
          <ArrowRight size={20} />
        </motion.button>

        <p style={{ fontSize: 11, color: '#52525B' }}>
          Monochrome Edition • Glassmorphism UI • React Bits Powered
        </p>
      </motion.div>
    </div>
  );
}
