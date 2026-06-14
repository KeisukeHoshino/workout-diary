# 筋トレ日記アプリ 詳細設計書

## 1. 前提

本書は `basic_design.md` を実装可能な粒度へ落とし込むための詳細設計である。

MVP はスマホ利用を主対象とする Web/PWA アプリとして実装する。データは IndexedDB に保存し、ログイン、クラウド同期、複数端末対応、CSV エクスポートは対象外とする。

実装技術は以下を標準案とする。実装前に別スタックを選ぶ場合でも、画面状態、保存 API、データ構造、業務ルールは本書の内容を維持する。

| 項目 | 採用案 | 理由 |
| --- | --- | --- |
| UI | React + TypeScript | 画面状態とフォームの分割管理がしやすい。 |
| ビルド | Vite | PWA 化と開発環境の構築が軽い。 |
| ルーティング | React Router | 画面単位の URL を持たせやすい。 |
| IndexedDB | Dexie | スキーマ、インデックス、トランザクションを扱いやすい。 |
| グラフ | Recharts | 折れ線グラフとタップ詳細の実装が軽い。 |
| PWA | vite-plugin-pwa | Service Worker と manifest を管理しやすい。 |

### 1.1 技術選定の補足

#### Vite を標準案にする理由

MVP は端末内保存の PWA であり、サーバ側レンダリング、API Route、認証基盤、クラウド DB 接続を必須としない。そのため、初期実装では Next.js のサーバ機能を使う場面が少なく、Vite のほうが構成を小さく保ちやすい。

| 観点 | Vite | Next.js |
| --- | --- | --- |
| MVP との相性 | クライアント完結 PWA と相性がよい。 | サーバ機能を使わない場合はやや大きい。 |
| オフライン利用 | IndexedDB と Service Worker 中心で構成しやすい。 | 可能だが SSR/Server Components の扱いを意識する必要がある。 |
| 将来のログイン | 外部 API 層を追加して対応する。 | API Route や認証ライブラリを同一プロジェクトで扱いやすい。 |
| 実装の単純さ | MVP では単純。 | 将来機能込みなら有力。 |

Next.js を使わない理由は、Next.js が不適という意味ではない。MVP の中心が「スマホで素早く記録する」「端末内に保存する」「オフラインでも使える」であるため、まずはクライアントアプリとして小さく作る判断である。

ただし、ログイン、クラウド同期、共有、サーバ集計を早期に入れる前提へ変える場合は、Next.js を採用候補の第一案に上げる。

#### サーバ側処理の扱い

MVP ではサーバ側処理を作らず、クライアント側だけで実装する。保存先は IndexedDB、集計はブラウザ内、PWA のオフライン対応は Service Worker で行う。

将来サーバを追加する場合に備え、画面から IndexedDB を直接呼ばず、Repository インターフェースを経由する。これにより、将来は `IndexedDBRepository` を `ApiRepository` や `SyncRepository` に置き換えられる。

#### 将来拡張性

ログインやクラウド同期を追加する場合は、以下の順で拡張する。

1. `User` と `RemoteAccount` を追加する。
2. 各エンティティに `userId`、`syncStatus`、`remoteId`、`deletedAt` を追加する。
3. Repository の実装を IndexedDB 直書きから、ローカル保存 + 同期キュー方式へ拡張する。
4. API サーバまたは BaaS を追加する。
5. 競合解決ルールを追加する。

この構成は将来拡張を妨げない。ただし、複数端末同期を強く前提にするなら、MVP の時点で `userId`、論理削除、同期状態を持たせる選択もある。現時点では MVP の複雑さを抑えるため、同期用のカラムは詳細設計上の将来拡張として扱う。

## 2. アプリケーション構成

### 2.1 レイヤ構成

| レイヤ | 役割 | 主な責務 |
| --- | --- | --- |
| Presentation | 画面、コンポーネント、フォーム | 表示、入力、ユーザー操作、空状態、エラー表示。 |
| Application | ユースケース、画面用 hooks | 複数ストアをまたぐ操作、自動保存、集計呼び出し。 |
| Domain | 型、業務ルール、集計 | バリデーション、最大重量算出、期間フィルタ。 |
| Infrastructure | IndexedDB、PWA | Dexie スキーマ、Repository、初期データ投入。 |

Presentation は IndexedDB を直接呼ばず、Application の hooks または use case 経由でデータを取得・更新する。

### 2.2 推奨ディレクトリ構成

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  components/
    common/
    layout/
  features/
    workout/
    exercises/
    presets/
    menus/
    graphs/
    history/
    settings/
  domain/
    models.ts
    rules.ts
    validation.ts
    graphAggregation.ts
  infrastructure/
    db/
      database.ts
      seedPresets.ts
      repositories.ts
      migrations.ts
  styles/
    tokens.css
    global.css
  pwa/
    manifest.ts
```

## 3. ルーティング設計

| パス | 画面 | 備考 |
| --- | --- | --- |
| `/` | 今日の記録 | `date` クエリがなければ当日を表示する。 |
| `/?date=YYYY-MM-DD` | 日付指定の記録 | 履歴画面からの編集にも使う。 |
| `/graphs` | グラフ | タブ状態はクエリで保持可能にする。 |
| `/history` | 日別履歴 | 日付一覧から `/` に遷移して編集する。 |
| `/menus` | メニュー管理 | 作成・編集は同一画面内のシートまたはモーダル。 |
| `/exercises` | マイ種目管理 | プリセット追加導線を持つ。 |
| `/settings` | 設定 | MVP では最小構成。 |

スマホでは下部ナビゲーションを基本とし、主要導線は「記録」「グラフ」「履歴」「管理」「設定」とする。「管理」は種目管理とメニュー管理への入口を持つ。

## 4. 型定義

### 4.1 共通型

```ts
type UUID = string;
type LocalDateString = `${number}-${number}-${number}`;
type ISODateTimeString = string;
type WeightUnit = 'kg';
type GraphRange = '1m' | '3m' | '6m' | 'all';

type BodyPart =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'abs'
  | 'cardio'
  | 'other';

type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'other';
```

`ISODateTimeString` は `Date` 型ではなく string 型で保持する。理由は、IndexedDB 保存、JSON 化、将来の API 連携、エクスポートで扱いやすく、タイムゾーン変換による意図しない表示差分を避けやすいためである。

アプリ内部で日時計算が必要な箇所では、保存値の string を `Date` または日時ライブラリの型へ変換して扱う。永続化層とドメインモデルの保存表現は ISO 8601 文字列に統一する。

### 4.2 エンティティ型

```ts
interface UserSettings {
  id: 'default';
  weightUnit: WeightUnit;
  defaultGraphRange: GraphRange;
  isSetupCompleted: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

interface ExercisePreset {
  id: UUID;
  name: string;
  bodyPart: BodyPart;
  equipmentType: EquipmentType | null;
  sortOrder: number;
}

interface Exercise {
  id: UUID;
  name: string;
  bodyPart: BodyPart;
  equipmentType: EquipmentType | null;
  sortOrder: number;
  isActive: boolean;
  sourcePresetId: UUID | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

interface WorkoutDay {
  id: UUID;
  date: LocalDateString;
  memo: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

interface WorkoutExercise {
  id: UUID;
  workoutDayId: UUID;
  exerciseId: UUID;
  sortOrder: number;
  memo: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

interface WorkoutSet {
  id: UUID;
  workoutExerciseId: UUID;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

interface BodyWeightLog {
  id: UUID;
  date: LocalDateString;
  bodyWeightKg: number;
  memo: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

interface MenuTemplate {
  id: UUID;
  name: string;
  memo: string;
  sortOrder: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

interface MenuTemplateExercise {
  id: UUID;
  menuTemplateId: UUID;
  exerciseId: UUID;
  sortOrder: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}
```

## 5. IndexedDB 詳細設計

### 5.1 データベース

| 項目 | 値 |
| --- | --- |
| DB 名 | `workoutDiary` |
| 初期バージョン | `1` |
| 初期投入 | `userSettings` と `exercisePresets` |

### 5.2 ストア定義

```ts
db.version(1).stores({
  userSettings: 'id',
  exercisePresets: 'id, bodyPart, name, sortOrder',
  exercises: 'id, bodyPart, isActive, sourcePresetId, sortOrder, updatedAt',
  workoutDays: 'id, &date, updatedAt',
  workoutExercises: 'id, workoutDayId, exerciseId, [workoutDayId+sortOrder]',
  workoutSets: 'id, workoutExerciseId, [workoutExerciseId+setNumber]',
  bodyWeightLogs: 'id, &date, updatedAt',
  menuTemplates: 'id, sortOrder, updatedAt',
  menuTemplateExercises: 'id, menuTemplateId, exerciseId, [menuTemplateId+sortOrder]',
});
```

`date` は日付ごとに一意とする。体重は `bodyWeightLogs.date` を一意キーとして扱い、同じ日付への入力は更新になる。

### 5.3 初期化

1. DB オープン時に `userSettings.default` が存在しなければ作成する。
2. `exercisePresets` が空であれば初期プリセットを投入する。
3. プリセット追加済み判定は `Exercise.sourcePresetId` で行う。

### 5.4 トランザクション方針

複数ストアを同時に更新する操作は Dexie の `transaction('rw', stores, callback)` でまとめる。

| 操作 | 対象ストア |
| --- | --- |
| 種目を今日へ追加 | `workoutDays`, `workoutExercises`, `workoutSets` |
| メニューを今日へ追加 | `workoutDays`, `workoutExercises`, `workoutSets`, `menuTemplateExercises` |
| プリセットをマイ種目へ追加 | `exercisePresets`, `exercises` |
| 日別記録削除 | `workoutDays`, `workoutExercises`, `workoutSets` |
| メニュー削除 | `menuTemplates`, `menuTemplateExercises` |

## 6. Repository API

### 6.1 WorkoutRepository

```ts
interface WorkoutRepository {
  getWorkoutByDate(date: LocalDateString): Promise<WorkoutDetail | null>;
  ensureWorkoutDay(date: LocalDateString): Promise<WorkoutDay>;
  addExerciseToDate(date: LocalDateString, exerciseId: UUID): Promise<WorkoutDetail>;
  addMenuToDate(date: LocalDateString, menuTemplateId: UUID): Promise<WorkoutDetail>;
  updateWorkoutExerciseMemo(id: UUID, memo: string): Promise<void>;
  deleteWorkoutExercise(id: UUID): Promise<void>;
  addSet(workoutExerciseId: UUID): Promise<WorkoutSet>;
  updateSet(id: UUID, patch: Pick<WorkoutSet, 'weightKg' | 'reps'>): Promise<void>;
  deleteSet(id: UUID): Promise<void>;
  deleteWorkoutDay(date: LocalDateString): Promise<void>;
}
```

`getWorkoutByDate` は画面表示に必要な結合済みデータを返す。

```ts
interface WorkoutDetail {
  day: WorkoutDay;
  bodyWeightLog: BodyWeightLog | null;
  exercises: Array<{
    workoutExercise: WorkoutExercise;
    exercise: Exercise;
    sets: WorkoutSet[];
  }>;
}
```

### 6.2 BodyWeightRepository

```ts
interface BodyWeightRepository {
  getByDate(date: LocalDateString): Promise<BodyWeightLog | null>;
  upsert(date: LocalDateString, bodyWeightKg: number, memo?: string): Promise<BodyWeightLog>;
  removeByDate(date: LocalDateString): Promise<void>;
  listByRange(range: DateRange): Promise<BodyWeightLog[]>;
}
```

### 6.3 ExerciseRepository

```ts
interface ExerciseRepository {
  listActive(): Promise<Exercise[]>;
  listAll(): Promise<Exercise[]>;
  searchActive(query: ExerciseSearchQuery): Promise<Exercise[]>;
  create(input: ExerciseInput): Promise<Exercise>;
  update(id: UUID, input: ExerciseInput): Promise<Exercise>;
  archive(id: UUID): Promise<void>;
  restore(id: UUID): Promise<void>;
  addFromPresets(presetIds: UUID[]): Promise<Exercise[]>;
}
```

### 6.4 MenuRepository

```ts
interface MenuRepository {
  list(): Promise<MenuTemplateSummary[]>;
  get(id: UUID): Promise<MenuTemplateDetail | null>;
  create(input: MenuTemplateInput): Promise<MenuTemplate>;
  update(id: UUID, input: MenuTemplateInput): Promise<MenuTemplate>;
  delete(id: UUID): Promise<void>;
  replaceExercises(menuTemplateId: UUID, exerciseIds: UUID[]): Promise<void>;
  reorder(menuTemplateId: UUID, orderedItemIds: UUID[]): Promise<void>;
}
```

### 6.5 GraphRepository

```ts
interface GraphRepository {
  listMaxWeightPoints(exerciseId: UUID, range: GraphRange): Promise<MaxWeightPoint[]>;
  listBodyWeightPoints(range: GraphRange): Promise<BodyWeightPoint[]>;
}
```

## 7. ユースケース詳細

### 7.1 今日の記録を表示する

1. URL の `date` を読む。
2. 未指定なら端末ローカル日付の当日を使う。
3. `WorkoutRepository.getWorkoutByDate(date)` を呼ぶ。
4. `BodyWeightRepository.getByDate(date)` を呼ぶ。
5. どちらも未登録の場合は空状態を表示する。
6. 画面上で種目・体重が入力された時点で必要なレコードを作成する。

### 7.2 種目を今日へ追加する

1. 種目選択シートで `Exercise` を選ぶ。
2. 対象日の `WorkoutDay` を `ensureWorkoutDay` で取得または作成する。
3. 同一日の同一 `exerciseId` の `WorkoutExercise` を検索する。
4. 既存カードがあれば新しい `WorkoutSet` を追加する。
5. 既存カードがなければ `WorkoutExercise` と空の1セット目を作成する。
6. 画面は更新後の `WorkoutDetail` を再取得して描画する。

### 7.3 セットを追加する

1. 対象 `WorkoutExercise` のセットを `setNumber` 昇順で取得する。
2. 最終セットがあれば重量・回数をコピーする。
3. 最終セットが空であれば、同じ空セットを増やす。
4. `setNumber` は既存最大値 + 1 とする。

### 7.4 セットを編集する

1. 重量または回数の入力をローカル状態に反映する。
2. 入力値がバリデーションを通過したら自動保存キューに積む。
3. 直近入力から 400ms 後に `updateSet` を実行する。
4. 保存中は対象行の状態だけを `saving` にする。
5. 失敗時は対象行にエラーを出し、再試行操作を表示する。

### 7.5 体重を入力する

1. 入力値をローカル状態に反映する。
2. 空欄の場合は保存せず、既存値がある場合は削除確認なしで `removeByDate` する。
3. 数値の場合は小数1桁へ丸めず、入力値をそのまま保存する。
4. 表示時は小数1桁を基本に整形する。

### 7.6 メニューを今日へ追加する

1. メニュー選択シートで `MenuTemplate` を選ぶ。
2. `MenuTemplateExercise` を `sortOrder` 昇順で取得する。
3. 対象日の `WorkoutDay` を取得または作成する。
4. 各種目について、既存カードがあれば空セットを1つ追加する。
5. 既存カードがなければ `WorkoutExercise` と空の1セット目を作成する。
6. 追加後、今日の記録画面へ戻る。

### 7.7 プリセットをマイ種目へ追加する

1. プリセット選択画面で複数選択する。
2. 選択 ID のうち、すでに `Exercise.sourcePresetId` に存在するものを除外する。
3. 残りを `Exercise` として作成する。
4. `sortOrder` は現在の最大値 + 10 から連番で採番する。
5. 追加後、種目選択シートまたはマイ種目管理に反映する。

## 8. 画面詳細設計

### 8.1 共通レイアウト

| 項目 | スマホ | デスクトップ |
| --- | --- | --- |
| ナビゲーション | 下部固定ナビ | 左サイドまたは上部ナビ |
| コンテンツ幅 | 100% | 最大 960px |
| 主操作 | 画面下部の固定アクション | 右上またはセクション上部 |
| シート | 下から表示 | 中央モーダルまたは右ドロワー |

### 8.2 今日の記録画面

#### 表示要素

| 要素 | 内容 |
| --- | --- |
| 日付ヘッダー | 前日、日付、翌日、カレンダー選択。 |
| 体重入力 | kg 単位の数値入力。 |
| 種目カード一覧 | 種目名、部位、メモ、セット表。 |
| セット行 | セット番号、重量、回数、削除。 |
| 追加操作 | 種目追加、メニュー追加。 |

#### 状態

| 状態 | 表示 |
| --- | --- |
| loading | 日付ヘッダーは表示し、本文にスケルトンを出す。 |
| empty | 体重入力と「種目追加」「メニュー追加」を表示する。 |
| saving | 編集中の入力またはカードに保存中表示を出す。 |
| saveError | 対象行にエラーと再試行ボタンを出す。 |

#### 操作

| 操作 | イベント | 結果 |
| --- | --- | --- |
| 前日/翌日 | `changeDate(date)` | URL を更新し、対象日を再取得する。 |
| 日付選択 | `selectDate(date)` | URL を更新する。 |
| 体重入力 | `upsertBodyWeight(date, value)` | 日付ごとの体重を保存する。 |
| 種目追加 | `openExerciseSheet()` | 種目選択シートを開く。 |
| メニュー追加 | `openMenuSheet()` | メニュー選択シートを開く。 |
| セット追加 | `addSet(workoutExerciseId)` | 前セットコピーで追加する。 |
| セット削除 | `deleteSet(setId)` | 確認後に削除し、番号を振り直す。 |
| 種目カード削除 | `deleteWorkoutExercise(id)` | 確認後、配下セットごと削除する。 |

### 8.3 種目選択シート

| 項目 | 仕様 |
| --- | --- |
| 初期表示 | 最近使った種目を上位、次に `sortOrder` 順。 |
| 検索 | 種目名の部分一致。大文字小文字は区別しない。 |
| 絞り込み | 部位カテゴリ。 |
| 選択 | タップで即時追加し、シートを閉じる。 |
| 空状態 | マイ種目がない場合はプリセット追加導線を表示する。 |

最近使った種目は `WorkoutExercise.createdAt` の降順から重複を除いて算出する。派生値として保存しない。

### 8.4 プリセット選択画面

| 項目 | 仕様 |
| --- | --- |
| 選択方式 | チェックボックスによる複数選択。 |
| 追加済み表示 | `sourcePresetId` が存在するものは「追加済み」と表示し選択不可。 |
| 追加ボタン | 選択件数が 1 以上で有効。 |
| 追加後 | 選択解除し、追加済み状態へ更新する。 |

### 8.5 マイ種目管理画面

| 項目 | 仕様 |
| --- | --- |
| 一覧 | 有効な種目を部位、表示順、名前で表示。 |
| 作成 | 種目名、部位、種別を入力。 |
| 編集 | 名前、部位、種別を変更可能。 |
| 非表示 | 削除ではなく `isActive: false` にする。 |
| 復元 | 設定または非表示一覧から復元可能にする。 |

使用済み種目も非表示にできる。過去記録では種目名が引けるよう、`Exercise` レコード自体は残す。

### 8.6 メニュー管理画面

| 項目 | 仕様 |
| --- | --- |
| 一覧 | メニュー名、登録種目数、メモを表示。 |
| 作成 | メニュー名必須。 |
| 種目追加 | マイ種目から選ぶ。 |
| 並び替え | ドラッグまたは上下ボタンで `sortOrder` 更新。 |
| 削除 | 確認後、メニューと紐づく種目行を削除。 |

### 8.7 グラフ画面

#### 重量推移タブ

| 項目 | 仕様 |
| --- | --- |
| 種目選択 | マイ種目から選択。初期値は直近記録された種目。 |
| 期間 | `1m`, `3m`, `6m`, `all`。初期値は `3m`。 |
| データ点 | 日付、最大重量、該当セットの回数。 |
| サマリー | 最新値、期間内最高値、期間内変化量、記録回数。 |
| 空状態 | 対象種目の記録がない旨と記録画面への導線を表示。 |

#### 体重推移タブ

| 項目 | 仕様 |
| --- | --- |
| 期間 | `1m`, `3m`, `6m`, `all`。 |
| データ点 | 日付、体重。 |
| サマリー | 最新値、期間内最低値、期間内最高値、期間内変化量。 |
| 空状態 | 体重記録がない旨と今日の記録への導線を表示。 |

### 8.8 日別履歴画面

| 項目 | 仕様 |
| --- | --- |
| 一覧単位 | 日付ごとのカード。 |
| 表示内容 | 日付、体重、種目数、総セット数、主な種目名。 |
| 並び順 | 日付降順。 |
| 編集 | カードタップで `/?date=YYYY-MM-DD` へ遷移。 |
| 削除 | 日別記録を削除。体重記録は独立しているため削除対象に含めない。 |

### 8.9 設定画面

| 項目 | 仕様 |
| --- | --- |
| 単位 | MVP は kg 固定表示。 |
| グラフ初期期間 | `defaultGraphRange` を変更可能。 |
| データ初期化 | 確認を2段階にして全 IndexedDB データを削除。 |
| エクスポート | MVP 後機能として無効表示または非表示。 |

## 9. 自動保存設計

### 9.1 保存タイミング

| 対象 | タイミング | デバウンス |
| --- | --- | --- |
| 体重 | 入力確定またはフォーカスアウト | 400ms |
| セット重量 | 入力中 | 400ms |
| セット回数 | 入力中 | 400ms |
| メモ | 入力中 | 800ms |
| 種目/メニュー作成 | 登録ボタン押下 | なし |
| 削除 | 確認後 | なし |

### 9.2 保存状態

各編集単位に以下の状態を持たせる。

```ts
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
```

`saved` は 1.5 秒後に `idle` へ戻す。画面全体をブロックせず、対象入力だけに状態を表示する。

### 9.3 競合と順序

同じレコードへの保存が連続した場合は、最後の入力だけを保存する。保存リクエストには連番を付与し、古いリクエストの完了結果で新しい状態を上書きしない。

```ts
interface PendingSave<T> {
  key: string;
  revision: number;
  payload: T;
}
```

## 10. バリデーション

| 対象 | ルール | エラー表示 |
| --- | --- | --- |
| 種目名 | 1〜40文字、前後空白は除去 | 入力欄直下 |
| メニュー名 | 1〜40文字、前後空白は除去 | 入力欄直下 |
| メモ | 0〜500文字 | 入力欄直下 |
| 重量 | 0〜999.9、空欄可 | セット行 |
| 回数 | 1〜999、空欄可 | セット行 |
| 体重 | 0〜999.9、空欄可 | 体重入力欄 |
| 日付 | 有効なローカル日付 | 日付ヘッダー |

重量と回数は両方空欄を許容する。片方だけ入力された場合も保存可能とする。グラフ集計では重量が `null` のセットを除外する。

## 11. グラフ集計設計

### 11.1 期間計算

```ts
interface DateRange {
  from: LocalDateString | null;
  to: LocalDateString;
}
```

`to` は端末ローカル日付の当日とする。`all` の場合は `from: null` とする。

| 期間 | from |
| --- | --- |
| `1m` | 当日から1か月前 |
| `3m` | 当日から3か月前 |
| `6m` | 当日から6か月前 |
| `all` | なし |

### 11.2 最大重量推移

集計手順は以下とする。

1. 対象 `exerciseId` の `WorkoutExercise` を取得する。
2. 親の `WorkoutDay.date` が期間内のものに絞る。
3. 配下 `WorkoutSet` のうち `weightKg !== null` を対象にする。
4. 同一日の中で最大 `weightKg` のセットを選ぶ。
5. 同じ重量が複数ある場合は `reps` が多いセットを詳細表示用に採用する。
6. 日付昇順で返す。

```ts
interface MaxWeightPoint {
  date: LocalDateString;
  weightKg: number;
  reps: number | null;
  workoutExerciseId: UUID;
  workoutSetId: UUID;
}
```

### 11.3 体重推移

1. `BodyWeightLog` を期間内で取得する。
2. `date` 昇順に並べる。
3. 同一日付は DB 制約により1件のみとする。

```ts
interface BodyWeightPoint {
  date: LocalDateString;
  bodyWeightKg: number;
  bodyWeightLogId: UUID;
}
```

### 11.4 サマリー

| グラフ | 項目 | 算出 |
| --- | --- | --- |
| 重量 | 最新値 | 最後のデータ点 |
| 重量 | 期間内最高値 | `max(weightKg)` |
| 重量 | 変化量 | 最後の値 - 最初の値 |
| 重量 | 記録回数 | データ点数 |
| 体重 | 最新値 | 最後のデータ点 |
| 体重 | 最高値 | `max(bodyWeightKg)` |
| 体重 | 最低値 | `min(bodyWeightKg)` |
| 体重 | 変化量 | 最後の値 - 最初の値 |

## 12. 削除設計

| 対象 | 動作 |
| --- | --- |
| セット | 対象セットのみ削除し、残りの `setNumber` を 1 から振り直す。 |
| 種目カード | `WorkoutExercise` と配下 `WorkoutSet` を削除する。 |
| 日別記録 | `WorkoutDay`、配下 `WorkoutExercise`、配下 `WorkoutSet` を削除する。体重は残す。 |
| 体重 | `BodyWeightLog` のみ削除する。 |
| マイ種目 | `isActive: false` にする。 |
| メニュー | `MenuTemplate` と配下 `MenuTemplateExercise` を削除する。 |

削除確認文には削除対象が分かる名前または日付を含める。

## 13. PWA 詳細設計

### 13.1 Manifest

| 項目 | 値 |
| --- | --- |
| name | `筋トレ日記` |
| short_name | `筋トレ日記` |
| display | `standalone` |
| start_url | `/` |
| theme_color | `#16776f` |
| background_color | `#f6f7f9` |

### 13.2 キャッシュ方針

| 対象 | 方針 |
| --- | --- |
| HTML/JS/CSS | ビルド成果物を precache。 |
| アイコン | precache。 |
| IndexedDB データ | Service Worker では扱わない。 |
| 外部 API | MVP ではなし。 |

アプリ更新時は次回起動時に新しい Service Worker を有効化する。更新通知は MVP では必須としない。

## 14. アクセシビリティ

- 主要操作ボタンは 44px 以上のタップ領域を確保する。
- 入力欄には `label` または `aria-label` を付与する。
- シートとモーダルは開いている間フォーカスを閉じ込める。
- エラー文は入力欄と関連付ける。
- グラフのサマリーはテキストでも読めるようにする。
- 色だけで状態を伝えず、保存中、保存失敗、追加済みなどは文字でも示す。

## 15. テスト設計

### 15.1 単体テスト

| 対象 | 観点 |
| --- | --- |
| `validation.ts` | 数値範囲、空欄、文字数、日付。 |
| `rules.ts` | セット追加時のコピー、セット番号振り直し。 |
| `graphAggregation.ts` | 同日最大重量、同重量時の回数優先、期間フィルタ。 |
| Repository | upsert、cascade delete、プリセット重複除外。 |

### 15.2 コンポーネントテスト

| 画面 | 観点 |
| --- | --- |
| 今日の記録 | 空状態、体重入力、種目追加、セット編集、保存失敗表示。 |
| 種目選択シート | 検索、部位絞り込み、最近使った種目。 |
| プリセット選択 | 追加済み無効化、複数追加。 |
| メニュー管理 | 作成、種目追加、並び替え、削除。 |
| グラフ | 空状態、タブ切替、期間切替、点詳細。 |

### 15.3 E2E テスト

| ID | シナリオ |
| --- | --- |
| E-01 | プリセットから種目を追加し、今日の記録へ追加してセットを保存する。 |
| E-02 | 同じ種目を再追加したとき、カードが増えずセットが追加される。 |
| E-03 | メニューを作成し、今日の記録へまとめて追加する。 |
| E-04 | 体重を入力し、再読み込み後も残る。 |
| E-05 | 重量推移グラフに日別最大重量だけが表示される。 |
| E-06 | オフライン状態で既存画面を開き、記録を保存できる。 |
| E-07 | スマホ幅で主要画面の操作が破綻しない。 |

## 16. 受け入れ基準との対応

| 基本設計の基準 | 詳細設計の主な対応箇所 |
| --- | --- |
| A-01 体重入力 | 7.5、8.2、10 |
| A-02 種目追加 | 7.2、8.3 |
| A-03 セット記録 | 7.3、7.4、9、10 |
| A-04 プリセット追加 | 7.7、8.4 |
| A-05 メニュー追加 | 7.6、8.6 |
| A-06 重量推移 | 11.2 |
| A-07 体重推移 | 11.3 |
| A-08 初期期間 | 8.7、11.1 |
| A-09 端末内保存 | 5、13 |
| A-10 スマホ幅 | 8.1、14、15.3 |

## 17. 確定事項

| ID | 内容 | 判断 |
| --- | --- | --- |
| D-01 | 初回起動時にプリセットを自動でマイ種目へ入れるか | MVP では入れず、ユーザーが選ぶ。 |
| D-02 | セット入力の単位刻みを UI で制限するか | 入力は自由、補助ボタンで 2.5kg 増減を用意する。 |
| D-03 | 日別記録削除時に体重も削除するか | 体重は独立データとして残す。 |
| D-04 | 非表示種目を新規メニューに追加できるか | 追加不可。過去記録と既存メニュー表示では参照可能。 |
| D-05 | グラフの最高重量が同日複数カードに分かれる場合 | 同一日の全カード、全セットから最大を選ぶ。 |

## 18. 実装順序

1. プロジェクト雛形、ルーティング、共通レイアウトを作る。
2. IndexedDB スキーマ、初期化、Repository を作る。
3. マイ種目管理とプリセット追加を作る。
4. 今日の記録、体重入力、種目追加、セット編集を作る。
5. メニュー管理とメニュー追加を作る。
6. グラフ集計とグラフ画面を作る。
7. 日別履歴、設定、データ初期化を作る。
8. PWA 化、スマホ表示確認、E2E テストを行う。
