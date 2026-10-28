import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import FlightScene from './src/components/FlightScene';
import { Trip } from './src/components/Sections';
import FootprintsScreen from './src/screens/FootprintsScreen';
import HomeScreen, { toDateString, TripQuery } from './src/screens/HomeScreen';
import MemoryScreen from './src/screens/MemoryScreen';
import ResultScreen from './src/screens/ResultScreen';
import { loadFootprints, mergeFootprints, newFootprint, saveFootprints } from './src/services/footprints';
import { distanceKm, resolvePlace } from './src/services/geo';
import { getWeather } from './src/services/weather';
import { FONT, palette } from './src/theme';
import { Footprint, Place } from './src/types';

type Stage = 'home' | 'flying' | 'result' | 'footprints' | 'memory';

async function planTrip(q: TripQuery): Promise<Trip> {
  const [from, to] = await Promise.all([resolvePlace(q.from), resolvePlace(q.to)]);
  if (!from) throw new Error(`找不到出发地「${q.from}」，换个写法试试`);
  if (!to) throw new Error(`找不到目的地「${q.to}」，换个写法试试`);
  const weather = await getWeather(to.lat, to.lon, q.date);
  return { from, to, date: q.date, km: distanceKm(from, to), weather };
}

export default function App() {
  const [fontReady, fontError] = useFonts({ [FONT]: require('./assets/fonts/FusionPixel.otf') });
  const [stage, setStage] = useState<Stage>('home');
  const [query, setQuery] = useState<TripQuery>({ from: '北京', to: '', date: toDateString(new Date()) });
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [landed, setLanded] = useState(false);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const [memoryOf, setMemoryOf] = useState<string | null>(null);
  // 从相册页返回时回到哪一页
  const [memoryBack, setMemoryBack] = useState<Stage>('footprints');

  useEffect(() => {
    loadFootprints().then(setFootprints);
  }, []);

  const updateFootprints = (fn: (prev: Footprint[]) => Footprint[]) =>
    setFootprints((prev) => {
      const next = fn(prev);
      saveFootprints(next).catch(() => {});
      return next;
    });

  const markVisited = (place: Place, date: string) =>
    updateFootprints((prev) => {
      const old = prev.find((f) => f.name === place.name);
      if (!old) return [...prev, newFootprint(place, date)];
      if (old.visits.includes(date)) return prev;
      return prev.map((f) => (f === old ? { ...f, visits: [...f.visits, date].sort() } : f));
    });

  const openMemory = (name: string, from: Stage) => {
    setMemoryOf(name);
    setMemoryBack(from);
    setStage('memory');
  };

  const takeOff = (q: TripQuery) => {
    setQuery(q);
    setError(null);
    setTrip(null);
    setLanded(false);
    setStage('flying');
    planTrip(q)
      .then(setTrip)
      .catch((e: Error) => {
        setError(e.message);
        setStage('home');
      });
  };

  const onLanded = useCallback(() => setLanded(true), []);

  // 飞机动画播完、数据也准备好之后才进入结果页
  useEffect(() => {
    if (stage === 'flying' && landed && trip) setStage('result');
  }, [stage, landed, trip]);

  const memory = footprints.find((f) => f.name === memoryOf);

  // 等像素字体加载好再显示，避免先闪一下系统字体
  if (!fontReady && !fontError) return <View style={{ flex: 1, backgroundColor: palette.sky }} />;

  return (
    <>
      <StatusBar style="dark" />
      {stage === 'home' && (
        <HomeScreen
          initial={query}
          error={error}
          footprintCount={footprints.length}
          onTakeOff={takeOff}
          onFootprints={() => setStage('footprints')}
        />
      )}
      {stage === 'flying' && <FlightScene from={query.from} to={query.to} waiting={landed && !trip} onLanded={onLanded} />}
      {stage === 'result' && trip && (
        <ResultScreen
          trip={trip}
          visited={footprints.some((f) => f.name === trip.to.name)}
          onVisited={() => {
            markVisited(trip.to, trip.date);
            openMemory(trip.to.name, 'result');
          }}
          onBack={() => setStage('home')}
        />
      )}
      {stage === 'footprints' && (
        <FootprintsScreen
          footprints={footprints}
          onOpen={(name) => openMemory(name, 'footprints')}
          onAdd={async (city) => {
            const place = await resolvePlace(city);
            if (!place) return `找不到「${city}」，换个写法试试`;
            markVisited(place, toDateString(new Date()));
            return null;
          }}
          onImport={(found) => updateFootprints((prev) => mergeFootprints(prev, found))}
          onBack={() => setStage('home')}
        />
      )}
      {stage === 'memory' && memory && (
        <MemoryScreen
          key={memory.name}
          footprint={memory}
          onChange={(f) => updateFootprints((prev) => prev.map((p) => (p.name === f.name ? f : p)))}
          onRemove={() => {
            updateFootprints((prev) => prev.filter((p) => p.name !== memory.name));
            setStage(memoryBack);
          }}
          onBack={() => setStage(memoryBack)}
        />
      )}
    </>
  );
}
