import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import type { BodyWeightPoint, GraphRange, MaxWeightPoint } from '../../domain/models';
import { formatKg, graphRangeLabels } from '../../domain/rules';
import { initializeDatabase } from '../../infrastructure/db/database';
import { exerciseRepository, graphRepository, settingsRepository } from '../../infrastructure/db/repositories';
import { useAsyncData } from '../shared/useAsyncData';

type GraphTab = 'weight' | 'body';

export function GraphsPage() {
  const [tab, setTab] = useState<GraphTab>('weight');
  const [range, setRange] = useState<GraphRange>('3m');
  const [exerciseId, setExerciseId] = useState('');
  const { data, reload } = useAsyncData(async () => {
    await initializeDatabase();
    const [settings, exercises] = await Promise.all([settingsRepository.get(), exerciseRepository.listActive()]);
    return { settings, exercises };
  });

  useEffect(() => {
    if (data?.settings?.defaultGraphRange) setRange(data.settings.defaultGraphRange);
  }, [data?.settings?.defaultGraphRange]);

  useEffect(() => {
    if (!exerciseId && data?.exercises[0]) setExerciseId(data.exercises[0].id);
  }, [data?.exercises, exerciseId]);

  return (
    <>
      <ScreenHeader title="グラフ" description="最大重量と体重の推移を確認します。" />
      <section className="panel">
        <div className="tabs">
          <button className={`tab-button ${tab === 'weight' ? 'active' : ''}`} onClick={() => setTab('weight')}>最大重量</button>
          <button className={`tab-button ${tab === 'body' ? 'active' : ''}`} onClick={() => setTab('body')}>体重</button>
        </div>
        <div className="grid-2">
          {tab === 'weight' ? (
            <div className="field">
              <label>種目</label>
              <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
                {data?.exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </select>
            </div>
          ) : <div />}
          <div className="field">
            <label>期間</label>
            <select value={range} onChange={(event) => setRange(event.target.value as GraphRange)}>
              {Object.entries(graphRangeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <GraphContent tab={tab} range={range} exerciseId={exerciseId} reloadKey={data?.exercises.length ?? 0} onLoaded={reload} />
      </section>
    </>
  );
}

function GraphContent({ tab, range, exerciseId, reloadKey }: { tab: GraphTab; range: GraphRange; exerciseId: string; reloadKey: number; onLoaded: () => void }) {
  const { data } = useAsyncData(async () => {
    if (tab === 'weight') return exerciseId ? graphRepository.listMaxWeightPoints(exerciseId, range) : [];
    return graphRepository.listBodyWeightPoints(range);
  }, [tab, range, exerciseId, reloadKey]);

  const points = data ?? [];
  if (!points.length) {
    return <div style={{ marginTop: 14 }}><EmptyState title="表示できるデータがありません" /></div>;
  }

  return (
    <>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#d8e0df" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => `${value}kg`} width={58} />
            <Tooltip formatter={(value) => formatKg(Number(value))} />
            <Line type="monotone" dataKey="value" stroke={tab === 'weight' ? '#16776f' : '#b85337'} strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Summary points={points} tab={tab} />
    </>
  );
}

function Summary({ points, tab }: { points: Array<MaxWeightPoint | BodyWeightPoint>; tab: GraphTab }) {
  const values = points.map((point) => point.value);
  const latest = values[values.length - 1] ?? 0;
  const first = values[0] ?? latest;
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const delta = latest - first;
  const metrics = tab === 'weight'
    ? [
      ['最新', formatKg(latest)],
      ['最高', formatKg(highest)],
      ['変化', `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}kg`],
      ['記録', `${points.length}回`]
    ]
    : [
      ['最新', formatKg(latest)],
      ['最低', formatKg(lowest)],
      ['最高', formatKg(highest)],
      ['変化', `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}kg`]
    ];

  return (
    <div className="summary-grid">
      {metrics.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
