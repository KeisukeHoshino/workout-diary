import { FormEvent, useState } from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import { validateName } from "../../domain/validation";
import { initializeDatabase } from "../../infrastructure/db/database";
import {
  exerciseRepository,
  menuRepository,
} from "../../infrastructure/db/repositories";
import { useAsyncData } from "../shared/useAsyncData";

export function MenusPage() {
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const { data, reload } = useAsyncData(async () => {
    await initializeDatabase();
    const [menus, exercises] = await Promise.all([
      menuRepository.list(),
      exerciseRepository.listActive(),
    ]);
    return { menus, exercises };
  });

  async function createMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = validateName(String(form.get("name") ?? ""));
    if (!name) {
      setMessage("メニュー名は 1 から 40 文字で入力してください。");
      return;
    }
    if (!selectedExerciseIds.length) {
      setMessage("メニューに入れる種目を選択してください。");
      return;
    }

    setSubmitting(true);
    try {
      await menuRepository.create({
        name,
        memo: String(form.get("memo") ?? "").slice(0, 500),
        exerciseIds: selectedExerciseIds,
      });
      formElement.reset();
      setSelectedExerciseIds([]);
      setMessage("メニューを作成しました。");
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ScreenHeader
        title="メニュー"
        description="1回分の筋トレテンプレートを作成します。"
      />
      <section className="panel">
        <form onSubmit={createMenu}>
          <div className="grid-2">
            <div className="field">
              <label>メニュー名</label>
              <input
                name="name"
                maxLength={40}
                required
                placeholder="例: Push Day"
              />
            </div>
            <div className="field">
              <label>メモ</label>
              <input name="memo" maxLength={500} placeholder="任意" />
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: 12, marginBottom: 8 }}>
            <div className="label">種目</div>
            <span className="badge">{selectedExerciseIds.length} 件選択中</span>
          </div>
          {data?.exercises.length ? (
            <div className="grid-3">
              {data.exercises.map((exercise) => (
                <label className="row" key={exercise.id}>
                  <input
                    type="checkbox"
                    name="exerciseIds"
                    value={exercise.id}
                    checked={selectedExerciseIds.includes(exercise.id)}
                    onChange={(event) => {
                      setSelectedExerciseIds((current) =>
                        event.target.checked
                          ? [...current, exercise.id]
                          : current.filter((id) => id !== exercise.id),
                      );
                    }}
                  />
                  {exercise.name}
                </label>
              ))}
            </div>
          ) : (
            <EmptyState title="利用できる種目がありません">
              先にマイ種目を追加してください。
            </EmptyState>
          )}
          {message ? <p className="muted">{message}</p> : null}
          <div className="actions" style={{ marginTop: 12 }}>
            <button
              className="button"
              type="submit"
              disabled={isSubmitting || !data?.exercises.length}
            >
              {isSubmitting ? "作成中..." : "メニューを作成"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="toolbar">
          <h3>登録メニュー</h3>
          <span className="badge">{data?.menus.length ?? 0} 件</span>
        </div>
        {!data?.menus.length ? (
          <EmptyState title="メニューがありません" />
        ) : null}
        <div className="list">
          {data?.menus.map((item) => (
            <article className="list-item" key={item.menu.id}>
              <div className="list-item-top">
                <div>
                  <h3>{item.menu.name}</h3>
                  <p className="muted">
                    {item.exercises.map((row) => row.exercise.name).join(" / ")}
                  </p>
                </div>
                <button
                  className="danger-button"
                  onClick={async () => {
                    if (!confirm("このメニューを削除しますか？")) return;
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
