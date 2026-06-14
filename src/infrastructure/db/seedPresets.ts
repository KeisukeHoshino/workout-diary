import type { ExercisePreset } from '../../domain/models';

export const exercisePresets: ExercisePreset[] = [
  ['preset-bench-press', 'ベンチプレス', 'chest', 'barbell'],
  ['preset-dumbbell-press', 'ダンベルプレス', 'chest', 'dumbbell'],
  ['preset-incline-press', 'インクラインプレス', 'chest', 'barbell'],
  ['preset-lat-pulldown', 'ラットプルダウン', 'back', 'machine'],
  ['preset-deadlift', 'デッドリフト', 'back', 'barbell'],
  ['preset-barbell-row', 'バーベルロー', 'back', 'barbell'],
  ['preset-squat', 'スクワット', 'legs', 'barbell'],
  ['preset-leg-press', 'レッグプレス', 'legs', 'machine'],
  ['preset-leg-curl', 'レッグカール', 'legs', 'machine'],
  ['preset-shoulder-press', 'ショルダープレス', 'shoulders', 'dumbbell'],
  ['preset-side-raise', 'サイドレイズ', 'shoulders', 'dumbbell'],
  ['preset-face-pull', 'フェイスプル', 'shoulders', 'cable'],
  ['preset-barbell-curl', 'バーベルカール', 'arms', 'barbell'],
  ['preset-triceps-pushdown', 'トライセプスプッシュダウン', 'arms', 'cable'],
  ['preset-dips', 'ディップス', 'arms', 'bodyweight'],
  ['preset-crunch', 'クランチ', 'abs', 'bodyweight'],
  ['preset-plank', 'プランク', 'abs', 'bodyweight'],
  ['preset-running', 'ランニング', 'cardio', 'other']
].map(([id, name, bodyPart, equipmentType], index) => ({
  id,
  name,
  bodyPart,
  equipmentType,
  sortOrder: (index + 1) * 10
})) as ExercisePreset[];
