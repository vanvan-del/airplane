import { RawImage } from './pixelate';

// 网页版：用画布缩小照片并读出像素
export async function readPixels(uri: string, width: number): Promise<RawImage> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('图片读取失败'));
    img.src = uri;
  });
  const height = Math.max(1, Math.round((img.naturalHeight * width) / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持画布');
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return { width, height, data };
}
