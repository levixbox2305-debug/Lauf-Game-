import { Platform } from 'react-native';

// Washi paper, sumi ink, vermilion and sakura.
export const colors = {
  background: '#F3EBDD',
  surface: '#FBF6EC',
  border: '#E1D6C2',
  text: '#2B2A28',
  textMuted: '#8A7F6E',
  ink: '#2B2A28',
  inkSoft: '#B9AE9C',
  primary: '#C8392B',
  primaryDark: '#A52E22',
  onPrimary: '#FBEFE6',
  sakura: '#E9677F',
  matcha: '#6E8B3D',
  energy: '#C8392B',
  sea: '#3E7FA8',
};

export const fonts = {
  serif: Platform.select({ ios: 'Hiragino Mincho ProN', android: 'serif', default: 'Georgia, "Noto Serif JP", serif' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' }),
};
