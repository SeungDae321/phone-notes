const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const storageSource = fs.readFileSync(
  path.join(__dirname, "..", "js", "storage.js"),
  "utf8"
);
const appSources = [
  "state.js",
  "navigation.js",
  "preferences.js",
  "search.js",
  "ui.js",
  "notes.js",
  "backup.js",
  "app.js",
].map((fileName) =>
  fs.readFileSync(path.join(__dirname, "..", "js", fileName), "utf8")
);

function createElement() {
  const classes = new Set();
  const attributes = new Map();
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    disabled: false,
    files: [],
    dataset: {},
    style: {
      setProperty(name, value) {
        this[name] = value;
      },
    },
    attributes,
    children: [],
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    focus() {},
    click() {},
    remove() {},
    getBoundingClientRect() {
      return { right: 0, bottom: 0, width: 0, height: 0 };
    },
  };
}

function createAppContext() {
  const elements = new Map(
    [
      "note-list",
      "editor",
      "note-date",
      "save-status",
      "new-note-btn",
      "delete-note-btn",
      "context-menu",
      "context-delete-btn",
      "search-input",
      "export-btn",
      "import-btn",
      "import-file-input",
      "theme-toggle-btn",
      "font-decrease-btn",
      "font-increase-btn",
      "font-size-value",
      "note-sidebar",
      "sidebar-toggle-btn",
      "sidebar-backdrop",
    ].map((id) => [id, createElement()])
  );
  elements.get("context-menu").classList.add("hidden");

  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  const document = {
    getElementById: (id) => elements.get(id),
    createElement,
    addEventListener() {},
    body: createElement(),
    documentElement: createElement(),
  };
  const context = vm.createContext({
    console,
    document,
    localStorage,
    crypto: {
      randomUUID: (() => {
        let id = 0;
        return () => `uuid-${++id}`;
      })(),
    },
    confirm: () => true,
    window: {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener() {},
      matchMedia: () => ({ matches: true }),
    },
    setTimeout: () => 1,
    clearTimeout() {},
    Blob: class Blob {
      constructor(parts, options) {
        this.parts = parts;
        this.type = options?.type;
      }
    },
    URL: {
      createObjectURL: () => "blob:test",
      revokeObjectURL() {},
    },
  });

  vm.runInContext(storageSource, context);
  appSources.forEach((source) => vm.runInContext(source, context));
  return { context, elements, values };
}

test("키워드와 전화번호 일부를 검색한다", () => {
  const { context } = createAppContext();
  const note = { content: "김민수 고객 010-1234-5678" };

  assert.equal(context.noteMatchesSearch(note, "김민수"), true);
  assert.equal(context.noteMatchesSearch(note, "1234"), true);
  assert.equal(context.noteMatchesSearch(note, "9999"), false);
});

test("초기 메모 생성, 추가, 삭제 CRUD 흐름을 저장한다", () => {
  const { context, values } = createAppContext();

  context.init();
  assert.equal(vm.runInContext("notes.length", context), 1);

  context.createNote();
  assert.equal(vm.runInContext("notes.length", context), 2);

  context.deleteNote(vm.runInContext("activeNoteId", context));
  assert.equal(vm.runInContext("notes.length", context), 1);
  assert.equal(JSON.parse(values.get("callNotes")).length, 1);
});

test("입력을 지연 저장하고 수정한 메모를 최신 순으로 정렬한다", () => {
  const { context, elements, values } = createAppContext();
  vm.runInContext(
    `notes = [
      { id: "newer", createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T02:00:00.000Z", content: "새 메모" },
      { id: "older", createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T01:00:00.000Z", content: "이전 메모" }
    ]; activeNoteId = "older";`,
    context
  );
  elements.get("editor").value = "수정한 메모";

  context.handleInput();
  assert.equal(values.has("callNotes"), false);
  context.commitPendingSave();

  assert.equal(vm.runInContext("notes[0].id", context), "older");
  assert.equal(JSON.parse(values.get("callNotes"))[0].content, "수정한 메모");
});

test("검색 결과에서 활성 메모와 편집기를 함께 전환한다", () => {
  const { context, elements } = createAppContext();
  vm.runInContext(
    `notes = [
      { id: "a", createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T02:00:00.000Z", content: "알파 고객" },
      { id: "b", createdAt: "2026-08-12T00:00:00.000Z", updatedAt: "2026-08-12T01:00:00.000Z", content: "베타 고객" }
    ]; activeNoteId = "a";`,
    context
  );
  elements.get("search-input").value = "베타";

  context.handleSearchInput();

  assert.equal(vm.runInContext("activeNoteId", context), "b");
  assert.equal(elements.get("editor").value, "베타 고객");
});

test("시스템 테마와 입력 폰트 크기를 적용하고 사용자 선택을 저장한다", () => {
  const { context, elements, values } = createAppContext();

  context.initializePreferences();
  assert.equal(context.document.documentElement.dataset.theme, "dark");
  assert.equal(elements.get("font-size-value").textContent, "16px");

  context.toggleTheme();
  context.increaseEditorFontSize();

  assert.equal(context.document.documentElement.dataset.theme, "light");
  assert.equal(values.get("callNotesTheme"), "light");
  assert.equal(values.get("callNotesFontSize"), "18");
  assert.equal(
    context.document.documentElement.style["--editor-font-size"],
    "18px"
  );
});

test("모바일 메모 서랍을 열고 메모 선택 후 닫는다", () => {
  const { context, elements } = createAppContext();
  const sidebar = elements.get("note-sidebar");
  const toggle = elements.get("sidebar-toggle-btn");
  const backdrop = elements.get("sidebar-backdrop");

  context.init();
  assert.equal(sidebar.attributes.get("aria-hidden"), "true");

  context.toggleMobileSidebar();
  assert.equal(context.document.body.classList.contains("sidebar-open"), true);
  assert.equal(toggle.attributes.get("aria-expanded"), "true");
  assert.equal(sidebar.attributes.get("aria-hidden"), "false");
  assert.equal(backdrop.attributes.get("aria-hidden"), "false");

  context.selectNote(vm.runInContext("activeNoteId", context));
  assert.equal(context.document.body.classList.contains("sidebar-open"), false);
  assert.equal(toggle.attributes.get("aria-expanded"), "false");
});
