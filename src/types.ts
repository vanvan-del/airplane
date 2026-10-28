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
