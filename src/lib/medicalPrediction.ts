import type { UserSession } from './supabase';

export interface PredictedCondition {
  name: string;
  category: 'heat_exhaustion' | 'heat_stroke' | 'dehydration' | 'cardiac_strain';
  riskPercent: number; // 0 - 100%
  level: 'low' | 'moderate' | 'high' | 'critical';
  symptoms: string[];
  preventativeActions: string[];
}

export interface MedicalPredictionResult {
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  predictions: PredictedCondition[];
  keyVulnerabilityFactors: string[];
}

export function predictMedicalConditions(
  user: UserSession,
  heatIndexC: number,
  uvIndex: number,
  waterIntakeMl: number = 1500
): MedicalPredictionResult {
  const predictions: PredictedCondition[] = [];
  const keyFactors: string[] = [];

  // BMI calculation
  const bmi = user.weightKg / ((user.heightCm / 100) ** 2);

  // -------------------------------------------------------------
  // 1. HEAT EXHAUSTION PREDICTION
  // -------------------------------------------------------------
  let exhaustionPts = 0;
  if (heatIndexC >= 38) exhaustionPts += 35;
  else if (heatIndexC >= 32) exhaustionPts += 20;

  if (user.age >= 65 || user.age <= 6) { exhaustionPts += 15; keyFactors.push('Age extremes reduce thermoregulation'); }
  if (user.outdoor) { exhaustionPts += 15; keyFactors.push('Extended outdoor heat exposure'); }
  if (user.sweatRate === 'low') { exhaustionPts += 15; keyFactors.push('Reduced sweat response (Hypohidrosis)'); }
  if (user.medications) { exhaustionPts += 10; keyFactors.push('Medication altering thermoregulation'); }

  const exhaustionRisk = Math.min(100, Math.round(exhaustionPts));
  let exhaustionLevel: PredictedCondition['level'] = 'low';
  if (exhaustionRisk >= 75) exhaustionLevel = 'critical';
  else if (exhaustionRisk >= 50) exhaustionLevel = 'high';
  else if (exhaustionRisk >= 25) exhaustionLevel = 'moderate';

  predictions.push({
    name: 'Heat Exhaustion Risk',
    category: 'heat_exhaustion',
    riskPercent: exhaustionRisk,
    level: exhaustionLevel,
    symptoms: ['Heavy sweating or sudden chill', 'Dizziness / Lightheadedness', 'Nausea or headache', 'Weak, rapid pulse'],
    preventativeActions: ['Rest immediately in an air-conditioned room', 'Sip cool water or electrolyte solution', 'Apply cool wet towels to neck & armpits'],
  });

  // -------------------------------------------------------------
  // 2. HEAT STROKE RISK (MEDICAL EMERGENCY)
  // -------------------------------------------------------------
  let strokePts = 0;
  if (heatIndexC >= 42) strokePts += 45;
  else if (heatIndexC >= 38) strokePts += 25;

  if (user.pastHeatStrokeHistory) { strokePts += 25; keyFactors.push('Previous history of heatstroke'); }
  if (user.conditions.includes('cardiovascular')) { strokePts += 15; keyFactors.push('Pre-existing cardiovascular condition'); }
  if (user.acclimatizationDays !== undefined && user.acclimatizationDays < 4) { strokePts += 10; keyFactors.push('Low heat acclimatization (<4 days)'); }

  const strokeRisk = Math.min(100, Math.round(strokePts));
  let strokeLevel: PredictedCondition['level'] = 'low';
  if (strokeRisk >= 70) strokeLevel = 'critical';
  else if (strokeRisk >= 45) strokeLevel = 'high';
  else if (strokeRisk >= 20) strokeLevel = 'moderate';

  predictions.push({
    name: 'Heat Stroke Probability',
    category: 'heat_stroke',
    riskPercent: strokeRisk,
    level: strokeLevel,
    symptoms: ['Altered mental state or confusion', 'Hot, dry skin or heavy sweating', 'Throbbing headache', 'Body temp exceeding 40°C'],
    preventativeActions: ['Call emergency medical services immediately if confused', 'Move to shade and douse body with cold water', 'DO NOT force fluids if altered consciousness'],
  });

  // -------------------------------------------------------------
  // 3. DEHYDRATION & ELECTROLYTE IMBALANCE
  // -------------------------------------------------------------
  const targetWater = user.weightKg * 35 + (user.outdoor ? 500 : 0);
  const deficitRatio = Math.max(0, (targetWater - waterIntakeMl) / targetWater);
  let dehydrationPts = Math.round(deficitRatio * 50);

  if (heatIndexC >= 35) dehydrationPts += 25;
  if (user.sweatRate === 'heavy') { dehydrationPts += 15; keyFactors.push('Heavy sweat rate increases fluid depletion'); }

  const dehydrationRisk = Math.min(100, Math.round(dehydrationPts));
  let dehydrationLevel: PredictedCondition['level'] = 'low';
  if (dehydrationRisk >= 70) dehydrationLevel = 'critical';
  else if (dehydrationRisk >= 45) dehydrationLevel = 'high';
  else if (dehydrationRisk >= 20) dehydrationLevel = 'moderate';

  predictions.push({
    name: 'Dehydration & Electrolyte Deficit',
    category: 'dehydration',
    riskPercent: dehydrationRisk,
    level: dehydrationLevel,
    symptoms: ['Dark-colored urine', 'Dry mouth and thirst', 'Muscle cramps (Heat Cramps)', 'Fatigue and sluggishness'],
    preventativeActions: ['Drink 500ml water immediately with ORS/electrolytes', 'Avoid caffeine, alcohol, and sugary drinks', 'Monitor urine color (aim for pale yellow)'],
  });

  // -------------------------------------------------------------
  // 4. CARDIOVASCULAR HEAT STRAIN
  // -------------------------------------------------------------
  let cardiacPts = 0;
  if (heatIndexC >= 35) cardiacPts += 20;

  if (user.bloodPressure === 'high') { cardiacPts += 25; keyFactors.push('Hypertension (High Blood Pressure)'); }
  if (user.restingHeartRate && user.restingHeartRate > 85) { cardiacPts += 15; keyFactors.push('Elevated resting heart rate'); }
  if (user.conditions.includes('cardiovascular')) { cardiacPts += 25; }

  const cardiacRisk = Math.min(100, Math.round(cardiacPts));
  let cardiacLevel: PredictedCondition['level'] = 'low';
  if (cardiacRisk >= 70) cardiacLevel = 'critical';
  else if (cardiacRisk >= 45) cardiacLevel = 'high';
  else if (cardiacRisk >= 20) cardiacLevel = 'moderate';

  predictions.push({
    name: 'Cardiovascular Heat Strain',
    category: 'cardiac_strain',
    riskPercent: cardiacRisk,
    level: cardiacLevel,
    symptoms: ['Palpitations or rapid heart beating', 'Chest tightness or discomfort', 'Shortness of breath on exertion'],
    preventativeActions: ['Avoid strenuous physical labor during peak heat', 'Keep heart rate in low intensity zones', 'Consult physician regarding medication adjustment'],
  });

  // Determine overall max risk level
  const maxRisk = Math.max(exhaustionRisk, strokeRisk, dehydrationRisk, cardiacRisk);
  let overallRiskLevel: MedicalPredictionResult['overallRiskLevel'] = 'low';
  if (maxRisk >= 70) overallRiskLevel = 'critical';
  else if (maxRisk >= 45) overallRiskLevel = 'high';
  else if (maxRisk >= 20) overallRiskLevel = 'moderate';

  return {
    overallRiskLevel,
    predictions,
    keyVulnerabilityFactors: Array.from(new Set(keyFactors)),
  };
}
