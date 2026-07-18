import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { databaseSchema, WorkoutDiaryDatabase } from './database';

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(databaseNames.map((name) => Dexie.delete(name)));
  databaseNames.length = 0;
});

describe('database migration', () => {
  it('旧部位を変換しながらID・日時・参照を保持する', async () => {
    const name = `migration-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(1).stores(databaseSchema);
    await legacy.open();
    const createdAt = '2025-01-01T00:00:00.000Z';
    await legacy.table('exercises').bulkPut([
      { id: 'leg', name: 'レッグカール', bodyPart: 'legs', equipmentType: 'machine', sortOrder: 10, isActive: true, sourcePresetId: 'preset-leg-curl', createdAt, updatedAt: createdAt },
      { id: 'arm', name: 'トライセプスプッシュダウン', bodyPart: 'arms', equipmentType: 'cable', sortOrder: 20, isActive: true, sourcePresetId: 'preset-triceps-pushdown', createdAt, updatedAt: createdAt },
      { id: 'shoulder', name: 'サイドレイズ', bodyPart: 'shoulders', equipmentType: 'dumbbell', sortOrder: 30, isActive: true, sourcePresetId: 'preset-side-raise', createdAt, updatedAt: createdAt }
    ]);
    await legacy.table('workoutDays').put({ id: 'day', date: '2025-01-01', memo: '', createdAt, updatedAt: createdAt });
    await legacy.table('workoutExercises').put({ id: 'card', workoutDayId: 'day', exerciseId: 'leg', sortOrder: 10, memo: '', createdAt, updatedAt: createdAt });
    legacy.close();

    const current = new WorkoutDiaryDatabase(name);
    await current.open();
    expect(await current.exercises.get('leg')).toMatchObject({ id: 'leg', bodyPart: 'hamstrings', createdAt });
    expect(await current.exercises.get('arm')).toMatchObject({ id: 'arm', bodyPart: 'triceps', createdAt });
    expect(await current.exercises.get('shoulder')).toMatchObject({ id: 'shoulder', bodyPart: 'sideDelts', createdAt });
    expect(await current.workoutExercises.get('card')).toMatchObject({ workoutDayId: 'day', exerciseId: 'leg' });
    expect(current.verno).toBe(4);
    current.close();
  });
});
