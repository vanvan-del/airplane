import { Linking } from 'react-native';

export const amapSearch = (keyword: string, city: string) =>
  `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}`;

export const xiaohongshuSearch = (keyword: string) =>
  `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`;

export const baiduSearch = (keyword: string) => `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`;

export function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}
