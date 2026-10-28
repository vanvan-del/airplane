// 生成像素地球用的世界格子：把地球按 1° × 1° 切成 360 × 180 格，记下每格属于哪个国家。
// 用法：node scripts/build-world-grid.mjs（只在更换国家数据时需要重新跑）
import { geoBounds, geoContains } from 'd3-geo';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = require('world-atlas/countries-110m.json');
const countries = feature(topo, topo.objects.countries).features;
const W = 360;
const H = 180;

const boxes = countries.map((c) => geoBounds(c));
const inBox = (i, lon, lat) => {
  const [[x0, y0], [x1, y1]] = boxes[i];
  if (lat < y0 || lat > y1) return false;
  return x0 <= x1 ? lon >= x0 && lon <= x1 : lon >= x0 || lon <= x1; // 跨 180° 经线的国家
};

const cells = new Uint8Array(W * H);
for (let row = 0; row < H; row++) {
  const lat = 89.5 - row;
  for (let col = 0; col < W; col++) {
    const lon = -179.5 + col;
    for (let i = 0; i < countries.length; i++) {
      if (inBox(i, lon, lat) && geoContains(countries[i], [lon, lat])) {
        cells[row * W + col] = i + 1;
        break;
      }
    }
  }
}

const ids = countries.map((c) => String(c.id ?? ''));
const out = `// 由 scripts/build-world-grid.mjs 生成，请勿手改
// 360 × 180 格，从北纬 90° 往南、西经 180° 往东；值为 0 是海洋，否则是 COUNTRY_IDS 的下标 + 1
export const GRID_W = ${W};
export const GRID_H = ${H};
export const GRID_COUNTRY_IDS: string[] = ${JSON.stringify(ids)};
export const GRID_CELLS = '${Buffer.from(cells).toString('base64')}';
`;
writeFileSync(new URL('../src/data/worldGrid.ts', import.meta.url), out);
console.log('land cells:', cells.filter(Boolean).length, 'of', cells.length);
