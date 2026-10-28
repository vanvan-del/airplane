// 网页版没有 App 文件夹，照片压缩后存进浏览器的 IndexedDB，刷新页面也还在。
// 存进去的照片用 "idb:<key>" 记在 Memory.file 里。

const DB = 'travel-photos';
const STORE = 'photos';
const MAX_SIDE = 1600;

export const isIdbPhoto = (file: string) => file.startsWith('idb:');

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 大图缩到长边 1600px 再存，省浏览器空间
async function shrink(blob: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (k === 1 && blob.size < 1.5e6) return blob;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', 0.85));
  } catch {
    return blob;
  }
}

export async function savePhoto(blob: Blob): Promise<string> {
  const small = await shrink(blob);
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await run('readwrite', (s) => s.put(small, key));
  return `idb:${key}`;
}

const urlCache = new Map<string, Promise<string>>();
export function loadPhotoUrl(file: string): Promise<string> {
  if (!urlCache.has(file)) {
    urlCache.set(
      file,
      run<Blob | undefined>('readonly', (s) => s.get(file.slice(4))).then((b) => (b ? URL.createObjectURL(b) : '')),
    );
  }
  return urlCache.get(file)!;
}

export async function deletePhoto(file: string): Promise<void> {
  urlCache.delete(file);
  await run('readwrite', (s) => s.delete(file.slice(4))).catch(() => undefined);
}
