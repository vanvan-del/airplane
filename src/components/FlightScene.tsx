import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, shadow } from '../theme';
import Clouds from './Clouds';

const { width, height } = Dimensions.get('window');

const START = { x: 40, y: height * 0.68 };
const END = { x: width - 90, y: height * 0.3 };
const ARC = height * 0.14;
const STEPS = 14;

// 二次弧线上的点，t 从 0 到 1
function pointAt(t: number) {
  return {
    x: START.x + (END.x - START.x) * t,
    y: START.y + (END.y - START.y) * t - ARC * 4 * t * (1 - t),
  };
}

const samples = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS);

interface Props {
  from: string;
  to: string;
  /** 数据还没加载完时显示等待提示 */
  waiting: boolean;
  onLanded: () => void;
}

export default function FlightScene({ from, to, waiting, onLanded }: Props) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 2600,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => onLanded());
  }, [t, onLanded]);

  const translateX = t.interpolate({ inputRange: samples, outputRange: samples.map((s) => pointAt(s).x) });
  const translateY = t.interpolate({ inputRange: samples, outputRange: samples.map((s) => pointAt(s).y) });
  const scale = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.4, 0.9] });

  return (
    <View style={styles.container}>
      <Clouds />
      <Text style={styles.title}>{waiting ? '🛬 正在降落，查询中…' : `✈️ 飞往 ${to}`}</Text>

      {samples.slice(1, -1).map((s) => {
        const p = pointAt(s);
        const opacity = t.interpolate({ inputRange: [s - 0.01, s], outputRange: [0, 1], extrapolate: 'clamp' });
        return <Animated.View key={s} style={[styles.dot, { left: p.x + 18, top: p.y + 22, opacity }]} />;
      })}

      <View style={[styles.pin, { left: START.x - 10, top: START.y + 50 }]}>
        <Text style={styles.pinText}>🏠 {from}</Text>
      </View>
      <View style={[styles.pin, styles.pinEnd, { left: END.x - 30, top: END.y - 46 }]}>
        <Text style={styles.pinText}>🚩 {to}</Text>
      </View>

      <Animated.Text style={[styles.plane, { transform: [{ translateX }, { translateY }, { scale }] }]}>✈️</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sky, overflow: 'hidden' },
  title: {
    marginTop: height * 0.12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: colors.navy,
  },
  plane: { position: 'absolute', left: 0, top: 0, fontSize: 48 },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cloud },
  pin: {
    position: 'absolute',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...shadow,
  },
  pinEnd: { backgroundColor: colors.sun },
  pinText: { fontSize: 15, fontWeight: '700', color: colors.navy },
});
