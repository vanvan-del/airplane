import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import FlightScene from './src/components/FlightScene';
import { Trip } from './src/components/Sections';
import HomeScreen, { toDateString, TripQuery } from './src/screens/HomeScreen';
import ResultScreen from './src/screens/ResultScreen';
import { distanceKm, resolvePlace } from './src/services/geo';
import { getWeather } from './src/services/weather';

type Stage = 'home' | 'flying' | 'result';

async function planTrip(q: TripQuery): Promise<Trip> {
  const [from, to] = await Promise.all([resolvePlace(q.from), resolvePlace(q.to)]);
  if (!from) throw new Error(`找不到出发地「${q.from}」，换个写法试试`);
  if (!to) throw new Error(`找不到目的地「${q.to}」，换个写法试试`);
  const weather = await getWeather(to.lat, to.lon, q.date);
  return { from, to, date: q.date, km: distanceKm(from, to), weather };
}

export default function App() {
  const [stage, setStage] = useState<Stage>('home');
  const [query, setQuery] = useState<TripQuery>({ from: '北京', to: '', date: toDateString(new Date()) });
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [landed, setLanded] = useState(false);

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

  return (
    <>
      <StatusBar style="dark" />
      {stage === 'home' && <HomeScreen initial={query} error={error} onTakeOff={takeOff} />}
      {stage === 'flying' && <FlightScene from={query.from} to={query.to} waiting={landed && !trip} onLanded={onLanded} />}
      {stage === 'result' && trip && <ResultScreen trip={trip} onBack={() => setStage('home')} />}
    </>
  );
}
