import { PixelArt } from '../types';

// 把照片变成像素画，全部在手机上算，照片不会上传。
// 两种风格：
// - 清晰（默认）：从照片本身挑出最有代表性的十几种颜色，先锐化再缩小，边缘加深色描边，人脸和五官能认出来
// - 复古：换成 App 的 16 色调色板并加抖动，更像老游戏机画面，但细节少

export interface RawImage {
  width: number;
  height: number;
  /** RGBA，每个像素 4 个字节 */
  data: Uint8Array | Uint8ClampedArray;
}

export type PixelStyle = 'clear' | 'retro';

export const PIXEL_STYLE_LABELS: Record<PixelStyle, string> = { clear: '清晰', retro: '复古' };

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// 复古风格用的 16 色调色板（和 App 界面一致）加几种肤色
const RETRO = [
  '#1A1C2C', '#5D275D', '#B13E53', '#EF7D57', '#FFCD75', '#A7F070', '#38B764', '#257179',
  '#29366F', '#3B5DC9', '#41A6F6', '#73EFF7', '#F4F4F4', '#94B0C2', '#566C86', '#333C57',
  '#F7DCC0', '#EDC096', '#C98D5E', '#8A5A36',
].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB);

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

type RGB = [number, number, number];

const clamp = (v: number) => Math.max(0, Math.min(255, v));
const toHex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// 人眼对绿色更敏感，用加权距离比较颜色
function dist(a: RGB, b: RGB) {
  const rm = (a[0] + b[0]) / 2;
  return (2 + rm / 256) * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + (2 + (255 - rm) / 256) * (a[2] - b[2]) ** 2;
}

function nearest(c: RGB, pal: RGB[]) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const d = dist(c, pal[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

// 缩小：每一格取原图对应区域的平均色
function downsample(img: RawImage, w: number, h: number): RGB[] {
  const out: RGB[] = [];
  const sx = img.width / w;
  const sy = img.height / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      const y1 = Math.max(Math.floor(y * sy) + 1, Math.floor((y + 1) * sy));
      const x1 = Math.max(Math.floor(x * sx) + 1, Math.floor((x + 1) * sx));
      for (let yy = Math.floor(y * sy); yy < y1; yy++) {
        for (let xx = Math.floor(x * sx); xx < x1; xx++) {
          const i = (yy * img.width + xx) * 4;
          r += img.data[i];
          g += img.data[i + 1];
          b += img.data[i + 2];
          n++;
        }
      }
      out.push([r / n, g / n, b / n]);
    }
  }
  return out;
}

// 锐化：让五官、轮廓在缩小后还清楚
function sharpen(px: RGB[], w: number, h: number, amount: number): RGB[] {
  return px.map((c, i) => {
    const x = i % w;
    const y = Math.floor(i / w);
    const around: RGB[] = [];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = Math.min(w - 1, Math.max(0, x + dx));
      const ny = Math.min(h - 1, Math.max(0, y + dy));
      around.push(px[ny * w + nx]);
    }
    return c.map((v, k) => clamp(v + amount * (v - around.reduce((s, a) => s + a[k], 0) / 4))) as RGB;
  });
}

// 稍微提高饱和度，像素画颜色更鲜明
function vivid(c: RGB, sat: number, contrast: number): RGB {
  const lum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return c.map((v) => clamp((lum + (v - lum) * sat - 128) * contrast + 128)) as RGB;
}

// 用 k-means 从照片里挑出最有代表性的 k 种颜色。
// 人通常在画面中间，中间的像素多算几次，脸和衣服的颜色就不会被大片背景挤掉
function adaptivePalette(all: RGB[], w: number, h: number, k: number): RGB[] {
  const px: RGB[] = [];
  all.forEach((c, i) => {
    const dx = ((i % w) - w / 2) / (w / 2);
    const dy = (Math.floor(i / w) - h * 0.45) / (h / 2);
    const weight = dx * dx + dy * dy < 0.35 ? 4 : dx * dx + dy * dy < 0.7 ? 2 : 1;
    for (let n = 0; n < weight; n++) px.push(c);
  });
  // 按亮度排序后等距取初始颜色，结果稳定、每次一样
  const sorted = [...px].sort((a, b) => a[0] + a[1] * 2 + a[2] - (b[0] + b[1] * 2 + b[2]));
  let centers: RGB[] = Array.from({ length: k }, (_, i) => [...sorted[Math.floor(((i + 0.5) * sorted.length) / k)]] as RGB);
  for (let iter = 0; iter < 10; iter++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (const c of px) {
      const s = sum[nearest(c, centers)];
      s[0] += c[0];
      s[1] += c[1];
      s[2] += c[2];
      s[3]++;
    }
    centers = centers.map((old, i) => (sum[i][3] ? ([sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] as RGB) : old));
  }
  return centers;
}

const luma = (c: RGB) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

function toArt(w: number, h: number, idx: number[], pal: RGB[]): PixelArt {
  const used = new Map<number, string>();
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const i = idx[y * w + x];
      if (!used.has(i)) used.set(i, CHARS[used.size]);
      row += used.get(i);
    }
    rows.push(row);
  }
  const colors: Record<string, string> = {};
  used.forEach((ch, i) => (colors[ch] = toHex(pal[i])));
  return { w, h, rows, colors };
}

export function pixelate(img: RawImage, cols = 72, style: PixelStyle = 'clear'): PixelArt {
  const w = Math.min(cols, img.width);
  const h = Math.max(1, Math.min(Math.round(cols * 1.6), Math.round((img.height * w) / img.width)));
  const base = downsample(img, w, h);

  if (style === 'retro') {
    const idx = base.map((c, i) => {
      const t = (BAYER[Math.floor(i / w) % 4][(i % w) % 4] / 16 - 0.5) * 18;
      const v = vivid(c, 1.3, 1.1).map((x) => clamp(x + t)) as RGB;
      return nearest(v, RETRO);
    });
    return toArt(w, h, idx, RETRO);
  }

  const px = sharpen(base, w, h, 0.5).map((c) => vivid(c, 1.15, 1.06));
  const pal = adaptivePalette(px, w, h, 24);
  const idx = px.map((c) => nearest(c, pal));

  // 描边：亮暗差很大的交界处，把较暗的一边换成调色板里最深的颜色，轮廓更像手绘像素画
  const darkest = pal.reduce((best, c, i) => (luma(c) < luma(pal[best]) ? i : best), 0);
  const out = [...idx];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const me = luma(pal[idx[i]]);
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const other = luma(pal[idx[ny * w + nx]]);
        if (other - me > 100 && me < 90) {
          out[i] = darkest;
          break;
        }
      }
    }
  }
  return toArt(w, h, out, pal);
}
