import { Memory, PixelArt } from '../types';
import { resolvePhotoUri } from './footprints';
import { pixelate } from './pixelate';
import { readPixels } from './pixelSource';

/** 把一张记忆照片转成像素画，cols 是横向多少格 */
export async function pixelatePhoto(m: Memory, cols = 48): Promise<PixelArt> {
  const uri = await resolvePhotoUri(m);
  return pixelate(await readPixels(uri, cols * 2), cols);
}
