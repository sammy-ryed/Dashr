export interface ThemePreferences {
  presetId: string;
  bgColor: string;
  boxColor: string;
  accentColor: string;
  headerBgColor: string;
  hamburgerBgColor: string;
}

export interface ThemePreset {
  id: string;
  label: string;
  bgColor: string;
  boxColor: string;
  accentColor: string;
  headerBgColor: string;
  hamburgerBgColor: string;
}

const STORAGE_KEY = 'dashr_theme_preferences_v1';
export const THEME_STORAGE_KEY = STORAGE_KEY;

export const THEME_PRESETS: ThemePreset[] = [
  // ── DARK ──────────────────────────────────────────────────────
  {
    id: 'classic',
    label: 'Classic',
    bgColor: '#0f0f0f',
    boxColor: '#1a1a1a',
    accentColor: '#e9b50b',
    headerBgColor: '#0f0f0f',
    hamburgerBgColor: '#0f0f0f',
  },
  {
    id: 'void-red',
    label: 'Void Red',
    bgColor: '#0a0505',
    boxColor: '#1a0a0a',
    accentColor: '#ef233c',
    headerBgColor: '#0a0505',
    hamburgerBgColor: '#110808',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    bgColor: '#0f1020',
    boxColor: '#1d2240',
    accentColor: '#67e8f9',
    headerBgColor: '#0d1020',
    hamburgerBgColor: '#0d1020',
  },
  {
    id: 'forest-night',
    label: 'Forest Night',
    bgColor: '#0d110d',
    boxColor: '#131a13',
    accentColor: '#a3e635',
    headerBgColor: '#0d110d',
    hamburgerBgColor: '#0d110d',
  },
  {
    id: 'deep-purple',
    label: 'Deep Purple',
    bgColor: '#110d1a',
    boxColor: '#1e1428',
    accentColor: '#c084fc',
    headerBgColor: '#110d1a',
    hamburgerBgColor: '#110d1a',
  },
  {
    id: 'molten',
    label: 'Molten',
    bgColor: '#0e0800',
    boxColor: '#1c1100',
    accentColor: '#fb923c',
    headerBgColor: '#0e0800',
    hamburgerBgColor: '#0e0800',
  },
  {
    id: 'abyss',
    label: 'Abyss',
    // Monochromatic near-black + electric blue — pure depth
    bgColor: '#040810',
    boxColor: '#0a1120',
    accentColor: '#3b82f6',
    headerBgColor: '#040810',
    hamburgerBgColor: '#040810',
  },
  {
    id: 'carbon',
    label: 'Carbon',
    // Neutral charcoal + vivid cyan-white — industrial minimal
    bgColor: '#111214',
    boxColor: '#1c1e22',
    accentColor: '#e2e8f0',
    headerBgColor: '#111214',
    hamburgerBgColor: '#111214',
  },
  {
    id: 'rose-noir',
    label: 'Rose Noir',
    // Dark moody base + dusty rose — split-complementary warmth
    bgColor: '#0e0a0b',
    boxColor: '#1a1214',
    accentColor: '#fb7185',
    headerBgColor: '#0e0a0b',
    hamburgerBgColor: '#0e0a0b',
  },
  {
    id: 'copper',
    label: 'Copper',
    // Dark graphite + warm copper — analogous amber tones
    bgColor: '#100c09',
    boxColor: '#1e1510',
    accentColor: '#d97706',
    headerBgColor: '#100c09',
    hamburgerBgColor: '#100c09',
  },
  // ── LIGHT ─────────────────────────────────────────────────────
  {
    id: 'paper',
    label: 'Paper',
    bgColor: '#f5f0e8',
    boxColor: '#ebe4d5',
    accentColor: '#1a1a1a',
    headerBgColor: '#ede7d8',
    hamburgerBgColor: '#ede7d8',
  },
  {
    id: 'purple-pop',
    label: 'Purple Pop',
    bgColor: '#f6f2ea',
    boxColor: '#efe8ff',
    accentColor: '#7b2cbf',
    headerBgColor: '#f1ece2',
    hamburgerBgColor: '#f1ece2',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    bgColor: '#fff3e6',
    boxColor: '#ffe4cc',
    accentColor: '#ea580c',
    headerBgColor: '#ffefdd',
    hamburgerBgColor: '#ffefdd',
  },
  {
    id: 'mint',
    label: 'Mint',
    bgColor: '#effcf7',
    boxColor: '#d8fff1',
    accentColor: '#0f766e',
    headerBgColor: '#e6f7f0',
    hamburgerBgColor: '#e6f7f0',
  },
  {
    id: 'slate',
    label: 'Slate',
    // Cool blue-grey bg + deep navy — monochromatic cool, calm authority
    bgColor: '#f0f4f8',
    boxColor: '#dde6f0',
    accentColor: '#1e3a5f',
    headerBgColor: '#e8eef5',
    hamburgerBgColor: '#e8eef5',
  },
];


export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  presetId: THEME_PRESETS[0].id,
  bgColor: THEME_PRESETS[0].bgColor,
  boxColor: THEME_PRESETS[0].boxColor,
  accentColor: THEME_PRESETS[0].accentColor,
  headerBgColor: THEME_PRESETS[0].headerBgColor,
  hamburgerBgColor: THEME_PRESETS[0].hamburgerBgColor,
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return HEX_PATTERN.test(value) ? value : fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHexPart(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`;
}

function mixHex(colorA: string, colorB: string, ratio: number): string {
  const left = hexToRgb(colorA);
  const right = hexToRgb(colorB);
  const mix = (a: number, b: number) => Math.round(a * (1 - ratio) + b * ratio);

  return rgbToHex(mix(left.r, right.r), mix(left.g, right.g), mix(left.b, right.b));
}

function channelToLinear(value: number): number {
  const normalized = value / 255;
  if (normalized <= 0.03928) return normalized / 12.92;
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function getContrastTextColor(bgHex: string): '#f0f0f0' | '#000000' {
  const { r, g, b } = hexToRgb(bgHex);
  const luminance =
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b);

  return luminance > 0.45 ? '#000000' : '#f0f0f0';
}

function resolvePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

export function normalizeThemePreferences(input: Partial<ThemePreferences>): ThemePreferences {
  const fallbackPreset = resolvePreset(input.presetId || '') || THEME_PRESETS[0];

  const bgColor = sanitizeHex(input.bgColor, fallbackPreset.bgColor);
  const boxColor = sanitizeHex(input.boxColor, fallbackPreset.boxColor);

  return {
    presetId: input.presetId || fallbackPreset.id,
    bgColor,
    boxColor,
    accentColor: sanitizeHex(input.accentColor, fallbackPreset.accentColor),
    headerBgColor: sanitizeHex(input.headerBgColor, fallbackPreset.headerBgColor || bgColor),
    hamburgerBgColor: sanitizeHex(input.hamburgerBgColor, fallbackPreset.hamburgerBgColor || boxColor),
  };
}

export function loadThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') return DEFAULT_THEME_PREFERENCES;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }

  if (!raw) return DEFAULT_THEME_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as Partial<ThemePreferences>;
    return normalizeThemePreferences(parsed);
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }
}

export function saveThemePreferences(prefs: ThemePreferences) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeThemePreferences(prefs);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function clearThemePreferences() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function applyThemePreferences(prefs: ThemePreferences) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const textColor = getContrastTextColor(prefs.bgColor);
  const accentTextColor = getContrastTextColor(prefs.accentColor);
  const boxColor2 = mixHex(prefs.boxColor, prefs.bgColor, 0.28);
  const muted = mixHex(textColor, prefs.bgColor, 0.45);
  const accentDark = mixHex(prefs.accentColor, '#000000', 0.25);
  const headerBgHover = mixHex(prefs.headerBgColor, textColor, 0.08);

  root.style.setProperty('--bg', prefs.bgColor);
  root.style.setProperty('--surf', prefs.boxColor);
  root.style.setProperty('--surf2', boxColor2);
  root.style.setProperty('--yellow', prefs.accentColor);
  root.style.setProperty('--yellow-d', accentDark);
  root.style.setProperty('--white', textColor);
  root.style.setProperty('--ink', accentTextColor);
  root.style.setProperty('--muted', muted);
  root.style.setProperty('--header-bg', prefs.headerBgColor);
  root.style.setProperty('--header-bg-hover', headerBgHover);
  root.style.setProperty('--hamburger-bg', prefs.hamburgerBgColor);
  root.style.setProperty('color-scheme', textColor === '#000000' ? 'light' : 'dark');

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', prefs.bgColor);
  }
}

export function applyStoredThemePreferences() {
  const prefs = loadThemePreferences();
  applyThemePreferences(prefs);
  return prefs;
}

export function getThemePresetById(id: string): ThemePreset {
  return resolvePreset(id) || THEME_PRESETS[0];
}

export function getThemeBootstrapScript(): string {
  return `(() => {
    try {
      const key = ${JSON.stringify(STORAGE_KEY)};
      const defaults = ${JSON.stringify(DEFAULT_THEME_PREFERENCES)};
      const hexPattern = /^#[0-9a-fA-F]{6}$/;

      const sanitizeHex = (value, fallback) => {
        if (typeof value !== 'string') return fallback;
        return hexPattern.test(value) ? value : fallback;
      };

      const hexToRgb = (hex) => {
        const normalized = hex.replace('#', '');
        return {
          r: Number.parseInt(normalized.slice(0, 2), 16),
          g: Number.parseInt(normalized.slice(2, 4), 16),
          b: Number.parseInt(normalized.slice(4, 6), 16),
        };
      };

      const toHexPart = (value) => value.toString(16).padStart(2, '0');

      const rgbToHex = (r, g, b) => '#'+toHexPart(r)+toHexPart(g)+toHexPart(b);

      const mixHex = (colorA, colorB, ratio) => {
        const left = hexToRgb(colorA);
        const right = hexToRgb(colorB);
        const mix = (a, b) => Math.round(a * (1 - ratio) + b * ratio);

        return rgbToHex(
          mix(left.r, right.r),
          mix(left.g, right.g),
          mix(left.b, right.b)
        );
      };

      const channelToLinear = (value) => {
        const normalized = value / 255;
        if (normalized <= 0.03928) return normalized / 12.92;
        return ((normalized + 0.055) / 1.055) ** 2.4;
      };

      const getContrastTextColor = (bgHex) => {
        const { r, g, b } = hexToRgb(bgHex);
        const luminance =
          0.2126 * channelToLinear(r) +
          0.7152 * channelToLinear(g) +
          0.0722 * channelToLinear(b);

        return luminance > 0.45 ? '#000000' : '#f0f0f0';
      };

      let stored = null;
      try {
        const raw = window.localStorage.getItem(key);
        stored = raw ? JSON.parse(raw) : null;
      } catch {
        stored = null;
      }

      const bgColor = sanitizeHex(stored?.bgColor, defaults.bgColor);
      const boxColor = sanitizeHex(stored?.boxColor, defaults.boxColor);
      const accentColor = sanitizeHex(stored?.accentColor, defaults.accentColor);
      const headerBgColor = sanitizeHex(stored?.headerBgColor, defaults.headerBgColor);
      const hamburgerBgColor = sanitizeHex(stored?.hamburgerBgColor, defaults.hamburgerBgColor);

      const textColor = getContrastTextColor(bgColor);
      const accentTextColor = getContrastTextColor(accentColor);
      const boxColor2 = mixHex(boxColor, bgColor, 0.28);
      const muted = mixHex(textColor, bgColor, 0.45);
      const accentDark = mixHex(accentColor, '#000000', 0.25);
      const headerBgHover = mixHex(headerBgColor, textColor, 0.08);

      const root = document.documentElement;
      root.style.setProperty('--bg', bgColor);
      root.style.setProperty('--surf', boxColor);
      root.style.setProperty('--surf2', boxColor2);
      root.style.setProperty('--yellow', accentColor);
      root.style.setProperty('--yellow-d', accentDark);
      root.style.setProperty('--white', textColor);
      root.style.setProperty('--ink', accentTextColor);
      root.style.setProperty('--muted', muted);
      root.style.setProperty('--header-bg', headerBgColor);
      root.style.setProperty('--header-bg-hover', headerBgHover);
      root.style.setProperty('--hamburger-bg', hamburgerBgColor);
      root.style.setProperty('color-scheme', textColor === '#000000' ? 'light' : 'dark');
    } catch {
      // Swallow errors to avoid blocking render.
    }
  })();`;
}
