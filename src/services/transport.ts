import { Place } from '../types';
import { isAbroad, regionOf } from './geo';

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
export function estimateOptions(from: Place, to: Place, km: number): TransportOption[] {
  const options = isAbroad(from) || isAbroad(to) ? abroadOptions(from, to, km) : chinaOptions(km);
  const cheapest = options.reduce((a, b) => (b.priceLow < a.priceLow ? b : a));
  cheapest.cheapest = true;
  const fastest = options.reduce((a, b) => (b.hours < a.hours ? b : a));
  fastest.fastest = true;
  return options;
}

function chinaOptions(km: number): TransportOption[] {
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

  return options;
}

// 国外：同在欧洲可以坐火车、大巴或廉航；跨洲只能坐飞机
function abroadOptions(from: Place, to: Place, km: number): TransportOption[] {
  const rf = from.region ?? regionOf(from.lat, from.lon, from.country);
  const rt = to.region ?? regionOf(to.lat, to.lon, to.country);
  const sameCountry = !!from.country && from.country === to.country;
  const options: TransportOption[] = [];
  if (rf === 'europe' && rt === 'europe' && km < 1500) {
    options.push({
      mode: '欧洲火车',
      emoji: '🚄',
      priceLow: round10(km * 1.2 * 0.5),
      priceHigh: round10(km * 1.2 * 1.6),
      hours: (km * 1.2) / 140 + 0.5,
      note: '提前一两个月买最便宜；跨多国连续坐车可以看看 Eurail 通票',
    });
    if (km < 1200) {
      options.push({
        mode: '长途大巴',
        emoji: '🚕',
        priceLow: round10(km * 0.25),
        priceHigh: round10(km * 0.6),
        hours: (km * 1.2) / 70,
        note: '最省钱，FlixBus 等夜班车还能省一晚住宿',
      });
    }
  } else if (sameCountry && km < 1200) {
    options.push({
      mode: '火车 / 新干线',
      emoji: '🚄',
      priceLow: round10(km * 1.2 * 1.1),
      priceHigh: round10(km * 1.2 * 2.2),
      hours: (km * 1.2) / 200 + 0.3,
      note: '城市之间最方便，日本可以考虑 JR Pass',
    });
  }
  if (km >= 250) {
    const longHaul = km > 4000;
    options.push({
      mode: longHaul ? '国际航班 经济舱' : '飞机（含廉航）',
      emoji: '✈️',
      priceLow: round10(longHaul ? Math.max(1800, km * 0.35) : Math.max(300, km * 0.45)),
      priceHigh: round10(longHaul ? Math.max(5000, km * 0.9) : Math.max(1200, km * 1.3)),
      hours: km / 800 + (longHaul ? 3.5 : 2.5),
      note: longHaul ? '提前 2-3 个月订，转机比直飞便宜很多' : '廉航行李要另买，机场可能离市区远',
    });
  }
  if (options.length === 0) {
    options.push({ mode: '地铁 / 公交 / 打车', emoji: '🚕', priceLow: 10, priceHigh: round10(km * 8), hours: km / 30, note: '距离很近，市内交通即可' });
  }
  return options;
}

export function bookingLinks(from: Place, to: Place, date: string, km: number): BookingLink[] {
  if (isAbroad(from) || isAbroad(to)) return abroadLinks(from, to, date, km);
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

function abroadLinks(from: Place, to: Place, date: string, km: number): BookingLink[] {
  const links: BookingLink[] = [];
  const fe = encodeURIComponent(from.en ?? from.name);
  const te = encodeURIComponent(to.en ?? to.name);
  if (km >= 250) {
    if (from.code && to.code) {
      const fc = from.code.toLowerCase();
      const tc = to.code.toLowerCase();
      links.push({ label: '携程 · 国际机票', emoji: '✈️', url: `https://flights.ctrip.com/online/list/oneway-${fc}-${tc}?depdate=${date}` });
      links.push({ label: 'Trip.com · 机票', emoji: '🛫', url: `https://www.trip.com/flights/showfarefirst?dcity=${fc}&acity=${tc}&ddate=${date}&triptype=ow` });
    }
    links.push({
      label: 'Google 航班比价',
      emoji: '✈️',
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from.en ?? from.code ?? from.name} to ${to.en ?? to.code ?? to.name} on ${date}`)}`,
    });
  }
  // Rome2Rio 会把火车、大巴、飞机、轮渡的路线和价格一起列出来
  links.push({ label: 'Rome2Rio · 所有交通方式比价', emoji: '🚆', url: `https://www.rome2rio.com/s/${fe}/${te}` });
  return links;
}

export function formatHours(h: number): string {
  if (h < 1) return `约 ${Math.max(10, Math.round(h * 60))} 分钟`;
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min >= 10 ? `约 ${whole} 小时 ${min} 分` : `约 ${whole} 小时`;
}
