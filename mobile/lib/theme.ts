/**
 * VoxGuard design tokens — matches the web frontend's oklch color palette.
 *
 * oklch → approximate sRGB conversions done manually to keep the feel identical.
 */

export const Colors = {
  // Backgrounds
  background: "#dfe8d3",         // oklch(0.93 0.03 125)
  card: "#d8e1cc",               // oklch(0.9 0.035 125)
  secondary: "#ccd6c0",          // oklch(0.86 0.03 130)
  muted: "#ccd4be",              // oklch(0.86 0.028 130)
  accent: "#c2d0b4",             // oklch(0.82 0.045 135)
  border: "#b8c8aa",             // oklch(0.8 0.03 130)
  input: "#c4d2b6",              // oklch(0.84 0.03 130)
  sidebar: "#d5dfc9",            // oklch(0.9 0.03 125)

  // Foregrounds / text
  foreground: "#2e4a35",         // oklch(0.32 0.05 150)
  cardForeground: "#2e4a35",
  secondaryForeground: "#2e4838", // oklch(0.35 0.06 150)
  mutedForeground: "#5a7a62",    // oklch(0.52 0.035 145)
  accentForeground: "#2e4838",

  // Primary (deep forest green)
  primary: "#3a6645",            // oklch(0.42 0.06 150)
  primaryForeground: "#f3f7ee",  // oklch(0.96 0.015 120)

  // Destructive (red)
  destructive: "#a83020",        // oklch(0.55 0.2 25)
  destructiveForeground: "#faf8f0", // oklch(0.97 0.01 90)

  // Risk levels
  riskLow: "#4a7c5a",           // oklch(0.5 0.09 150)
  riskMedium: "#b5830a",        // oklch(0.6 0.13 90)
  riskHigh: "#c7581a",          // oklch(0.56 0.18 45)
  riskCritical: "#c23020",      // oklch(0.52 0.21 22)

  // Surface glow (approximated as a top-edge tint for RN)
  surfaceGlowTint: "#c8dab4",

  // Transparent helpers
  transparent: "transparent",
  white: "#ffffff",
  black: "#000000",
} as const;

export type Color = keyof typeof Colors;

export const Typography = {
  displayFamily: "SpaceGrotesk_700Bold",
  displayFamilyMedium: "SpaceGrotesk_500Medium",
  sansFamily: "DMSans_400Regular",
  sansFamilyMedium: "DMSans_500Medium",
  sansFamilySemiBold: "DMSans_700Bold",
  monoFamily: "JetBrainsMono_400Regular",
  monoFamilySemiBold: "JetBrainsMono_600SemiBold",
} as const;

export const Radius = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: "#2e4a35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: "#2e4a35",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
