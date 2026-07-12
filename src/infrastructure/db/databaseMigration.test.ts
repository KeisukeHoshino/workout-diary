import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { databaseSchema, WorkoutDiaryDatabase } from './database';

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(databaseNames.map((name) => Dexie.delete(name)));
  databaseNames.length = 0;
});

describe('database migration', () => {
  it('migrates legacy body-part values without losing exercise identity', async () => {
    const name = `migration-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(1).stores(databaseSchema);
    await legacy.open();
    await legacy.table('exercises').put({
      id: 'legacy-exercise',
      name: 'レッグカール',
      bodyPart: 'legs',
      equipmentType: 'machine',
      sortOrder: 10,
      isActive: true,
      sourcePresetId: 'preset-leg-curl',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    });
    legacy.close();

    const current = new WorkoutDiaryDatabase(name);
    await current.open();
    const migrated = await current.exercises.get('legacy-exercise');
    expect(migrated).toMatchObject({ id: 'legacy-exercise', name: 'レッグカール', bodyPart: 'hamstrings' });
    expect(current.verno).toBe(4);
    current.close();
  });
});
