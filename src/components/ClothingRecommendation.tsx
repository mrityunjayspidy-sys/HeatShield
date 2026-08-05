/**
 * ClothingRecommendation — weather-context smart outfit system.
 * Handles: hot/sunny, humid, rainy, cold, windy, overcast, snowy, foggy.
 * Accounts for temperature, UV index, wind, rain, and user skin type.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, ChevronDown, ChevronUp, Sun, Wind, Thermometer, CloudRain, Snowflake, Droplets } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import type { RiskTier } from '../lib/scoring';
import type { WeatherCondition } from '../lib/weather';
import { conditionLabel } from '../lib/weather';

type SkinType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | undefined;

interface ClothingRecommendationProps {
  tempC: number;
  uvIndex: number;
  tier: RiskTier;
  skinType?: SkinType;
  tempUnit: 'C' | 'F';
  weatherCondition?: WeatherCondition;
  windSpeedKmh?: number;
  precipMm?: number;
  humidityPct?: number;
}

// ── Weather scenario classifier ───────────────────────────────────────────────
type WeatherScenario =
  | 'extreme_heat'   // >40°C
  | 'hot_sunny'      // 30–40°C, clear
  | 'warm_humid'     // 25–35°C + humidity > 70%
  | 'warm_cloudy'    // 20–30°C, overcast/cloudy
  | 'rainy'          // precipitation > 0
  | 'cold'           // <15°C
  | 'cool'           // 15–22°C
  | 'windy'          // wind > 30 kmh
  | 'snowy'          // snow condition
  | 'foggy';         // foggy

function classifyScenario(
  tempC: number,
  _uvIndex: number,
  condition: WeatherCondition,
  windKmh: number,
  precipMm: number,
  humidity: number,
): WeatherScenario {
  if (condition === 'snow') return 'snowy';
  if (condition === 'foggy') return 'foggy';
  if (condition === 'rain' || condition === 'heavy_rain' || condition === 'drizzle' || condition === 'thunderstorm' || precipMm > 0.3) return 'rainy';
  if (tempC < 10) return 'cold';
  if (tempC < 22) return 'cool';
  if (windKmh > 30 && tempC < 28) return 'windy';
  if (tempC >= 40) return 'extreme_heat';
  if (humidity > 72 && tempC >= 25) return 'warm_humid';
  if (condition === 'overcast' || condition === 'partly_cloudy') return 'warm_cloudy';
  return 'hot_sunny';
}

// ── Clothing item DB ───────────────────────────────────────────────────────────
interface ClothingItem {
  id: string;
  emoji: string;
  name: string;
  material: string;
  description: string;
  tip: string;
  scenarios: WeatherScenario[];      // which scenarios this item applies to
  heatAbsorption: 'very low' | 'low' | 'moderate' | 'high';
  uvProtection: 'none' | 'low' | 'moderate' | 'high' | 'max';
  rainproof?: boolean;
  windproof?: boolean;
  warmth?: 'none' | 'light' | 'moderate' | 'high';
  priority?: number;                  // higher = show first
  skinTypesPreferred?: string[];
  minUvFor?: number;
}

const ALL_ITEMS: ClothingItem[] = [
  // ── EXTREME HEAT & HOT SUNNY ──────────────────────────────────────────────
  {
    id: 'linen_shirt',
    emoji: '👕', name: 'White Linen Shirt', material: '100% Linen',
    heatAbsorption: 'very low', uvProtection: 'moderate', warmth: 'none',
    scenarios: ['extreme_heat', 'hot_sunny', 'warm_humid', 'warm_cloudy'],
    description: 'Extremely breathable natural fibre. Reflects sunlight, wicks sweat, and dries fast.',
    tip: 'White or light pastels reflect up to 95% of sunlight. Linen breathes 30% better than cotton.',
    priority: 10,
  },
  {
    id: 'upf50_tee',
    emoji: '🛡️', name: 'UPF 50+ UV-Shield Tee', material: 'Performance polyester blend',
    heatAbsorption: 'low', uvProtection: 'max', warmth: 'none',
    scenarios: ['extreme_heat', 'hot_sunny'],
    description: 'Blocks 98% of UV rays while remaining lightweight and moisture-wicking.',
    tip: 'Essential for skin types I–III at UV 6+. Replaces sunscreen re-application on covered areas.',
    priority: 12, skinTypesPreferred: ['I', 'II', 'III'], minUvFor: 5,
  },
  {
    id: 'wide_brim_hat',
    emoji: '👒', name: 'Wide-Brim Sun Hat', material: 'Straw / UPF-rated fabric',
    heatAbsorption: 'very low', uvProtection: 'high', warmth: 'none',
    scenarios: ['extreme_heat', 'hot_sunny', 'warm_humid', 'warm_cloudy'],
    description: 'Shades face, neck, and ears from direct UV exposure.',
    tip: 'A 3-inch brim cuts UV to the face by 70%. Straw hats allow ventilation unlike solid caps.',
    priority: 11, minUvFor: 3,
  },
  {
    id: 'uv400_sunglasses',
    emoji: '🕶️', name: 'UV400 Wraparound Sunglasses', material: 'Polycarbonate lens',
    heatAbsorption: 'very low', uvProtection: 'max', warmth: 'none',
    scenarios: ['extreme_heat', 'hot_sunny', 'warm_cloudy'],
    description: 'Full UV400 protection blocks UVA and UVB. Prevents cataracts and heat glare fatigue.',
    tip: 'Wraparound style blocks 30% more side UV than standard frames.',
    priority: 9, minUvFor: 3,
  },
  {
    id: 'loose_light_trousers',
    emoji: '👖', name: 'Loose Light-Coloured Trousers', material: 'Linen or lightweight cotton',
    heatAbsorption: 'low', uvProtection: 'moderate', warmth: 'none',
    scenarios: ['extreme_heat', 'hot_sunny'],
    description: 'Full leg coverage from sun while loose fit allows air to circulate freely.',
    tip: 'Covering legs in direct sun can actually feel cooler than bare skin in extreme UV.',
    priority: 8, skinTypesPreferred: ['I', 'II'], minUvFor: 7,
  },
  {
    id: 'mesh_shorts',
    emoji: '🩳', name: 'Breathable Mesh Shorts', material: 'Mesh polyester',
    heatAbsorption: 'low', uvProtection: 'none', warmth: 'none',
    scenarios: ['hot_sunny', 'warm_humid'],
    description: 'Maximum airflow for legs. Ideal when UV is moderate and heat is extreme.',
    tip: 'Mesh weave increases ventilation by 40% vs solid fabric. Best for shaded or lower UV environments.',
    priority: 6,
  },
  {
    id: 'cooling_towel',
    emoji: '🧣', name: 'PVA Cooling Neck Wrap', material: 'PVA cooling fabric',
    heatAbsorption: 'very low', uvProtection: 'none', warmth: 'none',
    scenarios: ['extreme_heat', 'hot_sunny', 'warm_humid'],
    description: 'Wet and drape around neck. Lowers apparent body temperature by 1–2°C instantly.',
    tip: 'The carotid arteries in the neck are the body\'s most effective heat dissipation points.',
    priority: 9,
  },
  {
    id: 'rash_guard',
    emoji: '🦺', name: 'UPF 50+ Rash Guard / Arm Sleeves', material: 'UPF 50+ Lycra',
    heatAbsorption: 'low', uvProtection: 'max', warmth: 'none',
    scenarios: ['extreme_heat', 'hot_sunny'],
    description: 'Full arm coverage without sunscreen. Critical for prolonged outdoor exposure.',
    tip: 'More effective than repeated sunscreen application for 4+ hour outdoor sessions.',
    priority: 7, skinTypesPreferred: ['I', 'II', 'III'], minUvFor: 8,
  },
  {
    id: 'open_sandals',
    emoji: '👡', name: 'Breathable Open Sandals', material: 'Leather / mesh strap',
    heatAbsorption: 'very low', uvProtection: 'none', warmth: 'none',
    scenarios: ['extreme_heat', 'hot_sunny', 'warm_humid'],
    description: 'Full foot ventilation. Feet are an underrated heat release point.',
    tip: 'Avoid dark rubber soles — asphalt can reach 60°C+ on hot days, transferring heat up.',
    priority: 5,
  },

  // ── HUMID / WARM CLOUDY ────────────────────────────────────────────────────
  {
    id: 'moisture_wicking',
    emoji: '💧', name: 'Moisture-Wicking Sport Tee', material: 'Polyester Dri-Fit',
    heatAbsorption: 'low', uvProtection: 'low', warmth: 'none',
    scenarios: ['warm_humid', 'warm_cloudy'],
    description: 'Pulls sweat away from skin and dries fast. Essential in high-humidity conditions.',
    tip: 'In high humidity, cotton becomes heavy and clingy. Dri-Fit fabrics outperform by 40%.',
    priority: 10,
  },
  {
    id: 'anti_fungal_socks',
    emoji: '🧦', name: 'Anti-Microbial Dry-Fit Socks', material: 'Bamboo fibre blend',
    heatAbsorption: 'low', uvProtection: 'none', warmth: 'light',
    scenarios: ['warm_humid', 'rainy'],
    description: 'Prevents moisture build-up in shoes. Reduces risk of fungal infections in humid heat.',
    tip: 'Bamboo socks are 3x more absorbent than cotton and naturally anti-microbial.',
    priority: 6,
  },

  // ── RAINY ─────────────────────────────────────────────────────────────────
  {
    id: 'waterproof_jacket',
    emoji: '🧥', name: 'Waterproof Rain Jacket', material: 'Gore-Tex / PU shell',
    heatAbsorption: 'moderate', uvProtection: 'low', warmth: 'light', rainproof: true,
    scenarios: ['rainy'],
    description: 'Windproof and waterproof outer layer. Keeps core dry without restricting movement.',
    tip: 'Sealed seams matter — look for "fully seam-taped" for heavy rain protection.',
    priority: 12,
  },
  {
    id: 'compact_umbrella',
    emoji: '☂️', name: 'Compact UV-Blocking Umbrella', material: 'UV-coated polyester canopy',
    heatAbsorption: 'very low', uvProtection: 'high', warmth: 'none', rainproof: true,
    scenarios: ['rainy', 'warm_cloudy'],
    description: 'Shields from both rain and UV. UV-coated umbrellas block up to 99% of UV rays.',
    tip: 'Dark-interior umbrellas reflect UV away better than white-interior ones.',
    priority: 11,
  },
  {
    id: 'waterproof_shoes',
    emoji: '👟', name: 'Waterproof Trail Shoes', material: 'GORE-TEX lined upper',
    heatAbsorption: 'low', uvProtection: 'none', warmth: 'light', rainproof: true,
    scenarios: ['rainy', 'foggy'],
    description: 'Keeps feet dry and prevents slipping on wet surfaces.',
    tip: 'Wet feet lose body heat 25x faster than dry feet — critical in cool rain.',
    priority: 10,
  },
  {
    id: 'quick_dry_shirt',
    emoji: '🟦', name: 'Quick-Dry Long Sleeve Shirt', material: 'Nylon/polyester blend',
    heatAbsorption: 'low', uvProtection: 'moderate', warmth: 'light', rainproof: false,
    scenarios: ['rainy', 'warm_cloudy'],
    description: 'Dries 4x faster than cotton when caught in rain. Stays comfortable all day.',
    tip: 'Roll up sleeves if it gets warm — nylon cools quickly when air-circulated.',
    priority: 8,
  },
  {
    id: 'waterproof_trousers',
    emoji: '🫙', name: 'Waterproof Trousers', material: 'Ripstop nylon with DWR coating',
    heatAbsorption: 'moderate', uvProtection: 'moderate', warmth: 'light', rainproof: true,
    scenarios: ['rainy'],
    description: 'Lightweight rain over-trousers. Pack small and pull on over regular pants.',
    tip: 'DWR (Durable Water Repellent) coating needs re-activating after washing — iron on low heat.',
    priority: 7,
  },

  // ── COOL / COLD ───────────────────────────────────────────────────────────
  {
    id: 'light_fleece',
    emoji: '🧶', name: 'Lightweight Fleece Jacket', material: 'Recycled polyester fleece',
    heatAbsorption: 'moderate', uvProtection: 'low', warmth: 'moderate',
    scenarios: ['cool', 'windy'],
    description: 'Traps body heat efficiently. Compresses into a pocket. Great wind-resistant mid-layer.',
    tip: 'Fleece insulates even when damp — unlike down which loses 80% of its warmth when wet.',
    priority: 10,
  },
  {
    id: 'thermal_base',
    emoji: '🔴', name: 'Thermal Base Layer', material: 'Merino wool / polypropylene',
    heatAbsorption: 'moderate', uvProtection: 'low', warmth: 'high',
    scenarios: ['cold', 'snowy'],
    description: 'Wicks moisture while maintaining body warmth. The foundation of cold weather layering.',
    tip: 'Merino wool regulates temperature in both cold and mild conditions — no itching either.',
    priority: 12,
  },
  {
    id: 'insulated_jacket',
    emoji: '🧥', name: 'Insulated Puffer Jacket', material: 'Synthetic or down fill',
    heatAbsorption: 'high', uvProtection: 'low', warmth: 'high',
    scenarios: ['cold', 'snowy'],
    description: 'Traps air to insulate against extreme cold. Essential below 10°C.',
    tip: 'Synthetic fill performs better in wet cold vs down, which collapses when wet.',
    priority: 11,
  },
  {
    id: 'wool_hat',
    emoji: '🧢', name: 'Warm Beanie / Wool Hat', material: 'Merino wool or acrylic',
    heatAbsorption: 'moderate', uvProtection: 'low', warmth: 'high',
    scenarios: ['cold', 'snowy'],
    description: 'Up to 40% of body heat is lost through the head. A warm hat is the most efficient warmer.',
    tip: 'Merino wool is naturally odour-resistant — ideal for all-day wear.',
    priority: 10,
  },
  {
    id: 'thermal_gloves',
    emoji: '🧤', name: 'Thermal Gloves', material: 'Softshell / fleece-lined',
    heatAbsorption: 'moderate', uvProtection: 'none', warmth: 'high',
    scenarios: ['cold', 'snowy'],
    description: 'Protects extremities from cold and wind. Touchscreen-compatible tips available.',
    tip: 'Cold hands reduce dexterity by 30%. Always layer gloves in wind chill below 5°C.',
    priority: 9,
  },
  {
    id: 'scarf',
    emoji: '🧣', name: 'Wool Scarf / Neck Warmer', material: 'Merino wool',
    heatAbsorption: 'moderate', uvProtection: 'none', warmth: 'moderate',
    scenarios: ['cold', 'cool', 'windy'],
    description: 'Protects neck and throat from cold wind exposure. Doubles as a face shield in extreme cold.',
    tip: 'A neck warmer can add 2–3°C of perceived warmth without adding bulk.',
    priority: 8,
  },
  {
    id: 'waterproof_boots',
    emoji: '🥾', name: 'Insulated Waterproof Boots', material: 'Full-grain leather / synthetic shell',
    heatAbsorption: 'moderate', uvProtection: 'none', warmth: 'high', rainproof: true,
    scenarios: ['cold', 'snowy', 'rainy'],
    description: 'Essential in snow or heavy rain. Insulation prevents frostbite in sub-zero conditions.',
    tip: 'Replace insoles every 6 months — compressed insoles lose 50% of thermal effectiveness.',
    priority: 9,
  },

  // ── WINDY ─────────────────────────────────────────────────────────────────
  {
    id: 'windbreaker',
    emoji: '🌬️', name: 'Lightweight Windbreaker', material: 'Ripstop nylon shell',
    heatAbsorption: 'low', uvProtection: 'low', warmth: 'light', windproof: true, rainproof: false,
    scenarios: ['windy', 'cool'],
    description: 'Blocks wind chill without adding heat. Packs flat into a pocket or bag.',
    tip: 'Wind at 30 km/h makes 20°C feel like 14°C. A windbreaker restores perceived warmth.',
    priority: 11,
  },
  {
    id: 'windproof_trousers',
    emoji: '🩱', name: 'Windproof Softshell Trousers', material: 'Softshell fabric',
    heatAbsorption: 'low', uvProtection: 'low', warmth: 'light', windproof: true,
    scenarios: ['windy', 'cool'],
    description: 'Stretch-woven to block wind while remaining breathable and comfortable for active use.',
    tip: 'Great for cycling, running, or hiking in exposed windy conditions.',
    priority: 8,
  },

  // ── FOGGY ─────────────────────────────────────────────────────────────────
  {
    id: 'reflective_vest',
    emoji: '🦺', name: 'Hi-Viz Reflective Vest', material: 'Polyester with reflective tape',
    heatAbsorption: 'low', uvProtection: 'none', warmth: 'none',
    scenarios: ['foggy'],
    description: 'Critical visibility aid in foggy conditions. Makes you visible to traffic from 200m+.',
    tip: 'In dense fog, vehicle stopping distances double. Visibility gear is not optional.',
    priority: 12,
  },
  {
    id: 'moisture_repellent',
    emoji: '💨', name: 'Moisture-Repellent Outer Layer', material: 'DWR-coated softshell',
    heatAbsorption: 'low', uvProtection: 'low', warmth: 'light', rainproof: true,
    scenarios: ['foggy', 'warm_cloudy'],
    description: 'Fog deposits fine water droplets on clothing. A repellent outer layer keeps you dry.',
    tip: 'Fog can saturate regular clothing just as fast as light rain.',
    priority: 10,
  },

  // ── SNOWY ─────────────────────────────────────────────────────────────────
  {
    id: 'snow_goggles',
    emoji: '🥽', name: 'Snow Goggles / Polarised Glasses', material: 'Polycarbonate lens',
    heatAbsorption: 'very low', uvProtection: 'max', warmth: 'none',
    scenarios: ['snowy'],
    description: 'Snow reflects up to 80% of UV rays — UV exposure in snow can exceed equatorial sun.',
    tip: 'Snow blindness (photokeratitis) can occur in as little as 30 min without UV protection.',
    priority: 10,
  },
];

// ── Scoring function ──────────────────────────────────────────────────────────
function scoreItem(
  item: ClothingItem,
  scenario: WeatherScenario,
  tempC: number,
  uvIndex: number,
  skinType: SkinType,
): number {
  if (!item.scenarios.includes(scenario)) return -1;
  if (item.minUvFor !== undefined && uvIndex < item.minUvFor) return -1;

  let score = item.priority ?? 5;

  // Skin type bonus
  if (skinType && item.skinTypesPreferred?.includes(skinType)) score += 8;

  // Temperature relevance
  if (tempC >= 40 && item.heatAbsorption === 'very low') score += 5;
  if (tempC < 5  && (item.warmth === 'high')) score += 5;

  return score;
}

// ── Badge data (Subtle Monochrome Edition) ──────────────────────────────────
const ABSORPTION_DOT: Record<ClothingItem['heatAbsorption'], { color: string; label: string }> = {
  'very low': { color: '#E4E4E7', label: 'Very Low' },
  'low':      { color: '#A1A1AA', label: 'Low' },
  'moderate': { color: '#71717A', label: 'Moderate' },
  'high':     { color: '#52525B', label: 'High' },
};

const UV_PROT_BADGE: Record<ClothingItem['uvProtection'], { color: string; label: string }> = {
  'none':     { color: '#52525B', label: 'No UV' },
  'low':      { color: '#71717A', label: 'Basic' },
  'moderate': { color: '#A1A1AA', label: 'Moderate' },
  'high':     { color: '#D4D4D8', label: 'High' },
  'max':      { color: '#FFFFFF', label: 'UPF 50+' },
};

const SCENARIO_META: Record<WeatherScenario, { label: string; emoji: string; desc: string; headerColor: string; headerBg: string }> = {
  extreme_heat: { label: 'Extreme Heat', emoji: '🔥', desc: 'Temperature above 40°C — maximum protection mode.', headerColor: '#EF4444', headerBg: 'rgba(239,68,68,0.15)' },
  hot_sunny:    { label: 'Hot & Sunny',  emoji: '☀️', desc: 'High UV and heat. Prioritise light, reflective fabrics.', headerColor: '#FBBF24', headerBg: 'rgba(251,191,36,0.15)' },
  warm_humid:   { label: 'Warm & Humid', emoji: '💦', desc: 'High humidity amplifies heat stress. Prioritise moisture-wicking.', headerColor: '#38BDF8', headerBg: 'rgba(56,189,248,0.15)' },
  warm_cloudy:  { label: 'Warm Cloudy',  emoji: '⛅', desc: 'Cloud cover reduces UV but warmth remains. Light layers work best.', headerColor: '#94A3B8', headerBg: 'rgba(148,163,184,0.15)' },
  rainy:        { label: 'Rainy',        emoji: '🌧️', desc: 'Stay dry and warm. Waterproof outer layers are essential.', headerColor: '#60A5FA', headerBg: 'rgba(96,165,250,0.15)' },
  cold:         { label: 'Cold',         emoji: '🥶', desc: 'Below 10°C. Layer up — base, mid, and shell.', headerColor: '#818CF8', headerBg: 'rgba(129,140,248,0.15)' },
  cool:         { label: 'Cool',         emoji: '🌤️', desc: '15–22°C. Light layering with wind protection as needed.', headerColor: '#34D399', headerBg: 'rgba(52,211,153,0.15)' },
  windy:        { label: 'Windy',        emoji: '💨', desc: 'High wind chill. Block the wind with a windbreaker or softshell.', headerColor: '#A78BFA', headerBg: 'rgba(167,139,250,0.15)' },
  snowy:        { label: 'Snowy',        emoji: '❄️', desc: 'Full cold-weather kit required. UV from snow reflection is very high.', headerColor: '#BAE6FD', headerBg: 'rgba(186,230,253,0.15)' },
  foggy:        { label: 'Foggy',        emoji: '🌫️', desc: 'Low visibility and damp air. Bright/reflective clothing + dry layers.', headerColor: '#CBD5E1', headerBg: 'rgba(203,213,225,0.15)' },
};

function formatTemp(c: number, unit: 'C' | 'F') {
  return unit === 'F' ? `${((c * 9) / 5 + 32).toFixed(0)}°F` : `${c.toFixed(0)}°C`;
}

// ── Color Heat Reflection Data (Subtle & Elegant Theme) ────────────────────────
const COLOR_HEAT_GUIDE = [
  { name: 'White / Pastel', hex: 'rgba(255,255,255,0.18)', textHex: '#FFFFFF', reflectPct: 95, absorbPct: 5, rating: 'BEST', desc: 'Reflects 95% of solar radiation. Reduces heat intake by up to 5°C.' },
  { name: 'Yellow / Light Khaki', hex: 'rgba(255,255,255,0.10)', textHex: '#E4E4E7', reflectPct: 80, absorbPct: 20, rating: 'GOOD', desc: 'High reflection. Great alternative to plain white.' },
  { name: 'Red / Light Blue', hex: 'rgba(255,255,255,0.06)', textHex: '#A1A1AA', reflectPct: 55, absorbPct: 45, rating: 'MODERATE', desc: 'Moderate solar absorption. Okay for short exposures.' },
  { name: 'Black / Dark Navy', hex: 'rgba(0,0,0,0.4)', textHex: '#71717A', reflectPct: 15, absorbPct: 85, rating: 'AVOID', desc: 'Absorbs 85% of solar heat! Increases surface body temperature rapidly.' },
];

export function ClothingRecommendation({
  tempC, uvIndex, tier: _tier, skinType, tempUnit,
  weatherCondition = 'clear', windSpeedKmh = 0, precipMm = 0, humidityPct = 50,
}: ClothingRecommendationProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState<ClothingItem | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  const scenario = classifyScenario(tempC, uvIndex, weatherCondition, windSpeedKmh, precipMm, humidityPct);
  const meta = SCENARIO_META[scenario];
  const condInfo = conditionLabel(weatherCondition);

  const recommended = ALL_ITEMS
    .map((item) => ({ item, score: scoreItem(item, scenario, tempC, uvIndex, skinType) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  const visibleItems = expanded ? recommended : recommended.slice(0, 5);

  const uvLabel = uvIndex < 3 ? 'Low' : uvIndex < 6 ? 'Moderate' : uvIndex < 8 ? 'High' : uvIndex < 11 ? 'Very High' : 'Extreme';
  const burnTime = uvIndex >= 11 ? '<10 min' : uvIndex >= 8 ? '~15 min' : uvIndex >= 6 ? '~25 min' : uvIndex >= 3 ? '~40 min' : '60+ min';

  return (
    <GlassCard>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: meta.headerBg, border: `1px solid ${meta.headerColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {meta.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#E2E8F0', margin: 0 }}>
            Clothing Recommendations
          </h3>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
            {meta.label} conditions · {condInfo.emoji} {condInfo.label}
          </p>
        </div>
        <Shirt size={18} color={meta.headerColor} />
      </div>

      {/* Scenario banner */}
      <div style={{
        padding: '11px 14px', borderRadius: 13,
        background: meta.headerBg,
        border: `1px solid ${meta.headerColor}33`,
        marginBottom: 14, fontSize: 12, color: '#CBD5E1', lineHeight: 1.6,
      }}>
        <strong style={{ color: meta.headerColor }}>{meta.emoji} {meta.label}:</strong> {meta.desc}
        {(scenario === 'hot_sunny' || scenario === 'extreme_heat') && uvIndex >= 3 && (
          <span> Unprotected skin can burn in <strong style={{ color: '#FBBF24' }}>{burnTime}</strong>.</span>
        )}
        {scenario === 'rainy' && (
          <span> Precipitation: <strong style={{ color: '#60A5FA' }}>{precipMm.toFixed(1)} mm</strong>.</span>
        )}
        {scenario === 'windy' && (
          <span> Wind chill: <strong style={{ color: '#A78BFA' }}>{windSpeedKmh} km/h</strong> winds.</span>
        )}
      </div>

      {/* ── Shirt Color Heat Absorption Guide ── */}
      {(tempC >= 26 || scenario === 'hot_sunny' || scenario === 'extreme_heat') && (
        <div style={{
          padding: '14px', borderRadius: 14, marginBottom: 16,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#FFF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            🎨 <span>Shirt Color Heat Reflection Guide</span>
          </div>
          <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12, lineHeight: 1.5 }}>
            Fabric color dramatically changes how much solar heat your body absorbs in direct sun:
          </p>

          {/* Color selector chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
            {COLOR_HEAT_GUIDE.map((c, idx) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedColorIdx(idx)}
                style={{
                  padding: '8px 4px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  background: selectedColorIdx === idx ? 'rgba(255,255,255,0.18)' : c.hex,
                  color: selectedColorIdx === idx ? '#FFFFFF' : c.textHex,
                  border: `1.5px solid ${selectedColorIdx === idx ? '#FFFFFF' : 'rgba(255,255,255,0.12)'}`,
                  fontSize: 10, fontWeight: 800,
                  transition: 'all 0.15s',
                }}
              >
                {c.rating}
              </button>
            ))}
          </div>

          {/* Active color detail card */}
          {(() => {
            const active = COLOR_HEAT_GUIDE[selectedColorIdx];
            return (
              <div style={{
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#FFF' }}>{active.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                  }}>
                    {active.rating}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                  <span style={{ color: '#E4E4E7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sun size={12} color="#FFFFFF" /> Reflects {active.reflectPct}% heat
                  </span>
                  <span style={{ color: '#A1A1AA', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shirt size={12} color="#A1A1AA" /> Absorbs {active.absorbPct}% heat
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>
                  {active.desc}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* Condition chips */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
        <CondChip icon={<Thermometer size={11} color="#FFFFFF" />} label={formatTemp(tempC, tempUnit)} />
        {uvIndex > 0 && <CondChip icon={<Sun size={11} color="#FFFFFF" />} label={`UV ${uvIndex} ${uvLabel}`} />}
        {windSpeedKmh > 5 && <CondChip icon={<Wind size={11} color="#A1A1AA" />} label={`${windSpeedKmh} km/h wind`} />}
        {precipMm > 0 && <CondChip icon={<CloudRain size={11} color="#A1A1AA" />} label={`${precipMm.toFixed(1)} mm rain`} />}
        {humidityPct > 0 && <CondChip icon={<Droplets size={11} color="#FFFFFF" />} label={`${humidityPct}% humidity`} />}
        {skinType && <CondChip icon={<Shirt size={11} color="#A1A1AA" />} label={`Skin Type ${skinType}`} />}
        {scenario === 'snowy' && <CondChip icon={<Snowflake size={11} color="#FFFFFF" />} label="Snow" />}
      </div>

      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence>
          {visibleItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ delay: i * 0.045 }}
            >
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveItem(activeItem?.id === item.id ? null : item)}
                type="button"
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: activeItem?.id === item.id ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${activeItem?.id === item.id ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)'}`,
                  borderRadius: 14, padding: '12px 14px', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#E2E8F0' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{item.material}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    {/* Heat absorption */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: ABSORPTION_DOT[item.heatAbsorption].color }} />
                      <span style={{ fontSize: 9, color: ABSORPTION_DOT[item.heatAbsorption].color, fontWeight: 700 }}>
                        {ABSORPTION_DOT[item.heatAbsorption].label} heat
                      </span>
                    </div>
                    {/* UV protection */}
                    {item.uvProtection !== 'none' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Sun size={7} color={UV_PROT_BADGE[item.uvProtection].color} />
                        <span style={{ fontSize: 9, color: UV_PROT_BADGE[item.uvProtection].color, fontWeight: 700 }}>
                          {UV_PROT_BADGE[item.uvProtection].label}
                        </span>
                      </div>
                    )}
                    {/* Special badges */}
                    {item.rainproof && (
                      <span style={{ fontSize: 9, color: '#60A5FA', fontWeight: 700 }}>💧 Waterproof</span>
                    )}
                    {item.windproof && (
                      <span style={{ fontSize: 9, color: '#A78BFA', fontWeight: 700 }}>💨 Windproof</span>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {activeItem?.id === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <p style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.65, marginBottom: 8 }}>
                          {item.description}
                        </p>
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: 6,
                          background: `${meta.headerColor}11`, borderRadius: 10, padding: '8px 12px',
                        }}>
                          <span style={{ fontSize: 14 }}>💡</span>
                          <p style={{ fontSize: 11, color: meta.headerColor, fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                            {item.tip}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more / less */}
      {recommended.length > 5 && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setExpanded(!expanded)}
          type="button"
          style={{
            width: '100%', marginTop: 10, padding: '10px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94A3B8', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {expanded ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Show All {recommended.length} Recommended Items</>}
        </motion.button>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Heat Absorption</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(ABSORPTION_DOT).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.color }} />
                <span style={{ fontSize: 9, color: '#52525B' }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function CondChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: 700, color: '#E2E8F0' }}>{label}</span>
    </div>
  );
}
