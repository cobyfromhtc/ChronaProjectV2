// System profile-theme presets — the single source of truth for the Chronos
// theme shop. Shared between:
//   - /api/chronos/themes  (self-healing seed + shop listing)
//   - /api/chronos/purchase (buy_theme ownership checks)
//   - /api/chronos          (ownedThemes computation)
// The record ids are stable (theme-sunset, theme-ocean, ...) so purchases and
// persona.themeId references survive re-seeding.

export interface SystemThemePreset {
  id: string
  name: string
  description: string
  /** CSS background value (gradient) */
  background: string
  borderColor: string
  textColor: string
  accentColor: string
  price: number
}

export const SYSTEM_THEMES: SystemThemePreset[] = [
  {
    id: 'themesunset0000',
    name: 'Sunset',
    description: 'Warm golden-hour hues melting into coral',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    borderColor: '#ff6b6b',
    textColor: '#ffffff',
    accentColor: '#feca57',
    price: 100,
  },
  {
    id: 'themeocean00000',
    name: 'Ocean',
    description: 'Deep violet-blue currents with amethyst depths',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderColor: '#667eea',
    textColor: '#ffffff',
    accentColor: '#764ba2',
    price: 150,
  },
  {
    id: 'themeforest0000',
    name: 'Forest',
    description: 'Pine-teal shadows softened by mossy light',
    background: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    borderColor: '#71b280',
    textColor: '#ffffff',
    accentColor: '#134e5e',
    price: 150,
  },
  {
    id: 'themenight00000',
    name: 'Night Sky',
    description: 'Midnight indigo dusted with faint starlight',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    borderColor: '#302b63',
    textColor: '#a5b4fc',
    accentColor: '#818cf8',
    price: 200,
  },
  {
    id: 'themeaurora0000',
    name: 'Aurora',
    description: 'Northern lights — cyan ribbons over mint green',
    background: 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)',
    borderColor: '#00c9ff',
    textColor: '#0f172a',
    accentColor: '#92fe9d',
    price: 250,
  },
  {
    id: 'themefire000000',
    name: 'Fire',
    description: 'Ember-red flames crowned with molten gold',
    background: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    borderColor: '#f12711',
    textColor: '#ffffff',
    accentColor: '#f5af19',
    price: 200,
  },
  {
    id: 'themecosmic0000',
    name: 'Cosmic',
    description: 'Deep-space navy pierced by a crimson nebula',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    borderColor: '#e94560',
    textColor: '#eaeaea',
    accentColor: '#e94560',
    price: 300,
  },
  {
    id: 'themelavender00',
    name: 'Lavender',
    description: 'Soft violet petals brushed with rose water',
    background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    borderColor: '#a18cd1',
    textColor: '#1f2937',
    accentColor: '#fbc2eb',
    price: 175,
  },
]

export const SYSTEM_THEME_IDS = SYSTEM_THEMES.map(t => t.id)
