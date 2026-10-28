import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';
import { base64ToBytes } from '../utils/base64';
import { RawImage } from './pixelate';

// 手机上：先让系统把照片缩到很小，再在 JS 里解码出每个像素
export async function readPixels(uri: string, width: number): Promise<RawImage> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width }).renderAsync();
  const saved = await ref.saveAsync({ base64: true, format: SaveFormat.JPEG, compress: 0.9 });
  if (!saved.base64) throw new Error('没有拿到图片数据');
  const img = decode(base64ToBytes(saved.base64), { useTArray: true });
  return { width: img.width, height: img.height, data: img.data };
}
