import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Footprint, Memory, Place } from '../types';

const STORAGE_KEY = 'footprints:v1';
const PHOTO_DIR = 'memories';

export async function loadFootprints(): Promise<Footprint[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Footprint[]) : [];
  } catch {
    return [];
  }
}

export async function saveFootprints(list: Footprint[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function newFootprint(place: Place, date: string): Footprint {
  return { name: place.name, lat: place.lat, lon: place.lon, visits: [date], photos: [], note: '' };
}

// 照片复制进 App 自己的文件夹，只存文件名：相册里删了原图、或者 App 更新后路径变了，记忆都还在
export function photoUri(m: Memory): string {
  if (m.file.includes('://')) return m.file;
  return new File(Paths.document, PHOTO_DIR, m.file).uri;
}

async function keepCopy(sourceUri: string): Promise<string> {
  try {
    const dir = new Directory(Paths.document, PHOTO_DIR);
    dir.create({ intermediates: true, idempotent: true });
    const ext = sourceUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext.length <= 5 ? ext : 'jpg'}`;
    await new File(sourceUri).copy(new File(dir, name));
    return name;
  } catch {
    // 复制失败（比如网页预览环境）时退回直接引用原图
    return sourceUri;
  }
}

async function toMemories(result: ImagePicker.ImagePickerResult): Promise<Memory[]> {
  if (result.canceled) return [];
  const now = new Date().toISOString();
  const files = await Promise.all(result.assets.map((a) => keepCopy(a.uri)));
  return files.map((file, i) => ({ id: `${Date.now()}-${i}`, file, addedAt: now }));
}

export async function pickFromAlbum(): Promise<Memory[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 30,
    quality: 0.8,
  });
  return toMemories(result);
}

export async function takePhoto(): Promise<Memory[] | 'denied'> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return 'denied';
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  return toMemories(result);
}

export function deletePhotoFile(m: Memory) {
  if (m.file.includes('://')) return;
  try {
    new File(Paths.document, PHOTO_DIR, m.file).delete();
  } catch {
    // 文件已经不在了就算了
  }
}
