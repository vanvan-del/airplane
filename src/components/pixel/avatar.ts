import { palette } from '../../theme';
import { Avatar } from '../../types';

// 像素小人：12×16，按发型、配饰把几层叠在一起
// 字母含义：H 头发 S 皮肤 k 描边/眼睛 m 嘴 T 衣服 P 裤子 X 配饰
const BASE = [
  '............',
  '............',
  '...kkkkkk...',
  '..kSSSSSSk..',
  '..SSkSSkSS..',
  '..SSSSSSSS..',
  '...SSmmSS...',
  '....SSSS....',
  '..TTTTTTTT..',
  '.TTTTTTTTTT.',
  '.STTTTTTTTS.',
  '.STTTTTTTTS.',
  '..PPPPPPPP..',
  '..PPP..PPP..',
  '..PPP..PPP..',
  '..kkk..kkk..',
];

// 发型：H 处画头发，其他字符保持底图
export const HAIR_STYLES = {
  short: ['....HHHH....', '..HHHHHHHH..', '..HHHHHHHH..', '..H......H..'],
  long: ['....HHHH....', '..HHHHHHHH..', '.HHHHHHHHHH.', '.HH......HH.', '.H........H.', '.H........H.', '.H........H.', '.H........H.'],
  bun: ['....HHHH....', '....HHHH....', '..HHHHHHHH..', '..HH....HH..'],
  spiky: ['..H.H..H.H..', '..HHHHHHHH..', '..HHHHHHHH..', '..H......H..'],
  cap: ['...XXXXXX...', '..XXXXXXXX..', '..XXXXXXXXXX', '..H......H..'],
  bald: ['............', '............', '...kkkkkk...', '............'],
} as const;
export type HairStyle = keyof typeof HAIR_STYLES;

export const HAIR_LABELS: Record<HairStyle, string> = { short: '短发', long: '长发', bun: '丸子头', spiky: '刺猬头', cap: '棒球帽', bald: '光头' };
export const EXTRA_LABELS = { none: '无', glasses: '眼镜', scarf: '围巾', bag: '背包' } as const;
export type Extra = keyof typeof EXTRA_LABELS;

export const SKIN_TONES = ['#F7DCC0', '#EDC096', '#C98D5E', '#8A5A36'];
export const HAIR_COLORS = [palette.ink, '#6B4226', palette.yellow, palette.red, palette.blue, palette.white];
export const OUTFIT_COLORS = [palette.red, palette.orange, palette.green, palette.blue, palette.plum, palette.white, palette.teal];

export function avatarRows(a: Avatar): string[] {
  const rows = BASE.map((r) => r.split(''));
  const hair = HAIR_STYLES[a.hair] ?? HAIR_STYLES.short;
  hair.forEach((line, y) => {
    line.split('').forEach((ch, x) => {
      if (ch !== '.') rows[y][x] = ch;
    });
  });
  if (a.extra === 'glasses') rows[4] = '..SkkkkkkS..'.split('');
  if (a.extra === 'scarf') rows[8] = '..XXXXXXXX..'.split('');
  if (a.extra === 'bag') {
    rows[9][1] = 'X';
    rows[10][0] = 'X';
    rows[11][0] = 'X';
  }
  return rows.map((r) => r.join(''));
}

export function avatarColors(a: Avatar): Record<string, string> {
  return {
    H: a.hairColor,
    S: a.skin,
    k: palette.ink,
    m: palette.red,
    T: a.outfit,
    P: palette.slate,
    X: a.hair === 'cap' ? a.outfit : a.extra === 'bag' ? palette.orange : palette.red,
  };
}

export function randomAvatar(): Avatar {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
  return {
    skin: pick(SKIN_TONES),
    hair: pick(Object.keys(HAIR_STYLES) as HairStyle[]),
    hairColor: pick(HAIR_COLORS),
    outfit: pick(OUTFIT_COLORS),
    extra: pick(Object.keys(EXTRA_LABELS) as Extra[]),
  };
}
