import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { PixelBox, PixelButton } from '../components/pixel/PixelBox';
import PixelChip, { pixelInput } from '../components/pixel/PixelChip';
import PixelIcon from '../components/pixel/PixelIcon';
import PixelAvatar from '../components/pixel/PixelAvatar';
import {
  EXTRA_LABELS,
  Extra,
  HAIR_COLORS,
  HAIR_LABELS,
  HairStyle,
  OUTFIT_COLORS,
  randomAvatar,
  SKIN_TONES,
} from '../components/pixel/avatar';
import { inviteLink, makeInviteCode, newId, readInviteCode } from '../services/companions';
import { BORDER, palette, px, topInset } from '../theme';
import { Avatar, Companion, Footprint } from '../types';

interface Props {
  companions: Companion[];
  footprints: Footprint[];
  onChange: (list: Companion[]) => void;
  onAcceptInvite: (code: string) => string | null;
  onReplay: (companionId?: string) => void;
  onBack: () => void;
}

const tripsWith = (footprints: Footprint[], id: string) =>
  footprints.reduce((n, f) => n + Object.values(f.withWhom ?? {}).filter((ids) => ids.includes(id)).length, 0);

export default function CompanionsScreen({ companions, footprints, onChange, onAcceptInvite, onReplay, onBack }: Props) {
  const [editing, setEditing] = useState<Companion | null>(null);
  const [invite, setInvite] = useState<{ code: string; title: string } | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const me = companions.find((c) => c.isMe)!;

  const share = async (text: string) => {
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(text);
        setMessage('已复制，发给朋友吧');
      } else {
        await Share.share({ message: text });
      }
    } catch {
      setMessage('没能复制，请手动长按选中邀请码');
    }
  };

  const showInvite = (friend?: Companion) => {
    if (me.name === '我') {
      setMessage('先点上面的「我」给自己起个名字，朋友才知道是谁邀请的');
      setInvite(null);
      return;
    }
    const c = makeInviteCode(me, footprints, friend?.id);
    setInvite({ code: c, title: friend ? `发给${friend.name}的邀请` : '我的邀请码' });
    setMessage(null);
  };

  const accept = () => {
    const err = onAcceptInvite(code);
    setMessage(err ?? '已加入新伙伴！一起去过的地方也同步进足迹了');
    if (!err) setCode('');
  };

  if (editing) {
    return (
      <AvatarEditor
        companion={editing}
        onCancel={() => setEditing(null)}
        onDelete={
          editing.isMe || !companions.some((c) => c.id === editing.id)
            ? undefined
            : () => {
                onChange(companions.filter((c) => c.id !== editing.id));
                setEditing(null);
              }
        }
        onSave={(c) => {
          onChange(companions.some((x) => x.id === c.id) ? companions.map((x) => (x.id === c.id ? c : x)) : [...companions, c]);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.row} accessibilityRole="button">
          <PixelIcon name="back" scale={2} tint={palette.white} />
          <Text style={px(12, palette.white)}>返回</Text>
        </Pressable>
        <View style={[styles.row, { marginTop: 10 }]}>
          <PixelIcon name="heart" scale={3} />
          <Text style={[px(36, palette.white), styles.title]}>旅行伙伴</Text>
        </View>
        <Text style={px(12, palette.cyan)}>每个人一个像素角色，记下和谁一起去过哪里</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.party}>
          {companions.map((c) => (
            <Pressable key={c.id} style={styles.member} onPress={() => setEditing(c)} accessibilityLabel={`编辑${c.name}`}>
              <PixelAvatar avatar={c.avatar} scale={4} />
              <Text style={px(12, palette.white)}>{c.name}</Text>
              {!c.isMe && <Text style={px(12, palette.yellow)}>同行 {tripsWith(footprints, c.id)} 次</Text>}
            </Pressable>
          ))}
          <Pressable
            style={[styles.member, styles.add]}
            onPress={() => setEditing({ id: newId(), name: '', avatar: randomAvatar() })}
            accessibilityLabel="新建角色"
          >
            <PixelIcon name="plus" scale={3} tint={palette.white} />
            <Text style={px(12, palette.white)}>新建角色</Text>
          </Pressable>
        </View>
        <Text style={px(12)}>点角色可以修改外观和名字。</Text>

        <PixelButton bg={palette.orange} contentStyle={styles.btn} onPress={() => onReplay()}>
          <PixelIcon name="play" scale={2} tint={palette.white} />
          <Text style={px(18, palette.white)}>播放我的旅行回放</Text>
        </PixelButton>

        {companions
          .filter((c) => !c.isMe)
          .map((c) => (
            <PixelBox key={c.id} contentStyle={styles.friend}>
              <PixelAvatar avatar={c.avatar} scale={2} />
              <Text style={[px(12), { flex: 1 }]}>和{c.name}</Text>
              <PixelButton contentStyle={styles.small} onPress={() => onReplay(c.id)}>
                <Text style={px(12)}>回放</Text>
              </PixelButton>
              <PixelButton bg={palette.yellow} contentStyle={styles.small} onPress={() => showInvite(c)}>
                <Text style={px(12)}>邀请</Text>
              </PixelButton>
            </PixelBox>
          ))}

        <View style={styles.row}>
          <PixelIcon name="note" scale={2} />
          <Text style={px(18)}>邀请朋友</Text>
        </View>
        <Text style={px(12, palette.ink)}>
          把邀请码发给朋友，对方在这里输入后，就会出现你的角色和你们一起去过的地方；让朋友也把他自己做的角色发给你，这样每个人都是自己设计的样子。
        </Text>
        <PixelButton bg={palette.yellow} contentStyle={styles.btn} onPress={() => showInvite()}>
          <Text style={px(12)}>生成我的邀请码</Text>
        </PixelButton>
        {invite && (
          <PixelBox bg={palette.white} contentStyle={styles.inviteBox}>
            <Text style={px(12)}>{invite.title}</Text>
            <Text selectable style={[px(12, palette.slate), styles.code]} numberOfLines={4}>
              {invite.code}
            </Text>
            <View style={styles.row}>
              <PixelButton style={{ flex: 1 }} bg={palette.blue} contentStyle={styles.small} onPress={() => share(invite.code)}>
                <Text style={px(12, palette.white)}>{Platform.OS === 'web' ? '复制邀请码' : '分享邀请码'}</Text>
              </PixelButton>
              <PixelButton style={{ flex: 1 }} contentStyle={styles.small} onPress={() => share(`来和我一起记录旅行吧！${inviteLink(invite.code)}`)}>
                <Text style={px(12)}>{Platform.OS === 'web' ? '复制邀请链接' : '分享邀请链接'}</Text>
              </PixelButton>
            </View>
          </PixelBox>
        )}

        <Text style={px(12)}>收到朋友的邀请码？粘贴到这里：</Text>
        <View style={styles.row}>
          <TextInput
            style={[pixelInput, px(12), { flex: 1 }]}
            value={code}
            onChangeText={setCode}
            placeholder="FEIJI1.…… 或邀请链接"
            placeholderTextColor={palette.grey}
            autoCapitalize="none"
          />
          <PixelButton bg={palette.orange} contentStyle={styles.small} onPress={accept} disabled={!readInviteCode(code)}>
            <Text style={px(12, palette.white)}>加入</Text>
          </PixelButton>
        </View>
        {message && <Text style={px(12, palette.plum)}>{message}</Text>}
      </ScrollView>
    </View>
  );
}

export function AvatarEditor({
  companion,
  onSave,
  onCancel,
  onDelete,
}: {
  companion: Companion;
  onSave: (c: Companion) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(companion.name);
  const [avatar, setAvatar] = useState<Avatar>(companion.avatar);
  const set = (patch: Partial<Avatar>) => setAvatar((a) => ({ ...a, ...patch }));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topInset }]} keyboardShouldPersistTaps="handled">
        <Text style={px(24)}>{companion.name ? `编辑「${companion.name}」` : '新建角色'}</Text>
        <PixelBox bg={palette.sky} contentStyle={styles.preview}>
          <PixelAvatar avatar={avatar} scale={9} />
        </PixelBox>
        <TextInput style={pixelInput} value={name} onChangeText={setName} placeholder="名字，比如：小明" placeholderTextColor={palette.grey} maxLength={8} />

        <Text style={px(12)}>肤色</Text>
        <Swatches colors={SKIN_TONES} value={avatar.skin} onPick={(skin) => set({ skin })} />
        <Text style={px(12)}>发型</Text>
        <View style={styles.chips}>
          {(Object.keys(HAIR_LABELS) as HairStyle[]).map((h) => (
            <PixelChip key={h} label={HAIR_LABELS[h]} active={avatar.hair === h} onPress={() => set({ hair: h })} />
          ))}
        </View>
        <Text style={px(12)}>发色</Text>
        <Swatches colors={HAIR_COLORS} value={avatar.hairColor} onPick={(hairColor) => set({ hairColor })} />
        <Text style={px(12)}>衣服颜色</Text>
        <Swatches colors={OUTFIT_COLORS} value={avatar.outfit} onPick={(outfit) => set({ outfit })} />
        <Text style={px(12)}>配饰</Text>
        <View style={styles.chips}>
          {(Object.keys(EXTRA_LABELS) as Extra[]).map((x) => (
            <PixelChip key={x} label={EXTRA_LABELS[x]} active={avatar.extra === x} onPress={() => set({ extra: x })} />
          ))}
        </View>
        <PixelButton contentStyle={styles.btn} onPress={() => setAvatar(randomAvatar())}>
          <Text style={px(12)}>随机换一个</Text>
        </PixelButton>

        <View style={styles.row}>
          <PixelButton style={{ flex: 1 }} contentStyle={styles.btn} onPress={onCancel}>
            <Text style={px(12)}>取消</Text>
          </PixelButton>
          <PixelButton
            style={{ flex: 1 }}
            bg={palette.orange}
            contentStyle={styles.btn}
            disabled={!name.trim()}
            onPress={() => onSave({ ...companion, name: name.trim(), avatar })}
          >
            <Text style={px(12, palette.white)}>保存</Text>
          </PixelButton>
        </View>
        {onDelete && (
          <Pressable onPress={onDelete} style={{ alignSelf: 'center', padding: 8 }}>
            <Text style={[px(12, palette.slate), { textDecorationLine: 'underline' }]}>删除这个伙伴</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <View style={styles.chips}>
      {colors.map((c) => (
        <Pressable
          key={c}
          onPress={() => onPick(c)}
          style={[styles.swatch, { backgroundColor: c }, value === c && styles.swatchOn]}
          accessibilityLabel={`颜色 ${c}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.sky },
  header: { backgroundColor: palette.navy, paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 4, borderColor: palette.ink },
  title: { textShadowColor: palette.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  party: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: palette.navy,
    borderWidth: BORDER,
    borderColor: palette.ink,
    padding: 12,
  },
  member: { alignItems: 'center', gap: 2, minWidth: 64 },
  add: { justifyContent: 'center', borderWidth: 2, borderColor: palette.slate, borderStyle: 'dashed', padding: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  small: { paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  friend: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  inviteBox: { padding: 10, gap: 8 },
  code: { backgroundColor: palette.white, borderWidth: 2, borderColor: palette.grey, padding: 6 },
  preview: { alignItems: 'center', paddingVertical: 14 },
  swatch: { width: 32, height: 32, borderWidth: BORDER, borderColor: palette.ink },
  swatchOn: { borderColor: palette.white, outlineColor: palette.ink, outlineWidth: 3, outlineStyle: 'solid' },
});
