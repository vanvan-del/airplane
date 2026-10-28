import { StyleSheet, Text, View } from 'react-native';
import { outfitAdvice } from '../services/advice';
import { amapSearch, baiduSearch, xiaohongshuSearch } from '../services/links';
import { bookingLinks, estimateOptions, formatHours } from '../services/transport';
import { BORDER, palette, px } from '../theme';
import { Place, Spot, WeatherInfo } from '../types';
import ExternalLink from './ExternalLink';
import { PixelBox } from './pixel/PixelBox';
import PixelIcon from './pixel/PixelIcon';
import { IconName } from './pixel/icons';

export interface Trip {
  from: Place;
  to: Place;
  date: string;
  km: number;
  weather: WeatherInfo | null;
}

// 数据里的 emoji 换成对应的像素图标
const EMOJI_ICON: Record<string, IconName> = { '✈️': 'plane', '🛫': 'plane', '🚄': 'train', '🚆': 'train', '🚂': 'train', '🚕': 'pin', '🎟️': 'ticket' };
// 去掉文字开头的 emoji，像素字体里没有彩色表情
const plain = (s: string) => s.replace(/^[^\p{Script=Han}\p{L}\p{N}]+\s*/u, '');

function LinkButton({ icon, label, url, color = palette.blue }: { icon: IconName; label: string; url: string; color?: string }) {
  return (
    <ExternalLink url={url}>
      <PixelBox bg={color} style={{ marginBottom: 8 }} contentStyle={styles.link}>
        <PixelIcon name={icon} scale={2} />
        <Text style={[px(12, palette.white), { flex: 1 }]}>{label}</Text>
        <Text style={px(12, palette.white)}>▶</Text>
      </PixelBox>
    </ExternalLink>
  );
}

function Note({ children }: { children: string }) {
  return <Text style={[px(12, palette.slate), styles.note]}>※ {children}</Text>;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={px(12, palette.white)}>{label}</Text>
    </View>
  );
}

function SearchFallback({ city, keyword }: { city: string; keyword: string }) {
  return (
    <View>
      <Text style={[px(12), styles.body]}>暂时还没有收录「{city}」的攻略，点下面的链接看看大家的推荐：</Text>
      <LinkButton icon="note" label={`小红书搜「${city}${keyword}」`} url={xiaohongshuSearch(city + keyword)} color={palette.red} />
      <LinkButton icon="map" label="高德地图搜索" url={amapSearch(keyword, city)} />
      <LinkButton icon="globe" label="百度搜索" url={baiduSearch(city + keyword)} color={palette.slate} />
    </View>
  );
}

function Item({ icon, children, highlight }: { icon: IconName; children: React.ReactNode; highlight?: string }) {
  return (
    <PixelBox bg={highlight ?? palette.white} style={{ marginBottom: 10 }} contentStyle={styles.item}>
      <PixelIcon name={icon} scale={3} />
      <View style={{ flex: 1, gap: 2 }}>{children}</View>
    </PixelBox>
  );
}

function SpotCard({ spot, city, showTicket }: { spot: Spot; city: string; showTicket?: boolean }) {
  return (
    <Item icon={spot.kind === 'photo' ? 'camera' : 'temple'}>
      <Text style={px(18)}>{spot.name}</Text>
      {showTicket && <Text style={px(12, palette.red)}>门票：{spot.ticket}</Text>}
      <Text style={px(12, palette.slate)}>
        {spot.kind === 'photo' ? '拍照：' : '提示：'}
        {spot.tip}
      </Text>
      <ExternalLink url={amapSearch(spot.name, city)}>
        <Text style={px(12, palette.blue)}>▶ 高德导航</Text>
      </ExternalLink>
    </Item>
  );
}

export function TransportSection({ trip }: { trip: Trip }) {
  const options = estimateOptions(trip.km);
  const links = bookingLinks(trip.from, trip.to, trip.date, trip.km);
  return (
    <View>
      <Text style={[px(12), styles.body]}>
        {trip.from.name} → {trip.to.name}　直线约 {Math.round(trip.km)} 公里　{trip.date}
      </Text>
      {options.map((o) => (
        <Item key={o.mode} icon={EMOJI_ICON[o.emoji] ?? 'pin'} highlight={o.cheapest ? palette.lime : undefined}>
          <View style={styles.row}>
            <Text style={px(12)}>{o.mode}</Text>
            {o.cheapest && <Badge label="最省钱" color={palette.green} />}
            {o.fastest && <Badge label="最快" color={palette.orange} />}
          </View>
          <Text style={px(24, palette.red)}>
            ¥{o.priceLow}-{o.priceHigh}
          </Text>
          <Text style={px(12, palette.slate)}>
            {formatHours(o.hours)}　{o.note}
          </Text>
        </Item>
      ))}
      <Note>价格是按距离估算的参考区间，实时最低价请点下面的链接比价购票。</Note>
      <Text style={[px(18), styles.subhead]}>直达购票</Text>
      {links.map((l) => (
        <LinkButton key={l.label} icon={EMOJI_ICON[l.emoji] ?? 'ticket'} label={l.label} url={l.url} />
      ))}
    </View>
  );
}

export function SpotsSection({ trip, kind }: { trip: Trip; kind: Spot['kind'] }) {
  const city = trip.to.name;
  const spots = trip.to.guide?.spots.filter((s) => s.kind === kind) ?? [];
  if (spots.length === 0) return <SearchFallback city={city} keyword={kind === 'photo' ? '拍照打卡' : '必去景点'} />;
  return (
    <View>
      {spots.map((s) => (
        <SpotCard key={s.name} spot={s} city={city} showTicket={kind === 'sight'} />
      ))}
      <LinkButton
        icon="note"
        label={`小红书看更多「${city}${kind === 'photo' ? '拍照机位' : '景点'}」`}
        url={xiaohongshuSearch(city + (kind === 'photo' ? '拍照机位' : '景点'))}
        color={palette.red}
      />
    </View>
  );
}

export function WeatherSection({ trip }: { trip: Trip }) {
  const w = trip.weather;
  if (!w) {
    return (
      <View>
        <Text style={[px(12), styles.body]}>天气获取失败，请检查网络后重试。</Text>
        <LinkButton icon="sun" label={`查看${trip.to.name}天气`} url={baiduSearch(trip.to.name + '天气')} />
      </View>
    );
  }
  const advice = outfitAdvice(w);
  return (
    <View>
      <PixelBox bg={palette.cyan} contentStyle={styles.weatherHero}>
        <PixelIcon name={w.code <= 2 ? 'sun' : 'cloud'} scale={6} />
        <View style={{ flex: 1 }}>
          <Text style={px(36)}>
            {w.tMin}°~{w.tMax}°
          </Text>
          <Text style={px(12)}>
            {w.desc}
            {w.precipProb != null ? `　降水 ${w.precipProb}%` : ''}
          </Text>
          <Text style={px(12, palette.slate)}>{w.isForecast ? `${w.date} 预报` : '超出预报范围，显示今天的天气'}</Text>
        </View>
      </PixelBox>
      <Text style={[px(18), styles.subhead]}>穿搭建议：{advice.summary}</Text>
      <View style={styles.chipWrap}>
        {advice.items.map((i) => (
          <View key={i} style={styles.outfit}>
            <Text style={px(12)}>▪ {plain(i)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function FoodSection({ trip }: { trip: Trip }) {
  const city = trip.to.name;
  const foods = trip.to.guide?.foods ?? [];
  if (foods.length === 0) return <SearchFallback city={city} keyword="美食" />;
  return (
    <View>
      <View style={styles.foodGrid}>
        {foods.map((f) => (
          <PixelBox key={f.name} style={styles.foodTile} bg={palette.yellow} contentStyle={styles.foodInner}>
            <PixelIcon name="bowl" scale={3} />
            <Text style={px(12)}>{f.name}</Text>
            <Text style={[px(12, palette.slate), { textAlign: 'center' }]}>{f.desc}</Text>
          </PixelBox>
        ))}
      </View>
      <LinkButton icon="map" label="高德地图找附近美食" url={amapSearch('美食', city)} />
      <LinkButton icon="note" label={`小红书搜「${city}美食」`} url={xiaohongshuSearch(city + '美食')} color={palette.red} />
    </View>
  );
}

export function RouteSection({ trip }: { trip: Trip }) {
  const city = trip.to.name;
  const route = trip.to.guide?.route ?? [];
  if (route.length === 0) return <SearchFallback city={city} keyword="旅游路线" />;
  return (
    <View>
      {route.map((r, i) => (
        <View key={r} style={styles.routeRow}>
          <View style={styles.routeNum}>
            <Text style={px(12, palette.white)}>{i + 1}</Text>
          </View>
          <Text style={[px(12), { flex: 1 }]}>{r.replace(/^第\d+天：/, '')}</Text>
        </View>
      ))}
      <LinkButton icon="note" label={`小红书搜「${city}旅游攻略」`} url={xiaohongshuSearch(city + '旅游攻略')} color={palette.red} />
    </View>
  );
}

export function TicketSection({ trip }: { trip: Trip }) {
  const city = trip.to.name;
  const spots = trip.to.guide?.spots ?? [];
  if (spots.length === 0) return <SearchFallback city={city} keyword="景点门票" />;
  return (
    <View>
      {spots.map((s) => (
        <View key={s.name} style={styles.ticketRow}>
          <PixelIcon name="ticket" scale={2} />
          <View style={{ flex: 1 }}>
            <Text style={px(12)}>{s.name}</Text>
            <Text style={px(12, palette.red)}>{s.ticket}</Text>
          </View>
        </View>
      ))}
      <Note>门票为参考价，旺季淡季和优惠政策会变，请以景区官方公布为准；很多热门景点需要提前在官方公众号/小程序实名预约。</Note>
      <LinkButton icon="globe" label={`搜索「${city}景点门票预约」`} url={baiduSearch(city + '景点门票预约')} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { marginBottom: 10 },
  subhead: { marginTop: 14, marginBottom: 8 },
  note: { marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  item: { flexDirection: 'row', gap: 10, padding: 10, alignItems: 'flex-start' },
  badge: { paddingHorizontal: 6, borderWidth: 2, borderColor: palette.ink },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10 },
  weatherHero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outfit: { backgroundColor: palette.yellow, borderWidth: 2, borderColor: palette.ink, paddingHorizontal: 8, paddingVertical: 2 },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  foodTile: { width: '46%', marginBottom: 10 },
  foodInner: { alignItems: 'center', padding: 8, gap: 4 },
  routeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  routeNum: { width: 28, height: 28, backgroundColor: palette.blue, borderWidth: BORDER, borderColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 2, borderColor: palette.grey },
});
