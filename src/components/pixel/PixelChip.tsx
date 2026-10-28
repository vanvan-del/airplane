import { Pressable, StyleSheet, Text, TextStyle } from 'react-native';
import { BORDER, palette, px } from '../../theme';

interface Props {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

// 小号像素选项按钮，选中时变成深色
export default function PixelChip({ label, active, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.active]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={px(12, active ? palette.white : palette.ink)}>{label}</Text>
    </Pressable>
  );
}

export const pixelInput: TextStyle = {
  ...px(18),
  backgroundColor: palette.white,
  borderWidth: BORDER,
  borderColor: palette.ink,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 0,
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: palette.white,
    borderWidth: BORDER,
    borderColor: palette.ink,
  },
  active: { backgroundColor: palette.blue },
});
