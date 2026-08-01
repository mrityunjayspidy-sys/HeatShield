// Glass design tokens — Black & White Monochrome Edition
// 3 elevation levels: ambient (bg blobs) → mid (cards) → hero (score gauge)

export const GLASS = {
  // Card fills
  light: 'rgba(255, 255, 255, 0.10)',
  dark:  'rgba(12, 12, 12, 0.65)',

  // Borders
  borderLight: 'rgba(255, 255, 255, 0.30)',
  borderDark:  'rgba(255, 255, 255, 0.18)',

  // Blur
  blur: {
    base: 'blur(20px) saturate(180%)',
    hero: 'blur(28px) saturate(200%)',
    reduced: 'blur(8px)',
  },

  // Shadows by elevation
  shadow: {
    mid:  '0 8px 32px rgba(0,0,0,0.6)',
    hero: '0 16px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.3)',
  },

  // Border radius
  radius: {
    card:  '24px',
    chip:  '16px',
    pill:  '999px',
    gauge: '50%',
  },
} as const;

// Tier-driven ambient background gradients (Black & White monochrome)
export const TIER_BG_GRADIENTS = {
  safe:    'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(160,160,160,0.06), transparent 60%)',
  watch:   'radial-gradient(ellipse at 30% 20%, rgba(220,220,220,0.14), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(140,140,140,0.08), transparent 60%)',
  warning: 'radial-gradient(ellipse at 30% 20%, rgba(180,180,180,0.18), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(120,120,120,0.10), transparent 60%)',
  danger:  'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(100,100,100,0.15), transparent 60%)',
} as const;
