import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  FoodSection,
  RouteSection,
  SpotsSection,
  TicketSection,
  TransportSection,
  Trip,
  WeatherSection,
} from '../components/Sections';
import { colors, shadow, topInset } from '../theme';

interface Tile {
  key: string;
  emoji: string;
  title: string;
  color: string;
  render: (trip: Trip) => ReactNode;
}

const TILES: Tile[] = [
  { key: 'transport', emoji: '🚄', title: '交通比价', color: '#FFE3D8', render: (t) => <TransportSection trip={t} /> },
  { key: 'sights', emoji: '🏞️', title: '必去景点', color: '#DDF3FF', render: (t) => <SpotsSection trip={t} kind="sight" /> },
  { key: 'photo', emoji: '📸', title: '打卡拍照', color: '#FFE0EC', render: (t) => <SpotsSection trip={t} kind="photo" /> },
  { key: 'weather', emoji: '🌤️', title: '天气穿搭', color: '#FFF4D6', render: (t) => <WeatherSection trip={t} /> },
  { key: 'food', emoji: '🍜', title: '地道美食', color: '#E3F9EE', render: (t) => <FoodSection trip={t} /> },
  { key: 'route', emoji: '🗺️', title: '推荐路线', color: '#E9E4FF', render: (t) => <RouteSection trip={t} /> },
  { key: 'ticket', emoji: '🎫', title: '门票指南', color: '#FFEBD6', render: (t) => <TicketSection trip={t} /> },
];

function TileButton({ tile, index, onPress }: { tile: Tile; index: number; onPress: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, delay: index * 90, friction: 5, useNativeDriver: true }).start();
  }, [pop, index]);
  return (
    <Animated.View style={[styles.tileWrap, { transform: [{ scale: pop }], opacity: pop }]}>
      <Pressable
        style={({ pressed }) => [styles.tile, { backgroundColor: tile.color }, pressed && { transform: [{ scale: 0.94 }] }]}
        onPress={onPress}
      >
        <Text style={styles.tileEmoji}>{tile.emoji}</Text>
        <Text style={styles.tileTitle}>{tile.title}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ResultScreen({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const [open, setOpen] = useState<Tile | null>(null);
  const w = trip.weather;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ 重新出发</Text>
        </Pressable>
        <Text style={styles.arrived}>🛬 已抵达</Text>
        <Text style={styles.city}>{trip.to.name}</Text>
        <Text style={styles.meta}>
          {trip.from.name} → {trip.to.name} · {trip.date}
        </Text>
        {w && (
          <View style={styles.weatherBadge}>
            <Text style={styles.weatherText}>
              {w.emoji} {w.desc} {w.tMin}°~{w.tMax}°C
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        <Text style={styles.hint}>点图标查看详情 👇</Text>
        <View style={styles.tiles}>
          {TILES.map((tile, i) => (
            <TileButton key={tile.key} tile={tile} index={i} onPress={() => setOpen(tile)} />
          ))}
        </View>
      </ScrollView>

      <Modal visible={open != null} animationType="slide" transparent onRequestClose={() => setOpen(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {open?.emoji} {open?.title}
              </Text>
              <Pressable onPress={() => setOpen(null)} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>{open?.render(trip)}</ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    backgroundColor: colors.sky,
    paddingTop: topInset,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  back: { fontSize: 16, fontWeight: '700', color: colors.navy },
  arrived: { fontSize: 16, color: colors.navy, marginTop: 12, opacity: 0.8 },
  city: { fontSize: 40, fontWeight: '900', color: colors.navy },
  meta: { fontSize: 14, color: colors.navy, opacity: 0.75, marginTop: 2 },
  weatherBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  weatherText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  grid: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 14, color: colors.muted, marginBottom: 12, marginLeft: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  tileWrap: { width: '31%' },
  tile: {
    aspectRatio: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...shadow,
  },
  tileEmoji: { fontSize: 40 },
  tileTitle: { fontSize: 14, fontWeight: '800', color: colors.navy, marginTop: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(29,53,87,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '85%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: colors.navy },
  close: { fontSize: 22, color: colors.muted, fontWeight: '700' },
});
