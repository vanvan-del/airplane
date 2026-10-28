import { ComponentType, Ref, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView as RNWebView, WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { shadow } from '../theme';
import { Footprint } from '../types';
import { buildMapHtml, toPins } from './mapHtml';

// react-native-webview 的类声明默认泛型是 undefined，props 会被推成 never，这里换成明确的类型
interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

interface Props {
  footprints: Footprint[];
  onOpen: (name: string) => void;
}

export default function FootprintMap({ footprints, onOpen }: Props) {
  const ref = useRef<WebViewHandle>(null);
  const pins = toPins(footprints);
  const pinsJson = JSON.stringify(pins);
  // 页面只生成一次，之后足迹变化时注入新的小旗子，地图不用重新加载
  const html = useMemo(() => buildMapHtml(pins), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ref.current?.injectJavaScript(`window.setPins && window.setPins(${pinsJson}); true;`);
  }, [pinsJson]);

  return (
    <View style={styles.map}>
      <WebView
        ref={ref}
        source={{ html }}
        originWhitelist={['*']}
        onMessage={(e: WebViewMessageEvent) => onOpen(e.nativeEvent.data)}
        style={styles.web}
        scrollEnabled={false}
        nestedScrollEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 340, borderRadius: 24, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', ...shadow },
  web: { flex: 1, backgroundColor: '#DFF1FF' },
});
