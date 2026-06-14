import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { dateLabel, formatKg } from '../../domain/rules';
import { db, initializeDatabase } from '../../infrastructure/db/database';
import { workoutRepository } from '../../infrastructure/db/repositories';
import { useAsyncData } from '../shared/useAsyncData';

export function HistoryPage() {
  const { data, reload } = useAsyncData(async () => {
    await initializeDatabase();
    const [days, bodyWeights, workoutExercises, sets, exercises] = await Promise.all([
      db.workoutDays.toArray(),
      db.bodyWeightLogs.toArray(),
      db.workoutExercises.toArray(),
      db.workoutSets.toArray(),
      db.exercises.toArray()
    ]);
    const dates = [...new Set([...days.map((day) => day.date), ...bodyWeights.map((log) => log.date)])].sort((a, b) => b.localeCompare(a));
    return dates.map((date) => {
      const day = days.find((item) => item.date === date) ?? null;
      const cards = day ? workoutExercises.filter((item) => item.workoutDayId === day.id) : [];
      return {
        date,
        day,
        weight: bodyWeights.find((item) => item.date === date) ?? null,
        exerciseCount: cards.length,
        setCount: sets.filter((set) => cards.some((card) => card.id === set.workoutExerciseId)).length,
        exerciseNames: cards.map((card) => exercises.find((exercise) => exercise.id === card.exerciseId)?.name).filter(Boolean).slice(0, 3)
      };
    });
  });

  return (
    <>
      <ScreenHeader title="日別履歴" description="過去の記録を確認して編集します。" />
      <section className="panel">
        {!data?.length ? <EmptyState title="履歴はまだありません" /> : null}
        <div className="list">
          {data?.map((item) => (
            <article className="list-item" key={item.date}>
              <div className="list-item-top">
                <div>
                  <h3>{dateLabel(item.date)}</h3>
                  <p className="muted">
                    {item.weight ? formatKg(item.weight.bodyWeightKg) : '体重なし'} / {item.exerciseCount} 種目 / {item.setCount} セット
                  </p>
                  <p className="muted">{item.exerciseNames.join(' / ') || '筋トレ記録なし'}</p>
                </div>
                <div className="actions">
                  <Link className="secondary-button" to={`/?date=${item.date}`}>編集</Link>
                  {item.day ? (
                    <button
                      className="danger-button"
                      onClick={async () => {
                        if (!confirm('この日の筋トレ記録を削除しますか？体重は残ります。')) return;
                        await workoutRepository.deleteWorkoutDay(item.date);
                        reload();
                      }}
                    >
                      削除
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
