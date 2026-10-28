import { Companion, Footprint } from '../types';
import { BackupPhoto, readPhotoForBackup, writePhotoFromBackup } from './backupIO';

// 备份文件：足迹、伙伴，以及存在 App 里的照片（转成文字一起打包）
export interface Backup {
  app: 'airplane-travel';
  v: 1;
  exportedAt: string;
  footprints: Footprint[];
  companions: Companion[];
  photos: Record<string, BackupPhoto>;
}

export async function makeBackup(footprints: Footprint[], companions: Companion[], onProgress?: (done: number, total: number) => void) {
  const all = footprints.flatMap((f) => f.photos);
  const photos: Record<string, BackupPhoto> = {};
  for (let i = 0; i < all.length; i++) {
    onProgress?.(i + 1, all.length);
    const data = await readPhotoForBackup(all[i]).catch(() => null);
    if (data) photos[all[i].id] = data;
  }
  const backup: Backup = { app: 'airplane-travel', v: 1, exportedAt: new Date().toISOString(), footprints, companions, photos };
  return JSON.stringify(backup);
}

export function parseBackup(text: string): Backup | null {
  try {
    const b = JSON.parse(text) as Backup;
    return b.app === 'airplane-travel' && Array.isArray(b.footprints) && Array.isArray(b.companions) ? b : null;
  } catch {
    return null;
  }
}

/** 恢复：把照片写回本机，再把记录里的照片位置换成新的 */
export async function restoreBackup(b: Backup): Promise<{ footprints: Footprint[]; companions: Companion[] }> {
  const footprints: Footprint[] = [];
  for (const f of b.footprints) {
    const photos = [];
    for (const m of f.photos) {
      const data = b.photos[m.id];
      const file = data ? await writePhotoFromBackup(data).catch(() => null) : null;
      photos.push(file ? { ...m, file } : m);
    }
    footprints.push({ ...f, photos });
  }
  return { footprints, companions: b.companions };
}
