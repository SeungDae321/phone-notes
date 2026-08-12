const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const storageSource = fs.readFileSync(
  path.join(__dirname, "..", "js", "storage.js"),
  "utf8"
);

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    values,
  };
}

function createContext(storage = createStorage()) {
  const context = vm.createContext({
    console,
    localStorage: storage,
    crypto: { randomUUID: () => "test-uuid" },
  });
  vm.runInContext(storageSource, context);
  return context;
}

function sampleNote(overrides = {}) {
  return {
    id: "note-1",
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:10:00.000Z",
    content: "고객 통화",
    ...overrides,
  };
}

test("빈 저장소를 구분한다", () => {
  const context = createContext();
  assert.equal(context.loadNotes().status, "empty");
});

test("메모를 저장하고 유효한 데이터만 로드한다", () => {
  const storage = createStorage();
  const context = createContext(storage);
  const notes = [sampleNote()];

  assert.equal(context.saveNotes(notes), true);
  const result = context.loadNotes();

  assert.equal(result.status, "ok");
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.notes)),
    notes
  );
});

test("저장 실패를 false로 반환한다", () => {
  const storage = createStorage();
  storage.setItem = () => {
    throw new Error("quota exceeded");
  };
  const context = createContext(storage);

  assert.equal(context.saveNotes([sampleNote()]), false);
});

test("손상된 JSON을 감지하고 원문을 복구 키에 보관한다", () => {
  const raw = "{not-json";
  const storage = createStorage({ callNotes: raw });
  const context = createContext(storage);
  const result = context.loadNotes();

  assert.equal(result.status, "corrupt");
  assert.equal(result.raw, raw);

  const recoveryKey = context.backupCorruptData(raw);
  assert.match(recoveryKey, /^callNotes_recovery_/);
  assert.equal(storage.values.get(recoveryKey), raw);
});

test("형식이 잘못된 항목만 제외해 복구한다", () => {
  const notes = [sampleNote(), { id: "broken", content: 123 }];
  const storage = createStorage({ callNotes: JSON.stringify(notes) });
  const context = createContext(storage);
  const result = context.loadNotes();

  assert.equal(result.status, "corrupt");
  assert.equal(result.notes.length, 1);
  assert.match(result.message, /1개/);
});

test("내보내기 형식과 레거시 배열 가져오기를 지원한다", () => {
  const context = createContext();
  const notes = [sampleNote()];
  const payload = context.createExportPayload(notes);

  assert.equal(payload.version, 1);
  assert.equal(context.parseImportPayload(JSON.stringify(payload)).ok, true);
  assert.equal(context.parseImportPayload(JSON.stringify(notes)).ok, true);
  assert.equal(context.parseImportPayload("{}").ok, false);
});

test("메모 객체에 UUID와 ISO 날짜를 생성한다", () => {
  const context = createContext();
  const note = context.createNoteObject();

  assert.equal(note.id, "test-uuid");
  assert.equal(note.content, "");
  assert.equal(Number.isNaN(Date.parse(note.createdAt)), false);
});
