import { WeatherInfo } from '../types';

interface ForecastResponse {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: Array<number | null>;
  };
}

// WMO 天气代码 → 中文描述和图标
export function describeWeather(code: number): { desc: string; emoji: string } {
  if (code === 0) return { desc: '晴', emoji: '☀️' };
  if (code <= 2) return { desc: '晴间多云', emoji: '🌤️' };
  if (code === 3) return { desc: '阴', emoji: '☁️' };
  if (code === 45 || code === 48) return { desc: '雾', emoji: '🌫️' };
  if (code >= 51 && code <= 57) return { desc: '毛毛雨', emoji: '🌦️' };
  if (code >= 61 && code <= 67) return { desc: '雨', emoji: '🌧️' };
  if (code >= 71 && code <= 77) return { desc: '雪', emoji: '❄️' };
  if (code >= 80 && code <= 82) return { desc: '阵雨', emoji: '🌦️' };
  if (code === 85 || code === 86) return { desc: '阵雪', emoji: '🌨️' };
  if (code >= 95) return { desc: '雷阵雨', emoji: '⛈️' };
  return { desc: '多云', emoji: '⛅' };
}

// Open-Meteo 免费天气预报，最多 16 天；出行日期更远时退回显示今天的天气
export async function getWeather(lat: number, lon: number, date: string): Promise<WeatherInfo | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max' +
      '&timezone=Asia%2FShanghai&forecast_days=16';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: ForecastResponse = await res.json();
    const daily = data.daily;
    if (!daily || daily.time.length === 0) return null;

    let i = daily.time.indexOf(date);
    const isForecast = i >= 0;
    if (!isForecast) i = 0;
    const code = daily.weather_code[i];
    return {
      date: daily.time[i],
      tMax: Math.round(daily.temperature_2m_max[i]),
      tMin: Math.round(daily.temperature_2m_min[i]),
      code,
      precipProb: daily.precipitation_probability_max[i] ?? null,
      isForecast,
      ...describeWeather(code),
    };
  } catch {
    return null;
  }
}
