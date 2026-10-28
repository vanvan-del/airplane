import { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PhotoImage from '../components/PhotoImage';
import { deletePhotoFile, pickFromAlbum, takePhoto } from '../services/footprints';
import { colors, shadow, topInset } from '../theme';
import { Footprint, Memory } from '../types';
import { toDateString } from './HomeScreen';

const GAP = 6;
const TILE = (Dimensions.get('window').width - 32 - GAP * 2) / 3;

interface Props {
  footprint: Footprint;
  onChange: (f: Footprint) => void;
  onRemove: () => void;
  onBack: () => void;
}

export default function MemoryScreen({ footprint, onChange, onRemove, onBack }: Props) {
  const [note, setNote] = useState(footprint.note);
  const [viewing, setViewing] = useState<Memory | null>(null);
  // 提示和删除确认都直接显示在页面里（网页版不支持系统弹窗）
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const today = toDateString(new Date());
  // 每次保存都带上正在编辑的文字，避免还没失焦的内容被覆盖
  const update = (patch: Partial<Footprint>) => onChange({ ...footprint, note, ...patch });

  const addPhotos = async (source: 'album' | 'camera') => {
    const added = source === 'album' ? await pickFromAlbum() : await takePhoto();
    if (added === 'denied') {
      setMessage('没有相机权限：请在系统设置里允许「小飞机去旅行」使用相机');
      return;
    }
    if (added.length > 0) update({ photos: [...added, ...footprint.photos] });
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

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => {
            if (note !== footprint.note) update({});
            onBack();
          }}
          hitSlop={12}
        >
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.title}>📍 {footprint.name}的记忆</Text>

        <View style={styles.visits}>
          {footprint.visits.map((d, i) => (
            <Text key={`${d}-${i}`} style={styles.visitChip}>
              ✈️ {d}
            </Text>
          ))}
          {!footprint.visits.includes(today) && (
            <Pressable onPress={() => update({ visits: [...footprint.visits, today] })}>
              <Text style={[styles.visitChip, styles.visitAdd]}>＋ 今天又来了</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.section}>📝 写点什么</Text>
        <TextInput
          style={styles.note}
          value={note}
          onChangeText={setNote}
          onBlur={() => note !== footprint.note && update({})}
          placeholder="和谁一起、吃了什么、最难忘的瞬间…"
          multiline
        />

        <View style={styles.photoHeader}>
          <Text style={styles.section}>🖼️ 照片（{footprint.photos.length}）</Text>
        </View>
        {message && <Text style={styles.message}>⚠️ {message}</Text>}
        <View style={styles.actions}>
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.skyDeep }]} onPress={() => addPhotos('album')}>
            <Text style={styles.actionText}>🖼️ 从相册添加</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.coral }]} onPress={() => addPhotos('camera')}>
            <Text style={styles.actionText}>📷 拍一张</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {footprint.photos.map((m) => (
            <Pressable key={m.id} onPress={() => setViewing(m)}>
              <PhotoImage memory={m} style={styles.photo} />
            </Pressable>
          ))}
        </View>
        {footprint.photos.length === 0 && <Text style={styles.empty}>还没有照片，把这里的回忆存进来吧 📸</Text>}

        {confirming ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>删除「{footprint.name}」的足迹？这里的照片和文字也会一起删除。</Text>
            <View style={styles.actions}>
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.line }]} onPress={() => setConfirming(false)}>
                <Text style={[styles.actionText, { color: colors.navy }]}>取消</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.coral }]} onPress={removePlace}>
                <Text style={styles.actionText}>删除</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirming(true)} style={styles.removePlace}>
            <Text style={styles.removeText}>删除这个足迹</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={viewing != null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewing(null)} />
          {viewing && <PhotoImage memory={viewing} style={styles.full} resizeMode="contain" />}
          <View style={styles.viewerBar}>
            <Pressable onPress={() => viewing && removePhoto(viewing)} style={styles.viewerBtn}>
              <Text style={styles.viewerText}>🗑️ 删除</Text>
            </Pressable>
            <Pressable onPress={() => setViewing(null)} style={styles.viewerBtn}>
              <Text style={styles.viewerText}>✕ 关闭</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 48 },
  back: { fontSize: 16, fontWeight: '700', color: colors.navy },
  title: { fontSize: 28, fontWeight: '900', color: colors.navy, marginTop: 10, marginBottom: 12 },
  visits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  visitChip: {
    backgroundColor: colors.card,
    color: colors.navy,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  visitAdd: { backgroundColor: colors.sun },
  section: { fontSize: 18, fontWeight: '900', color: colors.navy, marginTop: 22, marginBottom: 10 },
  note: {
    minHeight: 90,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: colors.navy,
    textAlignVertical: 'top',
    ...shadow,
  },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  photo: { width: TILE, height: TILE, borderRadius: 12, backgroundColor: colors.line },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 12 },
  message: { color: colors.coral, fontWeight: '700', marginBottom: 10 },
  confirm: { marginTop: 28, backgroundColor: colors.card, borderRadius: 16, padding: 14, ...shadow },
  confirmText: { color: colors.navy, fontWeight: '700', marginBottom: 12, lineHeight: 20 },
  removePlace: { alignSelf: 'center', marginTop: 32, padding: 8 },
  removeText: { color: colors.muted, textDecorationLine: 'underline' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  full: { width: '100%', height: '75%' },
  viewerBar: { position: 'absolute', bottom: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
  viewerBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  viewerText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
