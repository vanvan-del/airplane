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
  /** 热门路线里这一天的主题 */
  title?: string;
  areas: string[];
  items: PlanItem[];
  foods: Food[];
  hours: number;
}

export interface Plan {
  days: PlanDay[];
  /** 时间排不下、但也符合兴趣的备选 */
  extras: Spot[];
  /** 这份行程是按喜好排的，还是照热门路线排的 */
  mode: 'interest' | 'hot';
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

// 离市区远、要单独花一天去的片区（周边一日游），不和市区景点拼在同一天
const FAR_AREAS = new Set(
  ('延庆 怀柔 通州 青浦 番禺 佛山 大鹏 都江堰 广汉 乐山 武隆 大足 临潼 华阴 咸阳 嘉兴 余杭 江宁 南靖 集美 保亭 韶山 望城 黄岛 剑川 ' +
    '凡尔赛 诺曼底 吉维尼 利维斯登 牛津 格林威治 蒂沃利 比萨 锡耶纳 外岛 蒙特塞拉特 郊外 海牙 波茨坦 克鲁姆洛夫 库特纳霍拉 哈尔施塔特 ' +
    '圣安德烈 辛特拉 爱琴海 卡帕多奇亚 镰仓 河口湖 三鹰 奈良 大阪 坡州 大城 圣淘沙 万礼').split(' '),
);

const isNight = (s: Spot) => s.tags.includes('night') && s.tags[0] !== 'nature';

export function makePlan(guide: CityGuide, options: PlanOptions, skip: Set<Spot> = new Set()): Plan {
  const { interests, days, pace } = options;
  const cap = DAY_HOURS[pace];
  const spots = guide.spots.filter((s) => !skip.has(s));
  const ranked = spots
    .map((spot, i) => ({ spot, score: score(spot, i, spots.length, interests) }))
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
    // 顺序：同片区且符合兴趣 → 其他片区符合兴趣 → 同片区补位 → 其他经典景点
    const ordered = [
      anchor,
      ...left.filter((r) => r !== anchor && r.spot.area === main && isLiked(r)),
      ...left.filter((r) => r.spot.area !== main && isLiked(r)),
      ...left.filter((r) => r !== anchor && r.spot.area === main && !isLiked(r)),
      ...left.filter((r) => r.spot.area !== main && !isLiked(r)),
    ];
    const chosen: Spot[] = [];
    let hours = 0;
    for (const r of ordered) {
      // 还有符合兴趣的景点时，不符合的只用来补同一片区的空档
      if (!isLiked(r) && likedLeft.length > 0 && (r.spot.area !== main || hours > cap * 0.5)) continue;
      if (r.spot.area !== main && (FAR_AREAS.has(main) || FAR_AREAS.has(r.spot.area))) continue;
      if (hours + r.spot.hours > cap + 0.5 && chosen.length > 0) continue;
      chosen.push(r.spot);
      used.add(r.spot);
      hours += r.spot.hours;
      if (hours >= cap) break;
    }
    plan.push(toDay(d, chosen));
  }
  // 先逛市区，周边一日游放到后面
  plan.sort((a, b) => Number(FAR_AREAS.has(a.areas[0])) - Number(FAR_AREAS.has(b.areas[0])));
  plan.forEach((d, i) => (d.day = i + 1));

  addFoods(plan, guide);
  const extras = liked.map((r) => r.spot).filter((s) => !used.has(s));
  return { days: plan, extras, mode: 'interest' };
}

/** 照网上热门攻略的路线排；路线天数不够时，剩下的天按喜好从没去过的景点里补 */
export function hotPlan(guide: CityGuide, options: PlanOptions): Plan {
  const byName = new Map(guide.spots.map((s) => [s.name, s]));
  const route = (guide.route ?? []).slice(0, options.days);
  const used = new Set<Spot>();
  const plan = route.map((r, i) => {
    const spots = r.stops.map((n) => byName.get(n)).filter((s): s is Spot => !!s);
    spots.forEach((s) => used.add(s));
    return { ...toDay(i + 1, spots), title: r.title };
  });
  if (plan.length < options.days) {
    const rest = makePlan(guide, { ...options, days: options.days - plan.length }, used);
    rest.days.forEach((d) => plan.push({ ...d, day: plan.length + 1, title: '自由安排', foods: [] }));
  }
  plan.forEach((d) => (d.foods = []));
  addFoods(plan, guide);
  return { days: plan, extras: [], mode: 'hot' };
}

// 白天的放前面，夜景放晚上
function toDay(day: number, chosen: Spot[]): PlanDay {
  const dayItems = chosen.filter((s) => !isNight(s));
  const nightItems = dayItems.length ? chosen.filter(isNight) : [];
  if (!dayItems.length) dayItems.push(...chosen);
  let clock = 0;
  const items: PlanItem[] = dayItems.map((spot) => {
    const slot = clock < 3 ? '上午' : '下午';
    clock += spot.hours;
    return { slot, spot };
  });
  nightItems.forEach((spot) => items.push({ slot: '晚上', spot }));
  const hours = chosen.reduce((sum, s) => sum + s.hours, 0);
  return { day, areas: [...new Set(chosen.map((s) => s.area))], items, foods: [], hours };
}

// 每天推荐当地美食，轮流来
function addFoods(plan: PlanDay[], guide: CityGuide) {
  guide.foods.forEach((food, i) => {
    if (plan.length) plan[i % plan.length].foods.push(food);
  });
}
