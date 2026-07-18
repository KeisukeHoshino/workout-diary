import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './database';
import { bodyWeightRepository, menuRepository, workoutRepository } from './repositories/index';

const timestamp = '2026-01-01T00:00:00.000Z';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();
});

describe('workout repository', () => {
  it('日付へ種目と最初のセットを追加する', async () => {
    await workoutRepository.addExerciseToDate('2026-01-01', 'bench');
    const day = await db.workoutDays.where('date').equals('2026-01-01').first();
    const card = await db.workoutExercises.where('workoutDayId').equals(day!.id).first();
    const set = await db.workoutSets.where('workoutExerciseId').equals(card!.id).first();
    expect(card).toMatchObject({ exerciseId: 'bench', sortOrder: 10 });
    expect(set).toMatchObject({ setNumber: 1, weightKg: null, reps: null });
  });

  it('セット削除後に番号を詰める', async () => {
    await workoutRepository.addExerciseToDate('2026-01-01', 'bench');
    const card = await db.workoutExercises.where('exerciseId').equals('bench').first();
    await workoutRepository.addSet(card!.id);
    await workoutRepository.addSet(card!.id);
    const sets = await db.workoutSets.where('workoutExerciseId').equals(card!.id).sortBy('setNumber');
    await workoutRepository.deleteSet(sets[1].id);
    expect((await db.workoutSets.where('workoutExerciseId').equals(card!.id).sortBy('setNumber')).map((set) => set.setNumber)).toEqual([1, 2]);
  });

  it('日別記録を削除しても体重を残す', async () => {
    await workoutRepository.addExerciseToDate('2026-01-01', 'bench');
    await bodyWeightRepository.upsert('2026-01-01', 70);
    await workoutRepository.deleteWorkoutDay('2026-01-01');
    expect(await db.workoutDays.count()).toBe(0);
    expect(await db.workoutExercises.count()).toBe(0);
    expect(await db.workoutSets.count()).toBe(0);
    expect(await db.bodyWeightLogs.count()).toBe(1);
  });

  it('存在しない種目参照を削除済み種目として返す', async () => {
    await workoutRepository.addExerciseToDate('2026-01-01', 'missing');
    const detail = await workoutRepository.getWorkoutByDate('2026-01-01');
    expect(detail.exercises[0].exercise).toMatchObject({ id: 'missing', name: '削除済み種目', isActive: false });
  });
});

describe('menu repository', () => {
  it('メニュー更新時に種目順と重複を整理する', async () => {
    await db.menuTemplates.put({ id: 'menu', name: '旧名', memo: '', sortOrder: 10, createdAt: timestamp, updatedAt: timestamp });
    await menuRepository.update('menu', { name: '新名', memo: 'memo', exerciseIds: ['a', 'b', 'a'] });
    expect(await db.menuTemplates.get('menu')).toMatchObject({ name: '新名', memo: 'memo' });
    const rows = await db.menuTemplateExercises.where('menuTemplateId').equals('menu').sortBy('sortOrder');
    expect(rows.map((row) => row.exerciseId)).toEqual(['a', 'b']);
  });

  it('明細更新失敗時にメニュー本体もロールバックする', async () => {
    await db.menuTemplates.put({ id: 'menu', name: '旧名', memo: '', sortOrder: 10, createdAt: timestamp, updatedAt: timestamp });
    const spy = vi.spyOn(db.menuTemplateExercises, 'bulkPut').mockRejectedValueOnce(new Error('write failed'));
    await expect(menuRepository.update('menu', { name: '新名', memo: '', exerciseIds: ['a'] })).rejects.toThrow('write failed');
    expect(await db.menuTemplates.get('menu')).toMatchObject({ name: '旧名' });
    spy.mockRestore();
  });
});
