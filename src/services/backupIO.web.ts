import { Memory } from '../types';
import { base64ToBytes } from '../utils/base64';
import { isIdbPhoto, loadPhotoUrl, savePhoto } from './webPhotos';

export interface BackupPhoto {
  mime: string;
  base64: string;
}

// 网页版：照片在浏览器存储里，导出时转成文字
export async function readPhotoForBackup(m: Memory): Promise<BackupPhoto | null> {
  if (!isIdbPhoto(m.file)) return null;
  const blob = await (await fetch(await loadPhotoUrl(m.file))).blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return { mime: blob.type || 'image/jpeg', base64: dataUrl.split(',')[1] ?? '' };
}

export async function writePhotoFromBackup(p: BackupPhoto): Promise<string> {
  const bytes = base64ToBytes(p.base64);
  return savePhoto(new Blob([bytes.buffer as ArrayBuffer], { type: p.mime }));
}

export async function saveBackupFile(text: string, filename: string): Promise<void> {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
