import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BackupBox from '../components/BackupBox';
import FootprintMap from '../components/FootprintMap';
import GlobeView from '../components/GlobeView';
import { CITIES } from '../data/cities';
import PhotoImage from '../components/PhotoImage';
import { PixelBox, PixelButton } from '../components/pixel/PixelBox';
import PixelChip, { pixelInput } from '../components/pixel/PixelChip';
import PixelIcon from '../components/pixel/PixelIcon';
import { ScanProgress, scanAlbum } from '../services/photoScan';
import { palette, px, topInset } from '../theme';
import { Companion, Footprint } from '../types';

interface Props {
  footprints: Footprint[];
  onOpen: (name: string) => void;
  /** 手动补录一个去过的城市，失败时返回错误提示 */
  onAdd: (city: string) => Promise<string | null>;
  /** 合并相册扫描出来的足迹 */
  onImport: (found: Footprint[]) => void;
  onCompanions: () => void;
  onReplay: () => void;
  companions: Companion[];
  onRestore: (data: { footprints: Footprint[]; companions: Companion[] }) => void;
  onBack: () => void;
}

export default function FootprintsScreen({ footprints, onOpen, onAdd, onImport, onCompanions, onReplay, companions, onRestore, onBack }: Props) {
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'globe' | 'map'>('globe');
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  // 扫描结果直接显示在页面上（网页版不支持系统弹窗）
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const cancelled = useRef(false);
  const photoCount = footprints.reduce((n, f) => n + f.photos.length, 0);
  const countries = new Set(footprints.map((f) => f.country ?? '中国'));

  const scan = async () => {
    cancelled.current = false;
    setNotice(null);
    // 已经导入过的照片不再重复处理
    const known = new Set(footprints.flatMap((f) => f.photos.map((p) => p.assetId).filter((id): id is string => !!id)));
    const result = await scanAlbum(setProgress, () => cancelled.current, known);
    setProgress(null);
    if (!result.ok) {
      if (!cancelled.current && result.reason !== '已取消') setNotice({ title: '没能扫描相册', text: result.reason });
      return;
    }
    onImport(result.footprints);
    setNotice(
      result.located === 0
        ? {
            title: '这些照片里没有拍摄地点',
            text:
              `看了 ${result.scanned} 张照片，都没有记录位置。拍照时要打开相机的定位；` +
              '另外手机浏览器上传照片时常常会去掉位置信息，在电脑上选照片或者用手机 App 扫描更可靠。',
          }
        : {
            title: '扫描完成！',
            text:
              `看了 ${result.scanned} 张照片，其中 ${result.located} 张带拍摄地点，识别出 ${result.footprints.length} 个地方：` +
              result.footprints.map((f) => f.name).join('、'),
          },
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
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.row} accessibilityRole="button">
          <PixelIcon name="back" scale={2} tint={palette.white} />
          <Text style={px(12, palette.white)}>返回</Text>
        </Pressable>
        <View style={[styles.row, { marginTop: 10 }]}>
          <PixelIcon name="globe" scale={3} />
          <Text style={[px(36, palette.white), styles.title]}>我的足迹</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.stats}>
          <Stat value={countries.size} label="国家" color={palette.cyan} />
          <Stat value={footprints.length} label="城市" color={palette.yellow} />
          <Stat value={footprints.reduce((n, f) => n + f.visits.length, 0)} label="旅行" color={palette.lime} />
          <Stat value={photoCount} label="照片" color={palette.orange} />
        </View>

        <View style={styles.row}>
          <PixelChip label="地球" active={view === 'globe'} onPress={() => setView('globe')} />
          <PixelChip label="地图" active={view === 'map'} onPress={() => setView('map')} />
        </View>
        {view === 'globe' ? (
          <GlobeView footprints={footprints} onOpen={onOpen} />
        ) : (
          <PixelBox contentStyle={{ padding: 0 }}>
            <FootprintMap footprints={footprints} onOpen={onOpen} />
          </PixelBox>
        )}
        <Text style={[px(12, palette.ink), { textAlign: 'center' }]}>
          {view === 'globe' ? '拖动转地球 · 双指或＋－缩放 · 黄色是去过的国家' : '高德地图，可拖动缩放；点小旗子看回忆'}
        </Text>

        <View style={styles.row}>
          <PixelButton style={{ flex: 1 }} bg={palette.plum} onPress={onReplay} contentStyle={styles.scanBtn}>
            <View style={styles.row}>
              <PixelIcon name="play" scale={2} tint={palette.white} />
              <Text style={px(12, palette.white)}>旅行钉板</Text>
            </View>
          </PixelButton>
          <PixelButton style={{ flex: 1 }} bg={palette.yellow} onPress={onCompanions} contentStyle={styles.scanBtn}>
            <View style={styles.row}>
              <PixelIcon name="heart" scale={2} />
              <Text style={px(12)}>旅行伙伴</Text>
            </View>
          </PixelButton>
        </View>

        <PixelButton bg={palette.orange} onPress={scan} contentStyle={styles.scanBtn}>
          <View style={styles.row}>
            <PixelIcon name="camera" scale={2} />
            <Text style={px(12, palette.white)}>
              {Platform.OS === 'web' ? '选一批照片，自动点亮去过的地方' : '扫描相册，自动点亮去过的地方'}
            </Text>
          </View>
          <Text style={px(12, palette.yellow)}>按照片的拍摄地点识别城市</Text>
        </PixelButton>
        {notice && (
          <PixelBox bg={palette.yellow} contentStyle={styles.notice}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={px(18)}>{notice.title}</Text>
              <Text style={px(12)}>{notice.text}</Text>
            </View>
            <Pressable onPress={() => setNotice(null)} hitSlop={10} accessibilityLabel="关闭提示">
              <PixelIcon name="close" scale={1} />
            </Pressable>
          </PixelBox>
        )}

        <PixelBox bg={palette.white} contentStyle={styles.progressBox}>
          <Text style={px(12)}>
            热门城市收集 {footprints.filter((f) => CITIES.some((c) => c.name === f.name)).length} / {CITIES.length}
          </Text>
          <View style={styles.bar}>
            <View
              style={[
                styles.barFill,
                { width: `${(100 * footprints.filter((f) => CITIES.some((c) => c.name === f.name)).length) / CITIES.length}%` },
              ]}
            />
          </View>
        </PixelBox>

        <View style={styles.row}>
          <PixelIcon name="pin" scale={2} />
          <Text style={px(18)}>补录去过的城市</Text>
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={[pixelInput, { flex: 1 }]}
            value={city}
            onChangeText={setCity}
            placeholder="例如：桂林"
            placeholderTextColor={palette.grey}
            onSubmitEditing={add}
          />
          <PixelButton onPress={add} disabled={busy} bg={palette.orange} contentStyle={styles.addBtn}>
            {busy ? <ActivityIndicator color={palette.white} /> : <Text style={px(12, palette.white)}>点亮</Text>}
          </PixelButton>
        </View>
        {error && <Text style={px(12, palette.red)}>！{error}</Text>}

        <View style={styles.row}>
          <PixelIcon name="star" scale={2} />
          <Text style={px(18)}>去过的地方</Text>
        </View>
        {sorted.map((f) => (
          <PixelButton key={f.name} onPress={() => onOpen(f.name)} contentStyle={styles.card}>
            {f.photos[0] ? (
              <PhotoImage memory={f.photos[0]} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverEmpty]}>
                <PixelIcon name="camera" scale={3} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={px(18)}>{f.name}</Text>
              <Text style={px(12, palette.slate)}>
                最近 {f.visits.at(-1)} · {f.visits.length} 次 · {f.photos.length} 张
              </Text>
              {f.note ? (
                <Text style={px(12)} numberOfLines={1}>
                  “{f.note}”
                </Text>
              ) : null}
            </View>
            <Text style={px(12)}>▶</Text>
          </PixelButton>
        ))}
        {sorted.length === 0 && (
          <Text style={px(12, palette.ink)}>在目的地页面点「我去过这里」，或者在上面补录城市。</Text>
        )}

        <BackupBox footprints={footprints} companions={companions} onRestore={onRestore} />
      </ScrollView>

      <Modal visible={progress != null} transparent animationType="fade">
        <View style={styles.overlay}>
          <PixelBox bg={palette.white} style={{ width: '80%' }} contentStyle={styles.progressCard}>
            <PixelIcon name="plane" scale={5} />
            <Text style={[px(12), { textAlign: 'center' }]}>
              {progress?.stage === 'reading' && `正在读取相册… ${progress.done} 张`}
              {progress?.stage === 'locating' && `正在识别拍摄地点 ${progress.done} / ${progress.total}`}
              {progress?.stage === 'saving' && `正在识别城市 ${progress.done} / ${progress.total}`}
            </Text>
            <View style={[styles.bar, { alignSelf: 'stretch' }]}>
              <View style={[styles.barFill, { width: `${progress && progress.total ? (100 * progress.done) / progress.total : 10}%` }]} />
            </View>
            <PixelButton onPress={() => (cancelled.current = true)} contentStyle={styles.addBtn}>
              <Text style={px(12)}>取消</Text>
            </PixelButton>
          </PixelBox>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <PixelBox bg={color} style={{ flex: 1 }} contentStyle={styles.stat}>
      <Text style={px(24)}>{value}</Text>
      <Text style={px(12)}>{label}</Text>
    </PixelBox>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.sky },
  header: { backgroundColor: palette.navy, paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 4, borderColor: palette.ink },
  title: { textShadowColor: palette.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stats: { flexDirection: 'row', gap: 6 },
  stat: { alignItems: 'center', paddingVertical: 6 },
  scanBtn: { alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 8 },
  notice: { flexDirection: 'row', gap: 10, padding: 12 },
  progressBox: { padding: 10, gap: 6 },
  bar: { height: 14, borderWidth: 3, borderColor: palette.ink, backgroundColor: palette.dusk },
  barFill: { height: '100%', backgroundColor: palette.lime },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  cover: { width: 64, height: 64, borderWidth: 3, borderColor: palette.ink },
  coverEmpty: { backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(26,28,44,0.6)', alignItems: 'center', justifyContent: 'center' },
  progressCard: { padding: 18, alignItems: 'center', gap: 12 },
});
