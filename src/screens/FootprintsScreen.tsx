import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import FootprintMap from '../components/FootprintMap';
import GlobeView from '../components/GlobeView';
import { CITIES } from '../data/cities';
import { photoUri } from '../services/footprints';
import { ScanProgress, scanAlbum } from '../services/photoScan';
import { colors, shadow, topInset } from '../theme';
import { Footprint } from '../types';

interface Props {
  footprints: Footprint[];
  onOpen: (name: string) => void;
  /** 手动补录一个去过的城市，失败时返回错误提示 */
  onAdd: (city: string) => Promise<string | null>;
  /** 合并相册扫描出来的足迹 */
  onImport: (found: Footprint[]) => void;
  onBack: () => void;
}

export default function FootprintsScreen({ footprints, onOpen, onAdd, onImport, onBack }: Props) {
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'globe' | 'map'>('globe');
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const cancelled = useRef(false);
  const photoCount = footprints.reduce((n, f) => n + f.photos.length, 0);
  const countries = new Set(footprints.map((f) => f.country ?? '中国'));

  const scan = async () => {
    cancelled.current = false;
    setProgress({ stage: 'reading', done: 0, total: 0 });
    const result = await scanAlbum(setProgress, () => cancelled.current);
    setProgress(null);
    if (!result.ok) {
      if (!cancelled.current) Alert.alert('没能扫描相册', result.reason);
      return;
    }
    onImport(result.footprints);
    Alert.alert(
      '扫描完成 🎉',
      `看了 ${result.scanned} 张照片，其中 ${result.located} 张带拍摄地点，识别出 ${result.footprints.length} 个城市：\n` +
        (result.footprints.map((f) => f.name).join('、') || '（没有找到）'),
    );
  };
  const sorted = [...footprints].sort((a, b) => (b.visits.at(-1) ?? '').localeCompare(a.visits.at(-1) ?? ''));

  const add = async () => {
    if (!city.trim()) return;
    setBusy(true);
    const err = await onAdd(city.trim());
    setBusy(false);
    setError(err);
    if (!err) setCity('');
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.title}>🗺️ 我的足迹</Text>

        <View style={styles.stats}>
          <Stat value={countries.size} label="国家/地区" />
          <Stat value={footprints.length} label="点亮城市" />
          <Stat value={footprints.reduce((n, f) => n + f.visits.length, 0)} label="旅行次数" />
          <Stat value={photoCount} label="记忆照片" />
        </View>

        <View style={styles.tabs}>
          {(['globe', 'map'] as const).map((v) => (
            <Pressable key={v} style={[styles.tab, view === v && styles.tabActive]} onPress={() => setView(v)}>
              <Text style={[styles.tabText, view === v && styles.tabTextActive]}>{v === 'globe' ? '🌍 地球' : '🗺️ 地图'}</Text>
            </Pressable>
          ))}
        </View>
        {view === 'globe' ? (
          <GlobeView footprints={footprints} onOpen={onOpen} />
        ) : (
          <FootprintMap footprints={footprints} onOpen={onOpen} />
        )}
        <Text style={styles.mapHint}>
          {view === 'globe' ? '拖动转地球，双指或 ＋－ 缩放；黄色是去过的国家' : '高德地图，可拖动缩放；点小旗子看回忆'}
        </Text>

        <Pressable style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.85 }]} onPress={scan}>
          <Text style={styles.scanText}>📸 扫描相册，自动点亮去过的地方</Text>
          <Text style={styles.scanSub}>根据照片的拍摄地点识别城市，照片自动存进对应的记忆</Text>
        </Pressable>
        <Text style={styles.progress}>
          已点亮 {footprints.filter((f) => CITIES.some((c) => c.name === f.name)).length} / {CITIES.length} 个热门城市
        </Text>

        <Text style={styles.section}>📍 补录去过的城市</Text>
        <View style={styles.addRow}>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="例如：桂林" onSubmitEditing={add} />
          <Pressable style={styles.addBtn} onPress={add} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.addText}>点亮</Text>}
          </Pressable>
        </View>
        {error && <Text style={styles.error}>⚠️ {error}</Text>}

        <Text style={styles.section}>📒 去过的地方</Text>
        {sorted.map((f) => (
          <Pressable key={f.name} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={() => onOpen(f.name)}>
            {f.photos[0] ? (
              <Image source={{ uri: photoUri(f.photos[0]) }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverEmpty]}>
                <Text style={{ fontSize: 30 }}>📷</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{f.name}</Text>
              <Text style={styles.cardMeta}>
                最近：{f.visits.at(-1)}　去过 {f.visits.length} 次
              </Text>
              <Text style={styles.cardMeta}>🖼️ {f.photos.length} 张照片</Text>
              {f.note ? (
                <Text style={styles.cardNote} numberOfLines={1}>
                  “{f.note}”
                </Text>
              ) : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
        {sorted.length === 0 && <Text style={styles.emptyText}>在目的地页面点「📍 我去过这里」，或者在上面补录城市。</Text>}
      </ScrollView>

      <Modal visible={progress != null} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.progressCard}>
            <Text style={{ fontSize: 44 }}>✈️</Text>
            <Text style={styles.progressTitle}>
              {progress?.stage === 'reading' && `正在读取相册… ${progress.done} 张`}
              {progress?.stage === 'locating' && `正在识别拍摄地点 ${progress.done} / ${progress.total}`}
              {progress?.stage === 'saving' && `正在识别城市 ${progress.done} / ${progress.total}`}
            </Text>
            <ActivityIndicator color={colors.coral} style={{ marginVertical: 12 }} />
            <Pressable onPress={() => (cancelled.current = true)}>
              <Text style={styles.cancel}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 40 },
  back: { fontSize: 16, fontWeight: '700', color: colors.navy },
  title: { fontSize: 30, fontWeight: '900', color: colors.navy, marginTop: 10, marginBottom: 14 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 12, alignItems: 'center', ...shadow },
  statValue: { fontSize: 26, fontWeight: '900', color: colors.coral },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '700', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card },
  tabActive: { backgroundColor: colors.navy },
  tabText: { fontWeight: '800', color: colors.navy },
  tabTextActive: { color: '#fff' },
  mapHint: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 8 },
  scanBtn: { backgroundColor: colors.coral, borderRadius: 18, padding: 14, marginTop: 14, alignItems: 'center', ...shadow },
  scanText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  scanSub: { color: '#fff', fontSize: 12, opacity: 0.9, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(29,53,87,0.45)', alignItems: 'center', justifyContent: 'center' },
  progressCard: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '80%', alignItems: 'center' },
  progressTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, textAlign: 'center', marginTop: 8 },
  cancel: { color: colors.muted, fontWeight: '700', padding: 6 },
  progress: { textAlign: 'center', color: colors.muted, fontWeight: '700', marginTop: 10 },
  section: { fontSize: 18, fontWeight: '900', color: colors.navy, marginTop: 22, marginBottom: 10 },
  addRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.navy,
  },
  addBtn: { backgroundColor: colors.coral, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  error: { color: colors.coral, fontWeight: '700', marginTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
    ...shadow,
  },
  cover: { width: 72, height: 72, borderRadius: 14 },
  coverEmpty: { backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '900', color: colors.navy },
  cardMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cardNote: { fontSize: 13, color: colors.navy, marginTop: 2, fontStyle: 'italic' },
  chevron: { fontSize: 28, color: colors.muted, paddingRight: 6 },
  emptyText: { color: colors.muted, lineHeight: 20 },
});
