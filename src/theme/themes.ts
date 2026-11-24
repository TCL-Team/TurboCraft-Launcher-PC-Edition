import { ThemeId } from '../types/launcher';

export interface ThemeTokens {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  surface: string;
  surfaceBright: string;
  surfaceContainer: string;
  surfaceVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
}

/**
 * Exact Material-3 Expressive Color Palettes ported 1:1 from
 * `TCL-Team/TurboCraft-Launcher` -> `ui/theme/Color.kt`
 */
export const OFFICIAL_THEMES: Record<
  Exclude<ThemeId, 'CUSTOM'>,
  { label: string; swatch: string; dark: ThemeTokens; light: ThemeTokens }
> = {
  VERDANT_DAWN: {
    label: 'Verdant Dawn (TurboCraft)',
    swatch: '#8BE51B',
    dark: {
      primary: '#8ED88E',
      onPrimary: '#00390F',
      primaryContainer: '#005219',
      onPrimaryContainer: '#A6F2A5',
      secondary: '#B0CFAB',
      surface: '#101410',
      surfaceBright: '#242C24',
      surfaceContainer: '#181D18',
      surfaceVariant: '#40493E',
      onSurface: '#E0E4DB',
      onSurfaceVariant: '#C0C9BB',
      outline: '#8A9386',
    },
    light: {
      primary: '#004814',
      onPrimary: '#FFFFFF',
      primaryContainer: '#276E31',
      onPrimaryContainer: '#FFFFFF',
      secondary: '#4A6548',
      surface: '#F7FBF2',
      surfaceBright: '#FFFFFF',
      surfaceContainer: '#ECEFE6',
      surfaceVariant: '#DCE5D7',
      onSurface: '#181D18',
      onSurfaceVariant: '#40493E',
      outline: '#707A6D',
    },
  },
  EMBERMIRE: {
    label: 'Embermire',
    swatch: '#FE7A52',
    dark: {
      primary: '#FFB59F',
      onPrimary: '#5F1600',
      primaryContainer: '#C4502B',
      onPrimaryContainer: '#FFFFFF',
      secondary: '#FFB59F',
      surface: '#1C110E',
      surfaceBright: '#362622',
      surfaceContainer: '#241916',
      surfaceVariant: '#58423B',
      onSurface: '#F4DED8',
      onSurfaceVariant: '#DFC0B7',
      outline: '#A68B83',
    },
    light: {
      primary: '#A63A17',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FE7A52',
      onPrimaryContainer: '#2F0700',
      secondary: '#894F3D',
      surface: '#FFF8F6',
      surfaceBright: '#FFFFFF',
      surfaceContainer: '#FFE9E4',
      surfaceVariant: '#FCDBD3',
      onSurface: '#241916',
      onSurfaceVariant: '#58423B',
      outline: '#8B716A',
    },
  },
  VELVET_ROSE: {
    label: 'Velvet Rose',
    swatch: '#F9B2D2',
    dark: {
      primary: '#F9B2D2',
      onPrimary: '#4F2039',
      primaryContainer: '#915873',
      onPrimaryContainer: '#FFFFFF',
      secondary: '#E0BDCB',
      surface: '#171214',
      surfaceBright: '#31282C',
      surfaceContainer: '#1F1A1C',
      surfaceVariant: '#504348',
      onSurface: '#EBE0E2',
      onSurfaceVariant: '#D4C2C8',
      outline: '#9D8C92',
    },
    light: {
      primary: '#723D57',
      onPrimary: '#FFFFFF',
      primaryContainer: '#9B607C',
      onPrimaryContainer: '#FFFFFF',
      secondary: '#725762',
      surface: '#FFF8F8',
      surfaceBright: '#FFFFFF',
      surfaceContainer: '#F7EBED',
      surfaceVariant: '#F1DEE4',
      onSurface: '#1F1A1C',
      onSurfaceVariant: '#504348',
      outline: '#827378',
    },
  },
  MISTWAVE: {
    label: 'Mistwave',
    swatch: '#CEF3F9',
    dark: {
      primary: '#CEF3F9',
      onPrimary: '#11353A',
      primaryContainer: '#2C4E54',
      onPrimaryContainer: '#CEF3F9',
      secondary: '#BBC9CB',
      surface: '#121414',
      surfaceBright: '#292D2E',
      surfaceContainer: '#1A1C1C',
      surfaceVariant: '#414849',
      onSurface: '#E3E2E2',
      onSurfaceVariant: '#C1C8C9',
      outline: '#8B9293',
    },
    light: {
      primary: '#426469',
      onPrimary: '#FFFFFF',
      primaryContainer: '#B1D5DB',
      onPrimaryContainer: '#1E4146',
      secondary: '#546163',
      surface: '#FAF9F9',
      surfaceBright: '#FFFFFF',
      surfaceContainer: '#EEEEEE',
      surfaceVariant: '#DDE4E5',
      onSurface: '#1A1C1C',
      onSurfaceVariant: '#414849',
      outline: '#71787A',
    },
  },
  GLACIER: {
    label: 'Glacier',
    swatch: '#73D2FB',
    dark: {
      primary: '#73D2FB',
      onPrimary: '#003546',
      primaryContainer: '#007EA2',
      onPrimaryContainer: '#FFFFFF',
      secondary: '#AACBDD',
      surface: '#101416',
      surfaceBright: '#262E32',
      surfaceContainer: '#181C1F',
      surfaceVariant: '#3E484E',
      onSurface: '#DFE3E6',
      onSurfaceVariant: '#BEC8CE',
      outline: '#889298',
    },
    light: {
      primary: '#006684',
      onPrimary: '#FFFFFF',
      primaryContainer: '#4CAFD6',
      onPrimaryContainer: '#001B26',
      secondary: '#426372',
      surface: '#F6FAFD',
      surfaceBright: '#FFFFFF',
      surfaceContainer: '#EBEEF1',
      surfaceVariant: '#DAE4EA',
      onSurface: '#181C1F',
      onSurfaceVariant: '#3E484E',
      outline: '#6E797E',
    },
  },
  VERDANTFIELD: {
    label: 'VerdantField',
    swatch: '#D2C972',
    dark: {
      primary: '#D2C972',
      onPrimary: '#353100',
      primaryContainer: '#4E4800',
      onPrimaryContainer: '#EFE58B',
      secondary: '#CDC7A3',
      surface: '#15140C',
      surfaceBright: '#2E2C21',
      surfaceContainer: '#1D1C14',
      surfaceVariant: '#49473A',
      onSurface: '#E7E2D5',
      onSurfaceVariant: '#CBC7B5',
      outline: '#949181',
    },
    light: {
      primary: '#676014',
      onPrimary: '#FFFFFF',
      primaryContainer: '#EFE58B',
      onPrimaryContainer: '#1F1C00',
      secondary: '#635F41',
      surface: '#FEF9EB',
      surfaceBright: '#FFFFFF',
      surfaceContainer: '#F2EEE0',
      surfaceVariant: '#E7E3D0',
      onSurface: '#1D1C14',
      onSurfaceVariant: '#49473A',
      outline: '#7A7768',
    },
  },
  URBAN_ASH: {
    label: 'Urban Ash',
    swatch: '#C7C6C6',
    dark: {
      primary: '#C7C6C6',
      onPrimary: '#2F3131',
      primaryContainer: '#4A4B4B',
      onPrimaryContainer: '#F2F2F2',
      secondary: '#C8C6C6',
      surface: '#141313',
      surfaceBright: '#2B2A2A',
      surfaceContainer: '#1C1B1B',
      surfaceVariant: '#444748',
      onSurface: '#E5E2E1',
      onSurfaceVariant: '#C4C7C7',
      outline: '#8E9192',
    },
    light: {
      primary: '#5E5E5F',
      onPrimary: '#FFFFFF',
      primaryContainer: '#AEAEAE',
      onPrimaryContainer: '#222324',
      secondary: '#5F5E5E',
      surface: '#FCF8F8',
      surfaceBright: '#FFFFFF',
      surfaceContainer: '#F1EDEC',
      surfaceVariant: '#E0E3E3',
      onSurface: '#1C1B1B',
      onSurfaceVariant: '#444748',
      outline: '#747878',
    },
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  if (Number.isNaN(num)) return [139, 229, 27];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function buildCustomTheme(hex: string, darkMode: boolean): ThemeTokens {
  const [r, g, b] = hexToRgb(hex);
  const mix = (tr: number, tg: number, tb: number, weight: number) => {
    const nr = Math.round(r * (1 - weight) + tr * weight);
    const ng = Math.round(g * (1 - weight) + tg * weight);
    const nb = Math.round(b * (1 - weight) + tb * weight);
    return `rgb(${nr}, ${ng}, ${nb})`;
  };

  if (darkMode) {
    return {
      primary: mix(255, 255, 255, 0.2),
      onPrimary: '#0B1208',
      primaryContainer: mix(0, 0, 0, 0.45),
      onPrimaryContainer: '#FFFFFF',
      secondary: mix(200, 210, 200, 0.4),
      surface: '#111412',
      surfaceBright: '#242A26',
      surfaceContainer: '#181D19',
      surfaceVariant: '#3B433D',
      onSurface: '#E5EAE3',
      onSurfaceVariant: '#C1C9BE',
      outline: '#899287',
    };
  }
  return {
    primary: mix(0, 0, 0, 0.25),
    onPrimary: '#FFFFFF',
    primaryContainer: mix(255, 255, 255, 0.55),
    onPrimaryContainer: '#11170E',
    secondary: mix(80, 90, 80, 0.45),
    surface: '#F6FAF4',
    surfaceBright: '#FFFFFF',
    surfaceContainer: '#EAEFE8',
    surfaceVariant: '#DBE3D8',
    onSurface: '#181D18',
    onSurfaceVariant: '#414940',
    outline: '#717970',
  };
}

export function applyThemeCssVars(params: {
  theme: ThemeId;
  customHex: string;
  darkMode: boolean;
  opacity: number;
  blur: number;
}) {
  const tokens =
    params.theme === 'CUSTOM'
      ? buildCustomTheme(params.customHex, params.darkMode)
      : OFFICIAL_THEMES[params.theme][params.darkMode ? 'dark' : 'light'];

  const root = document.documentElement;
  root.style.setProperty('--primary', tokens.primary);
  root.style.setProperty('--on-primary', tokens.onPrimary);
  root.style.setProperty('--primary-container', tokens.primaryContainer);
  root.style.setProperty('--on-primary-container', tokens.onPrimaryContainer);
  root.style.setProperty('--secondary', tokens.secondary);
  root.style.setProperty('--surface', tokens.surface);
  root.style.setProperty('--surface-bright', tokens.surfaceBright);
  root.style.setProperty('--surface-container', tokens.surfaceContainer);
  root.style.setProperty('--surface-variant', tokens.surfaceVariant);
  root.style.setProperty('--on-surface', tokens.onSurface);
  root.style.setProperty('--on-surface-variant', tokens.onSurfaceVariant);
  root.style.setProperty('--outline', tokens.outline);

  // Convert surfaceBright / surfaceContainer with dynamic opacity so background video shines through!
  const cardAlpha = Math.max(0.32, Math.min(0.95, 0.42 + (params.opacity / 100) * 0.52));
  const shellAlpha = Math.max(0.12, Math.min(0.96, params.opacity / 100));
  root.style.setProperty('--card-alpha', cardAlpha.toFixed(2));
  root.style.setProperty('--shell-alpha', shellAlpha.toFixed(2));
  root.style.setProperty('--glass-blur', `${params.blur}px`);
}
