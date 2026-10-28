import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { palette, px, steps } from '../theme';
import Clouds from './Clouds';
import { PixelBox } from './pixel/PixelBox';
import PixelIcon from './pixel/PixelIcon';

const { width, height } = Dimensions.get('window');

const START = { x: 36, y: height * 0.66 };
const END = { x: width - 96, y: height * 0.3 };
const ARC = height * 0.14;
const STEPS = 18;
const GRID = 4; // 位置对齐到 4px 网格，看起来像像素游戏

function pointAt(t: number) {
  const x = START.x + (END.x - START.x) * t;
  const y = START.y + (END.y - START.y) * t - ARC * 4 * t * (1 - t);
  return { x: Math.round(x / GRID) * GRID, y: Math.round(y / GRID) * GRID };
}

const samples = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS);

interface Props {
  from: string;
  to: string;
  waiting: boolean;
  onLanded: () => void;
}

export default function FlightScene({ from, to, waiting, onLanded }: Props) {
  const t = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    // 18 格跳完全程，每格之间是硬切，像老游戏
    Animated.timing(t, { toValue: 1, duration: 2700, easing: steps(STEPS), useNativeDriver: true }).start(() => onLanded());
  }, [t, onLanded]);

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 400);
    return () => clearInterval(id);
  }, []);

  const translateX = t.interpolate({ inputRange: samples, outputRange: samples.map((s) => pointAt(s).x) });
  const translateY = t.interpolate({ inputRange: samples, outputRange: samples.map((s) => pointAt(s).y) });

  return (
    <View style={styles.container}>
      <Clouds />
      <View style={styles.titleWrap}>
        <Text style={[px(24, palette.white), styles.title]}>{waiting ? '降落中' : `飞往 ${to}`}</Text>
        <Text style={[px(12, palette.white), { opacity: blink ? 1 : 0 }]}>{waiting ? '正在查询…' : '▶ 起飞！'}</Text>
      </View>

      {samples.slice(1, -1).map((s) => {
        const p = pointAt(s);
        const opacity = t.interpolate({ inputRange: [s - 0.001, s], outputRange: [0, 1], extrapolate: 'clamp' });
        return <Animated.View key={s} style={[styles.dot, { left: p.x + 16, top: p.y + 16, opacity }]} />;
      })}

      <PixelBox style={[styles.pin, { left: START.x - 8, top: START.y + 48 }]} contentStyle={styles.pinInner}>
        <PixelIcon name="house" scale={2} />
        <Text style={px(12)}>{from}</Text>
      </PixelBox>
      <PixelBox style={[styles.pin, { left: END.x - 24, top: END.y - 52 }]} bg={palette.yellow} contentStyle={styles.pinInner}>
        <PixelIcon name="flag" scale={2} />
        <Text style={px(12)}>{to}</Text>
      </PixelBox>

      <Animated.View style={[styles.plane, { transform: [{ translateX }, { translateY }] }]}>
        <PixelIcon name="plane" scale={4} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.sky, overflow: 'hidden' },
  titleWrap: { marginTop: height * 0.12, alignItems: 'center', gap: 4 },
  title: { textShadowColor: palette.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  plane: { position: 'absolute', left: 0, top: 0 },
  dot: { position: 'absolute', width: 8, height: 8, backgroundColor: palette.white, borderWidth: 2, borderColor: palette.ink },
  pin: { position: 'absolute' },
  pinInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
});
