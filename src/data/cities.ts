import { Place, Region } from '../types';
import { CHINA_GUIDES } from './guides/china';
import { EUROPE_GUIDES } from './guides/europe';
import { WORLD_GUIDES } from './guides/world';

const GUIDES = { ...CHINA_GUIDES, ...EUROPE_GUIDES, ...WORLD_GUIDES };

// 内置城市坐标和三字码，没网或者地名解析失败时也能算距离、拼机票链接
const CITY_BASE: Array<[string, string, number, number]> = [
  ['北京', 'BJS', 39.904, 116.407],
  ['上海', 'SHA', 31.23, 121.474],
  ['广州', 'CAN', 23.129, 113.264],
  ['深圳', 'SZX', 22.543, 114.058],
  ['成都', 'CTU', 30.572, 104.066],
  ['重庆', 'CKG', 29.563, 106.551],
  ['西安', 'SIA', 34.341, 108.94],
  ['杭州', 'HGH', 30.274, 120.155],
  ['南京', 'NKG', 32.06, 118.797],
  ['厦门', 'XMN', 24.48, 118.089],
  ['三亚', 'SYX', 18.253, 109.512],
  ['长沙', 'CSX', 28.228, 112.939],
  ['青岛', 'TAO', 36.067, 120.383],
  ['大理', 'DLU', 25.606, 100.268],
  ['武汉', 'WUH', 30.593, 114.305],
  ['昆明', 'KMG', 25.039, 102.718],
  ['天津', 'TSN', 39.084, 117.201],
  ['郑州', 'CGO', 34.746, 113.625],
  ['沈阳', 'SHE', 41.806, 123.432],
  ['大连', 'DLC', 38.914, 121.615],
  ['哈尔滨', 'HRB', 45.803, 126.535],
  ['济南', 'TNA', 36.651, 117.12],
  ['合肥', 'HFE', 31.821, 117.227],
  ['福州', 'FOC', 26.075, 119.296],
  ['南昌', 'KHN', 28.682, 115.858],
  ['南宁', 'NNG', 22.817, 108.366],
  ['贵阳', 'KWE', 26.647, 106.63],
  ['海口', 'HAK', 20.044, 110.199],
  ['兰州', 'LHW', 36.061, 103.834],
  ['乌鲁木齐', 'URC', 43.825, 87.617],
  ['拉萨', 'LXA', 29.652, 91.172],
  ['太原', 'TYN', 37.87, 112.549],
  ['石家庄', 'SJW', 38.042, 114.515],
  ['呼和浩特', 'HET', 40.842, 111.749],
  ['银川', 'INC', 38.487, 106.231],
  ['西宁', 'XNN', 36.617, 101.778],
  ['桂林', 'KWL', 25.274, 110.29],
  ['丽江', 'LJG', 26.855, 100.227],
  ['宁波', 'NGB', 29.868, 121.544],
  ['温州', 'WNZ', 27.994, 120.699],
  ['无锡', 'WUX', 31.491, 120.312],
  ['珠海', 'ZUH', 22.271, 113.577],
  ['苏州', '', 31.299, 120.585],
];


// 国外城市：中文名、城市三字码、纬度、经度、国家、区域、英文名
const WORLD_BASE: Array<[string, string, number, number, string, Region, string]> = [
  ['巴黎', 'PAR', 48.857, 2.352, '法国', 'europe', 'Paris'],
  ['伦敦', 'LON', 51.507, -0.128, '英国', 'europe', 'London'],
  ['罗马', 'ROM', 41.903, 12.496, '意大利', 'europe', 'Rome'],
  ['佛罗伦萨', 'FLR', 43.77, 11.256, '意大利', 'europe', 'Florence'],
  ['威尼斯', 'VCE', 45.44, 12.316, '意大利', 'europe', 'Venice'],
  ['巴塞罗那', 'BCN', 41.385, 2.173, '西班牙', 'europe', 'Barcelona'],
  ['阿姆斯特丹', 'AMS', 52.37, 4.895, '荷兰', 'europe', 'Amsterdam'],
  ['柏林', 'BER', 52.52, 13.405, '德国', 'europe', 'Berlin'],
  ['布拉格', 'PRG', 50.075, 14.438, '捷克', 'europe', 'Prague'],
  ['维也纳', 'VIE', 48.208, 16.373, '奥地利', 'europe', 'Vienna'],
  ['布达佩斯', 'BUD', 47.498, 19.04, '匈牙利', 'europe', 'Budapest'],
  ['里斯本', 'LIS', 38.722, -9.139, '葡萄牙', 'europe', 'Lisbon'],
  ['雅典', 'ATH', 37.984, 23.728, '希腊', 'europe', 'Athens'],
  ['伊斯坦布尔', 'IST', 41.008, 28.978, '土耳其', 'europe', 'Istanbul'],
  ['东京', 'TYO', 35.676, 139.65, '日本', 'asia', 'Tokyo'],
  ['京都', 'OSA', 35.012, 135.768, '日本', 'asia', 'Kyoto'],
  ['首尔', 'SEL', 37.566, 126.978, '韩国', 'asia', 'Seoul'],
  ['曼谷', 'BKK', 13.756, 100.502, '泰国', 'asia', 'Bangkok'],
  ['新加坡', 'SIN', 1.352, 103.82, '新加坡', 'asia', 'Singapore'],
  ['纽约', 'NYC', 40.713, -74.006, '美国', 'americas', 'New York'],
];

// 国内城市的英文名，国际订票网站要用
const PINYIN: Record<string, string> = {
  北京: 'Beijing', 上海: 'Shanghai', 广州: 'Guangzhou', 深圳: 'Shenzhen', 成都: 'Chengdu', 重庆: 'Chongqing',
  西安: "Xi'an", 杭州: 'Hangzhou', 南京: 'Nanjing', 厦门: 'Xiamen', 三亚: 'Sanya', 长沙: 'Changsha', 青岛: 'Qingdao',
  大理: 'Dali', 武汉: 'Wuhan', 昆明: 'Kunming', 天津: 'Tianjin', 苏州: 'Suzhou', 桂林: 'Guilin', 丽江: 'Lijiang',
  哈尔滨: 'Harbin', 沈阳: 'Shenyang', 大连: 'Dalian', 郑州: 'Zhengzhou', 福州: 'Fuzhou', 贵阳: 'Guiyang', 拉萨: 'Lhasa',
};

export const CITIES: Place[] = [
  ...CITY_BASE.map(([name, code, lat, lon]): Place => ({
    name,
    code: code || undefined,
    lat,
    lon,
    country: '中国',
    region: 'china',
    en: PINYIN[name],
    guide: GUIDES[name],
  })),
  ...WORLD_BASE.map(([name, code, lat, lon, country, region, en]): Place => ({ name, code, lat, lon, country, region, en, guide: GUIDES[name] })),
];

/** 英文名 → 中文名，输入 Paris 也能找到巴黎 */
const ENGLISH = new Map(WORLD_BASE.map(([name, , , , , , en]) => [en.toLowerCase(), name]));

export const HOT_DESTINATIONS = Object.keys(CHINA_GUIDES);
export const WORLD_DESTINATIONS = [...Object.keys(EUROPE_GUIDES), ...Object.keys(WORLD_GUIDES)];

export function normalizeCityName(input: string): string {
  return input
    .trim()
    .replace(/(白族|彝族|藏族|苗族|土家族|侗族|壮族|傣族|景颇族|哈尼族|羌族|回族|朝鲜族|布依族|蒙古族|哈萨克|傈僳族|黎族|族)+自治(州|县)$/, '')
    .replace(/(市|省|自治区|特别行政区|地区|盟)$/, '');
}

export function findBuiltInCity(input: string): Place | undefined {
  const name = ENGLISH.get(input.trim().toLowerCase()) ?? normalizeCityName(input);
  return CITIES.find((c) => c.name === name);
}
