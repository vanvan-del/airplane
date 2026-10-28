import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomAvatar } from '../components/pixel/avatar';
import { Companion, Footprint } from '../types';

const KEY = 'companions:v1';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export async function loadCompanions(): Promise<Companion[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Companion[]) : [];
    if (list.some((c) => c.isMe)) return list;
    // 第一次打开：先给自己建一个角色
    return [{ id: newId(), name: '我', avatar: randomAvatar(), isMe: true }, ...list];
  } catch {
    return [{ id: newId(), name: '我', avatar: randomAvatar(), isMe: true }];
  }
}

export async function saveCompanions(list: Companion[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

// ---- 邀请码：把自己的角色和一起去过的地方打包成一串文字 ----

interface InvitePayload {
  v: 1;
  from: Companion;
  trips: Array<{ name: string; lat: number; lon: number; country?: string; dates: string[] }>;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// 中文先转成 UTF-8 字节，再编码成网址安全的 base64
function toBase64(text: string): string {
  const bin = unescape(encodeURIComponent(text));
  let out = '';
  for (let i = 0; i < bin.length; i += 3) {
    const a = bin.charCodeAt(i);
    const b = bin.charCodeAt(i + 1);
    const c = bin.charCodeAt(i + 2);
    const n = (a << 16) | ((b || 0) << 8) | (c || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bin.length ? B64[(n >> 6) & 63] : '';
    out += i + 2 < bin.length ? B64[n & 63] : '';
  }
  return out;
}

function fromBase64(code: string): string {
  let bin = '';
  for (let i = 0; i < code.length; i += 4) {
    const n =
      (B64.indexOf(code[i]) << 18) |
      (B64.indexOf(code[i + 1]) << 12) |
      ((code[i + 2] ? B64.indexOf(code[i + 2]) : 0) << 6) |
      (code[i + 3] ? B64.indexOf(code[i + 3]) : 0);
    bin += String.fromCharCode((n >> 16) & 255);
    if (code[i + 2]) bin += String.fromCharCode((n >> 8) & 255);
    if (code[i + 3]) bin += String.fromCharCode(n & 255);
  }
  return decodeURIComponent(escape(bin));
}

const PREFIX = 'FEIJI1.';

/** 生成邀请码：带上我的角色；如果指定了朋友，再带上我们一起去过的地方 */
export function makeInviteCode(me: Companion, footprints: Footprint[], friendId?: string): string {
  const trips = friendId
    ? footprints
        .map((f) => ({
          name: f.name,
          lat: f.lat,
          lon: f.lon,
          country: f.country,
          dates: f.visits.filter((d) => f.withWhom?.[d]?.includes(friendId)),
        }))
        .filter((t) => t.dates.length > 0)
    : [];
  const payload: InvitePayload = { v: 1, from: { id: me.id, name: me.name, avatar: me.avatar }, trips };
  return PREFIX + toBase64(JSON.stringify(payload));
}

export function inviteLink(code: string) {
  return `https://vanvan-del.github.io/airplane/#invite=${code}`;
}

/** 解析别人发来的邀请码或邀请链接 */
export function readInviteCode(input: string): InvitePayload | null {
  const match = input.match(/FEIJI1\.([A-Za-z0-9_-]+)/);
  if (!match) return null;
  try {
    const data = JSON.parse(fromBase64(match[1])) as InvitePayload;
    if (data.v !== 1 || !data.from?.id || !data.from.avatar) return null;
    return data;
  } catch {
    return null;
  }
}

/** 收下邀请：加上对方的角色，把一起去过的地方记成和对方同行 */
export function acceptInvite(
  data: InvitePayload,
  companions: Companion[],
  footprints: Footprint[],
): { companions: Companion[]; footprints: Footprint[] } {
  const friend: Companion = { ...data.from, isMe: false };
  const nextCompanions = companions.some((c) => c.id === friend.id)
    ? companions.map((c) => (c.id === friend.id ? { ...c, name: friend.name, avatar: friend.avatar } : c))
    : [...companions, friend];

  const nextFootprints = [...footprints];
  for (const t of data.trips) {
    let idx = nextFootprints.findIndex((f) => f.name === t.name);
    if (idx < 0) {
      nextFootprints.push({ name: t.name, lat: t.lat, lon: t.lon, country: t.country, visits: [], photos: [], note: '' });
      idx = nextFootprints.length - 1;
    }
    const f = nextFootprints[idx];
    const withWhom = { ...(f.withWhom ?? {}) };
    for (const d of t.dates) {
      withWhom[d] = [...new Set([...(withWhom[d] ?? []), friend.id])];
    }
    nextFootprints[idx] = { ...f, visits: [...new Set([...f.visits, ...t.dates])].sort(), withWhom };
  }
  return { companions: nextCompanions, footprints: nextFootprints };
}
