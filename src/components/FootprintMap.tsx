import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { CITIES } from '../data/cities';
import { colors, shadow } from '../theme';
import { Footprint } from '../types';

// 地图范围大致覆盖中国
const LON_MIN = 73;
const LON_MAX = 135;
const LAT_MIN = 17;
const LAT_MAX = 54;

interface Props {
  footprints: Footprint[];
  onOpen: (name: string) => void;
}

export default function FootprintMap({ footprints, onOpen }: Props) {
  const [width, setWidth] = useState(0);
  const height = width * 0.72;
  const project = (lat: number, lon: number) => ({
    x: ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * width,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * height,
  });
  const visited = new Set(footprints.map((f) => f.name));

  return (
    <View style={[styles.map, { height: height || 240 }]} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 &&
        CITIES.filter((c) => !visited.has(c.name)).map((c) => {
          const p = project(c.lat, c.lon);
          return <View key={c.name} style={[styles.dot, { left: p.x - 3, top: p.y - 3 }]} />;
        })}
      {width > 0 &&
        footprints.map((f) => {
          const p = project(f.lat, f.lon);
          return (
            <Pressable key={f.name} style={[styles.pin, { left: p.x - 12, top: p.y - 26 }]} onPress={() => onOpen(f.name)} hitSlop={6}>
              <Text style={styles.flag}>🚩</Text>
              <Text style={styles.pinLabel}>{f.name}</Text>
            </Pressable>
          );
        })}
      {footprints.length === 0 && <Text style={styles.empty}>还没有点亮任何城市，快出发吧 ✈️</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#DFF1FF',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    ...shadow,
  },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#A9C7E3' },
  pin: { position: 'absolute', alignItems: 'center' },
  flag: { fontSize: 20 },
  pinLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navy,
    backgroundColor: colors.sun,
    paddingHorizontal: 5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  empty: { position: 'absolute', alignSelf: 'center', top: '45%', color: colors.muted, fontWeight: '700' },
});
