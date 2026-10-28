import { ReactNode, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BORDER, palette, SHADOW } from '../../theme';

interface BoxProps {
  children?: ReactNode;
  /** 外层：位置、宽度、flex 这类布局 */
  style?: StyleProp<ViewStyle>;
  /** 内层：底色、内边距、排列方式 */
  contentStyle?: StyleProp<ViewStyle>;
  bg?: string;
  /** 硬阴影偏移，0 表示不要阴影 */
  depth?: number;
}

// 像素风的方框：粗黑描边 + 右下角的实心硬阴影
export function PixelBox({ children, style, contentStyle, bg = palette.white, depth = SHADOW }: BoxProps) {
  return (
    <View style={[{ marginRight: depth, marginBottom: depth }, style]}>
      {depth > 0 && <View style={[styles.shadow, { top: depth, left: depth, right: -depth, bottom: -depth }]} />}
      <View style={[styles.box, { backgroundColor: bg }, contentStyle]}>{children}</View>
    </View>
  );
}

interface ButtonProps extends Omit<BoxProps, 'depth'> {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

// 像素按钮：按下时整个按钮往右下“压”进阴影里
export function PixelButton({ children, style, contentStyle, bg = palette.white, onPress, disabled, accessibilityLabel }: ButtonProps) {
  const [down, setDown] = useState(false);
  const pressed = down && !disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[{ marginRight: SHADOW, marginBottom: SHADOW, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {!pressed && <View style={[styles.shadow, { top: SHADOW, left: SHADOW, right: -SHADOW, bottom: -SHADOW }]} />}
      <View
        style={[
          styles.box,
          { backgroundColor: bg },
          pressed && { transform: [{ translateX: SHADOW }, { translateY: SHADOW }] },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', backgroundColor: palette.ink },
  box: { borderWidth: BORDER, borderColor: palette.ink },
});
