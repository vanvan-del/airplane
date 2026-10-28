import { memo, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  /** 每行一个字符串，每个字符是一个像素，"." 是透明 */
  rows: readonly string[];
  /** 字符 → 颜色 */
  colors: Record<string, string>;
  scale?: number;
  tint?: string;
}

// 同色相邻的像素合并成一段，减少要画的方块数
export function toPaths(rows: readonly string[]) {
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

function PixelSprite({ rows, colors, scale = 3, tint }: Props) {
  const paths = useMemo(() => [...toPaths(rows)], [rows]);
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <Svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`}>
      {paths.map(([ch, d]) => (
        <Path key={ch} d={d} fill={tint ?? colors[ch] ?? '#000'} />
      ))}
    </Svg>
  );
}

export default memo(PixelSprite);
