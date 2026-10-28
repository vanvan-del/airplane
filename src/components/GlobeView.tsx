import { geoArea, geoCentroid, geoContains, geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import type { Feature } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { COUNTRIES, COUNTRY_NAMES } from '../data/world';
import { colors, shadow } from '../theme';
import { Footprint } from '../types';

const GRATICULE = geoGraticule10();
const SPHERE = { type: 'Sphere' } as const;
const LABELS = COUNTRIES.filter((f) => f.id != null && COUNTRY_NAMES[String(f.id)]).map((f) => ({
  name: COUNTRY_NAMES[String(f.id)],
  center: geoCentroid(f),
  area: geoArea(f),
}));

interface Props {
  footprints: Footprint[];
  onOpen: (name: string) => void;
}

export default function GlobeView({ footprints, onOpen }: Props) {
  const [size, setSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  // 先让去过的地方（没有就是中国）朝向自己
  const [rotation, setRotation] = useState<[number, number]>(() => {
    if (footprints.length === 0) return [-105, -30];
    const lon = footprints.reduce((s, f) => s + f.lon, 0) / footprints.length;
    const lat = footprints.reduce((s, f) => s + f.lat, 0) / footprints.length;
    return [-lon, -Math.max(-60, Math.min(60, lat))];
  });
  const [spinning, setSpinning] = useState(true);
  const drag = useRef({ start: rotation, pinch: 0, zoom: 1 });

  const visited = useMemo(
    () =>
      new Set(
        COUNTRIES.filter((c) => footprints.some((f) => geoContains(c as Feature, [f.lon, f.lat]))).map((c) => String(c.id)),
      ),
    [footprints],
  );

  // 没人碰的时候慢慢自转
  useEffect(() => {
    if (!spinning) return;
    const t = setInterval(() => setRotation(([l, p]) => [l + 0.4, p]), 50);
    return () => clearInterval(t);
  }, [spinning]);

  const radius = (size / 2) * 0.94 * zoom;
  const projection = useMemo(
    () => geoOrthographic().scale(radius).translate([size / 2, size / 2]).rotate([rotation[0], rotation[1]]).clipAngle(90),
    [radius, size, rotation],
  );
  const path = geoPath(projection);
  const center: [number, number] = [-rotation[0], -rotation[1]];
  const visible = (p: [number, number]) => geoDistance(p, center) < Math.PI / 2 - 0.05;

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
          // 拖动 1 个半径大约转 57 度，放大后转得慢一些
          const k = 57 / Math.max(1, radiusRef.current);
          const [l, p] = drag.current.start;
          setRotation([l + g.dx * k, Math.max(-85, Math.min(85, p - g.dy * k))]);
        },
      }),
    [],
  );

  return (
    <View style={styles.wrap} onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout.width)}>
      {size > 0 && (
        <View {...responder.panHandlers} style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Path d={path(SPHERE) ?? ''} fill={colors.ocean} stroke="#9CC9EE" strokeWidth={1} />
            <Path d={path(GRATICULE) ?? ''} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.6} />
            {COUNTRIES.map((c, i) => (
              <Path
                key={String(c.id ?? i)}
                d={path(c) ?? ''}
                fill={visited.has(String(c.id)) ? colors.sun : colors.land}
                stroke="#FFFFFF"
                strokeWidth={0.6}
              />
            ))}
            {LABELS.map((l) => {
              // 放大后才显示小国家的名字
              if (l.area * zoom * zoom < 0.02 || !visible(l.center)) return null;
              const xy = projection(l.center);
              if (!xy) return null;
              return (
                <SvgText key={l.name} x={xy[0]} y={xy[1]} fontSize={10} fill={colors.muted} textAnchor="middle" fontWeight="600">
                  {l.name}
                </SvgText>
              );
            })}
            {footprints.map((f) => {
              const p: [number, number] = [f.lon, f.lat];
              if (!visible(p)) return null;
              const xy = projection(p);
              if (!xy) return null;
              return (
                <G key={f.name} onPress={() => onOpen(f.name)}>
                  <Circle cx={xy[0]} cy={xy[1]} r={12} fill="transparent" />
                  <Circle cx={xy[0]} cy={xy[1]} r={5} fill={colors.coral} stroke="#FFFFFF" strokeWidth={2} />
                  {/* 先画一层白色描边，再画文字，在任何底色上都看得清 */}
                  <SvgText x={xy[0]} y={xy[1] - 9} fontSize={12} fontWeight="800" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={3} textAnchor="middle">
                    {f.name}
                  </SvgText>
                  <SvgText x={xy[0]} y={xy[1] - 9} fontSize={12} fontWeight="800" fill={colors.navy} textAnchor="middle">
                    {f.name}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      )}
      <View style={styles.controls}>
        <Pressable style={styles.btn} onPress={() => { setSpinning(false); setZoom((z) => Math.min(6, z * 1.5)); }}>
          <Text style={styles.btnText}>＋</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => { setSpinning(false); setZoom((z) => Math.max(1, z / 1.5)); }}>
          <Text style={styles.btnText}>－</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => setSpinning((s) => !s)}>
          <Text style={styles.btnText}>{spinning ? '⏸' : '⟳'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { aspectRatio: 1, borderRadius: 24, backgroundColor: colors.navy, overflow: 'hidden', ...shadow },
  controls: { position: 'absolute', right: 10, bottom: 10, gap: 8 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 18, fontWeight: '900', color: colors.navy },
});
