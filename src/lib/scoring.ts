// HeatWatch — Personal Heat Vulnerability Scoring Engine
// Pure function, no side effects, fully testable.

export type RiskTier = 'safe' | 'watch' | 'warning' | 'danger';

export interface ScoringInput {
  tempC: number;
  humidity: number;
  uvIndex: number;
  gender?: 'male' | 'female' | 'other';
  age: number;
  weightKg: number;
  heightCm: number;
  conditions: string[];
  medicationsAffectingHeat: boolean;
  outdoorOccupation: boolean;
  sunExposureLevel: 'low' | 'moderate' | 'high';
}

export interface ScoringResult {
  totalScore: number;
  tier: RiskTier;
  envScore: number;
  uvScore: number;
  personalScore: number;
  heatIndexC: number;
  factors: { label: string; points: number; reason: string }[];
  recommendedAction: string;
}

/**
 * NOAA Heat Index calculation (Rothfusz regression, Celsius version).
 * Only valid when tempC >= 27 and humidity >= 40%.
 */
export function computeHeatIndex(tempC: number, humidity: number): number {
  if (tempC < 27) return tempC;
  const T = tempC * 9 / 5 + 32; // to Fahrenheit
  const R = humidity;
  let HI = -42.379
    + 2.04901523 * T
    + 10.14333127 * R
    - 0.22475541 * T * R
    - 0.00683783 * T * T
    - 0.05481717 * R * R
    + 0.00122874 * T * T * R
    + 0.00085282 * T * R * R
    - 0.00000199 * T * T * R * R;
  return Math.round(((HI - 32) * 5 / 9) * 10) / 10;
}

function computeBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 22;
  return weightKg / ((heightCm / 100) ** 2);
}

/**
 * Step 1: Environmental Heat Index Score (0–60 pts)
 */
function envHeatScore(heatIndexC: number): { score: number; label: string } {
  if (heatIndexC >= 51) return { score: 60, label: 'Extreme danger heat index (≥51°C)' };
  if (heatIndexC >= 39) return { score: 45, label: 'Dangerous heat index (39–51°C)' };
  if (heatIndexC >= 32) return { score: 25, label: 'High heat index (32–39°C)' };
  if (heatIndexC >= 27) return { score: 10, label: 'Elevated heat index (27–32°C)' };
  return { score: 0, label: 'Comfortable heat index (<27°C)' };
}

/**
 * UV modifier (0–10 pts)
 */
function uvModifierScore(uvIndex: number): { score: number; label: string } {
  if (uvIndex >= 11) return { score: 10, label: 'Extreme UV (11+)' };
  if (uvIndex >= 8)  return { score: 8, label: 'Very high UV (8–10)' };
  if (uvIndex >= 6)  return { score: 6, label: 'High UV (6–7)' };
  if (uvIndex >= 3)  return { score: 3, label: 'Moderate UV (3–5)' };
  return { score: 0, label: 'Low UV (0–2)' };
}

/**
 * Step 2: Personal Vulnerability (0–30 pts, additive, capped at 30)
 */
function personalVulnerability(input: ScoringInput): { score: number; factors: ScoringResult['factors'] } {
  const factors: ScoringResult['factors'] = [];
  let total = 0;

  // Gender physiological factors in high heat
  if (input.gender === 'male') {
    // Males lose ~20% more fluid through sweat under heat stress, increasing dehydration speed
    if (input.tempC >= 35) {
      total += 3;
      factors.push({ label: 'Male sweat rate profile', points: 3, reason: 'Males lose fluid ~20% faster through sweat at high ambient temperatures.' });
    }
  } else if (input.gender === 'female') {
    // Females have higher heat storage per kg due to body composition & surface area ratio
    if (input.tempC >= 37) {
      total += 3;
      factors.push({ label: 'Female thermal storage profile', points: 3, reason: 'Higher core temperature sensitivity during peak thermal radiation.' });
    }
  }

  // Age
  if (input.age >= 65 || input.age <= 5) {
    total += 8;
    factors.push({ label: input.age >= 65 ? `Age ${input.age}` : `Age ${input.age} (child)`, points: 8, reason: 'Very young or elderly individuals have reduced thermoregulation capacity.' });
  }

  // BMI
  const bmi = computeBMI(input.weightKg, input.heightCm);
  if (bmi < 18.5 || bmi >= 30) {
    total += 4;
    factors.push({ label: `BMI ${bmi.toFixed(1)}`, points: 4, reason: bmi >= 30 ? 'Higher body mass increases heat retention.' : 'Underweight reduces heat tolerance resilience.' });
  }

  // Conditions
  const conditionMap: Record<string, { pts: number; reason: string }> = {
    diabetes:       { pts: 6, reason: 'Diabetes impairs sweat response and blood flow regulation in heat.' },
    cardiovascular: { pts: 6, reason: 'Heart conditions limit the body\'s ability to pump blood to cool the skin.' },
    kidney:         { pts: 5, reason: 'Kidney disease impairs fluid balance, increasing dehydration risk.' },
    pregnant:       { pts: 5, reason: 'Pregnancy raises core body temperature and reduces heat tolerance.' },
  };

  for (const cond of input.conditions) {
    const key = cond.toLowerCase();
    if (conditionMap[key]) {
      total += conditionMap[key].pts;
      factors.push({ label: cond, points: conditionMap[key].pts, reason: conditionMap[key].reason });
    }
  }

  // Medications
  if (input.medicationsAffectingHeat) {
    total += 5;
    factors.push({ label: 'Heat-affecting medication', points: 5, reason: 'Certain medications (diuretics, beta-blockers, antihistamines) reduce sweat production or alter heat perception.' });
  }

  // Outdoor occupation/exposure
  if (input.outdoorOccupation) {
    total += 6;
    factors.push({ label: 'Outdoor occupation', points: 6, reason: 'Extended outdoor work increases cumulative heat exposure.' });
  }

  // Low acclimatization
  if (input.sunExposureLevel === 'low') {
    total += 3;
    factors.push({ label: 'Low sun acclimatization', points: 3, reason: 'Less frequent sun exposure means the body is less adapted to heat stress.' });
  }

  return { score: Math.min(total, 30), factors };
}

function tierFromScore(score: number): RiskTier {
  if (score >= 75) return 'danger';
  if (score >= 50) return 'warning';
  if (score >= 25) return 'watch';
  return 'safe';
}

function recommendedAction(tier: RiskTier): string {
  switch (tier) {
    case 'danger':  return 'Move indoors immediately. Drink cold water. Seek medical help if symptomatic.';
    case 'warning': return 'Take a shaded break now. Drink water every 15 minutes. Limit outdoor activity.';
    case 'watch':   return 'Stay hydrated. Apply sunscreen. Avoid prolonged direct sun.';
    case 'safe':    return 'Conditions are comfortable. Stay hydrated as usual.';
  }
}

/**
 * Main scoring function — pure, deterministic, testable.
 */
export function computeHeatScore(input: ScoringInput): ScoringResult {
  const heatIndexC = computeHeatIndex(input.tempC, input.humidity);

  const env = envHeatScore(heatIndexC);
  const uv = uvModifierScore(input.uvIndex);
  const personal = personalVulnerability(input);

  const totalScore = Math.min(env.score + uv.score + personal.score, 100);
  const tier = tierFromScore(totalScore);

  const factors: ScoringResult['factors'] = [];
  if (env.score > 0) factors.push({ label: 'Heat Index', points: env.score, reason: env.label });
  if (uv.score > 0)  factors.push({ label: 'UV Index', points: uv.score, reason: uv.label });
  factors.push(...personal.factors);

  return {
    totalScore,
    tier,
    envScore: env.score,
    uvScore: uv.score,
    personalScore: personal.score,
    heatIndexC,
    factors,
    recommendedAction: recommendedAction(tier),
  };
}

// Tier color tokens (Black & White Monochrome Edition)
export const TIER_COLORS: Record<RiskTier, { bg: string; text: string; glow: string; gradient: [string, string] }> = {
  safe:    { bg: '#FFFFFF', text: '#000000', glow: 'rgba(255,255,255,0.35)', gradient: ['#FFFFFF', '#71717A'] },
  watch:   { bg: '#E4E4E7', text: '#000000', glow: 'rgba(228,228,231,0.30)', gradient: ['#E4E4E7', '#52525B'] },
  warning: { bg: '#A1A1AA', text: '#000000', glow: 'rgba(161,161,170,0.30)', gradient: ['#A1A1AA', '#3F3F46'] },
  danger:  { bg: '#FFFFFF', text: '#000000', glow: 'rgba(255,255,255,0.60)', gradient: ['#FFFFFF', '#27272A'] },
};
