import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { PhotoSpot } from '../data/photoSpots';
import { walkTo } from '../services/links';
import { BORDER, palette, px } from '../theme';
import ExternalLink from './ExternalLink';
import { PixelBox } from './pixel/PixelBox';
import PixelIcon from './pixel/PixelIcon';

const SIZE = 168;
const CELL = 8;
const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];

/** 站位到地标：往哪个方向拍、离多远（米） */
export function aim(spot: PhotoSpot) {
  if (!spot.target) return null;
  const [lat, lon] = spot.at;
  const [tLat, tLon] = spot.target;
  // 距离只有几百米到几公里，按平面算就够准
  const dx = (tLon - lon) * Math.cos((lat * Math.PI) / 180) * 111320;
  const dy = (tLat - lat) * 110540;
  const meters = Math.hypot(dx, dy);
  const bearing = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
  return { dx, dy, meters, bearing, dir: DIRS[Math.round(bearing / 45) % 8] };
}

const fovOf = (lens: string) => (lens.includes('广角') ? 70 : lens.includes('长焦') ? 22 : 45);

export const formatMeters = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} 公里` : `${Math.max(10, Math.round(m / 10) * 10)} 米`);

const snap = (v: number) => Math.round(v / CELL) * CELL;

/** 像素风机位图：上北下南，相机在站位，扇形是镜头能拍到的范围，星星是地标 */
export function PhotoSpotDiagram({ spot }: { spot: PhotoSpot }) {
  const a = aim(spot);
  const c = SIZE / 2;
  let cam = { x: c, y: c };
  let target: { x: number; y: number } | null = null;
  if (a && a.meters > 1) {
    // 相机和地标放在中心两侧，距离再远也缩放到图里
    const k = (SIZE * 0.32) / Math.max(Math.abs(a.dx), Math.abs(a.dy));
    cam = { x: snap(c - (a.dx * k) / 2), y: snap(c + (a.dy * k) / 2) };
    target = { x: snap(c + (a.dx * k) / 2), y: snap(c - (a.dy * k) / 2) };
  }
  const bearing = a?.bearing ?? 0;
  const fov = fovOf(spot.lens);
  const reach = SIZE * 0.85;
  const ray = (deg: number) => {
    const r = ((bearing + deg) * Math.PI) / 180;
    return `${cam.x + Math.sin(r) * reach},${cam.y - Math.cos(r) * reach}`;
  };
  const grid: number[] = [];
  for (let v = CELL * 2; v < SIZE; v += CELL * 2) grid.push(v);

  return (
    <View style={styles.diagram}>
      <Svg width={SIZE} height={SIZE}>
        <Rect x={0} y={0} width={SIZE} height={SIZE} fill={palette.white} />
        {grid.map((v) => (
          <Line key={`h${v}`} x1={0} y1={v} x2={SIZE} y2={v} stroke={palette.grey} strokeWidth={1} />
        ))}
        {grid.map((v) => (
          <Line key={`v${v}`} x1={v} y1={0} x2={v} y2={SIZE} stroke={palette.grey} strokeWidth={1} />
        ))}
        {a && <Polygon points={`${cam.x},${cam.y} ${ray(-fov / 2)} ${ray(fov / 2)}`} fill={palette.yellow} fillOpacity={0.55} />}
        {target && (
          <Line x1={cam.x} y1={cam.y} x2={target.x} y2={target.y} stroke={palette.red} strokeWidth={3} strokeDasharray="6 4" />
        )}
        {/* 指北针 */}
        <Path d={`M${SIZE - 18} 6 L${SIZE - 12} 20 L${SIZE - 24} 20 Z`} fill={palette.ink} />
        <SvgText x={SIZE - 18} y={32} fontSize={11} fontWeight="bold" fill={palette.ink} textAnchor="middle">
          N
        </SvgText>
      </Svg>
      {target && (
        <View style={[styles.marker, { left: target.x - 12, top: target.y - 12 }]}>
          <PixelIcon name="star" scale={2} />
        </View>
      )}
      <View style={[styles.marker, { left: cam.x - 12, top: cam.y - 12 }]}>
        <PixelIcon name="camera" scale={2} />
      </View>
    </View>
  );
}

export default function PhotoSpotCard({ spot, abroad }: { spot: PhotoSpot; abroad: boolean }) {
  const a = aim(spot);
  return (
    <PixelBox bg={palette.white} style={{ marginBottom: 12 }} contentStyle={{ gap: 8, padding: 10 }}>
      <View style={styles.head}>
        <PixelIcon name="camera" scale={2} />
        <Text style={[px(18), { flex: 1 }]}>{spot.name}</Text>
      </View>
      <Text style={px(12, palette.plum)}>拍：{spot.subject}</Text>
      <View style={styles.body}>
        <PhotoSpotDiagram spot={spot} />
        <View style={{ flex: 1, minWidth: 140, gap: 6 }}>
          <Text style={px(12, palette.red)}>
            {a ? `▲ 朝${a.dir}拍，离地标约 ${formatMeters(a.meters)}` : '▲ 就在脚下，原地取景'}
          </Text>
          <Text style={px(12)}>时间：{spot.time}</Text>
          <Text style={px(12)}>镜头：{spot.lens}</Text>
          <Text style={px(12, palette.slate)}>{spot.how}</Text>
        </View>
      </View>
      <ExternalLink url={walkTo(spot.at[0], spot.at[1], spot.name, abroad)}>
        <View style={styles.nav}>
          <PixelIcon name="map" scale={2} />
          <Text style={[px(12, palette.white), { flex: 1 }]}>导航到机位（步行）</Text>
          <Text style={px(12, palette.white)}>▶</Text>
        </View>
      </ExternalLink>
    </PixelBox>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  diagram: { width: SIZE + BORDER * 2, height: SIZE + BORDER * 2, borderWidth: BORDER, borderColor: palette.ink },
  marker: { position: 'absolute' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.blue,
    borderWidth: BORDER,
    borderColor: palette.ink,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
