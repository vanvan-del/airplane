import { memo, useMemo } from 'react';
import { Avatar } from '../../types';
import { avatarColors, avatarRows } from './avatar';
import PixelSprite from './PixelSprite';

function PixelAvatar({ avatar, scale = 3 }: { avatar: Avatar; scale?: number }) {
  const rows = useMemo(() => avatarRows(avatar), [avatar]);
  const colors = useMemo(() => avatarColors(avatar), [avatar]);
  return <PixelSprite rows={rows} colors={colors} scale={scale} />;
}

export default memo(PixelAvatar);
