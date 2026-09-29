export const COLORS = Object.freeze({
  // Indigo rather than a plain blue: deep enough to carry a filled header
  // without the washed-out look the lighter blue had on cheap LCD panels.
  primary: '#4338CA',
  primaryDark: '#3730A3',
  primaryLight: '#E0E7FF',
  // Warm counterweight to the indigo, for the one thing on a screen that
  // wants the eye — a highlighted figure, a badge, the brand mark. Never
  // used for success or danger, which own their own colours.
  accent: '#F59E0B',
  accentDark: '#B45309',
  accentLight: '#FEF3C7',
  // green-700: the lighter green failed contrast on white wherever it
  // carried money information.
  success: '#15803D',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#D97706',
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textLight: '#64748B',
  // slate-500: #94A3B8 was 2.6:1 on white — below the 4.5:1 readable floor.
  textMuted: '#64748B',
  disabled: '#CBD5E1',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.9)',
});

export const SPACING = Object.freeze({
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
});

export const RADIUS = Object.freeze({
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
});

export const FONT_SIZES = Object.freeze({
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
});
