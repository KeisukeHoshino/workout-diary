import type { ExerciseRepositoryPort } from '../../../application/ports';
import { DuplicateExerciseNameError } from '../../../domain/errors';
import { uuid } from '../../../domain/rules';
import { db } from '../database';
import { normalizeExerciseName, now } from './shared';

export const exerciseRepository: ExerciseRepositoryPort = {
  async listActive() {
    return (await db.exercises.toArray()).filter((exercise) => exercise.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ja'));
  },
  listAll: () => db.exercises.orderBy('sortOrder').toArray(),
  listPresets: () => db.exercisePresets.orderBy('sortOrder').toArray(),
  async create(input) {
    const all = await db.exercises.toArray();
    if (all.some((exercise) => normalizeExerciseName(exercise.name) === normalizeExerciseName(input.name))) throw new DuplicateExerciseNameError(input.name);
    const timestamp = now();
    const exercise = { id: uuid(), ...input, sortOrder: all.length ? Math.max(...all.map((item) => item.sortOrder)) + 10 : 10, isActive: true, sourcePresetId: null, createdAt: timestamp, updatedAt: timestamp };
    await db.exercises.put(exercise);
    return exercise;
  },
  async update(id, input) {
    const [existing, all] = await Promise.all([db.exercises.get(id), db.exercises.toArray()]);
    if (!existing) throw new Error('更新する種目が見つかりません。');
    if (normalizeExerciseName(input.name) !== normalizeExerciseName(existing.name) && all.some((exercise) => exercise.id !== id && normalizeExerciseName(exercise.name) === normalizeExerciseName(input.name))) throw new DuplicateExerciseNameError(input.name);
    const updated = { ...existing, ...input, updatedAt: now() };
    await db.exercises.put(updated);
    return updated;
  },
  async setActive(id, active) {
    const existing = await db.exercises.get(id);
    if (existing) await db.exercises.put({ ...existing, isActive: active, updatedAt: now() });
  },
  async addFromPresets(ids) {
    const [presets, exercises] = await Promise.all([db.exercisePresets.toArray(), db.exercises.toArray()]);
    const added = new Set(exercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));
    const names = new Set(exercises.map((exercise) => normalizeExerciseName(exercise.name)));
    const maxOrder = exercises.length ? Math.max(...exercises.map((exercise) => exercise.sortOrder)) : 0;
    const selected = presets.filter((preset) => ids.includes(preset.id) && !added.has(preset.id) && !names.has(normalizeExerciseName(preset.name)));
    const timestamp = now();
    await db.exercises.bulkPut(selected.map((preset, index) => ({ id: uuid(), name: preset.name, bodyPart: preset.bodyPart, equipmentType: preset.equipmentType, sortOrder: maxOrder + (index + 1) * 10, isActive: true, sourcePresetId: preset.id, createdAt: timestamp, updatedAt: timestamp })));
    return { addedCount: selected.length, skippedCount: ids.length - selected.length };
  }
};
