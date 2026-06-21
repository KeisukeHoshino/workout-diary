import Dexie from 'dexie';
import type {
  BodyPart,
  EquipmentType,
  GraphRange,
  LocalDateString,
  MenuTemplateDetail,
  WorkoutDetail
} from '../../domain/models';
import { aggregateBodyWeightPoints, aggregateMaxWeightPoints } from '../../domain/graphAggregation';
import { uuid } from '../../domain/rules';
import { db } from './database';

function now() {
  return new Date().toISOString();
}

function normalizeExerciseName(name: string) {
  return name.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
}

export class DuplicateExerciseNameError extends Error {
  constructor(name: string) {
    super(`${name} はすでにマイ種目に登録されています。`);
    this.name = 'DuplicateExerciseNameError';
  }
}

async function ensureWorkoutDay(date: LocalDateString) {
  const existing = await db.workoutDays.where('date').equals(date).first();
  if (existing) return existing;
  const timestamp = now();
  const day = { id: uuid(), date, memo: '', createdAt: timestamp, updatedAt: timestamp };
  await db.workoutDays.put(day);
  return day;
}

export const workoutRepository = {
  async getWorkoutByDate(date: LocalDateString): Promise<WorkoutDetail> {
    const [day, bodyWeightLog, exercises] = await Promise.all([
      db.workoutDays.where('date').equals(date).first(),
      db.bodyWeightLogs.where('date').equals(date).first(),
      db.exercises.toArray()
    ]);

    if (!day) return { day: null, bodyWeightLog: bodyWeightLog ?? null, exercises: [] };

    const workoutExercises = await db.workoutExercises
      .where('[workoutDayId+sortOrder]')
      .between([day.id, Dexie.minKey], [day.id, Dexie.maxKey])
      .toArray();

    const rows = await Promise.all(workoutExercises.map(async (workoutExercise) => ({
      workoutExercise,
      exercise: exercises.find((exercise) => exercise.id === workoutExercise.exerciseId) ?? {
        id: workoutExercise.exerciseId,
        name: '削除済み種目',
        bodyPart: 'other' as BodyPart,
        equipmentType: null,
        sortOrder: 0,
        isActive: false,
        sourcePresetId: null,
        createdAt: workoutExercise.createdAt,
        updatedAt: workoutExercise.updatedAt
      },
      sets: await db.workoutSets
        .where('[workoutExerciseId+setNumber]')
        .between([workoutExercise.id, Dexie.minKey], [workoutExercise.id, Dexie.maxKey])
        .toArray()
    })));

    return { day, bodyWeightLog: bodyWeightLog ?? null, exercises: rows };
  },

  async addExerciseToDate(date: LocalDateString, exerciseId: string) {
    return db.transaction('rw', db.workoutDays, db.workoutExercises, db.workoutSets, async () => {
      const day = await ensureWorkoutDay(date);
      const existing = await db.workoutExercises
        .where('workoutDayId')
        .equals(day.id)
        .and((item) => item.exerciseId === exerciseId)
        .first();

      if (existing) {
        await this.addSet(existing.id);
        return;
      }

      const siblings = await db.workoutExercises.where('workoutDayId').equals(day.id).toArray();
      const timestamp = now();
      const workoutExercise = {
        id: uuid(),
        workoutDayId: day.id,
        exerciseId,
        sortOrder: siblings.length ? Math.max(...siblings.map((item) => item.sortOrder)) + 10 : 10,
        memo: '',
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await db.workoutExercises.put(workoutExercise);
      await db.workoutSets.put({
        id: uuid(),
        workoutExerciseId: workoutExercise.id,
        setNumber: 1,
        weightKg: null,
        reps: null,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    });
  },

  async addMenuToDate(date: LocalDateString, menuTemplateId: string) {
    const items = await db.menuTemplateExercises
      .where('[menuTemplateId+sortOrder]')
      .between([menuTemplateId, Dexie.minKey], [menuTemplateId, Dexie.maxKey])
      .toArray();
    for (const item of items) {
      await this.addExerciseToDate(date, item.exerciseId);
    }
  },

  async addSet(workoutExerciseId: string) {
    const sets = await db.workoutSets
      .where('[workoutExerciseId+setNumber]')
      .between([workoutExerciseId, Dexie.minKey], [workoutExerciseId, Dexie.maxKey])
      .toArray();
    const last = sets[sets.length - 1];
    const timestamp = now();
    await db.workoutSets.put({
      id: uuid(),
      workoutExerciseId,
      setNumber: last ? last.setNumber + 1 : 1,
      weightKg: last?.weightKg ?? null,
      reps: last?.reps ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  },

  async updateSet(id: string, patch: { weightKg: number | null; reps: number | null }) {
    const existing = await db.workoutSets.get(id);
    if (!existing) return;
    await db.workoutSets.put({ ...existing, ...patch, updatedAt: now() });
  },

  async deleteSet(id: string) {
    const existing = await db.workoutSets.get(id);
    if (!existing) return;
    await db.workoutSets.delete(id);
    const siblings = await db.workoutSets
      .where('[workoutExerciseId+setNumber]')
      .between([existing.workoutExerciseId, Dexie.minKey], [existing.workoutExerciseId, Dexie.maxKey])
      .toArray();
    await Promise.all(siblings.map((set, index) => db.workoutSets.put({ ...set, setNumber: index + 1, updatedAt: now() })));
  },

  async deleteWorkoutExercise(id: string) {
    await db.transaction('rw', db.workoutExercises, db.workoutSets, async () => {
      await db.workoutSets.where('workoutExerciseId').equals(id).delete();
      await db.workoutExercises.delete(id);
    });
  },

  async deleteWorkoutDay(date: LocalDateString) {
    const day = await db.workoutDays.where('date').equals(date).first();
    if (!day) return;
    await db.transaction('rw', db.workoutDays, db.workoutExercises, db.workoutSets, async () => {
      const cards = await db.workoutExercises.where('workoutDayId').equals(day.id).toArray();
      await Promise.all(cards.map((card) => db.workoutSets.where('workoutExerciseId').equals(card.id).delete()));
      await db.workoutExercises.where('workoutDayId').equals(day.id).delete();
      await db.workoutDays.delete(day.id);
    });
  }
};

export const bodyWeightRepository = {
  async upsert(date: LocalDateString, bodyWeightKg: number | null) {
    const existing = await db.bodyWeightLogs.where('date').equals(date).first();
    if (bodyWeightKg === null) {
      if (existing) await db.bodyWeightLogs.delete(existing.id);
      return;
    }
    const timestamp = now();
    await db.bodyWeightLogs.put({
      id: existing?.id ?? uuid(),
      date,
      bodyWeightKg,
      memo: existing?.memo ?? '',
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    });
  }
};

export const exerciseRepository = {
  async listActive() {
    return (await db.exercises.toArray())
      .filter((exercise) => exercise.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ja'));
  },

  async listAll() {
    return db.exercises.orderBy('sortOrder').toArray();
  },

  async listPresets() {
    return db.exercisePresets.orderBy('sortOrder').toArray();
  },

  async create(input: { name: string; bodyPart: BodyPart; equipmentType: EquipmentType | null }) {
    const all = await db.exercises.toArray();
    const normalizedName = normalizeExerciseName(input.name);
    if (all.some((exercise) => normalizeExerciseName(exercise.name) === normalizedName)) {
      throw new DuplicateExerciseNameError(input.name);
    }
    const timestamp = now();
    const exercise = {
      id: uuid(),
      name: input.name,
      bodyPart: input.bodyPart,
      equipmentType: input.equipmentType,
      sortOrder: all.length ? Math.max(...all.map((item) => item.sortOrder)) + 10 : 10,
      isActive: true,
      sourcePresetId: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await db.exercises.put(exercise);
    return exercise;
  },

  async setActive(id: string, isActive: boolean) {
    const existing = await db.exercises.get(id);
    if (!existing) return;
    await db.exercises.put({ ...existing, isActive, updatedAt: now() });
  },

  async addFromPresets(presetIds: string[]) {
    const [presets, exercises] = await Promise.all([db.exercisePresets.toArray(), db.exercises.toArray()]);
    const added = new Set(exercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));
    const existingNames = new Set(exercises.map((exercise) => normalizeExerciseName(exercise.name)));
    const maxOrder = exercises.length ? Math.max(...exercises.map((exercise) => exercise.sortOrder)) : 0;
    const timestamp = now();
    const selected = presets.filter((preset) =>
      presetIds.includes(preset.id) &&
      !added.has(preset.id) &&
      !existingNames.has(normalizeExerciseName(preset.name))
    );
    await db.exercises.bulkPut(selected.map((preset, index) => ({
      id: uuid(),
      name: preset.name,
      bodyPart: preset.bodyPart,
      equipmentType: preset.equipmentType,
      sortOrder: maxOrder + (index + 1) * 10,
      isActive: true,
      sourcePresetId: preset.id,
      createdAt: timestamp,
      updatedAt: timestamp
    })));
    return {
      addedCount: selected.length,
      skippedCount: presetIds.length - selected.length
    };
  }
};

export const menuRepository = {
  async list(): Promise<MenuTemplateDetail[]> {
    const [menus, rows, exercises] = await Promise.all([
      db.menuTemplates.orderBy('sortOrder').toArray(),
      db.menuTemplateExercises.toArray(),
      db.exercises.toArray()
    ]);
    return menus.map((menu) => ({
      menu,
      exercises: rows
        .filter((row) => row.menuTemplateId === menu.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => ({
          menuTemplateExercise: row,
          exercise: exercises.find((exercise) => exercise.id === row.exerciseId)!
        }))
        .filter((item) => Boolean(item.exercise))
    }));
  },

  async create(input: { name: string; memo: string; exerciseIds: string[] }) {
    const menus = await db.menuTemplates.toArray();
    const timestamp = now();
    const menu = {
      id: uuid(),
      name: input.name,
      memo: input.memo,
      sortOrder: menus.length ? Math.max(...menus.map((item) => item.sortOrder)) + 10 : 10,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await db.transaction('rw', db.menuTemplates, db.menuTemplateExercises, async () => {
      await db.menuTemplates.put(menu);
      await db.menuTemplateExercises.bulkPut(input.exerciseIds.map((exerciseId, index) => ({
        id: uuid(),
        menuTemplateId: menu.id,
        exerciseId,
        sortOrder: (index + 1) * 10,
        createdAt: timestamp,
        updatedAt: timestamp
      })));
    });
    return menu;
  },

  async delete(id: string) {
    await db.transaction('rw', db.menuTemplates, db.menuTemplateExercises, async () => {
      await db.menuTemplateExercises.where('menuTemplateId').equals(id).delete();
      await db.menuTemplates.delete(id);
    });
  }
};

export const graphRepository = {
  async listMaxWeightPoints(exerciseId: string, range: GraphRange) {
    const [days, workoutExercises, sets] = await Promise.all([
      db.workoutDays.toArray(),
      db.workoutExercises.toArray(),
      db.workoutSets.toArray()
    ]);
    return aggregateMaxWeightPoints(exerciseId, range, days, workoutExercises, sets);
  },

  async listBodyWeightPoints(range: GraphRange) {
    return aggregateBodyWeightPoints(range, await db.bodyWeightLogs.toArray());
  }
};

export const settingsRepository = {
  async get() {
    return db.userSettings.get('default');
  },

  async updateDefaultGraphRange(range: GraphRange) {
    const settings = await db.userSettings.get('default');
    if (!settings) return;
    await db.userSettings.put({ ...settings, defaultGraphRange: range, updatedAt: now() });
  },

  async reset() {
    await db.delete();
    await db.open();
  }
};
