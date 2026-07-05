import { Archive, CheckCircle2, Pencil, Plus, RotateCcw, Save, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import type { BodyPart, EquipmentType, Exercise } from '../../domain/models';
import { bodyPartLabels, equipmentTypeLabels } from '../../domain/rules';
import { validateName } from '../../domain/validation';
import { initializeDatabase } from '../../infrastructure/db/database';
import { DuplicateExerciseNameError, exerciseRepository } from '../../infrastructure/db/repositories';
import { useAsyncData } from '../shared/useAsyncData';

interface ExerciseDraft {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipmentType: EquipmentType | null;
}

export function ExercisesPage() {
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [recentPresetIds, setRecentPresetIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackKind, setFeedbackKind] = useState<'success' | 'error'>('success');
  const [editingExercise, setEditingExercise] = useState<ExerciseDraft | null>(null);
  const [isUpdating, setUpdating] = useState(false);
  const { data, isLoading, reload } = useAsyncData(async () => {
    await initializeDatabase();
    const [exercises, presets] = await Promise.all([exerciseRepository.listAll(), exerciseRepository.listPresets()]);
    return { exercises, presets };
  });

  const addedPresetIds = new Set(data?.exercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));
  const activeExercises = data?.exercises.filter((exercise) => exercise.isActive) ?? [];
  const hiddenExercises = data?.exercises.filter((exercise) => !exercise.isActive) ?? [];
  const availablePresets = data?.presets.filter((preset) => !addedPresetIds.has(preset.id)) ?? [];
  const addedPresets = data?.presets.filter((preset) => addedPresetIds.has(preset.id)) ?? [];

  async function createExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = validateName(String(form.get('name') ?? ''));
    if (!name) {
      setFeedbackKind('error');
      setFeedback('種目名は 1 から 40 文字で入力してください。');
      return;
    }
    try {
      const exercise = await exerciseRepository.create({
        name,
        bodyPart: form.get('bodyPart') as BodyPart,
        equipmentType: (form.get('equipmentType') || null) as EquipmentType | null
      });
      formElement.reset();
      setRecentExerciseIds([exercise.id]);
      setRecentPresetIds([]);
      setFeedbackKind('success');
      setFeedback(`${exercise.name} をマイ種目に追加しました。`);
      reload();
    } catch (error) {
      setRecentExerciseIds([]);
      setRecentPresetIds([]);
      setFeedbackKind('error');
      setFeedback(error instanceof DuplicateExerciseNameError ? error.message : '種目を作成できませんでした。');
    }
  }

  async function changeExerciseVisibility(exercise: Exercise) {
    const nextActive = !exercise.isActive;
    await exerciseRepository.setActive(exercise.id, nextActive);
    setRecentExerciseIds([]);
    setRecentPresetIds([]);
    setFeedbackKind('success');
    setFeedback(`${exercise.name} を${nextActive ? '復元' : '非表示に'}しました。`);
    reload();
  }

  function startEditingExercise(exercise: Exercise) {
    setEditingExercise({
      id: exercise.id,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      equipmentType: exercise.equipmentType,
    });
    setFeedback('');
  }

  async function updateExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingExercise) return;

    const name = validateName(editingExercise.name);
    if (!name) {
      setFeedbackKind('error');
      setFeedback('種目名は 1 から 40 文字で入力してください。');
      return;
    }

    setUpdating(true);
    try {
      const updated = await exerciseRepository.update(editingExercise.id, {
        name,
        bodyPart: editingExercise.bodyPart,
        equipmentType: editingExercise.equipmentType,
      });
      setEditingExercise(null);
      setRecentExerciseIds([updated.id]);
      setRecentPresetIds([]);
      setFeedbackKind('success');
      setFeedback(`${updated.name} を更新しました。`);
      reload();
    } catch (error) {
      setFeedbackKind('error');
      setFeedback(error instanceof DuplicateExerciseNameError ? error.message : '種目を更新できませんでした。');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="exercise-page app-page">
      <ScreenHeader title="マイ種目" description="よく使う種目を管理します。" />
      {feedback ? (
        <div className={`notice ${feedbackKind === 'error' ? 'is-error' : ''}`} role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      ) : null}
      <section className="panel exercise-create-panel">
        <div className="section-heading">
          <h3>新しい種目</h3>
        </div>
        <form onSubmit={createExercise}>
          <div className="grid-3">
            <div className="field">
              <label>種目名</label>
              <input name="name" maxLength={40} required placeholder="例: ベンチプレス" />
            </div>
            <div className="field">
              <label>部位</label>
              <select name="bodyPart">{bodyPartOptions()}</select>
            </div>
            <div className="field">
              <label>種別</label>
              <select name="equipmentType">
                <option value="">なし</option>
                {equipmentOptions()}
              </select>
            </div>
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="button">
              <Plus size={17} aria-hidden="true" />
              種目を作成
            </button>
          </div>
        </form>
      </section>

      <section className="collection-section">
        <div className="toolbar collection-header">
          <h3>一覧</h3>
          <span className="badge">{activeExercises.length} 件</span>
        </div>
        {isLoading ? <EmptyState title="読み込み中" /> : null}
        {!isLoading && activeExercises.length === 0 ? (
          <EmptyState title="表示中の種目がありません">新しい種目を作成するか、非表示の種目を復元してください。</EmptyState>
        ) : null}
        <div className="list responsive-card-list">
          {activeExercises.map((exercise) => (
            <ExerciseCard
              draft={editingExercise?.id === exercise.id ? editingExercise : null}
              exercise={exercise}
              isRecent={recentExerciseIds.includes(exercise.id) || Boolean(exercise.sourcePresetId && recentPresetIds.includes(exercise.sourcePresetId))}
              isUpdating={isUpdating}
              key={exercise.id}
              onCancelEditing={() => setEditingExercise(null)}
              onDraftChange={setEditingExercise}
              onSave={updateExercise}
              onStartEditing={startEditingExercise}
              onVisibilityChange={changeExerciseVisibility}
            />
          ))}
        </div>
      </section>

      {hiddenExercises.length ? (
        <section className="collection-section hidden-exercise-section">
          <div className="toolbar collection-header">
            <h3>非表示の種目</h3>
            <span className="badge">{hiddenExercises.length} 件</span>
          </div>
          <div className="list responsive-card-list">
            {hiddenExercises.map((exercise) => (
              <ExerciseCard
                draft={editingExercise?.id === exercise.id ? editingExercise : null}
                exercise={exercise}
                isRecent={false}
                isUpdating={isUpdating}
                key={exercise.id}
                onCancelEditing={() => setEditingExercise(null)}
                onDraftChange={setEditingExercise}
                onSave={updateExercise}
                onStartEditing={startEditingExercise}
                onVisibilityChange={changeExerciseVisibility}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="collection-section preset-section">
        <div className="toolbar collection-header preset-header">
          <h3>プリセット追加</h3>
          <button
            className="button"
            disabled={!selectedPresetIds.length}
            onClick={async () => {
              const presetIds = selectedPresetIds;
              const result = await exerciseRepository.addFromPresets(presetIds);
              setSelectedPresetIds([]);
              setRecentExerciseIds([]);
              setRecentPresetIds(presetIds);
              setFeedbackKind(result.addedCount ? 'success' : 'error');
              setFeedback(result.addedCount
                ? `${result.addedCount} 件のプリセットをマイ種目に追加しました。${result.skippedCount ? ` ${result.skippedCount} 件は同名または追加済みのためスキップしました。` : ''}`
                : '選択したプリセットは同名または追加済みのため追加できませんでした。');
              reload();
            }}
          >
            選択した種目を追加
          </button>
        </div>
        <div className="list responsive-card-list">
          <div className="preset-group-heading">
            <h4>追加できる種目</h4>
            <span>{availablePresets.length} 件</span>
          </div>
          {availablePresets.map((preset) => {
            const checked = selectedPresetIds.includes(preset.id);
            return (
              <label className={`list-item preset-list-item ${checked ? 'is-selected' : ''}`} key={preset.id}>
                <span className="list-item-top">
                  <span>
                    <strong>{preset.name}</strong>
                    <span className="muted">{bodyPartLabels[preset.bodyPart]}</span>
                  </span>
                  <span className="badge preset-status is-pending">未追加</span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelectedPresetIds((current) => event.target.checked
                      ? [...current, preset.id]
                      : current.filter((id) => id !== preset.id));
                  }}
                />
              </label>
            );
          })}
          <div className="preset-group-heading is-added">
            <h4>追加済み</h4>
            <span>{addedPresets.length} 件</span>
          </div>
          {addedPresets.map((preset) => (
            <article className="list-item preset-list-item is-added" key={preset.id}>
              <span className="list-item-top">
                <span>
                  <strong>{preset.name}</strong>
                  <span className="muted">{bodyPartLabels[preset.bodyPart]}</span>
                </span>
                <span className="badge preset-status is-added">追加済み</span>
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExerciseCard({
  draft,
  exercise,
  isRecent,
  isUpdating,
  onCancelEditing,
  onDraftChange,
  onSave,
  onStartEditing,
  onVisibilityChange,
}: {
  draft: ExerciseDraft | null;
  exercise: Exercise;
  isRecent: boolean;
  isUpdating: boolean;
  onCancelEditing: () => void;
  onDraftChange: (draft: ExerciseDraft) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onStartEditing: (exercise: Exercise) => void;
  onVisibilityChange: (exercise: Exercise) => Promise<void>;
}) {
  if (draft) {
    return (
      <article
        className={`list-item exercise-list-item is-editing ${exercise.isActive ? '' : 'is-inactive'}`}
        data-exercise-id={exercise.id}
      >
        <form className="exercise-edit-form" onSubmit={onSave}>
          <div className="exercise-edit-heading">
            <div>
              <h3>種目を編集</h3>
              <p className="muted">種目名、部位、種別を変更できます。</p>
            </div>
            {!exercise.isActive ? <span className="badge">非表示</span> : null}
          </div>
          <div className="grid-3">
            <div className="field">
              <label htmlFor={`exercise-name-${exercise.id}`}>種目名</label>
              <input
                id={`exercise-name-${exercise.id}`}
                maxLength={40}
                required
                value={draft.name}
                onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`exercise-body-part-${exercise.id}`}>部位</label>
              <select
                id={`exercise-body-part-${exercise.id}`}
                value={draft.bodyPart}
                onChange={(event) => onDraftChange({ ...draft, bodyPart: event.target.value as BodyPart })}
              >
                {bodyPartOptions()}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`exercise-equipment-${exercise.id}`}>種別</label>
              <select
                id={`exercise-equipment-${exercise.id}`}
                value={draft.equipmentType ?? ''}
                onChange={(event) => onDraftChange({
                  ...draft,
                  equipmentType: (event.target.value || null) as EquipmentType | null,
                })}
              >
                <option value="">なし</option>
                {equipmentOptions()}
              </select>
            </div>
          </div>
          <div className="actions exercise-edit-actions">
            <button className="secondary-button" type="button" disabled={isUpdating} onClick={onCancelEditing}>
              <X size={16} aria-hidden="true" />
              キャンセル
            </button>
            <button className="button" type="submit" disabled={isUpdating}>
              <Save size={16} aria-hidden="true" />
              {isUpdating ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article
      className={`list-item exercise-list-item ${exercise.isActive ? '' : 'is-inactive'} ${isRecent ? 'is-new' : ''}`}
      data-exercise-id={exercise.id}
    >
      <div className="list-item-top">
        <div>
          <h3>{exercise.name}</h3>
          <p className="muted">
            {bodyPartLabels[exercise.bodyPart]} / {exercise.equipmentType ? equipmentTypeLabels[exercise.equipmentType] : '種別なし'}
            {exercise.isActive ? '' : ' / 非表示'}
          </p>
        </div>
        <div className="exercise-card-actions">
          <button className="secondary-button" type="button" disabled={isUpdating} onClick={() => onStartEditing(exercise)}>
            <Pencil size={16} aria-hidden="true" />
            編集
          </button>
          <button
            className={exercise.isActive ? 'danger-button' : 'secondary-button'}
            type="button"
            disabled={isUpdating}
            onClick={() => onVisibilityChange(exercise)}
          >
            {exercise.isActive ? <Archive size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
            {exercise.isActive ? '非表示' : '復元'}
          </button>
        </div>
      </div>
    </article>
  );
}

function bodyPartOptions() {
  return Object.entries(bodyPartLabels).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ));
}

function equipmentOptions() {
  return Object.entries(equipmentTypeLabels).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ));
}
