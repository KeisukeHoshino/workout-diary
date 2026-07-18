import { Link } from 'react-router-dom';
import { appServices } from '../../app/services';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { dateLabel, formatKg } from '../../domain/rules';
import { useAsyncData } from '../shared/useAsyncData';

export function HistoryPage() {
  const { data, reload } = useAsyncData(() => appServices.history.list());

  return (
    <div className="history-page app-page">
      <ScreenHeader title="日別履歴" description="過去の記録を確認して編集します。" />
      <section className="collection-section history-section">
        {!data?.length ? <EmptyState title="履歴はまだありません" /> : null}
        <div className="list history-list">
          {data?.map((item) => (
            <article className="list-item history-list-item" key={item.date}>
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
                  {item.hasWorkout ? (
                    <button
                      className="danger-button"
                      onClick={async () => {
                        if (!confirm('この日の筋トレ記録を削除しますか？体重は残ります。')) return;
                        await appServices.history.deleteWorkout(item.date);
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
    </div>
  );
}
