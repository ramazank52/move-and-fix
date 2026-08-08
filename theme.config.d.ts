export const themeColors: {
  primary: { light: string; dark: string };
  primaryLight: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  cardElevated: { light: string; dark: string };
  foreground: { light: string; dark: string };
  muted: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
  accentBlue: { light: string; dark: string };
  accentPurple: { light: string; dark: string };
  accentGreen: { light: string; dark: string };
  gradientOrange: { light: string; dark: string };
  gradientRed: { light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
