import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mapSearch } from '../services/links';
import { hotPlan, INTEREST_LABELS, makePlan, Pace, PACE_LABELS, Plan } from '../services/planner';
import { isAbroad } from '../services/geo';
import { BORDER, palette, px } from '../theme';
import { Interest } from '../types';
import ExternalLink from './ExternalLink';
import { PixelBox, PixelButton } from './pixel/PixelBox';
import PixelChip from './pixel/PixelChip';
import PixelIcon from './pixel/PixelIcon';
import { StoryBox, TagList, Trip } from './Sections';

const ALL_INTERESTS = Object.keys(INTEREST_LABELS) as Interest[];
const SLOT_COLOR = { 上午: palette.yellow, 下午: palette.orange, 晚上: palette.blue };

// 定制攻略：先问喜好、天数、节奏，再按片区排出每天的行程
export default function PlannerSection({ trip }: { trip: Trip }) {
  const guide = trip.to.guide;
  const [interests, setInterests] = useState<Interest[]>(['culture', 'photo']);
  const [days, setDays] = useState(isAbroad(trip.to) ? 4 : 3);
  const [pace, setPace] = useState<Pace>('normal');
  const [plan, setPlan] = useState<Plan | null>(null);

  if (!guide || guide.spots.length === 0) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={px(12)}>「{trip.to.name}」还没有收录攻略，网络也没能查到附近的景点资料，暂时排不出行程。</Text>
        <Text style={px(12, palette.slate)}>
          已经整理好攻略的有国内 14 个热门城市，以及巴黎、伦敦、罗马等 20 个国外城市，在首页的热门目的地里可以看到。
        </Text>
      </View>
    );
  }

  const toggle = (i: Interest) => setInterests((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]));

  if (!plan) {
    return (
      <View style={{ gap: 14 }}>
        <Question n={1} title="这次旅行你最想要什么？（可以多选）">
          <View style={styles.chips}>
            {ALL_INTERESTS.map((i) => (
              <PixelChip key={i} label={INTEREST_LABELS[i]} active={interests.includes(i)} onPress={() => toggle(i)} />
            ))}
          </View>
        </Question>
        <Question n={2} title="打算玩几天？">
          <View style={styles.chips}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <PixelChip key={d} label={`${d} 天`} active={days === d} onPress={() => setDays(d)} />
            ))}
          </View>
        </Question>
        <Question n={3} title="喜欢什么节奏？">
          <View style={styles.chips}>
            {(Object.keys(PACE_LABELS) as Pace[]).map((p) => (
              <PixelChip key={p} label={PACE_LABELS[p]} active={pace === p} onPress={() => setPace(p)} />
            ))}
          </View>
        </Question>
        <PixelButton bg={palette.orange} contentStyle={styles.go} onPress={() => setPlan(makePlan(guide, { interests, days, pace }))}>
          <Text style={px(18, palette.white)}>▶ 按我的喜好生成</Text>
        </PixelButton>
        {guide.route && (
          <PixelButton bg={palette.red} contentStyle={styles.go} onPress={() => setPlan(hotPlan(guide, { interests, days, pace }))}>
            <Text style={px(18, palette.white)}>★ 直接用网上最火的路线</Text>
          </PixelButton>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={px(12, palette.slate)}>
        {trip.to.name} · {days} 天 · {interests.length ? interests.map((i) => INTEREST_LABELS[i]).join('、') : '什么都想看'} · {PACE_LABELS[pace]}
      </Text>
      {guide.route && (
        <View style={styles.chips}>
          <PixelChip label="按我的喜好" active={plan.mode === 'interest'} onPress={() => setPlan(makePlan(guide, { interests, days, pace }))} />
          <PixelChip label="★ 热门路线" active={plan.mode === 'hot'} onPress={() => setPlan(hotPlan(guide, { interests, days, pace }))} />
        </View>
      )}
      {plan.mode === 'hot' && (
        <Text style={px(12, palette.slate)}>按携程、马蜂窝、小红书上最常见的热门行程整理，每天顺路排好；天数比路线多时，剩下的天按你的喜好补上。</Text>
      )}
      <StoryBox text={guide.intro} />
      {plan.days.map((d) => (
        <PixelBox key={d.day} bg={palette.white} contentStyle={{ padding: 0 }}>
          <View style={styles.dayHead}>
            <Text style={px(18, palette.white)}>
              DAY {d.day}
              {d.title ? ` · ${d.title}` : ''}
            </Text>
            <Text style={px(12, palette.cyan)}>
              {d.areas.join(' → ')} · 约 {Math.round(d.hours * 2) / 2} 小时
            </Text>
          </View>
          <View style={{ padding: 10, gap: 12 }}>
            {d.items.map(({ slot, spot }) => (
              <View key={spot.name} style={{ gap: 4 }}>
                <View style={styles.row}>
                  <View style={[styles.slot, { backgroundColor: SLOT_COLOR[slot] }]}>
                    <Text style={px(12, slot === '晚上' ? palette.white : palette.ink)}>{slot}</Text>
                  </View>
                  <Text style={[px(18), { flex: 1 }]}>{spot.name}</Text>
                </View>
                <TagList spot={spot} />
                <Text style={px(12, palette.slate)}>
                  {spot.hours} 小时 · {spot.ticket} · {spot.tip}
                </Text>
                <StoryBox text={spot.story} />
                <ExternalLink url={mapSearch(spot.name, trip.to)}>
                  <Text style={px(12, palette.blue)}>▶ 地图导航</Text>
                </ExternalLink>
              </View>
            ))}
            {d.foods.length > 0 && (
              <View style={styles.food}>
                <PixelIcon name="bowl" scale={2} />
                <Text style={[px(12), { flex: 1 }]}>今天吃：{d.foods.map((f) => `${f.name}（${f.desc}）`).join('、')}</Text>
              </View>
            )}
          </View>
        </PixelBox>
      ))}
      {plan.days.length < days && (
        <Text style={px(12, palette.slate)}>※ 收录的景点只够排 {plan.days.length} 天，剩下的时间可以自由逛逛、补觉或者去周边城市。</Text>
      )}
      {plan.extras.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={px(18)}>时间多的话还可以去</Text>
          {plan.extras.map((s) => (
            <Text key={s.name} style={px(12)}>
              ▪ {s.name}（{s.hours} 小时）：{s.tip}
            </Text>
          ))}
        </View>
      )}
      <PixelButton contentStyle={styles.go} onPress={() => setPlan(null)}>
        <Text style={px(12)}>重新回答问题</Text>
      </PixelButton>
    </View>
  );
}

function Question({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        <View style={styles.qNum}>
          <Text style={px(12, palette.white)}>Q{n}</Text>
        </View>
        <Text style={[px(12), { flex: 1 }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  go: { alignItems: 'center', paddingVertical: 10 },
  qNum: { backgroundColor: palette.plum, borderWidth: BORDER, borderColor: palette.ink, paddingHorizontal: 6 },
  dayHead: { backgroundColor: palette.navy, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: BORDER, borderColor: palette.ink },
  slot: { borderWidth: 2, borderColor: palette.ink, paddingHorizontal: 6 },
  food: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: palette.yellow, borderWidth: 2, borderColor: palette.ink, padding: 6 },
});
