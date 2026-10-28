import { Platform, StatusBar } from 'react-native';

export const colors = {
  sky: '#8FD3FF',
  skyDeep: '#4FA9F0',
  cloud: '#FFFFFF',
  sun: '#FFD25A',
  coral: '#FF7A59',
  mint: '#4CD3A5',
  navy: '#1D3557',
  muted: '#5B6B82',
  card: '#FFFFFF',
  paper: '#F4FAFF',
  line: '#DCE9F5',
};

export const topInset = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 12;

export const shadow = {
  shadowColor: '#1D3557',
  shadowOpacity: 0.15,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};
