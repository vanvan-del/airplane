import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Memory } from '../types';
import { base64ToBytes } from '../utils/base64';
import { photoUri } from './footprints';

export interface BackupPhoto {
  mime: string;
  base64: string;
}

// 手机版：读写 App 文件夹里的照片；相册里的原图（扫描导入的）不打包，相册本身就有
export async function readPhotoForBackup(m: Memory): Promise<BackupPhoto | null> {
  const uri = photoUri(m);
  if (!uri.startsWith('file://')) return null;
  const ext = uri.split('.').pop()?.toLowerCase();
  return { mime: ext === 'png' ? 'image/png' : 'image/jpeg', base64: await new File(uri).base64() };
}

export async function writePhotoFromBackup(p: BackupPhoto): Promise<string> {
  const dir = new Directory(Paths.document, 'memories');
  dir.create({ intermediates: true, idempotent: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${p.mime === 'image/png' ? 'png' : 'jpg'}`;
  new File(dir, name).write(base64ToBytes(p.base64));
  return name;
}

export async function saveBackupFile(text: string, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: '保存备份文件' });
}

export async function pickBackupFile(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', '*/*'] });
  if (picked.canceled) return null;
  return picked.result.text();
}
