export type SpotKind = 'sight' | 'photo';

export interface Spot {
  name: string;
  emoji: string;
  kind: SpotKind;
  /** 门票参考，以景区官方公布为准 */
  ticket: string;
  tip: string;
}

export interface Food {
  name: string;
  emoji: string;
  desc: string;
}

export interface CityGuide {
  spots: Spot[];
  foods: Food[];
  route: string[];
}

export interface Place {
  name: string;
  lat: number;
  lon: number;
  /** 城市三字码，用于拼携程机票链接 */
  code?: string;
  guide?: CityGuide;
}

export interface Memory {
  id: string;
  /** App 文件夹里的文件名；复制失败时是原图的完整 uri */
  file: string;
  addedAt: string;
}

export interface Footprint {
  name: string;
  lat: number;
  lon: number;
  /** 去过的日期，YYYY-MM-DD */
  visits: string[];
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
