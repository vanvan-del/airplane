import { geoContains } from 'd3-geo';
import type { Feature } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { PixelBox, PixelButton } from '../components/pixel/PixelBox';
import PhotoImage from '../components/PhotoImage';
import PixelArtView from '../components/pixel/PixelArtView';
import PixelAvatar from '../components/pixel/PixelAvatar';
import PixelIcon from '../components/pixel/PixelIcon';
import { COUNTRIES } from '../data/world';
import { cellAt, gridIndexOf } from '../data/worldMap';
import { BORDER, palette, px, topInset } from '../theme';
import { Companion, Footprint, Memory } from '../types';

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
  // 留出比较宽的边，给钉在旁边的拍立得腾地方
  let w = Math.max(18, (lon1 - lon0) * 2.2) * k;
  let h = Math.max(16, (lat1 - lat0) * 2.4);
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

/** 钉板上的一张拍立得：一个地方一张，用第一次去的那站决定什么时候钉上去 */
interface Pin {
  place: Footprint;
  photo?: Memory;
  dates: string[];
  firstStop: number;
  anchor: { x: number; y: number };
  x: number;
  y: number;
  tilt: number;
}

const TILTS = [-5, 4, -2, 6, -4, 3];

// 拍立得沿钉板四周排一圈，中间留给地图；按城市所在的方向分配位置，红线尽量不交叉
function layoutPins(pins: Pin[], w: number, h: number, card: { w: number; h: number }) {
  const gap = 6;
  const perRow = Math.max(1, Math.floor((w - gap) / (card.w + gap)));
  const sideRows = Math.max(0, Math.floor((h - 2 * (card.h + gap) - gap) / (card.h + gap)));
  const slots: { x: number; y: number }[] = [];
  const rowX = (k: number) => gap + k * ((w - gap * 2 - card.w) / Math.max(1, perRow - 1));
  for (let k = 0; k < perRow; k++) slots.push({ x: rowX(k), y: gap + 14 });
  for (let k = 0; k < sideRows; k++) {
    const y = gap + 14 + (k + 1) * (card.h + gap);
    slots.push({ x: w - card.w - gap, y });
  }
  for (let k = perRow - 1; k >= 0; k--) slots.push({ x: rowX(k), y: h - card.h - gap });
  for (let k = sideRows - 1; k >= 0; k--) {
    const y = gap + 14 + (k + 1) * (card.h + gap);
    slots.push({ x: gap, y });
  }
  // 位置按顺时针排好；照片也按城市相对中心的方向顺时针排
  const cx = w / 2;
  const cy = h / 2;
  const angle = (x: number, y: number) => Math.atan2(y - cy, x - cx);
  const slotAngles = slots.map((sl) => angle(sl.x + card.w / 2, sl.y + card.h / 2));
  const order = slots.map((_, k) => k).sort((a, b) => slotAngles[a] - slotAngles[b]);
  const sortedPins = [...pins].sort((a, b) => angle(a.anchor.x, a.anchor.y) - angle(b.anchor.x, b.anchor.y));
  const n = Math.min(sortedPins.length, order.length);
  const step = order.length / Math.max(1, n);
  let best: number[] = [];
  let bestCost = Infinity;
  // 试每一种整体旋转，选连线总长度最短的一种
  for (let shift = 0; shift < order.length; shift++) {
    const pick = Array.from({ length: n }, (_, k) => order[(Math.floor(k * step) + shift) % order.length]);
    const cost = pick.reduce((sum, slot, k) => {
      const pin = sortedPins[k];
      return sum + Math.hypot(slots[slot].x + card.w / 2 - pin.anchor.x, slots[slot].y + card.h / 2 - pin.anchor.y);
    }, 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = pick;
    }
  }
  sortedPins.forEach((pin, k) => {
    const slot = slots[best[k] ?? order[k % order.length]];
    pin.x = slot.x;
    pin.y = slot.y;
  });
  return pins;
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
  const width = Math.min(Dimensions.get('window').width - 32 - 16, 640);
  const cell = Math.floor(width / COLS);
  const mapW = cell * COLS;
  const rows = Math.round(COLS * 1.15); // 竖版钉板，上下有空间钉照片
  const mapH = cell * rows;
  const box = useMemo(() => (stops.length ? frame(stops, mapW / mapH) : null), [stops, mapW, mapH]);
  // 地方多时拍立得小一点，一圈能放下更多张
  const placeCount = new Set(stops.map((st) => st.place.name)).size;
  const cardW = Math.round(mapW * (placeCount > 8 ? 0.2 : 0.25));
  const card = { w: cardW, h: Math.round(cardW * 1.24) };

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

  // 钉板布局：每个地方一张拍立得
  const pins = useMemo(() => {
    const byPlace = new Map<string, Pin>();
    stops.forEach((s, i) => {
      const old = byPlace.get(s.place.name);
      if (old) {
        old.dates.push(s.date);
        return;
      }
      byPlace.set(s.place.name, {
        place: s.place,
        photo: s.place.photos.find((m) => m.pixel) ?? s.place.photos[0],
        dates: [s.date],
        firstStop: i,
        anchor: toXY(s.place.lon, s.place.lat),
        x: 0,
        y: 0,
        tilt: TILTS[byPlace.size % TILTS.length],
      });
    });
    return layoutPins([...byPlace.values()], mapW, mapH, card);
  }, [stops, box, mapW, mapH]); // eslint-disable-line react-hooks/exhaustive-deps

  // 时间线：每一站依次是飞过去、落地钉照片、打字说明、停一会儿
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
      push('hold', 14);
    });
    return { segs, total: t };
  }, [stops]);

  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState<Pin | null>(null);
  const done = tick >= timeline.total;

  useEffect(() => {
    if (!playing || done || stops.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), TICK / speed);
    return () => clearInterval(id);
  }, [playing, done, speed, stops.length]);

  if (!box || stops.length === 0) {
    return (
      <View style={styles.root}>
        <Header title="旅行钉板" sub={friend ? `和${friend.name}` : '全部旅行'} onBack={onBack} />
        <View style={styles.content}>
          <PixelBox contentStyle={{ padding: 14, gap: 8 }}>
            <Text style={px(18)}>钉板上还空着</Text>
            <Text style={px(12)}>
              {friend
                ? `在足迹的记忆页里，点日期选上「${friend.name}」，再放几张照片，你们去过的地方就会钉到这块板上。`
                : '先在目的地页面点「我去过这里」，给每个地方放几张照片，它们就会变成拍立得钉到地图上。'}
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
  const pinned = pins.filter((pin) => pin.firstStop < arrived);

  return (
    <View style={styles.root}>
      <Header title="旅行钉板" sub={friend ? `和${friend.name}一起去过的地方` : '我去过的所有地方'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.boardFrame}>
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

            {/* 红线：从拍立得的图钉连到城市的位置 */}
            <Svg width={mapW} height={mapH} style={StyleSheet.absoluteFill} pointerEvents="none">
              {pinned.map((pin) => (
                <Line
                  key={pin.place.name}
                  x1={pin.x + card.w / 2}
                  y1={pin.y + 4}
                  x2={pin.anchor.x}
                  y2={pin.anchor.y}
                  stroke={palette.red}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              ))}
              {pinned.map((pin) => (
                <Rect key={pin.place.name} x={pin.anchor.x - 4} y={pin.anchor.y - 4} width={8} height={8} fill={palette.red} stroke={palette.ink} strokeWidth={2} />
              ))}
            </Svg>

            {!plane && (
              <View style={[styles.party, { left: here.x - current.who.length * 13, top: here.y - 52 + hop }]} pointerEvents="none">
                {current.who.map((c) => (
                  <PixelAvatar key={c.id} avatar={c.avatar} scale={2} />
                ))}
              </View>
            )}

            {pinned.map((pin) => {
              // 刚到的这一站：拍立得从上方“啪”地钉下来
              const dropping = !done && pin.firstStop === seg.stop && seg.phase === 'land';
              const k = dropping ? 1 - (tick - seg.start) / seg.len : 0;
              const active = !done && pin.firstStop === seg.stop;
              return (
                <Pressable
                  key={pin.place.name}
                  onPress={() => setZoom(pin)}
                  accessibilityLabel={`看${pin.place.name}的照片`}
                  style={[
                    styles.polaroid,
                    {
                      left: pin.x,
                      top: pin.y - Math.round(k * 30),
                      width: card.w,
                      zIndex: active ? 5 : 1,
                      transform: [{ rotate: `${pin.tilt}deg` }, { scale: 1 + k * 0.25 }],
                    },
                  ]}
                >
                  <PinPhoto pin={pin} size={card.w - 10} />
                  <Text style={[px(12), { textAlign: 'center' }]} numberOfLines={1}>
                    {pin.place.name}
                  </Text>
                  <View style={styles.pushpin}>
                    <PixelIcon name="pushpin" scale={2} />
                  </View>
                </Pressable>
              );
            })}

            {plane && (
              <View style={[styles.plane, { left: plane.x - 24, top: plane.y - 18, transform: [{ scaleX: plane.flip ? -1 : 1 }] }]}>
                <PixelIcon name="plane" scale={3} />
              </View>
            )}
            <Text style={[px(12, palette.cyan), styles.hud]}>
              STAGE {Math.min(seg.stop + 1, stops.length)}/{stops.length}
            </Text>
          </View>
        </View>
        {done && <Text style={[px(12), { textAlign: 'center' }]}>点任意一张拍立得，看大图和这一站的回忆</Text>}

        <PixelBox bg={palette.navy} contentStyle={styles.dialog}>
          <Text style={px(12, palette.yellow)}>
            {done ? '旅行钉板完成！' : `第 ${seg.stop + 1} 站 · ${current.date}`}
          </Text>
          <Text style={[px(18, palette.white), { minHeight: 54 }]}>
            {done ? `一共钉上了 ${pins.length} 张拍立得，去了 ${countryCount} 个国家。` : shown}
            {!done && seg.phase === 'talk' && tick % 2 === 0 ? '▌' : ''}
          </Text>
        </PixelBox>

        <View style={styles.row}>
          <PixelButton style={{ flex: 1 }} bg={palette.orange} contentStyle={styles.btn} onPress={() => (done ? setTick(0) : setPlaying((x) => !x))}>
            <PixelIcon name={done || !playing ? 'play' : 'pause'} scale={2} tint={palette.white} />
            <Text style={px(12, palette.white)}>{done ? '再放一遍' : playing ? '暂停' : '继续'}</Text>
          </PixelButton>
          <PixelButton contentStyle={styles.btn} onPress={() => setSpeed((sp) => (sp === 1 ? 2 : sp === 2 ? 4 : 1))}>
            <Text style={px(12)}>速度 ×{speed}</Text>
          </PixelButton>
          <PixelButton contentStyle={styles.btn} onPress={() => setTick(timeline.total)}>
            <Text style={px(12)}>直接看钉板</Text>
          </PixelButton>
        </View>

        {done && (
          <PixelBox bg={palette.yellow} contentStyle={{ padding: 12, gap: 6 }}>
            <Text style={px(18)}>旅行总结</Text>
            <Text style={px(12)}>
              从 {stops[0].date} 到 {stops[stops.length - 1].date}，一共 {stops.length} 站，去了 {pins.length} 个地方、{countryCount} 个国家。
            </Text>
            {stops.map((st, i) => (
              <Text key={i} style={px(12, palette.dusk)}>
                {i + 1}. {st.date} {st.place.name}
              </Text>
            ))}
          </PixelBox>
        )}
      </ScrollView>

      <Modal visible={zoom != null} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <View style={styles.zoomBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setZoom(null)} />
          {zoom && (
            <View style={[styles.polaroid, styles.zoomCard, { transform: [{ rotate: `${zoom.tilt / 2}deg` }] }]}>
              <PinPhoto pin={zoom} size={Math.min(Dimensions.get('window').width - 80, 420)} />
              <Text style={[px(18), { textAlign: 'center' }]}>{zoom.place.name}</Text>
              <Text style={[px(12, palette.slate), { textAlign: 'center' }]}>{zoom.dates.join(' · ')}</Text>
              {zoom.place.note ? <Text style={[px(12), { textAlign: 'center' }]}>“{zoom.place.note}”</Text> : null}
              <View style={[styles.pushpin, { top: -10 }]}>
                <PixelIcon name="pushpin" scale={3} />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// 拍立得里的照片：优先用像素风版本，没有照片就画一面小旗
function PinPhoto({ pin, size }: { pin: Pin; size: number }) {
  const photo = pin.photo;
  if (!photo) {
    return (
      <View style={[styles.noPhoto, { width: size, height: size }]}>
        <PixelIcon name="flag" scale={Math.max(2, Math.round(size / 30))} />
      </View>
    );
  }
  if (photo.pixel) {
    const w = size * Math.max(1, photo.pixel.w / photo.pixel.h);
    return (
      <View style={{ width: size, height: size, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <PixelArtView art={photo.pixel} width={w} />
      </View>
    );
  }
  return <PhotoImage memory={photo} style={{ width: size, height: size }} />;
}

function Header({ title, sub, onBack }: { title: string; sub: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.row} accessibilityRole="button">
        <PixelIcon name="back" scale={2} tint={palette.white} />
        <Text style={px(12, palette.white)}>返回</Text>
      </Pressable>
      <View style={[styles.row, { marginTop: 10 }]}>
        <PixelIcon name="pushpin" scale={3} />
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
  // 钉板外框：像软木板的木边
  boardFrame: { alignSelf: 'center', borderWidth: 5, borderColor: '#8A5A36', outlineColor: palette.ink, outlineWidth: 3, outlineStyle: 'solid' },
  dot: { position: 'absolute', width: 5, height: 5, backgroundColor: palette.white },
  party: { position: 'absolute', flexDirection: 'row', gap: 2, zIndex: 3 },
  plane: { position: 'absolute', zIndex: 6 },
  hud: { position: 'absolute', left: 6, top: 4 },
  polaroid: {
    position: 'absolute',
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: palette.ink,
    padding: 4,
    paddingBottom: 2,
    alignItems: 'center',
  },
  pushpin: { position: 'absolute', top: -8, alignSelf: 'center' },
  noPhoto: { backgroundColor: palette.grey, alignItems: 'center', justifyContent: 'center' },
  zoomBg: { flex: 1, backgroundColor: 'rgba(26,28,44,0.85)', alignItems: 'center', justifyContent: 'center' },
  zoomCard: { position: 'relative', padding: 10, gap: 4 },
  dialog: { padding: 12, gap: 6, borderColor: palette.white, borderWidth: BORDER },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10 },
});
