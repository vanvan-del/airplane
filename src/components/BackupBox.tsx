import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Backup, makeBackup, parseBackup, restoreBackup } from '../services/backup';
import { pickBackupFile, saveBackupFile } from '../services/backupIO';
import { palette, px } from '../theme';
import { Companion, Footprint } from '../types';
import { PixelBox, PixelButton } from './pixel/PixelBox';
import PixelIcon from './pixel/PixelIcon';

interface Props {
  footprints: Footprint[];
  companions: Companion[];
  onRestore: (data: { footprints: Footprint[]; companions: Companion[] }) => void;
}

// 数据都存在这台设备上，换手机或清理浏览器前要先备份
export default function BackupBox({ footprints, companions, onRestore }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);

  const exportAll = async () => {
    try {
      const text = await makeBackup(footprints, companions, (d, t) => setStatus(`正在打包照片 ${d} / ${t}`));
      const d = new Date();
      const name = `airplane-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
      await saveBackupFile(text, name);
      setStatus(`已导出 ${name}，请存到安全的地方`);
    } catch {
      setStatus('导出失败，请重试');
    }
  };

  const pick = async () => {
    const text = await pickBackupFile();
    if (!text) return;
    const b = parseBackup(text);
    if (!b) return setStatus('这不是小飞机去旅行的备份文件');
    setPending(b);
    setStatus(null);
  };

  const confirm = async () => {
    if (!pending) return;
    setStatus('正在恢复…');
    onRestore(await restoreBackup(pending));
    setPending(null);
    setStatus('恢复完成！');
  };

  return (
    <PixelBox bg={palette.white} contentStyle={styles.box}>
      <View style={styles.row}>
        <PixelIcon name="note" scale={2} />
        <Text style={px(18)}>数据备份</Text>
      </View>
      <Text style={px(12, palette.slate)}>足迹、伙伴和照片只存在这台设备上。换手机、清理浏览器数据之前，记得先导出备份。</Text>
      <View style={styles.row}>
        <PixelButton style={{ flex: 1 }} bg={palette.blue} contentStyle={styles.btn} onPress={exportAll}>
          <Text style={px(12, palette.white)}>导出备份</Text>
        </PixelButton>
        <PixelButton style={{ flex: 1 }} contentStyle={styles.btn} onPress={pick}>
          <Text style={px(12)}>从备份恢复</Text>
        </PixelButton>
      </View>
      {pending && (
        <View style={styles.confirm}>
          <Text style={px(12)}>
            备份里有 {pending.footprints.length} 个地方、{pending.companions.length} 个角色（{pending.exportedAt.slice(0, 10)} 导出）。恢复后会替换现在的全部记录。
          </Text>
          <View style={styles.row}>
            <PixelButton style={{ flex: 1 }} contentStyle={styles.btn} onPress={() => setPending(null)}>
              <Text style={px(12)}>取消</Text>
            </PixelButton>
            <PixelButton style={{ flex: 1 }} bg={palette.red} contentStyle={styles.btn} onPress={confirm}>
              <Text style={px(12, palette.white)}>替换并恢复</Text>
            </PixelButton>
          </View>
        </View>
      )}
      {status && <Text style={px(12, palette.plum)}>{status}</Text>}
    </PixelBox>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { alignItems: 'center', paddingVertical: 8 },
  confirm: { backgroundColor: palette.yellow, borderWidth: 2, borderColor: palette.ink, padding: 8, gap: 8 },
});
