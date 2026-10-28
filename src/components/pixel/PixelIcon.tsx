import { memo } from 'react';
import { ICON_COLORS, ICONS, IconName } from './icons';
import PixelSprite from './PixelSprite';

interface Props {
  name: IconName;
  /** 每个像素画多大，默认 3 */
  scale?: number;
  /** 把所有不透明像素换成同一种颜色（比如深色按钮上的白色图标） */
  tint?: string;
}

function PixelIcon({ name, scale = 3, tint }: Props) {
  return <PixelSprite rows={ICONS[name]} colors={ICON_COLORS} scale={scale} tint={tint} />;
}

export default memo(PixelIcon);
