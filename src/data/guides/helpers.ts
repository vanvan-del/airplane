import { Food, Interest, Spot } from '../../types';

// 用字母简写兴趣标签：c 人文历史 n 自然风景 p 拍照打卡 a 艺术博物馆 f 名人足迹 s 运动户外 y 夜景夜生活
const TAGS: Record<string, Interest> = { c: 'culture', n: 'nature', p: 'photo', a: 'art', f: 'people', s: 'sport', y: 'night' };

/** 景点：名称、片区、标签、建议时长、门票、小贴士、历史故事 */
export function s(name: string, area: string, tags: string, hours: number, ticket: string, tip: string, story: string): Spot {
  const list = [...tags].map((t) => TAGS[t]).filter(Boolean);
  return { name, area, tags: list, hours, ticket, tip, story, kind: list[0] === 'photo' ? 'photo' : 'sight' };
}

/** 美食：名称、介绍 */
export const f = (name: string, desc: string): Food => ({ name, desc });
