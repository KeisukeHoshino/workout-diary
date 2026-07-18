import { CheckCircle2, Plus, Search, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { appServices } from '../../app/services';
import { useDirtySource } from '../../app/UnsavedChangesProvider';
import { EmptyState } from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import type { BodyPart, EquipmentType, Exercise, ExercisePreset } from '../../domain/models';
import { DuplicateExerciseNameError } from '../../domain/errors';
import { bodyPartLabels, equipmentTypeLabels } from '../../domain/rules';
import { validateName } from '../../domain/validation';
import { useAsyncData } from '../shared/useAsyncData';
import { ExerciseCard, type ExerciseDraft } from './components/ExerciseCard';

function normalizeSearchText(value: string) {
  return value
    .trim()
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/[\u3041-\u3096]/g, (character) => String.fromCharCode(character.charCodeAt(0) + 0x60));
}

export function ExercisesPage() {
  const dirty = useDirtySource('exercise-forms');
  const location = useLocation();
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [recentPresetIds, setRecentPresetIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackKind, setFeedbackKind] = useState<'success' | 'error'>('success');
  const [editingExercise, setEditingExercise] = useState<ExerciseDraft | null>(null);
  const [isUpdating, setUpdating] = useState(false);
  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const [presetBodyPart, setPresetBodyPart] = useState<BodyPart | 'all'>('all');
  const { data, isLoading, reload } = useAsyncData(async () => {
    return appServices.exercises.load();
  });

  const addedPresetIds = new Set(data?.exercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));
  const activeExercises = data?.exercises.filter((exercise) => exercise.isActive) ?? [];
  const hiddenExercises = data?.exercises.filter((exercise) => !exercise.isActive) ?? [];
  const normalizedPresetSearch = normalizeSearchText(presetSearchQuery);
  const matchesPresetFilter = (preset: ExercisePreset) =>
    (!normalizedPresetSearch || normalizeSearchText(preset.name).includes(normalizedPresetSearch)) &&
    (presetBodyPart === 'all' || preset.bodyPart === presetBodyPart);
  const availablePresets = data?.presets.filter((preset) => !addedPresetIds.has(preset.id) && matchesPresetFilter(preset)) ?? [];
  const addedPresets = data?.presets.filter((preset) => addedPresetIds.has(preset.id) && matchesPresetFilter(preset)) ?? [];
  const isPresetFilterActive = Boolean(normalizedPresetSearch || presetBodyPart !== 'all');
  const filteredPresetCount = availablePresets.length + addedPresets.length;
  const highlightedSection = location.hash === '#create' || location.hash === '#presets' ? location.hash.slice(1) : '';

  useEffect(() => {
    if (!highlightedSection) return;
    const target = document.getElementById(highlightedSection);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightedSection]);

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
      const exercise = await appServices.exercises.create({
        name,
        bodyPart: form.get('bodyPart') as BodyPart,
        equipmentType: (form.get('equipmentType') || null) as EquipmentType | null
      });
      formElement.reset();
      dirty.markClean();
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
    await appServices.exercises.setActive(exercise.id, nextActive);
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
      const updated = await appServices.exercises.update(editingExercise.id, {
        name,
        bodyPart: editingExercise.bodyPart,
        equipmentType: editingExercise.equipmentType,
      });
      setEditingExercise(null);
      dirty.markClean();
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
      <section
        id="create"
        className={`panel exercise-create-panel ${highlightedSection === 'create' ? 'is-anchor-target' : ''}`}
        tabIndex={-1}
      >
        <div className="section-heading">
          <h3>新しい種目</h3>
        </div>
        <form onSubmit={createExercise} onChange={dirty.markDirty}>
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
              onCancelEditing={() => { setEditingExercise(null); dirty.markClean(); }}
              onDraftChange={(draft) => { setEditingExercise(draft); dirty.markDirty(); }}
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
                onCancelEditing={() => { setEditingExercise(null); dirty.markClean(); }}
                onDraftChange={(draft) => { setEditingExercise(draft); dirty.markDirty(); }}
                onSave={updateExercise}
                onStartEditing={startEditingExercise}
                onVisibilityChange={changeExerciseVisibility}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section
        id="presets"
        className={`collection-section preset-section ${highlightedSection === 'presets' ? 'is-anchor-target' : ''}`}
        tabIndex={-1}
      >
        <div className="toolbar collection-header preset-header">
          <h3>プリセット追加</h3>
          <button
            className="button"
            disabled={!selectedPresetIds.length}
            onClick={async () => {
              const presetIds = selectedPresetIds;
              const result = await appServices.exercises.addFromPresets(presetIds);
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
        <div className="preset-filters" role="search" aria-label="プリセット種目を絞り込み">
          <div className="field">
            <label htmlFor="preset-search">種目名で検索</label>
            <div className="preset-search-field">
              <Search size={17} aria-hidden="true" />
              <input
                id="preset-search"
                type="search"
                value={presetSearchQuery}
                placeholder="例: プレス"
                onChange={(event) => setPresetSearchQuery(event.target.value)}
              />
              {presetSearchQuery ? (
                <button
                  className="preset-search-clear"
                  type="button"
                  title="検索語をクリア"
                  aria-label="検索語をクリア"
                  onClick={() => setPresetSearchQuery('')}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="field">
            <label htmlFor="preset-body-part">部位</label>
            <select
              id="preset-body-part"
              value={presetBodyPart}
              onChange={(event) => setPresetBodyPart(event.target.value as BodyPart | 'all')}
            >
              <option value="all">すべての部位</option>
              {bodyPartOptions()}
            </select>
          </div>
          <p className="preset-filter-result" aria-live="polite">
            {isPresetFilterActive ? `${filteredPresetCount} 件が条件に一致` : `全 ${data?.presets.length ?? 0} 件`}
          </p>
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
          {!isLoading && availablePresets.length === 0 ? (
            <div className="preset-filter-empty">
              <EmptyState title={isPresetFilterActive ? '条件に一致する未追加種目がありません' : '追加できる種目はありません'} />
            </div>
          ) : null}
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
          {!isLoading && addedPresets.length === 0 ? (
            <div className="preset-filter-empty">
              <EmptyState title={isPresetFilterActive ? '条件に一致する追加済み種目がありません' : '追加済みの種目はありません'} />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function bodyPartOptions() {
  return Object.entries(bodyPartLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>);
}

function equipmentOptions() {
  return Object.entries(equipmentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>);
}
