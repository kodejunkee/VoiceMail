/**
 * High-contrast color palette for accessibility
 *
 * Designed for visually impaired users:
 * - High contrast ratios (WCAG AAA where possible)
 * - Dark background to reduce glare
 * - Vibrant primary colors for interactive elements
 */

export const Colors = {
  // ─── Backgrounds ─────────────────────────────────────
  background: '#000000',       // Pure black — main background
  surface: '#161616',          // Slightly lighter — cards/surfaces
  surfaceElevated: '#1E1E1E',  // Elevated elements — modals, overlays

  // ─── Primary ─────────────────────────────────────────
  primary: '#FFD600',          // Vivid yellow — buttons, active states
  primaryDark: '#E6C100',      // Pressed state
  primaryLight: '#FFEB3B',     // Highlights

  // ─── Accent / Status ─────────────────────────────────
  accent: '#00E676',           // Bright green — success, active listening
  accentDark: '#00C853',       // Pressed success
  warning: '#FFB74D',          // Orange — warnings
  error: '#FF5252',            // Red — errors
  errorDark: '#D32F2F',        // Pressed error

  // ─── Text ────────────────────────────────────────────
  text: '#FFFFFF',             // Primary text — pure white
  textSecondary: '#E0E0E0',    // Secondary text — light gray
  textMuted: '#9E9E9E',        // Muted/disabled text
  textOnPrimary: '#000000',    // Text on yellow buttons — black for contrast

  // ─── Borders ─────────────────────────────────────────
  border: '#2A2A2A',           // Subtle borders
  borderFocused: '#FFD600',    // Focused input borders — yellow

  // ─── Voice States ────────────────────────────────────
  listening: '#00E676',        // Green pulse — actively listening
  processing: '#FFB74D',       // Orange — processing speech
  speaking: '#FFD600',         // Yellow — TTS speaking
  idle: '#9E9E9E',             // Gray — idle state
} as const;

export type ColorKey = keyof typeof Colors;
