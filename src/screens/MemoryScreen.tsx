import { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PhotoImage from '../components/PhotoImage';
import { PixelBox, PixelButton } from '../components/pixel/PixelBox';
import PixelChip, { pixelInput } from '../components/pixel/PixelChip';
import PixelArtView from '../components/pixel/PixelArtView';
import PixelAvatar from '../components/pixel/PixelAvatar';
import PixelIcon from '../components/pixel/PixelIcon';
import { deletePhotoFile, pickFromAlbum, takePhoto } from '../services/footprints';
import { PIXEL_STYLE_LABELS, PixelStyle } from '../services/pixelate';
import { pixelatePhoto } from '../services/pixelPhoto';
import { BORDER, palette, px, topInset } from '../theme';
import { Companion, Footprint, Memory } from '../types';
import { toDateString } from './HomeScreen';

const GAP = 6;
const TILE = Math.floor((Math.min(Dimensions.get('window').width, 600) - 32 - GAP * 2) / 3);

interface Props {
  footprint: Footprint;
  companions: Companion[];
  onChange: (f: Footprint) => void;
  onRemove: () => void;
  onBack: () => void;
}

export default function MemoryScreen({ footprint, companions, onChange, onRemove, onBack }: Props) {
  const [note, setNote] = useState(footprint.note);
  const [viewing, setViewing] = useState<Memory | null>(null);
  // 提示和删除确认都直接显示在页面里（网页版不支持系统弹窗）
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // 照片默认显示像素风版本，可以切回原图
  const [showPixel, setShowPixel] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [style, setStyle] = useState<PixelStyle>(footprint.photos.find((p) => p.pixel?.style)?.pixel?.style ?? 'clear');
  // 还没转过、或者风格和现在选的不一样（包括旧算法生成的）的照片
  const needsPixel = (m: Memory, st: PixelStyle) => !m.pixel || (m.pixel.style ?? 'old') !== st;
  // 正在选同行伙伴的那次旅行
  const [tripDate, setTripDate] = useState<string | null>(footprint.visits.at(-1) ?? null);
  const friends = companions.filter((c) => !c.isMe);
  const today = toDateString(new Date());
  // 每次保存都带上正在编辑的文字，避免还没失焦的内容被覆盖
  const update = (patch: Partial<Footprint>) => onChange({ ...footprint, note, ...patch });

  const addPhotos = async (source: 'album' | 'camera') => {
    const added = source === 'album' ? await pickFromAlbum() : await takePhoto();
    if (added === 'denied') {
      setMessage('没有相机权限：请在系统设置里允许「小飞机去旅行」使用相机');
      return;
    }
    if (added.length > 0) update({ photos: [...(await withPixels(added)), ...footprint.photos] });
  };

  // 逐张转成像素画；失败的保留原图
  const withPixels = async (list: Memory[], st: PixelStyle = style) => {
    const out: Memory[] = [];
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!needsPixel(m, st)) {
        out.push(m);
        continue;
      }
      setBusy(`正在变成像素风 ${i + 1} / ${list.length}`);
      try {
        out.push({ ...m, pixel: await pixelatePhoto(m, st) });
      } catch {
        out.push(m);
      }
    }
    setBusy(null);
    return out;
  };

  const pixelateAll = async (st: PixelStyle = style) => {
    const photos = await withPixels(footprint.photos, st);
    update({ photos });
    setViewing((v) => (v ? (photos.find((p) => p.id === v.id) ?? v) : v));
  };

  const removePhoto = (m: Memory) => {
    deletePhotoFile(m);
    update({ photos: footprint.photos.filter((p) => p.id !== m.id) });
    setViewing(null);
  };

  const removePlace = () => {
    footprint.photos.forEach(deletePhotoFile);
    onRemove();
  };

  const back = () => {
    if (note !== footprint.note) update({});
    onBack();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} style={styles.row} accessibilityRole="button">
          <PixelIcon name="back" scale={2} tint={palette.white} />
          <Text style={px(12, palette.white)}>返回</Text>
        </Pressable>
        <View style={[styles.row, { marginTop: 10 }]}>
          <PixelIcon name="flag" scale={3} />
          <Text style={[px(36, palette.white), styles.title]}>{footprint.name}</Text>
        </View>
        <Text style={px(12, palette.cyan)}>{footprint.country ? `${footprint.country} · ` : ''}旅行记忆存档</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.visits}>
          {footprint.visits.map((d, i) => (
            <Pressable
              key={`${d}-${i}`}
              style={[styles.visitChip, tripDate === d && styles.visitOn]}
              onPress={() => setTripDate(d)}
              accessibilityLabel={`${d} 这次旅行`}
            >
              <PixelIcon name="plane" scale={1} />
              <Text style={px(12)}>{d}</Text>
              {(footprint.withWhom?.[d] ?? []).map((id) => {
                const c = companions.find((x) => x.id === id);
                return c ? <PixelAvatar key={id} avatar={c.avatar} scale={1} /> : null;
              })}
            </Pressable>
          ))}
          {!footprint.visits.includes(today) && (
            <Pressable onPress={() => update({ visits: [...footprint.visits, today] })} style={[styles.visitChip, styles.visitAdd]}>
              <Text style={px(12)}>＋ 今天又来了</Text>
            </Pressable>
          )}
        </View>

        {tripDate && (
          <PixelBox bg={palette.white} contentStyle={styles.whoBox}>
            <Text style={px(12)}>{tripDate} 这次和谁一起去的？</Text>
            {friends.length === 0 ? (
              <Text style={px(12, palette.slate)}>还没有旅行伙伴，在「我的足迹 → 旅行伙伴」里添加朋友的角色。</Text>
            ) : (
              <View style={styles.visits}>
                {friends.map((c) => {
                  const ids = footprint.withWhom?.[tripDate] ?? [];
                  const on = ids.includes(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.who, on && styles.whoOn]}
                      onPress={() =>
                        update({
                          withWhom: { ...(footprint.withWhom ?? {}), [tripDate]: on ? ids.filter((x) => x !== c.id) : [...ids, c.id] },
                        })
                      }
                      accessibilityState={{ selected: on }}
                    >
                      <PixelAvatar avatar={c.avatar} scale={2} />
                      <Text style={px(12, on ? palette.white : palette.ink)}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </PixelBox>
        )}

        <View style={styles.row}>
          <PixelIcon name="note" scale={2} />
          <Text style={px(18)}>写点什么</Text>
        </View>
        <TextInput
          style={[pixelInput, px(12), styles.note]}
          value={note}
          onChangeText={setNote}
          onBlur={() => note !== footprint.note && update({})}
          placeholder="和谁一起、吃了什么、最难忘的瞬间…"
          placeholderTextColor={palette.grey}
          multiline
        />

        <View style={styles.row}>
          <PixelIcon name="photo" scale={2} />
          <Text style={[px(18), { flex: 1 }]}>照片 × {footprint.photos.length}</Text>
          {footprint.photos.length > 0 && (
            <PixelChip label={showPixel ? '像素风' : '原图'} active={showPixel} onPress={() => setShowPixel((x) => !x)} />
          )}
        </View>
        {busy && <Text style={px(12, palette.plum)}>{busy}…</Text>}
        {footprint.photos.length > 0 && showPixel && (
          <View style={styles.row}>
            <Text style={px(12)}>像素风格：</Text>
            {(Object.keys(PIXEL_STYLE_LABELS) as PixelStyle[]).map((st) => (
              <PixelChip
                key={st}
                label={PIXEL_STYLE_LABELS[st]}
                active={style === st}
                onPress={() => {
                  setStyle(st);
                  if (!busy) pixelateAll(st);
                }}
              />
            ))}
          </View>
        )}
        {footprint.photos.some((p) => needsPixel(p, style)) && !busy && (
          <PixelButton bg={palette.plum} contentStyle={styles.actionBtn} onPress={() => pixelateAll()}>
            <PixelIcon name="star" scale={2} />
            <Text style={px(12, palette.white)}>
              {footprint.photos.some((p) => p.pixel) ? '用新效果重新生成像素照片' : '把照片全部变成像素风'}
            </Text>
          </PixelButton>
        )}
        {message && <Text style={px(12, palette.red)}>！{message}</Text>}
        <View style={styles.actions}>
          <PixelButton style={{ flex: 1 }} bg={palette.blue} contentStyle={styles.actionBtn} onPress={() => addPhotos('album')}>
            <PixelIcon name="photo" scale={2} />
            <Text style={px(12, palette.white)}>从相册添加</Text>
          </PixelButton>
          <PixelButton style={{ flex: 1 }} bg={palette.orange} contentStyle={styles.actionBtn} onPress={() => addPhotos('camera')}>
            <PixelIcon name="camera" scale={2} />
            <Text style={px(12, palette.white)}>拍一张</Text>
          </PixelButton>
        </View>

        <View style={styles.grid}>
          {footprint.photos.map((m) => (
            <Pressable key={m.id} onPress={() => setViewing(m)} style={styles.photoFrame}>
              {showPixel && m.pixel ? (
                <View style={[styles.photo, styles.pixelTile]}>
                  {/* 横图按高度铺满，裁掉两边，缩略图不留空 */}
                  <PixelArtView art={m.pixel} width={(TILE - BORDER * 2) * Math.max(1, m.pixel.w / m.pixel.h)} />
                </View>
              ) : (
                <PhotoImage memory={m} style={styles.photo} />
              )}
            </Pressable>
          ))}
        </View>
        {footprint.photos.length === 0 && (
          <PixelBox bg={palette.white} contentStyle={styles.empty}>
            <PixelIcon name="camera" scale={4} />
            <Text style={[px(12, palette.slate), { textAlign: 'center' }]}>还没有照片，把这里的回忆存进来吧</Text>
          </PixelBox>
        )}

        {confirming ? (
          <PixelBox bg={palette.yellow} contentStyle={styles.confirm}>
            <Text style={px(12)}>删除「{footprint.name}」的足迹？这里的照片和文字也会一起删除。</Text>
            <View style={styles.actions}>
              <PixelButton style={{ flex: 1 }} contentStyle={styles.actionBtn} onPress={() => setConfirming(false)}>
                <Text style={px(12)}>取消</Text>
              </PixelButton>
              <PixelButton style={{ flex: 1 }} bg={palette.red} contentStyle={styles.actionBtn} onPress={removePlace}>
                <Text style={px(12, palette.white)}>删除</Text>
              </PixelButton>
            </View>
          </PixelBox>
        ) : (
          <Pressable onPress={() => setConfirming(true)} style={styles.removePlace}>
            <Text style={[px(12, palette.slate), { textDecorationLine: 'underline' }]}>删除这个足迹</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={viewing != null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewing(null)} />
          {viewing && (
            <View style={[styles.fullFrame, showPixel && viewing.pixel ? styles.pixelFull : null]}>
              {showPixel && viewing.pixel ? (
                <PixelArtView art={viewing.pixel} width={Math.min(Dimensions.get('window').width - 40, 560)} />
              ) : (
                <PhotoImage memory={viewing} style={styles.full} resizeMode="contain" />
              )}
            </View>
          )}
          <View style={styles.viewerBar}>
            {viewing?.pixel ? (
              <PixelButton bg={palette.plum} contentStyle={styles.actionBtn} onPress={() => setShowPixel((x) => !x)}>
                <Text style={px(12, palette.white)}>{showPixel ? '看原图' : '看像素风'}</Text>
              </PixelButton>
            ) : (
              <PixelButton bg={palette.plum} contentStyle={styles.actionBtn} onPress={() => pixelateAll()}>
                <Text style={px(12, palette.white)}>变像素风</Text>
              </PixelButton>
            )}
            <PixelButton bg={palette.red} contentStyle={styles.actionBtn} onPress={() => viewing && removePhoto(viewing)}>
              <Text style={px(12, palette.white)}>删除</Text>
            </PixelButton>
            <PixelButton contentStyle={styles.actionBtn} onPress={() => setViewing(null)}>
              <PixelIcon name="close" scale={1} />
              <Text style={px(12)}>关闭</Text>
            </PixelButton>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.sky },
  header: { backgroundColor: palette.navy, paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 4, borderColor: palette.ink },
  title: { textShadowColor: palette.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  visitChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.white, borderWidth: 2, borderColor: palette.ink, paddingHorizontal: 8, paddingVertical: 2 },
  visitAdd: { backgroundColor: palette.yellow },
  visitOn: { backgroundColor: palette.cyan },
  whoBox: { padding: 10, gap: 8 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: palette.ink, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: palette.white },
  whoOn: { backgroundColor: palette.blue },
  note: { minHeight: 90, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  photoFrame: { borderWidth: BORDER, borderColor: palette.ink, backgroundColor: palette.white },
  pixelTile: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  pixelFull: { height: undefined, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  photo: { width: TILE - BORDER * 2, height: TILE - BORDER * 2, backgroundColor: palette.grey },
  empty: { alignItems: 'center', gap: 8, padding: 18 },
  confirm: { padding: 12, gap: 12 },
  removePlace: { alignSelf: 'center', marginTop: 16, padding: 8 },
  viewer: { flex: 1, backgroundColor: 'rgba(26,28,44,0.94)', justifyContent: 'center', padding: 16 },
  fullFrame: { height: '72%', borderWidth: 4, borderColor: palette.white, backgroundColor: palette.ink },
  full: { width: '100%', height: '100%' },
  viewerBar: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
});
