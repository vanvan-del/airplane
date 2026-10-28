import { geoArea, geoCentroid, geoContains, geoDistance, geoOrthographic } from 'd3-geo';
import type { Feature } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COUNTRIES, COUNTRY_NAMES } from '../data/world';
import { cellAt, gridIndexOf } from '../data/worldMap';
import { palette, px } from '../theme';
import { Footprint } from '../types';
import { PixelBox } from './pixel/PixelBox';
import PixelIcon from './pixel/PixelIcon';

/** 地球横向切成多少个像素点 */
const DOTS = 64;

const LABELS = COUNTRIES.filter((f) => f.id != null && COUNTRY_NAMES[String(f.id)]).map((f) => ({
  name: COUNTRY_NAMES[String(f.id)],
  center: geoCentroid(f) as [number, number],
  area: geoArea(f),
}));

// 太空背景里固定的几颗星星
const STARS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 61 + 13) % 100, big: i % 7 === 0 }));

// 每种地面有亮面和暗面两种颜色，做出像素风的明暗
const TONES = {
  ocean: [palette.blue, palette.navy],
  land: [palette.green, palette.teal],
  visited: [palette.yellow, palette.orange],
  ice: [palette.white, palette.grey],
};

interface Props {
  footprints: Footprint[];
  onOpen: (name: string) => void;
}

export default function GlobeView({ footprints, onOpen }: Props) {
  const [size, setSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<[number, number]>(() => {
    if (footprints.length === 0) return [-105, -30];
    const lon = footprints.reduce((s, f) => s + f.lon, 0) / footprints.length;
    const lat = footprints.reduce((s, f) => s + f.lat, 0) / footprints.length;
    return [-lon, -Math.max(-60, Math.min(60, lat))];
  });
  const [spinning, setSpinning] = useState(true);
  const drag = useRef({ start: rotation, pinch: 0, zoom: 1 });

  // 去过的国家：在格子数据里的编号
  const visited = useMemo(() => {
    const set = new Set<number>();
    for (const f of footprints) {
      const c = COUNTRIES.find((x) => geoContains(x as Feature, [f.lon, f.lat]));
      const idx = c ? gridIndexOf(String(c.id)) : 0;
      if (idx > 0) set.add(idx);
    }
    return set;
  }, [footprints]);

  // 自转也是一格一格的：每 120ms 转 3°
  useEffect(() => {
    if (!spinning) return;
    const t = setInterval(() => setRotation(([l, p]) => [l + 3, p]), 120);
    return () => clearInterval(t);
  }, [spinning]);

  const cell = Math.max(2, Math.floor(size / DOTS));
  const box = cell * DOTS;
  const radius = (box / 2) * 0.9 * zoom;
  const projection = useMemo(
    () => geoOrthographic().scale(radius).translate([box / 2, box / 2]).rotate([rotation[0], rotation[1]]).clipAngle(90),
    [radius, box, rotation],
  );
  const center: [number, number] = [-rotation[0], -rotation[1]];
  const visible = (p: [number, number]) => geoDistance(p, center) < Math.PI / 2 - 0.08;

  // 逐个像素点反算经纬度，查格子决定颜色；同色的点合并成一条路径
  const paths = useMemo(() => {
    const byColor = new Map<string, string>();
    const add = (color: string, x: number, y: number) =>
      byColor.set(color, (byColor.get(color) ?? '') + `M${x * cell} ${y * cell}h${cell}v${cell}h-${cell}z`);
    const c = box / 2;
    for (let y = 0; y < DOTS; y++) {
      for (let x = 0; x < DOTS; x++) {
        const sx = (x + 0.5) * cell;
        const sy = (y + 0.5) * cell;
        const dx = (sx - c) / radius;
        const dy = (sy - c) / radius;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) {
          // 地球外面一圈青色像素当大气层
          if (d2 < Math.pow(1 + 1.6 / (DOTS * 0.45 * zoom), 2)) add(palette.cyan, x, y);
          continue;
        }
        const ll = projection.invert?.([sx, sy]);
        if (!ll) continue;
        const [lon, lat] = ll;
        const id = cellAt(lon, lat);
        const tone = id === 0 ? TONES.ocean : visited.has(id) ? TONES.visited : Math.abs(lat) > 66 ? TONES.ice : TONES.land;
        // 光从左上方照过来：球面法线和光线方向的点积决定亮暗
        const nz = Math.sqrt(1 - d2);
        const light = -dx * 0.5 - dy * 0.6 + nz * 0.62;
        const lit = light > 0.42 || ((x + y) % 2 === 0 && light > 0.3); // 交界处用棋盘格抖动过渡
        add(lit ? tone[0] : tone[1], x, y);
      }
    }
    return [...byColor];
  }, [projection, cell, box, radius, visited, zoom]);

  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const radiusRef = useRef(radius);
  radiusRef.current = radius;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          setSpinning(false);
          drag.current.start = rotationRef.current;
          drag.current.pinch = 0;
          drag.current.zoom = zoomRef.current;
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches && touches.length === 2) {
            const d = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            if (!drag.current.pinch) drag.current.pinch = d;
            setZoom(Math.max(1, Math.min(6, (drag.current.zoom * d) / drag.current.pinch)));
            return;
          }
          const k = 57 / Math.max(1, radiusRef.current);
          const [l, p] = drag.current.start;
          setRotation([l + g.dx * k, Math.max(-85, Math.min(85, p - g.dy * k))]);
        },
      }),
    [],
  );

  const snap = (v: number) => Math.round(v / cell) * cell;

  return (
    <PixelBox bg={palette.ink} contentStyle={styles.frame}>
      <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout.width)}>
        {STARS.map((s, i) => (
          <View key={i} style={[styles.star, { left: `${s.x}%`, top: `${s.y}%` }, s.big && styles.bigStar]} />
        ))}
        {size > 0 && (
          <View {...responder.panHandlers} style={{ width: box, height: box, alignSelf: 'center', marginTop: (size - box) / 2 }}>
            <Svg width={box} height={box}>
              {paths.map(([color, d]) => (
                <Path key={color} d={d} fill={color} />
              ))}
            </Svg>
            {LABELS.map((l) => {
              // 太小的国家放大后才标名字；靠近边缘的不标，免得挤在一起
              if (l.area * zoom * zoom < 0.06 || geoDistance(l.center, center) > 1.15) return null;
              const xy = projection(l.center);
              if (!xy) return null;
              return (
                <Text key={l.name} pointerEvents="none" numberOfLines={1} style={[px(12, palette.white), styles.label, { left: snap(xy[0]) - 48, top: snap(xy[1]) - 9 }]}>
                  {l.name}
                </Text>
              );
            })}
            {footprints.map((f) => {
              const p: [number, number] = [f.lon, f.lat];
              if (!visible(p)) return null;
              const xy = projection(p);
              if (!xy) return null;
              return (
                <Pressable
                  key={f.name}
                  onPress={() => onOpen(f.name)}
                  hitSlop={8}
                  style={[styles.pin, { left: snap(xy[0]) - 3, top: snap(xy[1]) - 33 }]}
                  accessibilityLabel={`打开${f.name}的记忆`}
                >
                  <PixelIcon name="flag" scale={3} />
                  <View style={styles.pinLabel}>
                    <Text style={px(12)}>{f.name}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={styles.controls}>
          <Pressable style={styles.btn} onPress={() => { setSpinning(false); setZoom((z) => Math.min(6, z * 1.5)); }} accessibilityLabel="放大">
            <PixelIcon name="plus" scale={2} />
          </Pressable>
          <Pressable style={styles.btn} onPress={() => { setSpinning(false); setZoom((z) => Math.max(1, z / 1.5)); }} accessibilityLabel="缩小">
            <PixelIcon name="minus" scale={2} />
          </Pressable>
          <Pressable style={styles.btn} onPress={() => setSpinning((s) => !s)} accessibilityLabel={spinning ? '停止自转' : '开始自转'}>
            <PixelIcon name={spinning ? 'pause' : 'play'} scale={2} />
          </Pressable>
        </View>
        <Text style={[px(12, palette.cyan), styles.hud]}>{spinning ? '◆ AUTO' : `◆ ZOOM ×${zoom.toFixed(1)}`}</Text>
      </View>
    </PixelBox>
  );
}

const styles = StyleSheet.create({
  frame: { padding: 0 },
  wrap: { aspectRatio: 1, overflow: 'hidden', backgroundColor: palette.ink },
  star: { position: 'absolute', width: 2, height: 2, backgroundColor: palette.grey },
  bigStar: { width: 4, height: 4, backgroundColor: palette.white },
  label: {
    position: 'absolute',
    width: 96,
    textAlign: 'center',
    textShadowColor: palette.ink,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  pin: { position: 'absolute', alignItems: 'flex-start' },
  pinLabel: { backgroundColor: palette.yellow, borderWidth: 2, borderColor: palette.ink, paddingHorizontal: 4, marginTop: -2 },
  controls: { position: 'absolute', right: 8, bottom: 8, gap: 6 },
  btn: {
    width: 32,
    height: 32,
    backgroundColor: palette.white,
    borderWidth: 3,
    borderColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hud: { position: 'absolute', left: 8, top: 6 },
});
