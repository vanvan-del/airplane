import { Platform, StatusBar, TextStyle } from 'react-native';

// 像素风配色：16 色调色板（Sweetie 16），所有界面颜色都从这里取
export const palette = {
  ink: '#1A1C2C',
  plum: '#5D275D',
  red: '#B13E53',
  orange: '#EF7D57',
  yellow: '#FFCD75',
  lime: '#A7F070',
  green: '#38B764',
  teal: '#257179',
  navy: '#29366F',
  blue: '#3B5DC9',
  sky: '#41A6F6',
  cyan: '#73EFF7',
  white: '#F4F4F4',
  grey: '#94B0C2',
  slate: '#566C86',
  dusk: '#333C57',
};

export const colors = {
  sky: palette.sky,
  skyDeep: palette.blue,
  cloud: palette.white,
  sun: palette.yellow,
  coral: palette.orange,
  mint: palette.green,
  navy: palette.ink,
  muted: palette.slate,
  card: palette.white,
  paper: '#E8EEF4',
  line: palette.grey,
  ocean: palette.navy,
  land: palette.green,
  pink: palette.red,
};

/** 像素字体（Fusion Pixel 12px），字号用 12 的倍数最清晰 */
export const FONT = 'FusionPixel';
export const px = (size: 12 | 18 | 24 | 36 | 48, color: string = palette.ink): TextStyle => ({
  fontFamily: FONT,
  fontSize: size,
  lineHeight: Math.round(size * 1.5),
  color,
});

/** 像素描边粗细和硬阴影偏移 */
export const BORDER = 3;
export const SHADOW = 4;

/** 一格一格跳的动画节奏，像老游戏机那样 */
export const steps = (n: number) => (t: number) => Math.floor(t * n) / n;

export const topInset = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 12;

// 兼容旧代码：像素风不用模糊阴影
export const shadow = {};
