import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import Clouds from '../components/Clouds';
import { PixelBox, PixelButton } from '../components/pixel/PixelBox';
import PixelIcon from '../components/pixel/PixelIcon';
import { IconName } from '../components/pixel/icons';
import { palette, px, steps, topInset } from '../theme';
import { Companion } from '../types';
import { AvatarEditor } from './CompanionsScreen';

const FEATURES: Array<[IconName, string, string]> = [
  ['train', '找最省钱的走法', '输入目的地，比较火车、飞机和大巴，直接跳转购票'],
  ['star', '定制攻略', '回答喜好、天数和节奏，排出每天的行程，附上历史故事'],
  ['globe', '点亮足迹', '在像素地球上插旗，照片一键变成像素风'],
  ['heart', '和朋友的旅行回放', '每个人一个像素角色，回放你们一起走过的路'],
];

// 第一次打开：介绍功能，然后捏一个自己的角色
export default function WelcomeScreen({ me, onDone }: { me: Companion; onDone: (me?: Companion) => void }) {
  const [step, setStep] = useState<'hello' | 'avatar'>('hello');
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 700, easing: steps(2), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: steps(2), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  if (step === 'avatar') {
    return <AvatarEditor companion={{ ...me, name: me.name === '我' ? '' : me.name }} onCancel={() => onDone()} onSave={(c) => onDone(c)} />;
  }

  return (
    <View style={styles.root}>
      <Clouds />
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={{ alignSelf: 'center', transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
          <PixelIcon name="plane" scale={8} />
        </Animated.View>
        <Text style={[px(36, palette.white), styles.title]}>欢迎登机！</Text>
        <Text style={[px(12), { textAlign: 'center' }]}>小飞机去旅行 · 一个像素风的旅行记录本</Text>
        <PixelBox contentStyle={styles.card}>
          {FEATURES.map(([icon, title, desc]) => (
            <View key={title} style={styles.feature}>
              <PixelIcon name={icon} scale={3} />
              <View style={{ flex: 1 }}>
                <Text style={px(18)}>{title}</Text>
                <Text style={px(12, palette.slate)}>{desc}</Text>
              </View>
            </View>
          ))}
        </PixelBox>
        <PixelButton bg={palette.orange} contentStyle={styles.btn} onPress={() => setStep('avatar')}>
          <Text style={px(18, palette.white)}>▶ 先捏一个自己的角色</Text>
        </PixelButton>
        <PixelButton contentStyle={styles.btn} onPress={() => onDone()}>
          <Text style={px(12)}>以后再说</Text>
        </PixelButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.sky },
  content: { paddingTop: topInset + 20, paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  title: { textAlign: 'center', textShadowColor: palette.ink, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0 },
  card: { padding: 14, gap: 14 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  btn: { alignItems: 'center', paddingVertical: 12 },
});
