import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Clouds from '../components/Clouds';
import { PixelBox, PixelButton } from '../components/pixel/PixelBox';
import PixelChip, { pixelInput } from '../components/pixel/PixelChip';
import PixelIcon from '../components/pixel/PixelIcon';
import { HOT_DESTINATIONS } from '../data/cities';
import { palette, px, steps, topInset } from '../theme';

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
  const [blink, setBlink] = useState(true);
  const bob = useRef(new Animated.Value(0)).current;
  const dates = quickDates();

  // 小飞机上下浮动：只有 3 个高度，一格一格跳
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: steps(3), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: steps(3), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const id = setInterval(() => setBlink((b) => !b), 500);
    return () => {
      loop.stop();
      clearInterval(id);
    };
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const canGo = from.trim().length > 0 && to.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Clouds />
      <View style={styles.ground} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.hero, { transform: [{ translateY }] }]}>
          <PixelIcon name="plane" scale={7} />
        </Animated.View>
        <Text style={[px(36, palette.white), styles.title]}>小飞机去旅行</Text>
        <Text style={[px(12, palette.ink), styles.subtitle]}>输入目的地，帮你找最省钱的出行方式</Text>

        <PixelButton onPress={onFootprints} style={styles.footprintBtn} bg={palette.yellow} contentStyle={styles.row}>
          <PixelIcon name="globe" scale={2} />
          <Text style={px(12)}>我的足迹 · 已点亮 {footprintCount} 城</Text>
        </PixelButton>

        <PixelBox contentStyle={styles.card}>
          <View style={styles.cardTitle}>
            <Text style={px(12, palette.white)}>行程设置</Text>
          </View>

          <View style={styles.row}>
            <PixelIcon name="house" scale={2} />
            <Text style={px(12)}>从哪出发</Text>
          </View>
          <TextInput style={pixelInput} value={from} onChangeText={setFrom} placeholder="例如：北京" placeholderTextColor={palette.grey} />

          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={styles.row}>
              <PixelIcon name="flag" scale={2} />
              <Text style={px(12)}>想去哪里</Text>
            </View>
            <PixelChip
              label="⇅ 对调"
              onPress={() => {
                setFrom(to);
                setTo(from);
              }}
            />
          </View>
          <TextInput style={pixelInput} value={to} onChangeText={setTo} placeholder="例如：大理" placeholderTextColor={palette.grey} />

          <Text style={px(12)}>出发日期</Text>
          <View style={styles.chips}>
            {dates.map((d) => (
              <PixelChip key={d.label} label={d.label} active={date === d.value} onPress={() => setDate(d.value)} />
            ))}
          </View>
          <TextInput style={pixelInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={palette.grey} />

          {error && <Text style={px(12, palette.red)}>！{error}</Text>}

          <PixelButton
            bg={palette.orange}
            disabled={!canGo}
            onPress={() => onTakeOff({ from: from.trim(), to: to.trim(), date })}
            contentStyle={styles.go}
            accessibilityLabel="起飞"
          >
            <Text style={[px(24, palette.white), { opacity: canGo && !blink ? 0.6 : 1 }]}>▶ 起飞！</Text>
          </PixelButton>
        </PixelBox>

        <View style={[styles.row, { marginTop: 20 }]}>
          <PixelIcon name="star" scale={2} />
          <Text style={px(18, palette.ink)}>热门目的地</Text>
        </View>
        <View style={styles.chips}>
          {HOT_DESTINATIONS.map((name) => (
            <PixelChip key={name} label={name} active={to === name} onPress={() => setTo(name)} />
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.sky },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, backgroundColor: palette.green, borderTopWidth: 4, borderColor: palette.ink },
  content: { paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  hero: { alignSelf: 'center', marginTop: 8 },
  title: { textAlign: 'center', textShadowColor: palette.ink, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0 },
  subtitle: { textAlign: 'center', marginBottom: 4 },
  footprintBtn: { alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { padding: 14, paddingTop: 0, gap: 10 },
  cardTitle: { backgroundColor: palette.navy, marginHorizontal: -14, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  go: { alignItems: 'center', paddingVertical: 10 },
});
