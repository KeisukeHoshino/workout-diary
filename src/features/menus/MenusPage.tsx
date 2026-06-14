import { FormEvent } from 'react';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { validateName } from '../../domain/validation';
import { initializeDatabase } from '../../infrastructure/db/database';
import { exerciseRepository, menuRepository } from '../../infrastructure/db/repositories';
import { useAsyncData } from '../shared/useAsyncData';

export function MenusPage() {
  const { data, reload } = useAsyncData(async () => {
    await initializeDatabase();
    const [menus, exercises] = await Promise.all([menuRepository.list(), exerciseRepository.listActive()]);
    return { menus, exercises };
  });

  async function createMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = validateName(String(form.get('name') ?? ''));
    const exerciseIds = form.getAll('exerciseIds').map(String);
    if (!name || !exerciseIds.length) return;
    await menuRepository.create({
      name,
      memo: String(form.get('memo') ?? '').slice(0, 500),
      exerciseIds
    });
    event.currentTarget.reset();
    reload();
  }

  return (
    <>
      <ScreenHeader title="メニュー" description="1回分の筋トレテンプレートを作成します。" />
      <section className="panel">
        <form onSubmit={createMenu}>
          <div className="grid-2">
            <div className="field">
              <label>メニュー名</label>
              <input name="name" maxLength={40} required placeholder="例: Push Day" />
            </div>
            <div className="field">
              <label>メモ</label>
              <input name="memo" maxLength={500} placeholder="任意" />
            </div>
          </div>
          <div className="label" style={{ marginTop: 12 }}>種目</div>
          <div className="grid-3" style={{ marginTop: 8 }}>
            {data?.exercises.map((exercise) => (
              <label className="row" key={exercise.id}>
                <input type="checkbox" name="exerciseIds" value={exercise.id} />
                {exercise.name}
              </label>
            ))}
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="button">メニューを作成</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="toolbar">
          <h3>登録メニュー</h3>
          <span className="badge">{data?.menus.length ?? 0} 件</span>
        </div>
        {!data?.menus.length ? <EmptyState title="メニューがありません" /> : null}
        <div className="list">
          {data?.menus.map((item) => (
            <article className="list-item" key={item.menu.id}>
              <div className="list-item-top">
                <div>
                  <h3>{item.menu.name}</h3>
                  <p className="muted">{item.exercises.map((row) => row.exercise.name).join(' / ')}</p>
                </div>
                <button
                  className="danger-button"
                  onClick={async () => {
                    if (!confirm('このメニューを削除しますか？')) return;
                    await menuRepository.delete(item.menu.id);
                    reload();
                  }}
                >
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
