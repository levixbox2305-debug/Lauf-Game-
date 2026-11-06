import { Platform } from 'react-native';

/** The look of the market game's menus: white boxes with thick dark frames, like old handheld RPGs. */
export const retro = {
  ink: '#2A2228',
  paper: '#FFFFFF',
  cream: '#F8F4E8',
  frame: '#2A2228',
  accent: '#C8102E',
  accentDark: '#9C0C24',
  gold: '#E0B12E',
  green: '#3FA34D',
  yellow: '#E8C02E',
  red: '#D8352A',
  muted: '#6E6670',
  shell: '#D9D4CC',
  shellDark: '#B5AFA6',
  font: Platform.select({ ios: 'Menlo', android: 'monospace', default: '"Courier New", ui-monospace, monospace' }),
};

export const box = {
  backgroundColor: retro.paper,
  borderColor: retro.frame,
  borderWidth: 4,
  borderRadius: 6,
} as const;
