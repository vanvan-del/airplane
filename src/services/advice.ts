import { WeatherInfo } from '../types';

export interface OutfitAdvice {
  summary: string;
  items: string[];
}

export function outfitAdvice(w: WeatherInfo): OutfitAdvice {
  const avg = (w.tMax + w.tMin) / 2;
  let summary: string;
  let items: string[];

  if (avg >= 28) {
    summary = '炎热，穿得清凉透气';
    items = ['👕 短袖 / 背心', '🩳 短裤 / 短裙', '🧢 遮阳帽', '🕶️ 墨镜', '🧴 防晒霜'];
  } else if (avg >= 22) {
    summary = '温暖舒适，轻薄为主';
    items = ['👕 短袖 T 恤', '👖 薄长裤 / 裙子', '🧥 带一件薄外套防空调', '🧴 防晒'];
  } else if (avg >= 16) {
    summary = '凉爽，注意早晚温差';
    items = ['👔 长袖衬衫 / T 恤', '🧥 薄外套 / 夹克', '👖 长裤', '👟 运动鞋'];
  } else if (avg >= 10) {
    summary = '偏凉，需要保暖外套';
    items = ['🧶 卫衣 / 针织衫', '🧥 风衣 / 厚外套', '👖 长裤', '🧣 薄围巾'];
  } else if (avg >= 0) {
    summary = '寒冷，做好保暖';
    items = ['🧶 毛衣 + 保暖内衣', '🧥 羽绒服 / 棉服', '🧣 围巾', '🧤 手套'];
  } else {
    summary = '严寒，全副武装';
    items = ['🧥 厚羽绒服', '🧶 加绒保暖内衣', '🧣 围巾 + 🧤 手套 + 帽子', '🥾 防滑雪地靴', '🔥 暖宝宝'];
  }

  if (w.tMax - w.tMin >= 10) items.push('🌗 昼夜温差大，记得带一件外套');
  const rainy = (w.precipProb ?? 0) >= 40 || [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(w.code);
  if (rainy) items.push('☂️ 可能下雨，带伞或雨衣');
  if (w.code >= 71 && w.code <= 86) items.push('❄️ 有雪，注意防滑');

  return { summary, items };
}
