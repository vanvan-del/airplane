import { geoContains } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countries110m from 'world-atlas/countries-110m.json';

// 国家编号（ISO 3166 数字码）→ 中文名，只给面积较大或常去的国家标名字
export const COUNTRY_NAMES: Record<string, string> = {
  '156': '中国', '392': '日本', '410': '韩国', '408': '朝鲜', '496': '蒙古', '643': '俄罗斯', '356': '印度',
  '398': '哈萨克斯坦', '764': '泰国', '704': '越南', '418': '老挝', '104': '缅甸', '458': '马来西亚',
  '360': '印度尼西亚', '608': '菲律宾', '116': '柬埔寨', '524': '尼泊尔', '586': '巴基斯坦', '004': '阿富汗',
  '364': '伊朗', '682': '沙特', '792': '土耳其', '036': '澳大利亚', '554': '新西兰', '840': '美国',
  '124': '加拿大', '484': '墨西哥', '076': '巴西', '032': '阿根廷', '152': '智利', '604': '秘鲁',
  '170': '哥伦比亚', '826': '英国', '250': '法国', '276': '德国', '380': '意大利', '724': '西班牙',
  '620': '葡萄牙', '578': '挪威', '752': '瑞典', '246': '芬兰', '616': '波兰', '804': '乌克兰',
  '756': '瑞士', '300': '希腊', '528': '荷兰', '818': '埃及', '710': '南非', '566': '尼日利亚',
  '404': '肯尼亚', '231': '埃塞俄比亚', '012': '阿尔及利亚', '434': '利比亚', '729': '苏丹',
  '180': '刚果（金）', '304': '格陵兰', '352': '冰岛',
};

const topo = countries110m as unknown as Topology<{ countries: GeometryCollection }>;
export const COUNTRIES = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>).features;

/** 根据坐标找所在国家：有中文名用中文名，没有就用英文名 */
export function countryAt(lon: number, lat: number): string | undefined {
  const hit = COUNTRIES.find((c) => geoContains(c as Feature, [lon, lat]));
  if (!hit) return undefined;
  return COUNTRY_NAMES[String(hit.id)] ?? hit.properties?.name;
}
