import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text } from 'react-native';

const { width } = Dimensions.get('window');

const CLOUDS = [
  { top: 70, size: 54, duration: 26000, delay: 0 },
  { top: 170, size: 36, duration: 34000, delay: 6000 },
  { top: 300, size: 46, duration: 30000, delay: 12000 },
  { top: 460, size: 30, duration: 38000, delay: 3000 },
];

function Cloud({ top, size, duration, delay }: (typeof CLOUDS)[number]) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [x, duration, delay]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-size * 2, width + size] });
  return (
    <Animated.View style={[styles.cloud, { top, transform: [{ translateX }] }]} pointerEvents="none">
      <Text style={{ fontSize: size, opacity: 0.9 }}>☁️</Text>
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
