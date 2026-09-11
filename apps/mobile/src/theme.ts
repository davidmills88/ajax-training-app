export const colors = {
  bg: "#16120E",
  surface: "#241E18",
  surfaceRaised: "#2E2720",
  text: "#F6F1E8",
  muted: "#B7A898",
  accent: "#C4A574",
  accentDim: "#8C7348",
  border: "#3C342C",
  danger: "#D27A6A",
  success: "#8FBF8A",
};

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
};

export const type = {
  kicker: { fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" as const, color: colors.accent },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
  muted: { fontSize: 15, lineHeight: 22, color: colors.muted },
};
