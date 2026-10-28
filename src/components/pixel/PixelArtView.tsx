import { View } from 'react-native';
import { PixelArt } from '../../types';
import PixelSprite from './PixelSprite';

// 按给定宽度显示一张像素画
export default function PixelArtView({ art, width }: { art: PixelArt; width: number }) {
  return (
    <View style={{ width, height: (width * art.h) / art.w }}>
      <PixelSprite rows={art.rows} colors={art.colors} scale={width / art.w} />
    </View>
  );
}
