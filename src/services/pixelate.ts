import { palette } from '../theme';
import { PixelArt } from '../types';

// 把照片变成像素画：缩小成几十格宽的马赛克，再把每格换成调色板里最接近的颜色，
// 加一点有规律的抖动，过渡更像手绘像素画。全部在手机上算，照片不会上传。

export interface RawImage {
  width: number;
  height: number;
  /** RGBA，每个像素 4 个字节 */
  data: Uint8Array | Uint8ClampedArray;
}

// 16 色调色板再加几个肤色，人脸会自然很多
const COLORS = [...Object.values(palette), '#F7DCC0', '#EDC096', '#C98D5E', '#8A5A36'];
const CHARS = 'abcdefghijklmnopqrst';
const RGB = COLORS.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// 人眼对绿色更敏感，用加权距离找最接近的颜色
function nearest(r: number, g: number, b: number) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < RGB.length; i++) {
    const [pr, pg, pb] = RGB[i];
    const rm = (r + pr) / 2;
    const d = (2 + rm / 256) * (r - pr) ** 2 + 4 * (g - pg) ** 2 + (2 + (255 - rm) / 256) * (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function pixelate(img: RawImage, cols = 48): PixelArt {
  const w = Math.min(cols, img.width);
  const h = Math.max(1, Math.min(Math.round(cols * 1.6), Math.round((img.height * w) / img.width)));
  const sx = img.width / w;
  const sy = img.height / h;
  const used = new Set<number>();
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      // 这一格对应原图里一块区域，取平均色
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++) {
        for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) {
          const i = (yy * img.width + xx) * 4;
          r += img.data[i];
          g += img.data[i + 1];
          b += img.data[i + 2];
          n++;
        }
      }
      n = Math.max(1, n);
      // 稍微提高饱和度和对比度，像素画颜色更鲜明；再叠一点有规律的抖动
      r /= n;
      g /= n;
      b /= n;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const t = (BAYER[y % 4][x % 4] / 16 - 0.5) * 18;
      const boost = (c: number) => Math.max(0, Math.min(255, (lum + (c - lum) * 1.3 - 128) * 1.1 + 128 + t));
      const idx = nearest(boost(r), boost(g), boost(b));
      used.add(idx);
      row += CHARS[idx];
    }
    rows.push(row);
  }
  const colors: Record<string, string> = {};
  used.forEach((i) => (colors[CHARS[i]] = COLORS[i]));
  return { w, h, rows, colors };
}
