import { findBuiltInCity, normalizeCityName } from '../data/cities';
import { Place, Region } from '../types';

interface GeocodeResult {
  results?: Array<{ name: string; latitude: number; longitude: number; country?: string }>;
}

// 先查内置城市，查不到再用 Open-Meteo 免费地名解析（不需要密钥）
export async function resolvePlace(input: string): Promise<Place | null> {
  const builtIn = findBuiltInCity(input);
  if (builtIn) return builtIn;

  const name = normalizeCityName(input);
  if (!name) return null;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: GeocodeResult = await res.json();
    const hit = data.results?.[0];
    if (!hit) return null;
    return { name, lat: hit.latitude, lon: hit.longitude, country: hit.country, region: regionOf(hit.latitude, hit.longitude, hit.country) };
  } catch {
    return null;
  }
}

/** 按国家和经纬度粗略判断在哪个区域 */
export function regionOf(lat: number, lon: number, country?: string): Region {
  if (country === '中国' || country === 'China') return 'china';
  if (lat > 34 && lat < 72 && lon > -25 && lon < 45) return 'europe';
  if (lon < -30) return 'americas';
  if (lon > 60 && lat > -12) return 'asia';
  return 'other';
}

export const isAbroad = (p: Place) => (p.region ?? regionOf(p.lat, p.lon, p.country)) !== 'china';

export function distanceKm(a: Place, b: Place): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
