import { Place } from '../types';

export interface TransportOption {
  mode: string;
  emoji: string;
  /** 估算价格区间（元），不是实时票价 */
  priceLow: number;
  priceHigh: number;
  hours: number;
  note: string;
  cheapest?: boolean;
  fastest?: boolean;
}

export interface BookingLink {
  label: string;
  emoji: string;
  url: string;
}

const round10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);

// 根据直线距离粗略估算票价和耗时，只用来帮你判断哪种方式大概更便宜；
// 实时最低价要点下面的链接去购票平台看
export function estimateOptions(km: number): TransportOption[] {
  const railKm = km * 1.2; // 铁路实际里程一般比直线距离长
  const options: TransportOption[] = [];

  if (km >= 30) {
    options.push({
      mode: '高铁 / 动车 二等座',
      emoji: '🚄',
      priceLow: round10(railKm * 0.4),
      priceHigh: round10(railKm * 0.5),
      hours: railKm / 250 + 0.3,
      note: '准点、舒适，市中心上下车',
    });
    options.push({
      mode: '普速火车 硬座/硬卧',
      emoji: '🚂',
      priceLow: round10(railKm * 0.1),
      priceHigh: round10(railKm * 0.2),
      hours: railKm / 80,
      note: '最省钱，但时间长；长途可选卧铺',
    });
  }
  if (km >= 400) {
    options.push({
      mode: '飞机 经济舱',
      emoji: '✈️',
      priceLow: round10(Math.max(250, km * 0.35)),
      priceHigh: round10(Math.max(600, km * 0.9)),
      hours: km / 700 + 2, // 含提前到机场、安检时间
      note: '特价票波动大，提前订、早晚航班更便宜',
    });
  }
  if (options.length === 0) {
    options.push({
      mode: '地铁 / 公交 / 打车',
      emoji: '🚕',
      priceLow: 5,
      priceHigh: round10(km * 3),
      hours: km / 30,
      note: '距离很近，市内交通即可',
    });
  }

  const cheapest = options.reduce((a, b) => (b.priceLow < a.priceLow ? b : a));
  cheapest.cheapest = true;
  const fastest = options.reduce((a, b) => (b.hours < a.hours ? b : a));
  fastest.fastest = true;
  return options;
}

export function bookingLinks(from: Place, to: Place, date: string, km: number): BookingLink[] {
  const f = encodeURIComponent(from.name);
  const t = encodeURIComponent(to.name);
  const links: BookingLink[] = [];

  if (km >= 400) {
    if (from.code && to.code) {
      links.push({
        label: '携程 · 机票',
        emoji: '✈️',
        url: `https://flights.ctrip.com/online/list/oneway-${from.code.toLowerCase()}-${to.code.toLowerCase()}?depdate=${date}`,
      });
    }
    links.push({
      label: '去哪儿 · 机票',
      emoji: '🛫',
      url: `https://flight.qunar.com/site/oneway_list.htm?searchDepartureAirport=${f}&searchArrivalAirport=${t}&searchDepartureTime=${date}`,
    });
  }
  links.push({
    label: '携程 · 火车票',
    emoji: '🚄',
    url: `https://trains.ctrip.com/webapp/train/list?ticketType=0&dStation=${f}&aStation=${t}&dDate=${date}`,
  });
  links.push({
    label: '去哪儿 · 火车票',
    emoji: '🚆',
    url: `https://train.qunar.com/stationToStation.htm?fromStation=${f}&toStation=${t}&date=${date}`,
  });
  links.push({ label: '12306 官网', emoji: '🎟️', url: 'https://www.12306.cn/index/' });
  return links;
}

export function formatHours(h: number): string {
  if (h < 1) return `约 ${Math.max(10, Math.round(h * 60))} 分钟`;
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min >= 10 ? `约 ${whole} 小时 ${min} 分` : `约 ${whole} 小时`;
}
