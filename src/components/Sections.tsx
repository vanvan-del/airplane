import { StyleSheet, Text, View } from 'react-native';
import ExternalLink from './ExternalLink';
import { outfitAdvice } from '../services/advice';
import { amapSearch, baiduSearch, xiaohongshuSearch } from '../services/links';
import { bookingLinks, estimateOptions, formatHours } from '../services/transport';
import { colors } from '../theme';
import { Place, Spot, WeatherInfo } from '../types';

export interface Trip {
  from: Place;
  to: Place;
  date: string;
  km: number;
  weather: WeatherInfo | null;
}

function LinkButton({ emoji, label, url, color = colors.skyDeep }: { emoji: string; label: string; url: string; color?: string }) {
  return (
    <ExternalLink url={url}>
      <View style={[styles.linkBtn, { backgroundColor: color }]}>
        <Text style={styles.linkText}>
          {emoji} {label} ›
        </Text>
      </View>
    </ExternalLink>
  );
}

function Note({ children }: { children: string }) {
  return <Text style={styles.note}>💡 {children}</Text>;
}

function SearchFallback({ city, keyword }: { city: string; keyword: string }) {
  return (
    <View>
      <Text style={styles.body}>暂时还没有收录「{city}」的攻略，点下面的链接看看大家的推荐：</Text>
      <LinkButton emoji="📕" label={`小红书搜「${city}${keyword}」`} url={xiaohongshuSearch(city + keyword)} color="#FF4D6D" />
      <LinkButton emoji="🗺️" label="高德地图搜索" url={amapSearch(keyword, city)} />
      <LinkButton emoji="🔍" label="百度搜索" url={baiduSearch(city + keyword)} color={colors.muted} />
    </View>
  );
}

function SpotCard({ spot, city, showTicket }: { spot: Spot; city: string; showTicket?: boolean }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemEmoji}>{spot.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{spot.name}</Text>
        {showTicket && <Text style={styles.ticket}>🎫 {spot.ticket}</Text>}
        <Text style={styles.itemDesc}>{spot.kind === 'photo' ? '📷 ' : '👉 '}{spot.tip}</Text>
        <ExternalLink url={amapSearch(spot.name, city)}>
          <Text style={styles.inlineLink}>📍 高德导航</Text>
        </ExternalLink>
      </View>
    </View>
  );
}

export function TransportSection({ trip }: { trip: Trip }) {
  const options = estimateOptions(trip.km);
  const links = bookingLinks(trip.from, trip.to, trip.date, trip.km);
  return (
    <View>
      <Text style={styles.body}>
        {trip.from.name} → {trip.to.name}　直线约 {Math.round(trip.km)} 公里　{trip.date}
      </Text>
      {options.map((o) => (
        <View key={o.mode} style={[styles.item, o.cheapest && styles.cheapest]}>
          <Text style={styles.itemEmoji}>{o.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <Text style={styles.itemTitle}>{o.mode}</Text>
              {o.cheapest && <Text style={[styles.badge, { backgroundColor: colors.mint }]}>最省钱</Text>}
              {o.fastest && <Text style={[styles.badge, { backgroundColor: colors.coral }]}>最快</Text>}
            </View>
            <Text style={styles.price}>
              约 ¥{o.priceLow} – {o.priceHigh}
              <Text style={styles.itemDesc}>　{formatHours(o.hours)}</Text>
            </Text>
            <Text style={styles.itemDesc}>{o.note}</Text>
          </View>
        </View>
      ))}
      <Note>以上价格是按距离估算的参考区间，实时最低价请点下面的链接比价购票。</Note>
      <Text style={styles.subhead}>🔗 直达购票</Text>
      {links.map((l) => (
        <LinkButton key={l.label} emoji={l.emoji} label={l.label} url={l.url} />
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
        emoji="📕"
        label={`小红书看更多「${city}${kind === 'photo' ? '拍照机位' : '景点'}」`}
        url={xiaohongshuSearch(city + (kind === 'photo' ? '拍照机位' : '景点'))}
        color="#FF4D6D"
      />
    </View>
  );
}

export function WeatherSection({ trip }: { trip: Trip }) {
  const w = trip.weather;
  if (!w) {
    return (
      <View>
        <Text style={styles.body}>天气获取失败，请检查网络后重试。</Text>
        <LinkButton emoji="🌤️" label={`查看${trip.to.name}天气`} url={baiduSearch(trip.to.name + '天气')} />
      </View>
    );
  }
  const advice = outfitAdvice(w);
  return (
    <View>
      <View style={styles.weatherHero}>
        <Text style={{ fontSize: 64 }}>{w.emoji}</Text>
        <View>
          <Text style={styles.temp}>
            {w.tMin}° ~ {w.tMax}°C
          </Text>
          <Text style={styles.body}>
            {w.desc}
            {w.precipProb != null ? `　降水概率 ${w.precipProb}%` : ''}
          </Text>
          <Text style={styles.itemDesc}>{w.isForecast ? `${w.date} 预报` : '出行日期超出预报范围，显示的是今天的天气'}</Text>
        </View>
      </View>
      <Text style={styles.subhead}>👗 穿搭建议：{advice.summary}</Text>
      <View style={styles.chipWrap}>
        {advice.items.map((i) => (
          <Text key={i} style={styles.outfitChip}>
            {i}
          </Text>
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
          <View key={f.name} style={styles.foodTile}>
            <Text style={{ fontSize: 36 }}>{f.emoji}</Text>
            <Text style={styles.itemTitle}>{f.name}</Text>
            <Text style={[styles.itemDesc, { textAlign: 'center' }]}>{f.desc}</Text>
          </View>
        ))}
      </View>
      <LinkButton emoji="🗺️" label="高德地图找附近美食" url={amapSearch('美食', city)} />
      <LinkButton emoji="📕" label={`小红书搜「${city}美食」`} url={xiaohongshuSearch(city + '美食')} color="#FF4D6D" />
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
          <View style={styles.routeDot}>
            <Text style={styles.routeNum}>{i + 1}</Text>
          </View>
          <Text style={[styles.body, { flex: 1 }]}>{r}</Text>
        </View>
      ))}
      <LinkButton emoji="📕" label={`小红书搜「${city}旅游攻略」`} url={xiaohongshuSearch(city + '旅游攻略')} color="#FF4D6D" />
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
          <Text style={styles.itemTitle}>
            {s.emoji} {s.name}
          </Text>
          <Text style={styles.ticket}>{s.ticket}</Text>
        </View>
      ))}
      <Note>门票为参考价，旺季淡季和优惠政策会变，请以景区官方公布为准；很多热门景点需要提前在官方公众号/小程序实名预约。</Note>
      <LinkButton emoji="🔍" label={`搜索「${city}景点门票预约」`} url={baiduSearch(city + '景点门票预约')} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, color: colors.navy, lineHeight: 22, marginBottom: 8 },
  subhead: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: 12, marginBottom: 8 },
  note: { fontSize: 13, color: colors.muted, lineHeight: 19, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.line,
  },
  cheapest: { borderColor: colors.mint },
  itemEmoji: { fontSize: 32 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  itemDesc: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 2 },
  price: { fontSize: 18, fontWeight: '900', color: colors.coral, marginTop: 2 },
  ticket: { fontSize: 14, fontWeight: '700', color: colors.coral, marginTop: 2 },
  badge: { color: '#fff', fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  inlineLink: { color: colors.skyDeep, fontWeight: '700', marginTop: 6 },
  linkBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8 },
  linkText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  weatherHero: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.paper, borderRadius: 20, padding: 16 },
  temp: { fontSize: 30, fontWeight: '900', color: colors.navy },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outfitChip: {
    backgroundColor: '#FFF4D6',
    color: colors.navy,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  foodTile: { width: '47%', alignItems: 'center', backgroundColor: colors.paper, borderRadius: 16, padding: 12 },
  routeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 6 },
  routeDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' },
  routeNum: { fontWeight: '900', color: colors.navy },
  ticketRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
});
