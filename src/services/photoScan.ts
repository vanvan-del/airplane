import * as Location from 'expo-location';
import { Asset, AssetField, MediaType, Query, requestPermissionsAsync } from 'expo-media-library';
import { Platform } from 'react-native';
import { normalizeCityName } from '../data/cities';
import { toDateString } from '../screens/HomeScreen';
import { Footprint, Memory } from '../types';

/** 最多扫描最近多少张照片 */
const MAX_PHOTOS = 5000;
const PAGE = 200;
/** 每个城市最多导入多少张照片到记忆相册 */
const PHOTOS_PER_CITY = 30;
/** 两张照片相隔超过这么多天，算作两次旅行 */
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
  id: string;
  lat: number;
  lon: number;
  time: number;
}

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>, onBatch: (done: number) => void) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
    onBatch(Math.min(i + size, items.length));
  }
  return out;
}

// 把旅行日期按间隔合并：连续几天拍的照片算一次旅行，记第一天
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

/**
 * 扫描手机相册里带拍摄地点的照片，按城市分组，生成足迹。
 * 照片只是引用相册里的原图，不会复制。
 */
export async function scanAlbum(
  onProgress: (p: ScanProgress) => void,
  isCancelled: () => boolean,
  known: Set<string> = new Set(),
): Promise<ScanResult> {
  const perm = await requestPermissionsAsync(false, ['photo']);
  if (!perm.granted) return { ok: false, reason: '没有相册权限，请在系统设置里允许访问「所有照片」' };
  // 安卓把坐标转换成城市名需要定位权限；iOS 不需要
  if (Platform.OS === 'android') {
    const loc = await Location.requestForegroundPermissionsAsync();
    if (!loc.granted) return { ok: false, reason: '安卓需要定位权限才能把照片坐标识别成城市名' };
  }

  // 1. 读取最近的照片
  const metas: { id: string; time: number }[] = [];
  for (let offset = 0; offset < MAX_PHOTOS; offset += PAGE) {
    if (isCancelled()) return { ok: false, reason: '已取消' };
    const page = await new Query()
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
      .limit(PAGE)
      .offset(offset)
      .exeForMetadata();
    page.forEach((m) => m.creationTime != null && metas.push({ id: m.id, time: m.creationTime }));
    onProgress({ stage: 'reading', done: metas.length, total: metas.length });
    if (page.length < PAGE) break;
  }

  // 2. 逐张读取拍摄地点
  const located = (
    await inBatches(
      metas,
      25,
      async (m): Promise<Located | null> => {
        if (isCancelled()) return null;
        try {
          const loc = await new Asset(m.id).getLocation();
          if (!loc || (loc.latitude === 0 && loc.longitude === 0)) return null;
          return { id: m.id, lat: loc.latitude, lon: loc.longitude, time: m.time };
        } catch {
          return null;
        }
      },
      (done) => onProgress({ stage: 'locating', done, total: metas.length }),
    )
  ).filter((x): x is Located => x != null);
  if (isCancelled()) return { ok: false, reason: '已取消' };

  // 3. 约 50 公里一格先分组，每组只做一次地名识别，避免请求太多
  const cells = new Map<string, Located[]>();
  for (const p of located) {
    const key = `${Math.round(p.lat * 2)},${Math.round(p.lon * 2)}`;
    cells.set(key, [...(cells.get(key) ?? []), p]);
  }

  const cities = new Map<string, { country?: string; points: Located[] }>();
  let i = 0;
  for (const points of cells.values()) {
    if (isCancelled()) return { ok: false, reason: '已取消' };
    onProgress({ stage: 'saving', done: ++i, total: cells.size });
    const mid = points[Math.floor(points.length / 2)];
    try {
      const [addr] = await Location.reverseGeocodeAsync({ latitude: mid.lat, longitude: mid.lon });
      const raw = addr?.city || addr?.subregion || addr?.region;
      if (!raw) continue;
      const name = normalizeCityName(raw);
      const entry = cities.get(name) ?? { country: addr.country ?? undefined, points: [] };
      entry.points.push(...points);
      cities.set(name, entry);
    } catch {
      // 识别失败的这一组先跳过
    }
  }

  // 4. 每个城市取最新的几张照片作为记忆
  const footprints: Footprint[] = [];
  for (const [name, { country, points }] of cities) {
    const newest = [...points]
      .sort((a, b) => b.time - a.time)
      .filter((p) => !known.has(p.id))
      .slice(0, PHOTOS_PER_CITY);
    const photos: Memory[] = [];
    for (const p of newest) {
      try {
        const uri = await new Asset(p.id).getUri();
        photos.push({ id: `asset-${p.id}`, assetId: p.id, file: uri, addedAt: new Date(p.time).toISOString() });
      } catch {
        // iCloud 里还没下载的照片可能拿不到，跳过
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

  return { ok: true, footprints, scanned: metas.length, located: located.length };
}
