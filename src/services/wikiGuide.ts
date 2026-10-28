import { CityGuide, Interest, Place, Spot } from '../types';

// 没有收录攻略的城市：用维基百科查附近的景点和简介，临时拼一份攻略。
// 维基百科在国内可能打不开，失败时返回 null。

interface GeoItem {
  pageid: number;
  title: string;
  dist: number;
}

const KEYWORDS: Array<[RegExp, Interest[]]> = [
  [/博物馆|美术馆|艺术|画廊|museum|gallery/i, ['art', 'culture']],
  [/故居|纪念馆|墓|memorial|house of/i, ['people', 'culture']],
  [/公园|山|湖|海滩|瀑布|森林|花园|park|lake|garden|beach|mount/i, ['nature']],
  [/寺|庙|教堂|大教堂|清真寺|宫|城堡|塔|古城|遗址|church|cathedral|palace|castle|temple|abbey|mosque|tower/i, ['culture', 'photo']],
  [/广场|桥|街|老城|square|bridge|street|old town/i, ['photo', 'night']],
  [/体育场|球场|stadium|arena/i, ['sport']],
];
const SKIP = /站|车站|机场|学校|大学|医院|酒店|公司|银行|小区|路$|station|airport|school|hospital|hotel/i;

async function getJson(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } finally {
    clearTimeout(timer);
  }
}

async function fromWiki(lang: 'zh' | 'en', place: Place): Promise<CityGuide | null> {
  const api = `https://${lang}.wikipedia.org/w/api.php?format=json&origin=*`;
  const geo = await getJson(`${api}&action=query&list=geosearch&gscoord=${place.lat}|${place.lon}&gsradius=10000&gslimit=50`);
  const items: GeoItem[] = (geo?.query?.geosearch ?? []).filter((g: GeoItem) => !SKIP.test(g.title));
  const picked = items
    .map((g) => ({ g, tags: KEYWORDS.find(([re]) => re.test(g.title))?.[1] }))
    .filter((x): x is { g: GeoItem; tags: Interest[] } => !!x.tags)
    .slice(0, 12);
  if (picked.length < 3) return null;
  const ids = picked.map((p) => p.g.pageid).join('|');
  const ex = await getJson(`${api}&action=query&prop=extracts&exintro=1&explaintext=1&exsentences=2&pageids=${ids}${lang === 'zh' ? '&variant=zh-cn' : ''}`);
  const pages = ex?.query?.pages ?? {};
  const spots: Spot[] = picked.map(({ g, tags }) => ({
    name: g.title,
    kind: tags[0] === 'photo' ? 'photo' : 'sight',
    tags,
    // 按离市中心的距离粗分片区，近的放一起
    area: g.dist < 1500 ? '市中心' : g.dist < 4000 ? '中心周边' : '郊外',
    hours: tags.includes('art') ? 2 : 1.5,
    ticket: '以官方为准',
    tip: `距市中心约 ${(g.dist / 1000).toFixed(1)} 公里`,
    story: (pages[g.pageid]?.extract as string | undefined)?.trim() || '暂无简介',
  }));
  return {
    intro: `「${place.name}」还没有收录整理好的攻略，下面是根据维基百科找到的附近地点，内容没有经过人工整理。`,
    spots,
    foods: [],
  };
}

export async function wikiGuide(place: Place): Promise<CityGuide | null> {
  for (const lang of ['zh', 'en'] as const) {
    try {
      const g = await fromWiki(lang, place);
      if (g) return g;
    } catch {
      // 换一种语言再试
    }
  }
  return null;
}
