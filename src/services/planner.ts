import { CityGuide, Food, Interest, Spot } from '../types';

export type Pace = 'relaxed' | 'normal' | 'packed';

export interface PlanOptions {
  interests: Interest[];
  days: number;
  pace: Pace;
}

export interface PlanItem {
  slot: '上午' | '下午' | '晚上';
  spot: Spot;
}

export interface PlanDay {
  day: number;
  areas: string[];
  items: PlanItem[];
  foods: Food[];
  hours: number;
}

export interface Plan {
  days: PlanDay[];
  /** 时间排不下、但也符合兴趣的备选 */
  extras: Spot[];
}

export const INTEREST_LABELS: Record<Interest, string> = {
  culture: '人文历史',
  nature: '自然风景',
  photo: '拍照打卡',
  art: '艺术博物馆',
  people: '名人足迹',
  sport: '运动户外',
  night: '夜景夜生活',
};

export const PACE_LABELS: Record<Pace, string> = { relaxed: '轻松慢游', normal: '正常节奏', packed: '特种兵' };
const DAY_HOURS: Record<Pace, number> = { relaxed: 5, normal: 7, packed: 9.5 };

// 越符合兴趣分越高；同样符合时，攻略里排在前面的（更经典的）优先
function score(spot: Spot, index: number, total: number, interests: Interest[]) {
  const hits = interests.length ? spot.tags.filter((t) => interests.includes(t)).length : 1;
  return hits * 10 + (1 - index / total) * 3;
}

const isNight = (s: Spot) => s.tags.includes('night') && s.tags[0] !== 'nature';

export function makePlan(guide: CityGuide, options: PlanOptions): Plan {
  const { interests, days, pace } = options;
  const cap = DAY_HOURS[pace];
  const ranked = guide.spots
    .map((spot, i) => ({ spot, score: score(spot, i, guide.spots.length, interests) }))
    .sort((a, b) => b.score - a.score);
  // 先选符合兴趣的；不够填满行程时，再补经典景点
  const liked = ranked.filter((r) => r.score >= 10);
  const pool = [...liked, ...ranked.filter((r) => r.score < 10)];
  const used = new Set<Spot>();
  const plan: PlanDay[] = [];

  for (let d = 1; d <= days; d++) {
    const left = pool.filter((r) => !used.has(r.spot));
    if (left.length === 0) break;
    // 当天的主片区：先安排耗时长的（比如去长城、凡尔赛这种半天以上的），短的再往空档里填
    const likedLeft = left.filter((r) => r.score >= 10);
    const anchor = (likedLeft.length ? likedLeft : left).reduce((best, r) =>
      r.score + r.spot.hours * 1.5 > best.score + best.spot.hours * 1.5 ? r : best,
    );
    const main = anchor.spot.area;
    const isLiked = (r: (typeof left)[number]) => r.score >= 10;
    // 顺序：同片区且符合兴趣 → 其他片区符合兴趣 → 同片区补位
    const ordered = [
      ...left.filter((r) => r.spot.area === main && isLiked(r)),
      ...left.filter((r) => r.spot.area !== main && isLiked(r)),
      ...left.filter((r) => !isLiked(r)),
    ];
    const chosen: Spot[] = [];
    let hours = 0;
    for (const r of ordered) {
      // 不符合兴趣的只用来补位，且只补同一片区或者当天还空很多时
      if (r.score < 10 && liked.length > 0 && (r.spot.area !== main || hours > cap * 0.5)) continue;
      if (hours + r.spot.hours > cap + 0.5 && chosen.length > 0) continue;
      chosen.push(r.spot);
      used.add(r.spot);
      hours += r.spot.hours;
      if (hours >= cap) break;
    }
    // 白天的放前面，夜景放晚上
    const dayItems = chosen.filter((s) => !isNight(s));
    const nightItems = chosen.filter(isNight);
    let clock = 0;
    const items: PlanItem[] = dayItems.map((spot) => {
      const slot = clock < 3 ? '上午' : '下午';
      clock += spot.hours;
      return { slot, spot };
    });
    nightItems.forEach((spot) => items.push({ slot: '晚上', spot }));
    plan.push({ day: d, areas: [...new Set(chosen.map((s) => s.area))], items, foods: [], hours });
  }

  // 每天推荐两样当地美食，轮流来
  guide.foods.forEach((food, i) => {
    if (plan.length) plan[i % plan.length].foods.push(food);
  });

  const extras = liked.map((r) => r.spot).filter((s) => !used.has(s));
  return { days: plan, extras };
}
