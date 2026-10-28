import exifr from 'exifr';
import { CITIES, normalizeCityName } from '../data/cities';
import { countryAt } from '../data/world';
import { toDateString } from '../screens/HomeScreen';
import { Footprint, Memory } from '../types';
import { distanceKm } from './geo';
import { savePhoto } from './webPhotos';

// 网页版：浏览器不能直接读整个相册，改成让你一次选一批照片，
// 读每张照片里记录的拍摄地点（EXIF GPS）来识别城市。

const PHOTOS_PER_CITY = 30;
const TRIP_GAP_DAYS = 3;

export interface ScanProgress {
  stage: 'reading' | 'locating' | 'saving';
  done: number;
  total: number;
}

export type ScanResult =
  | { ok: true; footprints: Footprint[]; scanned: number; located: number }
  | { ok: false; reason: string };

interface Located {
  file: File;
  key: string;
  lat: number;
  lon: number;
  time: number;
}

// 必须在点击事件里同步调用，浏览器才允许弹出选择文件
function pickFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => resolve([...(input.files ?? [])]);
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

function tripDates(times: number[]): string[] {
  const sorted = [...times].sort((a, b) => a - b);
  const dates: string[] = [];
  let last = -Infinity;
  for (const t of sorted) {
    if (t - last > TRIP_GAP_DAYS * 86400000) dates.push(toDateString(new Date(t)));
    last = t;
  }
  return dates;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

// 坐标 → 城市名：先用免费的在线地名服务，连不上就用内置城市和国家边界离线判断
async function placeName(lat: number, lon: number): Promise<{ name: string; country?: string }> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`;
    const res = await withTimeout(fetch(url), 6000);
    if (res.ok) {
      const d = await res.json();
      const raw = d.city || d.locality || d.principalSubdivision;
      if (raw) return { name: normalizeCityName(raw), country: d.countryName || countryAt(lon, lat) };
    }
  } catch {
    // 走离线判断
  }
  const here = { name: '', lat, lon };
  const near = CITIES.map((c) => ({ c, d: distanceKm(here, c) })).sort((a, b) => a.d - b.d)[0];
  const country = countryAt(lon, lat);
  if (near && near.d < 80) return { name: near.c.name, country: country ?? '中国' };
  return { name: country ?? '未知地点', country };
}

export async function scanAlbum(
  onProgress: (p: ScanProgress) => void,
  isCancelled: () => boolean,
  known: Set<string> = new Set(),
): Promise<ScanResult> {
  const files = await pickFiles();
  if (files.length === 0) return { ok: false, reason: '已取消' };

  // 1. 读每张照片的拍摄地点和时间
  const located: Located[] = [];
  for (let i = 0; i < files.length; i++) {
    if (isCancelled()) return { ok: false, reason: '已取消' };
    const file = files[i];
    onProgress({ stage: 'locating', done: i + 1, total: files.length });
    try {
      const gps = await exifr.gps(file);
      if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) continue;
      if (gps.latitude === 0 && gps.longitude === 0) continue;
      const meta = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']).catch(() => null);
      const taken: Date | undefined = meta?.DateTimeOriginal ?? meta?.CreateDate;
      located.push({
        file,
        key: `file:${file.name}:${file.size}`,
        lat: gps.latitude,
        lon: gps.longitude,
        time: taken instanceof Date && !isNaN(+taken) ? +taken : file.lastModified,
      });
    } catch {
      // 读不了的图片跳过
    }
  }

  // 2. 约 50 公里一格分组，每组识别一次地名
  const cells = new Map<string, Located[]>();
  for (const p of located) {
    const key = `${Math.round(p.lat * 2)},${Math.round(p.lon * 2)}`;
    cells.set(key, [...(cells.get(key) ?? []), p]);
  }
  const cities = new Map<string, { country?: string; points: Located[] }>();
  let n = 0;
  for (const points of cells.values()) {
    if (isCancelled()) return { ok: false, reason: '已取消' };
    onProgress({ stage: 'saving', done: ++n, total: cells.size });
    const mid = points[Math.floor(points.length / 2)];
    const { name, country } = await placeName(mid.lat, mid.lon);
    const entry = cities.get(name) ?? { country, points: [] };
    entry.points.push(...points);
    cities.set(name, entry);
  }

  // 3. 每个城市存最新的几张照片
  const footprints: Footprint[] = [];
  for (const [name, { country, points }] of cities) {
    const newest = [...points].sort((a, b) => b.time - a.time).filter((p) => !known.has(p.key)).slice(0, PHOTOS_PER_CITY);
    const photos: Memory[] = [];
    for (const p of newest) {
      try {
        const file = await savePhoto(p.file);
        photos.push({ id: `${p.key}-${p.time}`, assetId: p.key, file, addedAt: new Date(p.time).toISOString() });
      } catch {
        // 浏览器存储满了等情况，跳过这张
      }
    }
    footprints.push({
      name,
      country,
      lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
      lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
      visits: tripDates(points.map((p) => p.time)),
      photos,
      note: '',
    });
  }

  return { ok: true, footprints, scanned: files.length, located: located.length };
}
