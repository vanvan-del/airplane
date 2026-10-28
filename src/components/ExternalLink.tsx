import { createElement, ReactNode } from 'react';
import { Platform, Pressable } from 'react-native';
import { openUrl } from '../services/links';

// 打开外部网站。网页版用真正的 <a> 链接，在新标签页打开，嵌在别的页面里也能点开
export default function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  if (Platform.OS === 'web') {
    return createElement(
      'a',
      { href: url, target: '_blank', rel: 'noopener noreferrer', style: { textDecoration: 'none', display: 'block' } },
      children,
    );
  }
  return (
    <Pressable style={({ pressed }) => pressed && { opacity: 0.8 }} onPress={() => openUrl(url)}>
      {children}
    </Pressable>
  );
}
