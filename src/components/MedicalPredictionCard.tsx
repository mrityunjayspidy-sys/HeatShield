import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Stethoscope, ChevronRight, Activity, X, ShieldAlert, HeartPulse, Droplets } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import type { MedicalPredictionResult, PredictedCondition } from '../lib/medicalPrediction';

interface MedicalPredictionCardProps {
  predictionResult: MedicalPredictionResult;
}

export function MedicalPredictionCard({ predictionResult }: MedicalPredictionCardProps) {
  const [selectedCondition, setSelectedCondition] = useState<PredictedCondition | null>(null);

  const getLevelColor = (level: PredictedCondition['level']) => {
    switch (level) {
      case 'critical': return '#FFFFFF';
      case 'high': return '#E4E4E7';
      case 'moderate': return '#A1A1AA';
      case 'low': return '#71717A';
    }
  };

  const getCategoryIcon = (category: PredictedCondition['category']) => {
    switch (category) {
      case 'heat_stroke': return <ShieldAlert size={18} color="#FFFFFF" />;
      case 'heat_exhaustion': return <Activity size={18} color="#E4E4E7" />;
      case 'dehydration': return <Droplets size={18} color="#FFFFFF" />;
      case 'cardiac_strain': return <HeartPulse size={18} color="#A1A1AA" />;
    }
  };

  return (
    <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Stethoscope size={20} color="#FFFFFF" />
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFF' }}>Predicted Medical Risks</h3>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 800,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {predictionResult.overallRiskLevel} Risk
        </div>
      </div>

      {/* Conditions Risk Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {predictionResult.predictions.map((pred) => {
          const color = getLevelColor(pred.level);
          return (
            <motion.div
              key={pred.name}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCondition(pred)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', borderRadius: 16,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {getCategoryIcon(pred.category)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>{pred.name}</div>
                  <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>
                    {pred.level.toUpperCase()} • {pred.symptoms.length} Symptoms Monitored
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color }}>{pred.riskPercent}%</div>
                  <div style={{ fontSize: 10, color: '#71717A', fontWeight: 600 }}>Probability</div>
                </div>
                <ChevronRight size={16} color="#71717A" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Vulnerability factors warning list */}
      {predictionResult.keyVulnerabilityFactors.length > 0 && (
        <div style={{
          padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <AlertTriangle size={12} color="#FFFFFF" /> Key Physiological Vulnerabilities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {predictionResult.keyVulnerabilityFactors.map((factor, i) => (
              <span key={i} style={{
                fontSize: 11, color: '#E4E4E7', background: 'rgba(255,255,255,0.08)',
                padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
              }}>
                • {factor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Condition detail modal */}
      <AnimatePresence>
        {selectedCondition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <GlassCard elevation="hero" style={{ maxWidth: 440, width: '100%', position: 'relative' }}>
              <button
                onClick={() => setSelectedCondition(null)}
                style={{
                  position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
                  color: '#A1A1AA', cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                {getCategoryIcon(selectedCondition.category)}
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#FFF' }}>{selectedCondition.name}</h3>
                  <div style={{ fontSize: 12, color: getLevelColor(selectedCondition.level), fontWeight: 800 }}>
                    {selectedCondition.riskPercent}% Estimated Probability ({selectedCondition.level.toUpperCase()})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 6 }}>
                    Early Warning Symptoms
                  </h4>
                  <ul style={{ paddingLeft: 18, fontSize: 13, color: '#E4E4E7', lineHeight: 1.6 }}>
                    {selectedCondition.symptoms.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 6 }}>
                    Preventative Clinical Protocol
                  </h4>
                  <ul style={{ paddingLeft: 18, fontSize: 13, color: '#E4E4E7', lineHeight: 1.6 }}>
                    {selectedCondition.preventativeActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
