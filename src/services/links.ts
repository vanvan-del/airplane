import { Linking } from 'react-native';

export const amapSearch = (keyword: string, city: string) =>
  `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}`;

export const xiaohongshuSearch = (keyword: string) =>
  `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`;

export const baiduSearch = (keyword: string) => `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`;

export function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** 地图搜索：国内用高德，国外用 Google 地图 */
export function mapSearch(keyword: string, place: { name: string; en?: string; country?: string }) {
  const abroad = place.country && place.country !== '中国';
  return abroad
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${keyword} ${place.en ?? place.name}`)}`
    : amapSearch(keyword, place.name);
}
