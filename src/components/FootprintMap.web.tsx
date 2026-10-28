import { createElement, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { shadow } from '../theme';
import { Footprint } from '../types';
import { buildMapHtml, toPins } from './mapHtml';

interface Props {
  footprints: Footprint[];
  onOpen: (name: string) => void;
}

// 网页版没有 WebView，用 iframe 显示同一张地图
export default function FootprintMap({ footprints, onOpen }: Props) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const pins = toPins(footprints);
  const pinsJson = JSON.stringify(pins);
  const html = useMemo(() => buildMapHtml(pins), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const win = ref.current?.contentWindow as (Window & { setPins?: (p: unknown) => void }) | null | undefined;
    win?.setPins?.(JSON.parse(pinsJson));
  }, [pinsJson]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source === ref.current?.contentWindow && typeof e.data?.footprint === 'string') onOpen(e.data.footprint);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onOpen]);

  return (
    <View style={styles.map}>
      {createElement('iframe', { ref, srcDoc: html, style: { border: 0, width: '100%', height: '100%' } })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 340, borderRadius: 24, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', ...shadow },
});
