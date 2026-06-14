const DB_NAME = "workoutDiary";
const DB_VERSION = 1;
const STORE_NAMES = [
  "userSettings",
  "exercisePresets",
  "exercises",
  "workoutDays",
  "workoutExercises",
  "workoutSets",
  "bodyWeightLogs",
  "menuTemplates",
  "menuTemplateExercises"
];

const BODY_PARTS = {
  chest: "胸",
  back: "背中",
  legs: "脚",
  shoulders: "肩",
  arms: "腕",
  abs: "腹",
  cardio: "有酸素",
  other: "その他"
};

const EQUIPMENT_TYPES = {
  barbell: "バーベル",
  dumbbell: "ダンベル",
  machine: "マシン",
  cable: "ケーブル",
  bodyweight: "自重",
  other: "その他"
};

const PRESETS = [
  ["preset-bench-press", "ベンチプレス", "chest", "barbell"],
  ["preset-dumbbell-press", "ダンベルプレス", "chest", "dumbbell"],
  ["preset-incline-press", "インクラインプレス", "chest", "barbell"],
  ["preset-lat-pulldown", "ラットプルダウン", "back", "machine"],
  ["preset-deadlift", "デッドリフト", "back", "barbell"],
  ["preset-barbell-row", "バーベルロー", "back", "barbell"],
  ["preset-squat", "スクワット", "legs", "barbell"],
  ["preset-leg-press", "レッグプレス", "legs", "machine"],
  ["preset-leg-curl", "レッグカール", "legs", "machine"],
  ["preset-shoulder-press", "ショルダープレス", "shoulders", "dumbbell"],
  ["preset-side-raise", "サイドレイズ", "shoulders", "dumbbell"],
  ["preset-face-pull", "フェイスプル", "shoulders", "cable"],
  ["preset-barbell-curl", "バーベルカール", "arms", "barbell"],
  ["preset-triceps-pushdown", "トライセプスプッシュダウン", "arms", "cable"],
  ["preset-dips", "ディップス", "arms", "bodyweight"],
  ["preset-crunch", "クランチ", "abs", "bodyweight"],
  ["preset-plank", "プランク", "abs", "bodyweight"],
  ["preset-running", "ランニング", "cardio", "other"]
].map(([id, name, bodyPart, equipmentType], index) => ({
  id,
  name,
  bodyPart,
  equipmentType,
  sortOrder: (index + 1) * 10
}));

const state = {
  db: null,
  route: "record",
  recordDate: localDate(),
  graphTab: "weight",
  graphRange: "3m",
  graphExerciseId: null,
  manageTab: "exercises",
  timers: new Map()
};

const view = document.querySelector("#view");
const modal = document.querySelector("#modal");
const toast = document.querySelector("#toast");

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      createStore(db, "userSettings", { keyPath: "id" });
      createStore(db, "exercisePresets", { keyPath: "id" }, ["bodyPart", "name", "sortOrder"]);
      createStore(db, "exercises", { keyPath: "id" }, ["bodyPart", "isActive", "sourcePresetId", "sortOrder", "updatedAt"]);
      createStore(db, "workoutDays", { keyPath: "id" }, [["date", true], "updatedAt"]);
      createStore(db, "workoutExercises", { keyPath: "id" }, ["workoutDayId", "exerciseId", ["workoutDayId", "sortOrder"]]);
      createStore(db, "workoutSets", { keyPath: "id" }, ["workoutExerciseId", ["workoutExerciseId", "setNumber"]]);
      createStore(db, "bodyWeightLogs", { keyPath: "id" }, [["date", true], "updatedAt"]);
      createStore(db, "menuTemplates", { keyPath: "id" }, ["sortOrder", "updatedAt"]);
      createStore(db, "menuTemplateExercises", { keyPath: "id" }, ["menuTemplateId", "exerciseId", ["menuTemplateId", "sortOrder"]]);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function createStore(db, name, options, indexes = []) {
  if (db.objectStoreNames.contains(name)) return;
  const store = db.createObjectStore(name, options);
  indexes.forEach((index) => {
    if (Array.isArray(index) && typeof index[1] === "boolean") {
      const [field, unique] = index;
      store.createIndex(Array.isArray(field) ? field.join("+") : field, field, { unique: Boolean(unique) });
    } else if (Array.isArray(index)) {
      store.createIndex(index.join("+"), index);
    } else {
      store.createIndex(index, index);
    }
  });
}

function tx(storeNames, mode = "readonly") {
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  return state.db.transaction(names, mode);
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll(storeName) {
  return promisify(tx(storeName).objectStore(storeName).getAll());
}

function getOne(storeName, id) {
  return promisify(tx(storeName).objectStore(storeName).get(id));
}

function putOne(storeName, record) {
  return promisify(tx(storeName, "readwrite").objectStore(storeName).put(record));
}

function deleteOne(storeName, id) {
  return promisify(tx(storeName, "readwrite").objectStore(storeName).delete(id));
}

async function seed() {
  const now = new Date().toISOString();
  if (!(await getOne("userSettings", "default"))) {
    await putOne("userSettings", {
      id: "default",
      weightUnit: "kg",
      defaultGraphRange: "3m",
      isSetupCompleted: true,
      createdAt: now,
      updatedAt: now
    });
  }

  const presets = await getAll("exercisePresets");
  if (!presets.length) {
    const transaction = tx("exercisePresets", "readwrite");
    const store = transaction.objectStore("exercisePresets");
    PRESETS.forEach((preset) => store.put(preset));
    await transactionDone(transaction);
  }

  const exercises = await getAll("exercises");
  if (!exercises.length) {
    await addFromPresets(PRESETS.slice(0, 8).map((preset) => preset.id));
  }
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(dateString, delta) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return localDate(date);
}

function dateLabel(dateString) {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${dateString}T00:00:00`));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatKg(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${Number(value).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}kg`;
}

function parseNumber(value, min, max) {
  if (value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return undefined;
  return number;
}

function sortByOrderAndName(items) {
  return [...items].sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, "ja"));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function setActiveNav() {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === state.route);
  });
}

async function ensureWorkoutDay(date) {
  const days = await getAll("workoutDays");
  const existing = days.find((day) => day.date === date);
  if (existing) return existing;
  const now = new Date().toISOString();
  const day = { id: uuid(), date, memo: "", createdAt: now, updatedAt: now };
  await putOne("workoutDays", day);
  return day;
}

async function getWorkoutDetail(date) {
  const [days, workoutExercises, workoutSets, exercises, bodyWeights] = await Promise.all([
    getAll("workoutDays"),
    getAll("workoutExercises"),
    getAll("workoutSets"),
    getAll("exercises"),
    getAll("bodyWeightLogs")
  ]);
  const day = days.find((item) => item.date === date) || null;
  const bodyWeightLog = bodyWeights.find((item) => item.date === date) || null;
  if (!day) return { day: null, bodyWeightLog, exercises: [] };
  const rows = workoutExercises
    .filter((item) => item.workoutDayId === day.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((workoutExercise) => ({
      workoutExercise,
      exercise: exercises.find((exercise) => exercise.id === workoutExercise.exerciseId) || {
        id: workoutExercise.exerciseId,
        name: "削除済み種目",
        bodyPart: "other",
        equipmentType: null
      },
      sets: workoutSets
        .filter((set) => set.workoutExerciseId === workoutExercise.id)
        .sort((a, b) => a.setNumber - b.setNumber)
    }));
  return { day, bodyWeightLog, exercises: rows };
}

async function upsertBodyWeight(date, value) {
  const number = parseNumber(value, 0, 999.9);
  const logs = await getAll("bodyWeightLogs");
  const existing = logs.find((log) => log.date === date);
  if (number === null) {
    if (existing) await deleteOne("bodyWeightLogs", existing.id);
    return;
  }
  if (number === undefined) {
    showToast("体重は 0 から 999.9kg で入力してください");
    return;
  }
  const now = new Date().toISOString();
  await putOne("bodyWeightLogs", {
    id: existing?.id || uuid(),
    date,
    bodyWeightKg: number,
    memo: existing?.memo || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now
  });
}

async function addExerciseToDate(date, exerciseId) {
  const day = await ensureWorkoutDay(date);
  const existing = (await getAll("workoutExercises")).find((item) => item.workoutDayId === day.id && item.exerciseId === exerciseId);
  if (existing) {
    await addSet(existing.id);
    return;
  }
  const now = new Date().toISOString();
  const siblings = (await getAll("workoutExercises")).filter((item) => item.workoutDayId === day.id);
  const workoutExercise = {
    id: uuid(),
    workoutDayId: day.id,
    exerciseId,
    sortOrder: siblings.length ? Math.max(...siblings.map((item) => item.sortOrder)) + 10 : 10,
    memo: "",
    createdAt: now,
    updatedAt: now
  };
  await putOne("workoutExercises", workoutExercise);
  await putOne("workoutSets", {
    id: uuid(),
    workoutExerciseId: workoutExercise.id,
    setNumber: 1,
    weightKg: null,
    reps: null,
    createdAt: now,
    updatedAt: now
  });
}

async function addSet(workoutExerciseId) {
  const sets = (await getAll("workoutSets"))
    .filter((set) => set.workoutExerciseId === workoutExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber);
  const last = sets.at(-1);
  const now = new Date().toISOString();
  await putOne("workoutSets", {
    id: uuid(),
    workoutExerciseId,
    setNumber: last ? last.setNumber + 1 : 1,
    weightKg: last?.weightKg ?? null,
    reps: last?.reps ?? null,
    createdAt: now,
    updatedAt: now
  });
}

async function updateSet(setId, patch) {
  const set = await getOne("workoutSets", setId);
  if (!set) return;
  await putOne("workoutSets", { ...set, ...patch, updatedAt: new Date().toISOString() });
}

async function deleteSet(setId) {
  const set = await getOne("workoutSets", setId);
  if (!set) return;
  await deleteOne("workoutSets", setId);
  const sets = (await getAll("workoutSets"))
    .filter((item) => item.workoutExerciseId === set.workoutExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber);
  await Promise.all(sets.map((item, index) => putOne("workoutSets", { ...item, setNumber: index + 1, updatedAt: new Date().toISOString() })));
}

async function deleteWorkoutExercise(id) {
  const sets = (await getAll("workoutSets")).filter((set) => set.workoutExerciseId === id);
  await Promise.all(sets.map((set) => deleteOne("workoutSets", set.id)));
  await deleteOne("workoutExercises", id);
}

async function deleteWorkoutDay(date) {
  const day = (await getAll("workoutDays")).find((item) => item.date === date);
  if (!day) return;
  const exercises = (await getAll("workoutExercises")).filter((item) => item.workoutDayId === day.id);
  const setIds = (await getAll("workoutSets"))
    .filter((set) => exercises.some((exercise) => exercise.id === set.workoutExerciseId))
    .map((set) => set.id);
  await Promise.all([...setIds.map((id) => deleteOne("workoutSets", id)), ...exercises.map((item) => deleteOne("workoutExercises", item.id))]);
  await deleteOne("workoutDays", day.id);
}

async function listExercises({ includeArchived = false } = {}) {
  const exercises = await getAll("exercises");
  return sortByOrderAndName(exercises.filter((exercise) => includeArchived || exercise.isActive));
}

async function createExercise(input) {
  const name = input.name.trim();
  if (!name || name.length > 40) {
    showToast("種目名は 1 から 40 文字で入力してください");
    return null;
  }
  const now = new Date().toISOString();
  const exercises = await getAll("exercises");
  const sortOrder = exercises.length ? Math.max(...exercises.map((exercise) => exercise.sortOrder)) + 10 : 10;
  const exercise = {
    id: uuid(),
    name,
    bodyPart: input.bodyPart,
    equipmentType: input.equipmentType || null,
    sortOrder,
    isActive: true,
    sourcePresetId: null,
    createdAt: now,
    updatedAt: now
  };
  await putOne("exercises", exercise);
  return exercise;
}

async function archiveExercise(id, isActive) {
  const exercise = await getOne("exercises", id);
  if (!exercise) return;
  await putOne("exercises", { ...exercise, isActive, updatedAt: new Date().toISOString() });
}

async function addFromPresets(presetIds) {
  const [presets, exercises] = await Promise.all([getAll("exercisePresets"), getAll("exercises")]);
  const addedPresetIds = new Set(exercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));
  const now = new Date().toISOString();
  const maxOrder = exercises.length ? Math.max(...exercises.map((exercise) => exercise.sortOrder)) : 0;
  const selected = presets.filter((preset) => presetIds.includes(preset.id) && !addedPresetIds.has(preset.id));
  await Promise.all(selected.map((preset, index) => putOne("exercises", {
    id: uuid(),
    name: preset.name,
    bodyPart: preset.bodyPart,
    equipmentType: preset.equipmentType,
    sortOrder: maxOrder + (index + 1) * 10,
    isActive: true,
    sourcePresetId: preset.id,
    createdAt: now,
    updatedAt: now
  })));
  return selected.length;
}

async function createMenu(input) {
  const name = input.name.trim();
  if (!name || name.length > 40) {
    showToast("メニュー名は 1 から 40 文字で入力してください");
    return null;
  }
  const ids = input.exerciseIds.filter(Boolean);
  if (!ids.length) {
    showToast("メニューに入れる種目を選んでください");
    return null;
  }
  const now = new Date().toISOString();
  const menus = await getAll("menuTemplates");
  const menu = {
    id: uuid(),
    name,
    memo: input.memo.trim().slice(0, 500),
    sortOrder: menus.length ? Math.max(...menus.map((item) => item.sortOrder)) + 10 : 10,
    createdAt: now,
    updatedAt: now
  };
  await putOne("menuTemplates", menu);
  await Promise.all(ids.map((exerciseId, index) => putOne("menuTemplateExercises", {
    id: uuid(),
    menuTemplateId: menu.id,
    exerciseId,
    sortOrder: (index + 1) * 10,
    createdAt: now,
    updatedAt: now
  })));
  return menu;
}

async function deleteMenu(id) {
  const rows = (await getAll("menuTemplateExercises")).filter((row) => row.menuTemplateId === id);
  await Promise.all(rows.map((row) => deleteOne("menuTemplateExercises", row.id)));
  await deleteOne("menuTemplates", id);
}

async function listMenuDetails() {
  const [menus, rows, exercises] = await Promise.all([getAll("menuTemplates"), getAll("menuTemplateExercises"), getAll("exercises")]);
  return [...menus].sort((a, b) => a.sortOrder - b.sortOrder).map((menu) => ({
    menu,
    rows: rows
      .filter((row) => row.menuTemplateId === menu.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({ row, exercise: exercises.find((exercise) => exercise.id === row.exerciseId) }))
  }));
}

async function addMenuToDate(date, menuId) {
  const menus = await listMenuDetails();
  const detail = menus.find((item) => item.menu.id === menuId);
  if (!detail) return;
  for (const item of detail.rows) {
    if (item.exercise) await addExerciseToDate(date, item.exercise.id);
  }
}

function debounceSave(key, callback, delay = 400) {
  clearTimeout(state.timers.get(key));
  state.timers.set(key, setTimeout(async () => {
    await callback();
    showToast("保存しました");
    state.timers.delete(key);
  }, delay));
}

function routeFromHash() {
  const route = (location.hash || "#record").replace("#", "").split("?")[0];
  return ["record", "graphs", "history", "manage", "settings"].includes(route) ? route : "record";
}

async function render() {
  state.route = routeFromHash();
  setActiveNav();
  if (state.route === "record") return renderRecord();
  if (state.route === "graphs") return renderGraphs();
  if (state.route === "history") return renderHistory();
  if (state.route === "manage") return renderManage();
  return renderSettings();
}

async function renderRecord() {
  const detail = await getWorkoutDetail(state.recordDate);
  view.innerHTML = `
    <header class="screen-head">
      <div>
        <h2>今日の記録</h2>
        <p>${escapeHtml(dateLabel(state.recordDate))} のトレーニングを自動保存します。</p>
      </div>
      <div class="actions">
        <button class="secondary" data-action="open-exercise-modal">種目追加</button>
        <button class="primary" data-action="open-menu-modal">メニュー追加</button>
      </div>
    </header>

    <section class="panel">
      <div class="date-strip">
        <button class="icon-btn" title="前日" data-action="prev-date">‹</button>
        <input class="date-picker" type="date" value="${state.recordDate}" data-action="pick-date">
        <button class="icon-btn" title="翌日" data-action="next-date">›</button>
      </div>
    </section>

    <section class="panel bodyweight-card">
      <div class="field">
        <label for="body-weight">体重 kg</label>
        <input id="body-weight" type="number" inputmode="decimal" step="0.1" min="0" max="999.9" value="${detail.bodyWeightLog?.bodyWeightKg ?? ""}" placeholder="例: 68.5" data-action="body-weight">
      </div>
      <span class="muted mini">入力後に自動保存</span>
    </section>

    <section class="panel">
      <div class="toolbar">
        <h3>セット記録</h3>
        <span class="badge">${detail.exercises.length} 種目</span>
      </div>
      ${detail.exercises.length ? detail.exercises.map(renderWorkoutCard).join("") : `
        <div class="empty">
          <p>まだ種目がありません。</p>
          <div class="actions" style="justify-content:center">
            <button class="secondary" data-action="open-exercise-modal">種目追加</button>
            <button class="primary" data-action="open-menu-modal">メニュー追加</button>
          </div>
        </div>
      `}
    </section>
  `;
}

function renderWorkoutCard(item) {
  const bodyPart = BODY_PARTS[item.exercise.bodyPart] || BODY_PARTS.other;
  const equipment = item.exercise.equipmentType ? EQUIPMENT_TYPES[item.exercise.equipmentType] : "種別なし";
  return `
    <article class="workout-card">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(item.exercise.name)}</h3>
          <span class="badge">${bodyPart} / ${equipment}</span>
        </div>
        <button class="danger" data-action="delete-workout-exercise" data-id="${item.workoutExercise.id}">削除</button>
      </div>
      <table class="set-table">
        <thead><tr><th>#</th><th>重量 kg</th><th>回数</th><th></th></tr></thead>
        <tbody>
          ${item.sets.map((set) => `
            <tr>
              <td>${set.setNumber}</td>
              <td><input type="number" inputmode="decimal" min="0" max="999.9" step="0.1" value="${set.weightKg ?? ""}" data-action="set-weight" data-id="${set.id}"></td>
              <td><input type="number" inputmode="numeric" min="1" max="999" step="1" value="${set.reps ?? ""}" data-action="set-reps" data-id="${set.id}"></td>
              <td><button class="icon-btn" title="セット削除" data-action="delete-set" data-id="${set.id}">×</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="card-foot">
        <button class="secondary" data-action="add-set" data-id="${item.workoutExercise.id}">セット追加</button>
      </div>
    </article>
  `;
}

async function openExerciseModal() {
  const exercises = await listExercises();
  modal.innerHTML = `
    <form method="dialog" class="modal-body">
      <div class="modal-head">
        <h2>種目を追加</h2>
        <button class="icon-btn" value="cancel">×</button>
      </div>
      ${exercises.length ? `
        <div class="list">
          ${exercises.map((exercise) => `
            <button class="list-item" type="button" data-action="choose-exercise" data-id="${exercise.id}">
              <span class="list-item-top">
                <strong>${escapeHtml(exercise.name)}</strong>
                <span class="badge">${BODY_PARTS[exercise.bodyPart]}</span>
              </span>
            </button>
          `).join("")}
        </div>
      ` : `<div class="empty">マイ種目がありません。管理画面でプリセットを追加してください。</div>`}
    </form>
  `;
  modal.showModal();
}

async function openMenuModal() {
  const menus = await listMenuDetails();
  modal.innerHTML = `
    <form method="dialog" class="modal-body">
      <div class="modal-head">
        <h2>メニューを追加</h2>
        <button class="icon-btn" value="cancel">×</button>
      </div>
      ${menus.length ? `
        <div class="list">
          ${menus.map((item) => `
            <button class="list-item" type="button" data-action="choose-menu" data-id="${item.menu.id}">
              <span class="list-item-top">
                <strong>${escapeHtml(item.menu.name)}</strong>
                <span class="badge">${item.rows.length} 種目</span>
              </span>
              <span class="muted mini">${escapeHtml(item.rows.map((row) => row.exercise?.name).filter(Boolean).join(" / "))}</span>
            </button>
          `).join("")}
        </div>
      ` : `<div class="empty">メニューがありません。管理画面で作成できます。</div>`}
    </form>
  `;
  modal.showModal();
}

async function renderGraphs() {
  const [settings, exercises] = await Promise.all([getOne("userSettings", "default"), listExercises()]);
  state.graphRange = state.graphRange || settings?.defaultGraphRange || "3m";
  if (!state.graphExerciseId && exercises.length) state.graphExerciseId = exercises[0].id;
  const points = state.graphTab === "weight"
    ? await getMaxWeightPoints(state.graphExerciseId, state.graphRange)
    : await getBodyWeightPoints(state.graphRange);
  view.innerHTML = `
    <header class="screen-head">
      <div>
        <h2>グラフ</h2>
        <p>重量と体重の推移を期間別に確認します。</p>
      </div>
    </header>
    <section class="panel">
      <div class="tabs">
        <button class="tab ${state.graphTab === "weight" ? "active" : ""}" data-action="graph-tab" data-tab="weight">最大重量</button>
        <button class="tab ${state.graphTab === "body" ? "active" : ""}" data-action="graph-tab" data-tab="body">体重</button>
      </div>
      <div class="grid-2">
        ${state.graphTab === "weight" ? `
          <div class="field">
            <label>種目</label>
            <select data-action="graph-exercise">
              ${exercises.map((exercise) => `<option value="${exercise.id}" ${exercise.id === state.graphExerciseId ? "selected" : ""}>${escapeHtml(exercise.name)}</option>`).join("")}
            </select>
          </div>
        ` : "<div></div>"}
        <div class="field">
          <label>期間</label>
          <select data-action="graph-range">
            ${rangeOptions().map(([value, label]) => `<option value="${value}" ${value === state.graphRange ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="chart-wrap" style="margin-top:14px">${renderChart(points, state.graphTab)}</div>
      ${renderSummary(points, state.graphTab)}
    </section>
  `;
}

function rangeOptions() {
  return [["1m", "1か月"], ["3m", "3か月"], ["6m", "6か月"], ["all", "全期間"]];
}

function rangeFromNow(range) {
  if (range === "all") return null;
  const months = { "1m": 1, "3m": 3, "6m": 6 }[range] || 3;
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return localDate(date);
}

async function getMaxWeightPoints(exerciseId, range) {
  if (!exerciseId) return [];
  const from = rangeFromNow(range);
  const [days, workoutExercises, sets] = await Promise.all([getAll("workoutDays"), getAll("workoutExercises"), getAll("workoutSets")]);
  return days
    .filter((day) => !from || day.date >= from)
    .map((day) => {
      const cards = workoutExercises.filter((item) => item.workoutDayId === day.id && item.exerciseId === exerciseId);
      const cardSets = sets.filter((set) => cards.some((card) => card.id === set.workoutExerciseId) && set.weightKg !== null);
      if (!cardSets.length) return null;
      const best = cardSets.reduce((max, set) => Number(set.weightKg) > Number(max.weightKg) ? set : max, cardSets[0]);
      return { date: day.date, value: Number(best.weightKg), reps: best.reps };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getBodyWeightPoints(range) {
  const from = rangeFromNow(range);
  return (await getAll("bodyWeightLogs"))
    .filter((log) => !from || log.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log) => ({ date: log.date, value: Number(log.bodyWeightKg) }));
}

function renderChart(points, tab) {
  if (!points.length) {
    return `<div class="empty" style="margin:18px">表示できるデータがありません。</div>`;
  }
  const width = 900;
  const height = 280;
  const pad = 34;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (index) => pad + (points.length === 1 ? (width - pad * 2) / 2 : (index * (width - pad * 2)) / (points.length - 1));
  const y = (value) => height - pad - ((value - min) * (height - pad * 2)) / span;
  const path = points.map((point, index) => `${index ? "L" : "M"} ${x(index)} ${y(point.value)}`).join(" ");
  const color = tab === "weight" ? "#16776f" : "#b85337";
  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="推移グラフ">
      <g stroke="#d8e0df" stroke-width="1">
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}"></line>
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"></line>
      </g>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      ${points.map((point, index) => `
        <g>
          <circle cx="${x(index)}" cy="${y(point.value)}" r="6" fill="#fff" stroke="${color}" stroke-width="3"></circle>
          <title>${point.date}: ${formatKg(point.value)}${point.reps ? ` / ${point.reps}回` : ""}</title>
        </g>
      `).join("")}
      <text x="${pad}" y="22" fill="#64717d" font-size="13">${formatKg(max)}</text>
      <text x="${pad}" y="${height - 8}" fill="#64717d" font-size="13">${formatKg(min)}</text>
    </svg>
  `;
}

function renderSummary(points, tab) {
  if (!points.length) return "";
  const latest = points.at(-1).value;
  const values = points.map((point) => point.value);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const delta = latest - points[0].value;
  const labels = tab === "weight"
    ? [["最新", formatKg(latest)], ["最高", formatKg(highest)], ["変化", `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}kg`], ["記録", `${points.length}回`]]
    : [["最新", formatKg(latest)], ["最低", formatKg(lowest)], ["最高", formatKg(highest)], ["変化", `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}kg`]];
  return `<div class="summary-grid">${labels.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>`;
}

async function renderHistory() {
  const [days, bodyWeights, workoutExercises, sets, exercises] = await Promise.all([
    getAll("workoutDays"),
    getAll("bodyWeightLogs"),
    getAll("workoutExercises"),
    getAll("workoutSets"),
    getAll("exercises")
  ]);
  const dates = new Set([...days.map((day) => day.date), ...bodyWeights.map((log) => log.date)]);
  const rows = [...dates].sort((a, b) => b.localeCompare(a)).map((date) => {
    const day = days.find((item) => item.date === date);
    const cards = day ? workoutExercises.filter((item) => item.workoutDayId === day.id) : [];
    const countSets = sets.filter((set) => cards.some((card) => card.id === set.workoutExerciseId)).length;
    const names = cards.map((card) => exercises.find((exercise) => exercise.id === card.exerciseId)?.name).filter(Boolean).slice(0, 3);
    return { date, day, weight: bodyWeights.find((log) => log.date === date), cards, countSets, names };
  });
  view.innerHTML = `
    <header class="screen-head">
      <div>
        <h2>日別履歴</h2>
        <p>過去の記録を日付ごとに確認して編集できます。</p>
      </div>
    </header>
    <section class="panel">
      ${rows.length ? `<div class="list">${rows.map((row) => `
        <article class="list-item">
          <div class="list-item-top">
            <div>
              <h3>${escapeHtml(dateLabel(row.date))}</h3>
              <p class="muted">${row.weight ? formatKg(row.weight.bodyWeightKg) : "体重なし"} / ${row.cards.length} 種目 / ${row.countSets} セット</p>
              <p class="mini muted">${escapeHtml(row.names.join(" / ") || "筋トレ記録なし")}</p>
            </div>
            <div class="actions">
              <button class="secondary" data-action="edit-history" data-date="${row.date}">編集</button>
              ${row.day ? `<button class="danger" data-action="delete-day" data-date="${row.date}">削除</button>` : ""}
            </div>
          </div>
        </article>
      `).join("")}</div>` : `<div class="empty">履歴はまだありません。</div>`}
    </section>
  `;
}

async function renderManage() {
  const tabs = [["exercises", "マイ種目"], ["presets", "プリセット"], ["menus", "メニュー"]];
  view.innerHTML = `
    <header class="screen-head">
      <div>
        <h2>管理</h2>
        <p>よく使う種目とメニューを準備します。</p>
      </div>
    </header>
    <section class="panel">
      <div class="tabs">
        ${tabs.map(([id, label]) => `<button class="tab ${state.manageTab === id ? "active" : ""}" data-action="manage-tab" data-tab="${id}">${label}</button>`).join("")}
      </div>
      <div id="manage-content"></div>
    </section>
  `;
  if (state.manageTab === "exercises") return renderManageExercises();
  if (state.manageTab === "presets") return renderManagePresets();
  return renderManageMenus();
}

async function renderManageExercises() {
  const exercises = await listExercises({ includeArchived: true });
  document.querySelector("#manage-content").innerHTML = `
    <form class="panel" data-action="create-exercise-form" style="box-shadow:none;margin-bottom:14px">
      <div class="grid-3">
        <div class="field"><label>種目名</label><input name="name" maxlength="40" required placeholder="例: ベンチプレス"></div>
        <div class="field"><label>部位</label><select name="bodyPart">${optionMap(BODY_PARTS)}</select></div>
        <div class="field"><label>種別</label><select name="equipmentType"><option value="">なし</option>${optionMap(EQUIPMENT_TYPES)}</select></div>
      </div>
      <div class="actions" style="margin-top:12px"><button class="primary">種目を作成</button></div>
    </form>
    ${exercises.length ? `<div class="list">${exercises.map((exercise) => `
      <article class="list-item">
        <div class="list-item-top">
          <div>
            <h3>${escapeHtml(exercise.name)}</h3>
            <p class="muted">${BODY_PARTS[exercise.bodyPart]} / ${exercise.equipmentType ? EQUIPMENT_TYPES[exercise.equipmentType] : "種別なし"}${exercise.isActive ? "" : " / 非表示"}</p>
          </div>
          <button class="${exercise.isActive ? "danger" : "secondary"}" data-action="toggle-exercise" data-id="${exercise.id}" data-active="${exercise.isActive ? "0" : "1"}">${exercise.isActive ? "非表示" : "復元"}</button>
        </div>
      </article>
    `).join("")}</div>` : `<div class="empty">種目がありません。</div>`}
  `;
}

async function renderManagePresets() {
  const [presets, exercises] = await Promise.all([getAll("exercisePresets"), getAll("exercises")]);
  const added = new Set(exercises.map((exercise) => exercise.sourcePresetId).filter(Boolean));
  document.querySelector("#manage-content").innerHTML = `
    <div class="list">
      ${sortByOrderAndName(presets).map((preset) => `
        <label class="list-item">
          <span class="list-item-top">
            <span>
              <strong>${escapeHtml(preset.name)}</strong>
              <span class="muted mini"> ${BODY_PARTS[preset.bodyPart]} / ${preset.equipmentType ? EQUIPMENT_TYPES[preset.equipmentType] : "種別なし"}</span>
            </span>
            <span class="badge">${added.has(preset.id) ? "追加済み" : "未追加"}</span>
          </span>
          <input type="checkbox" data-preset-id="${preset.id}" ${added.has(preset.id) ? "disabled" : ""}>
        </label>
      `).join("")}
    </div>
    <div class="actions" style="margin-top:14px"><button class="primary" data-action="add-presets">選択したプリセットを追加</button></div>
  `;
}

async function renderManageMenus() {
  const [menus, exercises] = await Promise.all([listMenuDetails(), listExercises()]);
  document.querySelector("#manage-content").innerHTML = `
    <form class="panel" data-action="create-menu-form" style="box-shadow:none;margin-bottom:14px">
      <div class="grid-2">
        <div class="field"><label>メニュー名</label><input name="name" maxlength="40" required placeholder="例: Push Day"></div>
        <div class="field"><label>メモ</label><input name="memo" maxlength="500" placeholder="任意"></div>
      </div>
      <div class="label" style="margin-top:12px">種目</div>
      <div class="grid-3" style="margin-top:8px">
        ${exercises.map((exercise) => `
          <label class="row"><input type="checkbox" name="exerciseIds" value="${exercise.id}">${escapeHtml(exercise.name)}</label>
        `).join("")}
      </div>
      <div class="actions" style="margin-top:12px"><button class="primary">メニューを作成</button></div>
    </form>
    ${menus.length ? `<div class="list">${menus.map((item) => `
      <article class="list-item">
        <div class="list-item-top">
          <div>
            <h3>${escapeHtml(item.menu.name)}</h3>
            <p class="muted">${item.rows.length} 種目${item.menu.memo ? ` / ${escapeHtml(item.menu.memo)}` : ""}</p>
            <p class="mini muted">${escapeHtml(item.rows.map((row) => row.exercise?.name).filter(Boolean).join(" / "))}</p>
          </div>
          <button class="danger" data-action="delete-menu" data-id="${item.menu.id}">削除</button>
        </div>
      </article>
    `).join("")}</div>` : `<div class="empty">メニューがありません。</div>`}
  `;
}

function optionMap(map) {
  return Object.entries(map).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

async function renderSettings() {
  const settings = await getOne("userSettings", "default");
  view.innerHTML = `
    <header class="screen-head">
      <div>
        <h2>設定</h2>
        <p>端末内データと初期表示を管理します。</p>
      </div>
    </header>
    <section class="panel">
      <div class="grid-2">
        <div class="field"><label>単位</label><input value="kg" disabled></div>
        <div class="field">
          <label>グラフ初期期間</label>
          <select data-action="default-range">
            ${rangeOptions().map(([value, label]) => `<option value="${value}" ${settings?.defaultGraphRange === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <div>
          <h3>データ管理</h3>
          <p class="muted">IndexedDB に保存した記録、種目、メニューをこの端末から削除します。</p>
        </div>
        <button class="danger" data-action="reset-data">全データ初期化</button>
      </div>
    </section>
  `;
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "prev-date") state.recordDate = addDays(state.recordDate, -1);
  if (action === "next-date") state.recordDate = addDays(state.recordDate, 1);
  if (action === "open-exercise-modal") return openExerciseModal();
  if (action === "open-menu-modal") return openMenuModal();
  if (action === "add-set") await addSet(target.dataset.id);
  if (action === "delete-set" && confirm("このセットを削除しますか？")) await deleteSet(target.dataset.id);
  if (action === "delete-workout-exercise" && confirm("この種目カードを削除しますか？")) await deleteWorkoutExercise(target.dataset.id);
  if (action === "choose-exercise") {
    await addExerciseToDate(state.recordDate, target.dataset.id);
    modal.close();
    showToast("種目を追加しました");
  }
  if (action === "choose-menu") {
    await addMenuToDate(state.recordDate, target.dataset.id);
    modal.close();
    showToast("メニューを追加しました");
  }
  if (action === "graph-tab") state.graphTab = target.dataset.tab;
  if (action === "edit-history") {
    state.recordDate = target.dataset.date;
    location.hash = "#record";
    return render();
  }
  if (action === "delete-day" && confirm("この日の筋トレ記録を削除しますか？体重は残ります。")) await deleteWorkoutDay(target.dataset.date);
  if (action === "manage-tab") state.manageTab = target.dataset.tab;
  if (action === "toggle-exercise") await archiveExercise(target.dataset.id, target.dataset.active === "1");
  if (action === "add-presets") {
    const ids = [...document.querySelectorAll("[data-preset-id]:checked")].map((input) => input.dataset.presetId);
    const count = await addFromPresets(ids);
    showToast(`${count} 件追加しました`);
  }
  if (action === "delete-menu" && confirm("このメニューを削除しますか？")) await deleteMenu(target.dataset.id);
  if (action === "reset-data" && confirm("全データを削除しますか？") && confirm("本当に削除しますか？この操作は元に戻せません。")) {
    state.db.close();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
    state.db = await openDb();
    await seed();
    showToast("初期化しました");
  }

  await render();
});

document.addEventListener("input", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "pick-date") {
    state.recordDate = target.value || localDate();
    render();
  }
  if (action === "body-weight") {
    debounceSave(`body-${state.recordDate}`, () => upsertBodyWeight(state.recordDate, target.value));
  }
  if (action === "set-weight" || action === "set-reps") {
    const row = target.closest("tr");
    const weightValue = row.querySelector("[data-action='set-weight']").value;
    const repsValue = row.querySelector("[data-action='set-reps']").value;
    debounceSave(`set-${target.dataset.id}`, () => {
      const weightKg = parseNumber(weightValue, 0, 999.9);
      const reps = parseNumber(repsValue, 1, 999);
      if (weightKg === undefined || reps === undefined) {
        showToast("重量または回数の入力値を確認してください");
        return Promise.resolve();
      }
      return updateSet(row.querySelector("[data-action='set-weight']").dataset.id, { weightKg, reps });
    });
  }
});

document.addEventListener("change", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "graph-range") state.graphRange = target.value;
  if (action === "graph-exercise") state.graphExerciseId = target.value;
  if (action === "default-range") {
    const settings = await getOne("userSettings", "default");
    await putOne("userSettings", { ...settings, defaultGraphRange: target.value, updatedAt: new Date().toISOString() });
    showToast("設定を保存しました");
  }
  await render();
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action]");
  if (!form) return;
  event.preventDefault();
  const formData = new FormData(form);
  if (form.dataset.action === "create-exercise-form") {
    const exercise = await createExercise({
      name: formData.get("name"),
      bodyPart: formData.get("bodyPart"),
      equipmentType: formData.get("equipmentType")
    });
    if (exercise) showToast("種目を作成しました");
  }
  if (form.dataset.action === "create-menu-form") {
    const menu = await createMenu({
      name: formData.get("name"),
      memo: formData.get("memo") || "",
      exerciseIds: formData.getAll("exerciseIds")
    });
    if (menu) showToast("メニューを作成しました");
  }
  await render();
});

window.addEventListener("hashchange", render);

async function boot() {
  state.db = await openDb();
  await seed();
  const settings = await getOne("userSettings", "default");
  state.graphRange = settings?.defaultGraphRange || "3m";
  await render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

boot().catch((error) => {
  console.error(error);
  view.innerHTML = `<div class="panel"><h2>起動できませんでした</h2><p class="muted">${escapeHtml(error.message || error)}</p></div>`;
});
