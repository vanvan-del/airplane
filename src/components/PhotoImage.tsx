import { useEffect, useState } from 'react';
import { Image, ImageProps, View } from 'react-native';
import { photoUri } from '../services/footprints';
import { isIdbPhoto, loadPhotoUrl } from '../services/webPhotos';
import { Memory } from '../types';

type Props = Omit<ImageProps, 'source'> & { memory: Memory };

// 显示一张记忆照片：手机上直接读文件，网页版要先从浏览器存储里取出来
export default function PhotoImage({ memory, style, ...rest }: Props) {
  const idb = isIdbPhoto(memory.file);
  const [uri, setUri] = useState(idb ? '' : photoUri(memory));

  useEffect(() => {
    if (!idb) {
      setUri(photoUri(memory));
      return;
    }
    let alive = true;
    loadPhotoUrl(memory.file).then((u) => alive && setUri(u)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [idb, memory]);

  if (!uri) return <View style={style} />;
  return <Image source={{ uri }} style={style} {...rest} />;
}
