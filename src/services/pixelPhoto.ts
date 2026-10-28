import { Memory, PixelArt } from '../types';
import { resolvePhotoUri } from './footprints';
import { pixelate, PixelStyle } from './pixelate';
import { readPixels } from './pixelSource';

/** 把一张记忆照片转成像素画；清晰风格横向 72 格，复古风格 48 格 */
export async function pixelatePhoto(m: Memory, style: PixelStyle = 'clear'): Promise<PixelArt> {
  const cols = style === 'clear' ? 72 : 48;
  const uri = await resolvePhotoUri(m);
  return { ...pixelate(await readPixels(uri, cols * 2), cols, style), style };
}
