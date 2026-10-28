import { geoContains } from 'd3-geo';
import type { Feature } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PixelBox, PixelButton } from '../components/pixel/PixelBox';
import PhotoImage from '../components/PhotoImage';
import PixelArtView from '../components/pixel/PixelArtView';
import PixelAvatar from '../components/pixel/PixelAvatar';
import PixelIcon from '../components/pixel/PixelIcon';
import { COUNTRIES } from '../data/world';
import { cellAt, gridIndexOf } from '../data/worldMap';
import { BORDER, palette, px, topInset } from '../theme';
import { Companion, Footprint } from '../types';

interface Stop {
  date: string;
  place: Footprint;
  who: Companion[];
  country: number;
}

const TICK = 100; // 每格动画 100ms，约 10 帧每秒，像老游戏
const COLS = 72;

// 把足迹按日期排成一站一站；指定了伙伴时只看和他一起去的
function buildStops(footprints: Footprint[], companions: Companion[], withId?: string): Stop[] {
  const me = companions.find((c) => c.isMe);
  const stops: Stop[] = [];
  for (const f of footprints) {
    const c = COUNTRIES.find((x) => geoContains(x as Feature, [f.lon, f.lat]));
    const country = c ? gridIndexOf(String(c.id)) : 0;
    for (const date of f.visits) {
      const ids = f.withWhom?.[date] ?? [];
      if (withId && !ids.includes(withId)) continue;
      const friends = ids.map((id) => companions.find((x) => x.id === id)).filter((x): x is Companion => !!x);
      stops.push({ date, place: f, who: [...(me ? [me] : []), ...friends], country });
    }
  }
  return stops.sort((a, b) => a.date.localeCompare(b.date));
}

// 地图范围：把所有站点框进来，留一点边，再按画面比例补齐
function frame(stops: Stop[], aspect: number) {
  const lons = stops.map((s) => s.place.lon);
  const lats = stops.map((s) => s.place.lat);
  let lon0 = Math.min(...lons);
  let lon1 = Math.max(...lons);
  let lat0 = Math.min(...lats);
  let lat1 = Math.max(...lats);
  const midLat = (lat0 + lat1) / 2;
  const k = Math.cos((midLat * Math.PI) / 180); // 高纬度横向压缩，形状更接近真实
  let w = Math.max(24, (lon1 - lon0) * 1.35) * k;
  let h = Math.max(14, (lat1 - lat0) * 1.35);
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  const cLon = (lon0 + lon1) / 2;
  const cLat = Math.max(-60 + h / 2, Math.min(75 - h / 2, midLat));
  lon0 = cLon - w / k / 2;
  lon1 = cLon + w / k / 2;
  lat0 = cLat - h / 2;
  lat1 = cLat + h / 2;
  return { lon0, lon1, lat0, lat1 };
}

interface Segment {
  stop: number;
  phase: 'fly' | 'land' | 'talk' | 'hold';
  start: number;
  len: number;
}

function stopText(s: Stop) {
  const names = s.who.map((c) => c.name).join('、');
  const where = s.place.country && s.place.country !== '中国' ? `${s.place.name}（${s.place.country}）` : s.place.name;
  return `${names} 抵达 ${where}！${s.place.note ? `\n“${s.place.note}”` : ''}`;
}

export default function ReplayScreen({
  footprints,
  companions,
  withId,
  onBack,
}: {
  footprints: Footprint[];
  companions: Companion[];
  withId?: string;
  onBack: () => void;
}) {
  const stops = useMemo(() => buildStops(footprints, companions, withId), [footprints, companions, withId]);
  const friend = companions.find((c) => c.id === withId);
  const width = Math.min(Dimensions.get('window').width - 32 - 10, 640);
  const cell = Math.floor(width / COLS);
  const mapW = cell * COLS;
  const rows = Math.round(COLS * 0.75);
  const mapH = cell * rows;
  const box = useMemo(() => (stops.length ? frame(stops, mapW / mapH) : null), [stops, mapW, mapH]);

  const toXY = (lon: number, lat: number) => {
    if (!box) return { x: 0, y: 0 };
    const x = ((lon - box.lon0) / (box.lon1 - box.lon0)) * mapW;
    const y = ((box.lat1 - lat) / (box.lat1 - box.lat0)) * mapH;
    return { x: Math.round(x / cell) * cell, y: Math.round(y / cell) * cell };
  };

  // 预先算好地图像素：海、陆地，以及每个要去的国家单独一层（到达后点亮）
  const layers = useMemo(() => {
    if (!box) return { base: [] as [string, string][], countries: new Map<number, string>() };
    const want = new Set(stops.map((s) => s.country).filter(Boolean));
    const base = new Map<string, string>();
    const countries = new Map<number, string>();
    const sq = (x: number, y: number) => `M${x * cell} ${y * cell}h${cell}v${cell}h-${cell}z`;
    for (let y = 0; y < rows; y++) {
      const lat = box.lat1 - ((y + 0.5) / rows) * (box.lat1 - box.lat0);
      for (let x = 0; x < COLS; x++) {
        const lon = box.lon0 + ((x + 0.5) / COLS) * (box.lon1 - box.lon0);
        const id = cellAt(((lon + 540) % 360) - 180, lat);
        if (id && want.has(id)) countries.set(id, (countries.get(id) ?? '') + sq(x, y));
        const color = id ? palette.green : (x * 7 + y * 13) % 23 === 0 ? palette.blue : palette.navy;
        base.set(color, (base.get(color) ?? '') + sq(x, y));
      }
    }
    return { base: [...base], countries };
  }, [box, stops, rows, cell]);

  // 时间线：每一站依次是飞过去、落地蹦一下、打字说明、停一会儿
  const timeline = useMemo(() => {
    const segs: Segment[] = [];
    let t = 0;
    stops.forEach((s, i) => {
      const push = (phase: Segment['phase'], len: number) => {
        segs.push({ stop: i, phase, start: t, len });
        t += len;
      };
      push('fly', i === 0 ? 6 : 16);
      push('land', 6);
      push('talk', Math.ceil(stopText(s).length / 2));
      push('hold', 12);
    });
    return { segs, total: t };
  }, [stops]);

  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const done = tick >= timeline.total;

  useEffect(() => {
    if (!playing || done || stops.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), TICK / speed);
    return () => clearInterval(id);
  }, [playing, done, speed, stops.length]);

  if (!box || stops.length === 0) {
    return (
      <View style={styles.root}>
        <Header title="旅行回放" sub={friend ? `和${friend.name}` : '全部旅行'} onBack={onBack} />
        <View style={styles.content}>
          <PixelBox contentStyle={{ padding: 14, gap: 8 }}>
            <Text style={px(18)}>还没有可以回放的旅行</Text>
            <Text style={px(12)}>
              {friend
                ? `在足迹的记忆页里，点日期选上「${friend.name}」，就能记下你们一起去过哪里。`
                : '先在目的地页面点「我去过这里」，或者扫描相册点亮去过的城市。'}
            </Text>
          </PixelBox>
        </View>
      </View>
    );
  }

  const seg = timeline.segs.find((s) => tick >= s.start && tick < s.start + s.len) ?? timeline.segs[timeline.segs.length - 1];
  const p = Math.min(1, (tick - seg.start) / seg.len);
  const current = stops[seg.stop];
  const arrived = done ? stops.length : seg.phase === 'fly' ? seg.stop : seg.stop + 1;
  const here = toXY(current.place.lon, current.place.lat);
  const prev = seg.stop > 0 ? stops[seg.stop - 1] : null;
  const from = prev ? toXY(prev.place.lon, prev.place.lat) : { x: here.x - 60, y: here.y - 50 };

  // 飞行中的小飞机：沿弧线一格一格移动
  let plane: { x: number; y: number; flip: boolean } | null = null;
  if (seg.phase === 'fly' && !done) {
    const x = from.x + (here.x - from.x) * p;
    const y = from.y + (here.y - from.y) * p - Math.sin(Math.PI * p) * 36;
    plane = { x: Math.round(x / cell) * cell, y: Math.round(y / cell) * cell, flip: here.x < from.x };
  }
  const hop = seg.phase === 'land' && !done ? ((tick - seg.start) % 2 === 0 ? -8 : 0) : 0;
  const text = stopText(current);
  const shown = done || seg.phase === 'hold' ? text : seg.phase === 'talk' ? text.slice(0, (tick - seg.start + 1) * 2) : '';

  // 已经走过的路线：两站之间画一串小方块
  const dots: { x: number; y: number }[] = [];
  for (let i = 1; i < arrived; i++) {
    const a = toXY(stops[i - 1].place.lon, stops[i - 1].place.lat);
    const b = toXY(stops[i].place.lon, stops[i].place.lat);
    const n = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 12));
    for (let j = 1; j < n; j++) dots.push({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n - Math.sin((Math.PI * j) / n) * 36 });
  }
  const litCountries = new Set(stops.slice(0, arrived).map((s) => s.country));
  const countryCount = new Set(stops.map((s) => s.place.country ?? '中国')).size;

  return (
    <View style={styles.root}>
      <Header title="旅行回放" sub={friend ? `和${friend.name}的旅行` : '我的全部旅行'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <PixelBox bg={palette.ink} style={{ alignSelf: 'center' }} contentStyle={{ padding: 0 }}>
          <View style={{ width: mapW, height: mapH, overflow: 'hidden' }}>
            <Svg width={mapW} height={mapH}>
              {layers.base.map(([color, d]) => (
                <Path key={color} d={d} fill={color} />
              ))}
              {[...layers.countries].map(([id, d]) => (
                <Path key={id} d={d} fill={litCountries.has(id) ? palette.yellow : palette.green} />
              ))}
            </Svg>
            {dots.map((d, i) => (
              <View key={i} style={[styles.dot, { left: Math.round(d.x / cell) * cell - 2, top: Math.round(d.y / cell) * cell - 2 }]} />
            ))}
            {stops.slice(0, arrived).map((s, i) => {
              const xy = toXY(s.place.lon, s.place.lat);
              return (
                <View key={`${s.place.name}-${s.date}-${i}`} style={[styles.flag, { left: xy.x - 3, top: xy.y - 30 }]} pointerEvents="none">
                  <PixelIcon name="flag" scale={2} />
                  <Text style={[px(12, palette.white), styles.flagLabel]}>{i + 1}</Text>
                </View>
              );
            })}
            {!plane && (
              <View style={[styles.party, { left: here.x - current.who.length * 13, top: here.y - 52 + hop }]} pointerEvents="none">
                {current.who.map((c) => (
                  <PixelAvatar key={c.id} avatar={c.avatar} scale={2} />
                ))}
              </View>
            )}
            {plane && (
              <View style={[styles.plane, { left: plane.x - 24, top: plane.y - 18, transform: [{ scaleX: plane.flip ? -1 : 1 }] }]}>
                <PixelIcon name="plane" scale={3} />
              </View>
            )}
            {!plane && (seg.phase === 'talk' || seg.phase === 'hold') && !done && current.place.photos.length > 0 && (
              // 落地后弹出这一站的照片，像一张拍立得
              <View style={[styles.polaroid, { width: Math.round(mapW * 0.36) }]} pointerEvents="none">
                {(() => {
                  const photo = current.place.photos.find((m) => m.pixel) ?? current.place.photos[0];
                  const w = Math.round(mapW * 0.36) - 12;
                  return photo.pixel ? (
                    <View style={{ width: w, height: w, overflow: 'hidden', justifyContent: 'center' }}>
                      <PixelArtView art={photo.pixel} width={w} />
                    </View>
                  ) : (
                    <PhotoImage memory={photo} style={{ width: w, height: w }} />
                  );
                })()}
                <Text style={[px(12), { textAlign: 'center' }]} numberOfLines={1}>
                  {current.place.name}
                </Text>
              </View>
            )}
            <Text style={[px(12, palette.cyan), styles.hud]}>
              STAGE {Math.min(seg.stop + 1, stops.length)}/{stops.length}
            </Text>
          </View>
        </PixelBox>

        <PixelBox bg={palette.navy} contentStyle={styles.dialog}>
          <View style={styles.row}>
            <Text style={px(12, palette.yellow)}>
              第 {seg.stop + 1} 站 · {current.date}
            </Text>
          </View>
          <Text style={[px(18, palette.white), { minHeight: 54 }]}>
            {shown}
            {!done && seg.phase === 'talk' && tick % 2 === 0 ? '▌' : ''}
          </Text>
        </PixelBox>

        <View style={styles.row}>
          <PixelButton style={{ flex: 1 }} bg={palette.orange} contentStyle={styles.btn} onPress={() => (done ? setTick(0) : setPlaying((x) => !x))}>
            <PixelIcon name={done || !playing ? 'play' : 'pause'} scale={2} tint={palette.white} />
            <Text style={px(12, palette.white)}>{done ? '再放一遍' : playing ? '暂停' : '继续'}</Text>
          </PixelButton>
          <PixelButton contentStyle={styles.btn} onPress={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}>
            <Text style={px(12)}>速度 ×{speed}</Text>
          </PixelButton>
          <PixelButton contentStyle={styles.btn} onPress={() => setTick(timeline.total)}>
            <Text style={px(12)}>跳到结尾</Text>
          </PixelButton>
        </View>

        {done && (
          <PixelBox bg={palette.yellow} contentStyle={{ padding: 12, gap: 6 }}>
            <Text style={px(18)}>旅行总结</Text>
            <Text style={px(12)}>
              从 {stops[0].date} 到 {stops[stops.length - 1].date}，一共 {stops.length} 站，去了 {new Set(stops.map((s) => s.place.name)).size} 个地方、
              {countryCount} 个国家。
            </Text>
            {stops.map((s, i) => (
              <Text key={i} style={px(12, palette.dusk)}>
                {i + 1}. {s.date} {s.place.name}
              </Text>
            ))}
          </PixelBox>
        )}
      </ScrollView>
    </View>
  );
}

function Header({ title, sub, onBack }: { title: string; sub: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.row} accessibilityRole="button">
        <PixelIcon name="back" scale={2} tint={palette.white} />
        <Text style={px(12, palette.white)}>返回</Text>
      </Pressable>
      <View style={[styles.row, { marginTop: 10 }]}>
        <PixelIcon name="plane" scale={2} />
        <Text style={[px(36, palette.white), styles.title]}>{title}</Text>
      </View>
      <Text style={px(12, palette.cyan)}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.sky },
  header: { backgroundColor: palette.navy, paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 4, borderColor: palette.ink },
  title: { textShadowColor: palette.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { position: 'absolute', width: 5, height: 5, backgroundColor: palette.white },
  flag: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-start' },
  flagLabel: { backgroundColor: palette.red, borderWidth: 2, borderColor: palette.ink, paddingHorizontal: 3, marginLeft: -2 },
  party: { position: 'absolute', flexDirection: 'row', gap: 2 },
  plane: { position: 'absolute' },
  polaroid: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: palette.white,
    borderWidth: BORDER,
    borderColor: palette.ink,
    padding: 3,
    paddingBottom: 0,
    transform: [{ rotate: '3deg' }],
  },
  hud: { position: 'absolute', left: 6, top: 4 },
  dialog: { padding: 12, gap: 6, borderColor: palette.white, borderWidth: BORDER },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10 },
});
