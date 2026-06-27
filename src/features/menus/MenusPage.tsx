import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { ScreenHeader } from "../../components/common/ScreenHeader";
import type { MenuTemplateDetail } from "../../domain/models";
import { validateName } from "../../domain/validation";
import { initializeDatabase } from "../../infrastructure/db/database";
import {
  exerciseRepository,
  menuRepository,
} from "../../infrastructure/db/repositories";
import { useAsyncData } from "../shared/useAsyncData";

interface MenuDraft {
  id: string;
  name: string;
  memo: string;
  exerciseIds: string[];
}

export function MenusPage() {
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [libraryMessage, setLibraryMessage] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editingMenu, setEditingMenu] = useState<MenuDraft | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isUpdating, setUpdating] = useState(false);
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

  function startEditing(item: MenuTemplateDetail) {
    setEditingMenu({
      id: item.menu.id,
      name: item.menu.name,
      memo: item.menu.memo,
      exerciseIds: item.exercises.map((row) => row.exercise.id),
    });
    setEditMessage("");
    setLibraryMessage("");
  }

  function toggleEditingExercise(exerciseId: string, checked: boolean) {
    setEditingMenu((current) => {
      if (!current) return current;
      return {
        ...current,
        exerciseIds: checked
          ? [...current.exerciseIds, exerciseId]
          : current.exerciseIds.filter((id) => id !== exerciseId),
      };
    });
  }

  async function updateMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMenu) return;

    setEditMessage("");
    const name = validateName(editingMenu.name);
    if (!name) {
      setEditMessage("メニュー名は 1 から 40 文字で入力してください。");
      return;
    }
    if (!editingMenu.exerciseIds.length) {
      setEditMessage("メニューに入れる種目を選択してください。");
      return;
    }

    setUpdating(true);
    try {
      await menuRepository.update(editingMenu.id, {
        name,
        memo: editingMenu.memo.slice(0, 500),
        exerciseIds: editingMenu.exerciseIds,
      });
      setEditingMenu(null);
      setLibraryMessage("メニューを更新しました。");
      reload();
    } catch (error) {
      setEditMessage(
        error instanceof Error ? error.message : "メニューを更新できませんでした。",
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="menus-page app-page">
      <ScreenHeader
        title="メニュー"
        description="1回分の筋トレテンプレートを作成します。"
      />
      <section className="panel menu-create-panel">
        <div className="section-heading">
          <h3>新しいメニュー</h3>
        </div>
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
            <div className="menu-exercise-grid">
              {data.exercises.map((exercise) => (
                <label
                  className={`menu-exercise-option ${selectedExerciseIds.includes(exercise.id) ? "is-selected" : ""}`}
                  key={exercise.id}
                >
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
              <Plus size={17} aria-hidden="true" />
              {isSubmitting ? "作成中..." : "メニューを作成"}
            </button>
          </div>
        </form>
      </section>

      <section className="collection-section menu-library-section">
        <div className="toolbar collection-header">
          <h3>登録メニュー</h3>
          <span className="badge">{data?.menus.length ?? 0} 件</span>
        </div>
        {libraryMessage ? (
          <p className="status-message" aria-live="polite">
            {libraryMessage}
          </p>
        ) : null}
        {!data?.menus.length ? (
          <EmptyState title="メニューがありません" />
        ) : null}
        <div className="list menu-list">
          {data?.menus.map((item) => {
            const isEditing = editingMenu?.id === item.menu.id;
            return (
              <article
                className={`list-item menu-list-item ${isEditing ? "is-editing" : ""}`}
                key={item.menu.id}
              >
                {isEditing && editingMenu ? (
                  <form className="menu-edit-form" onSubmit={updateMenu}>
                    <div className="menu-edit-heading">
                      <div>
                        <h3>メニューを編集</h3>
                        <p className="muted">名前、メモ、種目を変更できます。</p>
                      </div>
                      <span className="badge">
                        {editingMenu.exerciseIds.length} 件選択中
                      </span>
                    </div>
                    <div className="grid-2">
                      <div className="field">
                        <label htmlFor={`menu-name-${item.menu.id}`}>メニュー名</label>
                        <input
                          id={`menu-name-${item.menu.id}`}
                          maxLength={40}
                          required
                          value={editingMenu.name}
                          onChange={(event) =>
                            setEditingMenu((current) =>
                              current ? { ...current, name: event.target.value } : current,
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`menu-memo-${item.menu.id}`}>メモ</label>
                        <input
                          id={`menu-memo-${item.menu.id}`}
                          maxLength={500}
                          placeholder="任意"
                          value={editingMenu.memo}
                          onChange={(event) =>
                            setEditingMenu((current) =>
                              current ? { ...current, memo: event.target.value } : current,
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="label">種目</div>
                    <div className="menu-exercise-grid">
                      {data.exercises.map((exercise) => {
                        const checked = editingMenu.exerciseIds.includes(exercise.id);
                        return (
                          <label
                            className={`menu-exercise-option ${checked ? "is-selected" : ""}`}
                            key={exercise.id}
                          >
                            <input
                              type="checkbox"
                              value={exercise.id}
                              checked={checked}
                              onChange={(event) =>
                                toggleEditingExercise(exercise.id, event.target.checked)
                              }
                            />
                            {exercise.name}
                          </label>
                        );
                      })}
                    </div>
                    {editMessage ? (
                      <p className="status-message is-error" aria-live="polite">
                        {editMessage}
                      </p>
                    ) : null}
                    <div className="actions menu-edit-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={isUpdating}
                        onClick={() => {
                          setEditingMenu(null);
                          setEditMessage("");
                        }}
                      >
                        <X size={16} aria-hidden="true" />
                        キャンセル
                      </button>
                      <button className="button" type="submit" disabled={isUpdating}>
                        <Save size={16} aria-hidden="true" />
                        {isUpdating ? "保存中..." : "変更を保存"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="list-item-top">
                    <div>
                      <h3>{item.menu.name}</h3>
                      {item.menu.memo ? <p className="menu-memo">{item.menu.memo}</p> : null}
                      <p className="muted">
                        {item.exercises.map((row) => row.exercise.name).join(" / ")}
                      </p>
                    </div>
                    <div className="actions menu-item-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={isUpdating}
                        onClick={() => startEditing(item)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        編集
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        disabled={isUpdating}
                        onClick={async () => {
                          if (!confirm("このメニューを削除しますか？")) return;
                          await menuRepository.delete(item.menu.id);
                          if (editingMenu?.id === item.menu.id) setEditingMenu(null);
                          setLibraryMessage("メニューを削除しました。");
                          reload();
                        }}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
