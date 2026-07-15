import Dexie, { type EntityTable } from 'dexie';
import type {
  BodyWeightLog,
  Exercise,
  ExercisePreset,
  MenuTemplate,
  MenuTemplateExercise,
  UserSettings,
  WorkoutDay,
  WorkoutExercise,
  WorkoutSet
} from '../../domain/models';
import { exercisePresets } from './seedPresets';

const databaseSchema = {
  userSettings: 'id',
  exercisePresets: 'id, bodyPart, name, sortOrder',
  exercises: 'id, bodyPart, isActive, sourcePresetId, sortOrder, updatedAt',
  workoutDays: 'id, &date, updatedAt',
  workoutExercises: 'id, workoutDayId, exerciseId, [workoutDayId+sortOrder]',
  workoutSets: 'id, workoutExerciseId, [workoutExerciseId+setNumber]',
  bodyWeightLogs: 'id, &date, updatedAt',
  menuTemplates: 'id, sortOrder, updatedAt',
  menuTemplateExercises: 'id, menuTemplateId, exerciseId, [menuTemplateId+sortOrder]'
};

type LegacyBodyPart = Exercise['bodyPart'] | 'legs' | 'arms' | 'shoulders';
type LegacyExercise = Omit<Exercise, 'bodyPart'> & { bodyPart: LegacyBodyPart };
type LegacyExercisePreset = Omit<ExercisePreset, 'bodyPart'> & { bodyPart: LegacyBodyPart };

function migratedLegBodyPart(name: string, sourcePresetId: string | null): Exercise['bodyPart'] {
  const normalizedName = name.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
  const hamstringsKeywords = [
    'レッグカール',
    'ハムストリング',
    'ルーマニアン',
    'スティッフレッグ',
    'ノルディック',
    'グッドモーニング',
    'leg curl',
    'hamstring',
    'romanian',
    'stiff leg',
    'nordic',
    'good morning'
  ];

  return sourcePresetId === 'preset-leg-curl' || hamstringsKeywords.some((keyword) => normalizedName.includes(keyword))
    ? 'hamstrings'
    : 'quadriceps';
}

function migratedArmBodyPart(name: string, sourcePresetId: string | null): Exercise['bodyPart'] {
  const normalizedName = name.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
  const tricepsPresetIds = new Set(['preset-triceps-pushdown', 'preset-dips']);
  const tricepsKeywords = [
    '三頭',
    'トライセプス',
    'プッシュダウン',
    'プレスダウン',
    'スカルクラッシャー',
    'フレンチプレス',
    'キックバック',
    'ディップス',
    'ナロープレス',
    'triceps',
    'pushdown',
    'pressdown',
    'skull crusher',
    'french press',
    'kickback',
    'dips',
    'close grip'
  ];

  return (sourcePresetId && tricepsPresetIds.has(sourcePresetId)) ||
    tricepsKeywords.some((keyword) => normalizedName.includes(keyword))
    ? 'triceps'
    : 'biceps';
}

function migratedShoulderBodyPart(name: string, sourcePresetId: string | null): Exercise['bodyPart'] {
  const normalizedName = name.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
  const rearDeltsPresetIds = new Set(['preset-face-pull']);
  const sideDeltsPresetIds = new Set(['preset-side-raise']);
  const rearDeltsKeywords = [
    '三角筋後部',
    'リア',
    'リバースフライ',
    'フェイスプル',
    'rear delt',
    'rear deltoid',
    'reverse fly',
    'face pull'
  ];
  const sideDeltsKeywords = [
    '三角筋中部',
    'サイドレイズ',
    'ラテラルレイズ',
    'アップライトロウ',
    'side raise',
    'lateral raise',
    'upright row'
  ];

  if (
    (sourcePresetId && rearDeltsPresetIds.has(sourcePresetId)) ||
    rearDeltsKeywords.some((keyword) => normalizedName.includes(keyword))
  ) {
    return 'rearDelts';
  }

  if (
    (sourcePresetId && sideDeltsPresetIds.has(sourcePresetId)) ||
    sideDeltsKeywords.some((keyword) => normalizedName.includes(keyword))
  ) {
    return 'sideDelts';
  }

  return 'frontDelts';
}

export class WorkoutDiaryDatabase extends Dexie {
  userSettings!: EntityTable<UserSettings, 'id'>;
  exercisePresets!: EntityTable<ExercisePreset, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  workoutDays!: EntityTable<WorkoutDay, 'id'>;
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>;
  workoutSets!: EntityTable<WorkoutSet, 'id'>;
  bodyWeightLogs!: EntityTable<BodyWeightLog, 'id'>;
  menuTemplates!: EntityTable<MenuTemplate, 'id'>;
  menuTemplateExercises!: EntityTable<MenuTemplateExercise, 'id'>;

  constructor() {
    super('workoutDiary');
    this.version(1).stores(databaseSchema);
    this.version(2).stores(databaseSchema).upgrade(async (transaction) => {
      const timestamp = new Date().toISOString();

      await transaction.table('exercisePresets').toCollection().modify((preset: LegacyExercisePreset) => {
        if (preset.bodyPart !== 'legs') return;
        preset.bodyPart = migratedLegBodyPart(preset.name, preset.id);
      });

      await transaction.table('exercises').toCollection().modify((exercise: LegacyExercise) => {
        if (exercise.bodyPart !== 'legs') return;
        exercise.bodyPart = migratedLegBodyPart(exercise.name, exercise.sourcePresetId);
        exercise.updatedAt = timestamp;
      });
    });
    this.version(3).stores(databaseSchema).upgrade(async (transaction) => {
      const timestamp = new Date().toISOString();

      await transaction.table('exercisePresets').toCollection().modify((preset: LegacyExercisePreset) => {
        if (preset.bodyPart !== 'arms') return;
        preset.bodyPart = migratedArmBodyPart(preset.name, preset.id);
      });

      await transaction.table('exercises').toCollection().modify((exercise: LegacyExercise) => {
        if (exercise.bodyPart !== 'arms') return;
        exercise.bodyPart = migratedArmBodyPart(exercise.name, exercise.sourcePresetId);
        exercise.updatedAt = timestamp;
      });
    });
    this.version(4).stores(databaseSchema).upgrade(async (transaction) => {
      const timestamp = new Date().toISOString();

      await transaction.table('exercisePresets').toCollection().modify((preset: LegacyExercisePreset) => {
        if (preset.bodyPart !== 'shoulders') return;
        preset.bodyPart = migratedShoulderBodyPart(preset.name, preset.id);
      });

      await transaction.table('exercises').toCollection().modify((exercise: LegacyExercise) => {
        if (exercise.bodyPart !== 'shoulders') return;
        exercise.bodyPart = migratedShoulderBodyPart(exercise.name, exercise.sourcePresetId);
        exercise.updatedAt = timestamp;
      });
    });
  }
}

export const db = new WorkoutDiaryDatabase();

export async function initializeDatabase() {
  const now = new Date().toISOString();
  const settings = await db.userSettings.get('default');
  if (!settings) {
    await db.userSettings.put({
      id: 'default',
      weightUnit: 'kg',
      defaultGraphRange: '3m',
      isSetupCompleted: true,
      createdAt: now,
      updatedAt: now
    });
  }

  if ((await db.exercisePresets.count()) === 0) {
    await db.exercisePresets.bulkPut(exercisePresets);
  }

  const existingExercises = await db.exercises.toArray();
  if (existingExercises.filter((exercise) => exercise.isActive).length === 0) {
    const existingPresetIds = new Set(existingExercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));
    const initialPresets = exercisePresets.slice(0, 8);
    await db.exercises.bulkPut(initialPresets.filter((preset) => !existingPresetIds.has(preset.id)).map((preset, index) => ({
      id: crypto.randomUUID(),
      name: preset.name,
      bodyPart: preset.bodyPart,
      equipmentType: preset.equipmentType,
      sortOrder: (index + 1) * 10,
      isActive: true,
      sourcePresetId: preset.id,
      createdAt: now,
      updatedAt: now
    })));
  }
}
