import { GRID_CELLS, GRID_COUNTRY_IDS, GRID_H, GRID_RES, GRID_W } from './worldGrid';

// 解码预先算好的世界格子：每格记着属于哪个国家（0 是海洋）
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decode(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2]) & 63) << 6) |
      (B64.indexOf(clean[i + 3]) & 63);
    out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

let cells: Uint8Array | null = null;

/** 某个经纬度所在的格子：0 是海洋，否则是国家编号 */
export function cellAt(lon: number, lat: number): number {
  cells ??= decode(GRID_CELLS);
  const col = Math.min(GRID_W - 1, Math.max(0, Math.floor((lon + 180) / GRID_RES)));
  const row = Math.min(GRID_H - 1, Math.max(0, Math.floor((90 - lat) / GRID_RES)));
  return cells[row * GRID_W + col];
}

/** 国家的 ISO 数字编号 → 格子里的国家编号 */
export const gridIndexOf = (countryId: string) => GRID_COUNTRY_IDS.indexOf(countryId) + 1;
