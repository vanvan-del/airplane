import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Clouds from '../components/Clouds';
import { HOT_DESTINATIONS } from '../data/cities';
import { colors, shadow, topInset } from '../theme';

export interface TripQuery {
  from: string;
  to: string;
  date: string;
}

interface Props {
  initial: TripQuery;
  error: string | null;
  footprintCount: number;
  onTakeOff: (q: TripQuery) => void;
  onFootprints: () => void;
}

export function toDateString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function quickDates() {
  const today = new Date();
  const add = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return toDateString(d);
  };
  const toSaturday = (6 - today.getDay() + 7) % 7 || 7;
  return [
    { label: '今天', value: add(0) },
    { label: '明天', value: add(1) },
    { label: '后天', value: add(2) },
    { label: '这周六', value: add(toSaturday) },
  ];
}

export default function HomeScreen({ initial, error, footprintCount, onTakeOff, onFootprints }: Props) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [date, setDate] = useState(initial.date);
  const bob = useRef(new Animated.Value(0)).current;
  const dates = quickDates();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
  const canGo = from.trim().length > 0 && to.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Clouds />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.Text style={[styles.plane, { transform: [{ translateY }, { rotate }] }]}>✈️</Animated.Text>
        <Text style={styles.title}>小飞机去旅行</Text>
        <Text style={styles.subtitle}>输入目的地，小飞机帮你找最省钱的出行方式</Text>
        <Pressable style={styles.footprintBtn} onPress={onFootprints}>
          <Text style={styles.footprintText}>🗺️ 我的足迹 · 已点亮 {footprintCount} 城</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.label}>🏠 从哪出发</Text>
          <TextInput style={styles.input} value={from} onChangeText={setFrom} placeholder="例如：北京" />

          <Pressable
            style={styles.swap}
            onPress={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            <Text style={styles.swapText}>⇅</Text>
          </Pressable>

          <Text style={styles.label}>🚩 想去哪里</Text>
          <TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="例如：大理" />

          <Text style={styles.label}>📅 出发日期</Text>
          <View style={styles.chips}>
            {dates.map((d) => (
              <Pressable
                key={d.label}
                style={[styles.chip, date === d.value && styles.chipActive]}
                onPress={() => setDate(d.value)}
              >
                <Text style={[styles.chipText, date === d.value && styles.chipTextActive]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

          {error && <Text style={styles.error}>⚠️ {error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.goButton, !canGo && styles.goDisabled, pressed && { transform: [{ scale: 0.96 }] }]}
            disabled={!canGo}
            onPress={() => onTakeOff({ from: from.trim(), to: to.trim(), date })}
          >
            <Text style={styles.goText}>起飞！🛫</Text>
          </Pressable>
        </View>

        <Text style={styles.hotTitle}>🔥 热门目的地</Text>
        <View style={styles.chips}>
          {HOT_DESTINATIONS.map((name) => (
            <Pressable key={name} style={[styles.chip, styles.hotChip]} onPress={() => setTo(name)}>
              <Text style={styles.chipText}>{name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky },
  content: { paddingTop: topInset, paddingHorizontal: 20, paddingBottom: 40 },
  plane: { fontSize: 72, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 32, fontWeight: '900', color: colors.navy, textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 14, color: colors.navy, opacity: 0.75, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  footprintBtn: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 18,
    ...shadow,
  },
  footprintText: { fontSize: 15, fontWeight: '800', color: colors.navy },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 20, ...shadow },
  label: { fontSize: 15, fontWeight: '700', color: colors.navy, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.navy,
    marginBottom: 12,
  },
  swap: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapText: { fontSize: 20, fontWeight: '900', color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.skyDeep, borderColor: colors.skyDeep },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  chipTextActive: { color: '#fff' },
  hotChip: { backgroundColor: colors.card, borderColor: colors.card },
  error: { color: colors.coral, fontWeight: '700', marginBottom: 10 },
  goButton: {
    backgroundColor: colors.coral,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    borderBottomWidth: 5,
    borderBottomColor: '#D85A3B',
  },
  goDisabled: { opacity: 0.5 },
  goText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  hotTitle: { fontSize: 17, fontWeight: '800', color: colors.navy, marginTop: 24, marginBottom: 10 },
});
