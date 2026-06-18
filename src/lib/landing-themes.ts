export interface ThemeOption {
  id: string;
  label: string;
  primary: string;
  primaryFg: string;
  ring: string;
  heroBg: string;
  sectionTint: string;
  footerBg: string;
  footerFg: string;
  swatch: string;
}

export const THEME_COLORS: ThemeOption[] = [
  {
    id: "green",
    label: "Hijau",
    primary: "oklch(0.52 0.17 145)",
    primaryFg: "oklch(0.99 0.01 150)",
    ring: "oklch(0.52 0.17 145)",
    heroBg: "linear-gradient(135deg, oklch(0.97 0.03 150), oklch(0.99 0.01 90) 60%)",
    sectionTint: "oklch(0.96 0.025 150)",
    footerBg: "oklch(0.22 0.03 150)",
    footerFg: "oklch(0.92 0.01 150)",
    swatch: "#16a34a",
  },
  {
    id: "emerald",
    label: "Hijau Tosca",
    primary: "oklch(0.55 0.15 170)",
    primaryFg: "oklch(0.99 0.01 150)",
    ring: "oklch(0.55 0.15 170)",
    heroBg: "linear-gradient(135deg, oklch(0.97 0.03 175), oklch(0.99 0.01 90) 60%)",
    sectionTint: "oklch(0.96 0.025 175)",
    footerBg: "oklch(0.20 0.03 175)",
    footerFg: "oklch(0.92 0.01 175)",
    swatch: "#059669",
  },
  {
    id: "blue",
    label: "Biru",
    primary: "oklch(0.55 0.22 260)",
    primaryFg: "oklch(0.99 0.005 260)",
    ring: "oklch(0.55 0.22 260)",
    heroBg: "linear-gradient(135deg, oklch(0.96 0.03 255), oklch(0.99 0.01 290) 60%)",
    sectionTint: "oklch(0.96 0.025 255)",
    footerBg: "oklch(0.20 0.04 255)",
    footerFg: "oklch(0.92 0.01 255)",
    swatch: "#2563eb",
  },
  {
    id: "sky",
    label: "Biru Langit",
    primary: "oklch(0.58 0.18 230)",
    primaryFg: "oklch(0.99 0.005 230)",
    ring: "oklch(0.58 0.18 230)",
    heroBg: "linear-gradient(135deg, oklch(0.96 0.03 225), oklch(0.99 0.01 250) 60%)",
    sectionTint: "oklch(0.96 0.025 225)",
    footerBg: "oklch(0.20 0.04 225)",
    footerFg: "oklch(0.92 0.01 225)",
    swatch: "#0284c7",
  },
  {
    id: "amber",
    label: "Kuning Madu",
    primary: "oklch(0.70 0.18 75)",
    primaryFg: "oklch(0.15 0.02 75)",
    ring: "oklch(0.70 0.18 75)",
    heroBg: "linear-gradient(135deg, oklch(0.97 0.04 85), oklch(0.99 0.015 60) 60%)",
    sectionTint: "oklch(0.96 0.035 80)",
    footerBg: "oklch(0.22 0.03 70)",
    footerFg: "oklch(0.93 0.02 75)",
    swatch: "#d97706",
  },
  {
    id: "orange",
    label: "Oranye",
    primary: "oklch(0.65 0.20 50)",
    primaryFg: "oklch(0.99 0.01 50)",
    ring: "oklch(0.65 0.20 50)",
    heroBg: "linear-gradient(135deg, oklch(0.97 0.04 55), oklch(0.99 0.015 70) 60%)",
    sectionTint: "oklch(0.96 0.035 55)",
    footerBg: "oklch(0.22 0.03 45)",
    footerFg: "oklch(0.93 0.02 50)",
    swatch: "#ea580c",
  },
  {
    id: "rose",
    label: "Merah Muda",
    primary: "oklch(0.58 0.22 10)",
    primaryFg: "oklch(0.99 0.01 10)",
    ring: "oklch(0.58 0.22 10)",
    heroBg: "linear-gradient(135deg, oklch(0.96 0.03 15), oklch(0.99 0.01 350) 60%)",
    sectionTint: "oklch(0.96 0.025 15)",
    footerBg: "oklch(0.20 0.04 15)",
    footerFg: "oklch(0.92 0.01 15)",
    swatch: "#e11d48",
  },
  {
    id: "violet",
    label: "Ungu",
    primary: "oklch(0.55 0.22 295)",
    primaryFg: "oklch(0.99 0.01 295)",
    ring: "oklch(0.55 0.22 295)",
    heroBg: "linear-gradient(135deg, oklch(0.96 0.03 290), oklch(0.99 0.01 320) 60%)",
    sectionTint: "oklch(0.96 0.025 290)",
    footerBg: "oklch(0.20 0.04 290)",
    footerFg: "oklch(0.92 0.01 290)",
    swatch: "#7c3aed",
  },
];

export function getThemeColor(id: string | null | undefined): ThemeOption {
  return THEME_COLORS.find((t) => t.id === id) ?? THEME_COLORS[0];
}