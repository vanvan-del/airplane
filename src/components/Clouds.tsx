import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { steps } from '../theme';
import PixelIcon from './pixel/PixelIcon';

const { width } = Dimensions.get('window');

const CLOUDS = [
  { top: 80, scale: 6, duration: 30000, delay: 0 },
  { top: 210, scale: 4, duration: 42000, delay: 9000 },
  { top: 360, scale: 5, duration: 36000, delay: 18000 },
  { top: 520, scale: 3, duration: 48000, delay: 4000 },
];

// 像素云：一格一格往右飘
function Cloud({ top, scale, duration, delay }: (typeof CLOUDS)[number]) {
  const x = useRef(new Animated.Value(0)).current;
  const size = 12 * scale;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration, delay, easing: steps(Math.round(duration / 250)), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [x, duration, delay]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-size, width + size] });
  return (
    <Animated.View style={[styles.cloud, { top, transform: [{ translateX }] }]} pointerEvents="none">
      <PixelIcon name="cloud" scale={scale} />
    </Animated.View>
  );
}

export default function Clouds() {
  return (
    <>
      {CLOUDS.map((c, i) => (
        <Cloud key={i} {...c} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  cloud: { position: 'absolute', left: 0 },
});
