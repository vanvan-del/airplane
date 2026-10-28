import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { ICON_COLORS, ICONS, IconName } from './icons';

interface Props {
  name: IconName;
  /** 每个像素画多大，默认 3 */
  scale?: number;
  /** 把所有不透明像素换成同一种颜色（比如深色按钮上的白色图标） */
  tint?: string;
}

// 同色相邻的像素合并成一段，减少要画的方块数
function toPaths(rows: readonly string[]) {
  const byColor = new Map<string, string>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      byColor.set(ch, (byColor.get(ch) ?? '') + `M${x} ${y}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  });
  return byColor;
}

const cache = new Map<IconName, Map<string, string>>();

function PixelIcon({ name, scale = 3, tint }: Props) {
  const rows = ICONS[name];
  if (!cache.has(name)) cache.set(name, toPaths(rows));
  const paths = cache.get(name)!;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <Svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`}>
      {[...paths].map(([ch, d]) => (
        <Path key={ch} d={d} fill={tint ?? ICON_COLORS[ch]} />
      ))}
    </Svg>
  );
}

export default memo(PixelIcon);
