export type SpotKind = 'sight' | 'photo';

/** 旅行兴趣：人文历史、自然风景、拍照打卡、艺术博物馆、名人足迹、运动户外、夜景夜生活 */
export type Interest = 'culture' | 'nature' | 'photo' | 'art' | 'people' | 'sport' | 'night';

export interface Spot {
  name: string;
  kind: SpotKind;
  tags: Interest[];
  /** 所在片区，排行程时同一片区的放在同一天 */
  area: string;
  /** 建议游玩时长（小时） */
  hours: number;
  /** 门票参考，以景区官方公布为准 */
  ticket: string;
  tip: string;
  /** 历史和故事背景 */
  story: string;
}

export interface Food {
  name: string;
  desc: string;
}

export interface CityGuide {
  /** 城市的历史和故事简介 */
  intro: string;
  spots: Spot[];
  foods: Food[];
}

export type Region = 'china' | 'europe' | 'asia' | 'americas' | 'other';

export interface Place {
  name: string;
  lat: number;
  lon: number;
  /** 城市三字码，用于拼携程机票链接 */
  code?: string;
  country?: string;
  /** 英文名，用于国外订票和地图链接 */
  en?: string;
  /** 大致区域，用来判断能不能坐火车、要不要坐国际航班 */
  region?: Region;
  guide?: CityGuide;
}

export interface Memory {
  id: string;
  /** App 文件夹里的文件名；复制失败时是原图的完整 uri */
  file: string;
  /** 从相册自动识别导入的照片，记下相册里的 id，避免重复导入 */
  assetId?: string;
  addedAt: string;
}

/** 像素小人的外观 */
export interface Avatar {
  skin: string;
  hair: 'short' | 'long' | 'bun' | 'spiky' | 'cap' | 'bald';
  hairColor: string;
  outfit: string;
  extra: 'none' | 'glasses' | 'scarf' | 'bag';
}

/** 旅行伙伴（包括自己） */
export interface Companion {
  id: string;
  name: string;
  avatar: Avatar;
  isMe?: boolean;
}

export interface Footprint {
  name: string;
  country?: string;
  lat: number;
  lon: number;
  /** 去过的日期，YYYY-MM-DD */
  visits: string[];
  /** 每次旅行（按日期）和谁一起去的，值是伙伴 id */
  withWhom?: Record<string, string[]>;
  photos: Memory[];
  note: string;
}

export interface WeatherInfo {
  date: string;
  tMax: number;
  tMin: number;
  code: number;
  desc: string;
  emoji: string;
  precipProb: number | null;
  /** 出行日期超出预报范围时为 false，此时显示的是今天的天气 */
  isForecast: boolean;
}
