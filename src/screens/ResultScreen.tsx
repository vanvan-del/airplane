import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PixelBox, PixelButton } from '../components/pixel/PixelBox';
import PixelIcon from '../components/pixel/PixelIcon';
import { IconName } from '../components/pixel/icons';
import {
  FoodSection,
  RouteSection,
  SpotsSection,
  TicketSection,
  TransportSection,
  Trip,
  WeatherSection,
} from '../components/Sections';
import { BORDER, palette, px, steps, topInset } from '../theme';

interface Tile {
  key: string;
  icon: IconName;
  title: string;
  color: string;
  render: (trip: Trip) => ReactNode;
}

const TILES: Tile[] = [
  { key: 'transport', icon: 'train', title: '交通比价', color: palette.orange, render: (t) => <TransportSection trip={t} /> },
  { key: 'sights', icon: 'temple', title: '必去景点', color: palette.cyan, render: (t) => <SpotsSection trip={t} kind="sight" /> },
  { key: 'photo', icon: 'camera', title: '打卡拍照', color: palette.lime, render: (t) => <SpotsSection trip={t} kind="photo" /> },
  { key: 'weather', icon: 'sun', title: '天气穿搭', color: palette.sky, render: (t) => <WeatherSection trip={t} /> },
  { key: 'food', icon: 'bowl', title: '地道美食', color: palette.white, render: (t) => <FoodSection trip={t} /> },
  { key: 'route', icon: 'map', title: '推荐路线', color: palette.grey, render: (t) => <RouteSection trip={t} /> },
  { key: 'ticket', icon: 'ticket', title: '门票指南', color: palette.yellow, render: (t) => <TicketSection trip={t} /> },
];

// 关卡图标：依次“咔”地弹出来，只有 3 个缩放档位
function TileButton({ tile, index, onPress }: { tile: Tile; index: number; onPress: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pop, { toValue: 1, duration: 240, delay: index * 110, easing: steps(3), useNativeDriver: true }).start();
  }, [pop, index]);
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return (
    <Animated.View style={[styles.tileWrap, { opacity: pop.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 1] }), transform: [{ scale }] }]}>
      <PixelButton onPress={onPress} bg={tile.color} contentStyle={styles.tile} accessibilityLabel={tile.title}>
        <PixelIcon name={tile.icon} scale={4} />
        <Text style={px(12)}>{tile.title}</Text>
      </PixelButton>
    </Animated.View>
  );
}

interface Props {
  trip: Trip;
  visited: boolean;
  onVisited: () => void;
  onBack: () => void;
}

export default function ResultScreen({ trip, visited, onVisited, onBack }: Props) {
  const [open, setOpen] = useState<Tile | null>(null);
  const w = trip.weather;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.row} accessibilityRole="button">
          <PixelIcon name="back" scale={2} tint={palette.white} />
          <Text style={px(12, palette.white)}>重新出发</Text>
        </Pressable>
        <Text style={[px(12, palette.cyan), { marginTop: 10 }]}>STAGE CLEAR · 已抵达</Text>
        <Text style={[px(48, palette.white), styles.city]}>{trip.to.name}</Text>
        <Text style={px(12, palette.grey)}>
          {trip.from.name} → {trip.to.name} · {trip.date}
        </Text>
        <View style={[styles.row, { marginTop: 10, flexWrap: 'wrap' }]}>
          {w && (
            <PixelBox contentStyle={styles.badge}>
              <PixelIcon name={w.code <= 2 ? 'sun' : 'cloud'} scale={2} />
              <Text style={px(12)}>
                {w.desc} {w.tMin}°~{w.tMax}°C
              </Text>
            </PixelBox>
          )}
          <PixelButton onPress={onVisited} bg={palette.yellow} contentStyle={styles.badge}>
            <PixelIcon name={visited ? 'photo' : 'pin'} scale={2} />
            <Text style={px(12)}>{visited ? '这里的记忆' : '我去过这里'}</Text>
          </PixelButton>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        <Text style={px(12, palette.slate)}>选择一个关卡查看详情 ▼</Text>
        <View style={styles.tiles}>
          {TILES.map((tile, i) => (
            <TileButton key={tile.key} tile={tile} index={i} onPress={() => setOpen(tile)} />
          ))}
        </View>
      </ScrollView>

      <Modal visible={open != null} animationType="fade" transparent onRequestClose={() => setOpen(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(null)} />
          <PixelBox style={styles.sheetWrap} contentStyle={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.row}>
                {open && <PixelIcon name={open.icon} scale={2} />}
                <Text style={px(18, palette.white)}>{open?.title}</Text>
              </View>
              <Pressable onPress={() => setOpen(null)} hitSlop={12} accessibilityLabel="关闭">
                <PixelIcon name="close" scale={2} tint={palette.white} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 28 }}>{open?.render(trip)}</ScrollView>
          </PixelBox>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.sky },
  header: {
    backgroundColor: palette.navy,
    paddingTop: topInset,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomWidth: 4,
    borderColor: palette.ink,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  city: { textShadowColor: palette.ink, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  grid: { padding: 16, paddingBottom: 40, gap: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tileWrap: { width: '31%' },
  tile: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(26,28,44,0.6)', justifyContent: 'flex-end', padding: 10 },
  sheetWrap: { maxHeight: '86%' },
  sheet: { backgroundColor: palette.white, flexShrink: 1 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.navy,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: BORDER,
    borderColor: palette.ink,
  },
});
