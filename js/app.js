let notes = [];
let activeNoteId = null;

const noteListEl = document.getElementById("note-list");
const editorEl = document.getElementById("editor");
const noteDateEl = document.getElementById("note-date");
const saveStatusEl = document.getElementById("save-status");
const newNoteBtn = document.getElementById("new-note-btn");
const deleteNoteBtn = document.getElementById("delete-note-btn");
const contextMenuEl = document.getElementById("context-menu");
const contextDeleteBtn = document.getElementById("context-delete-btn");
const searchInputEl = document.getElementById("search-input");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-file-input");

let contextMenuTargetId = null;
let storageWritable = true;
let pendingSave = false;
let saveTimer = null;

function normalizePhone(str) {
  return str.replace(/\D/g, "");
}

function noteMatchesSearch(note, query) {
  const content = note.content;
  const lowerQuery = query.toLowerCase();

  if (content.toLowerCase().includes(lowerQuery)) return true;

  const queryDigits = normalizePhone(query);
  if (queryDigits.length === 0) return false;

  const minDigits = /^\d[\d\s\-+]*$/.test(query) ? 3 : 4;
  if (queryDigits.length >= minDigits) {
    return normalizePhone(content).includes(queryDigits);
  }

  return false;
}

function getFilteredNotes() {
  const query = searchInputEl.value.trim();
  if (!query) return notes;
  return notes.filter((n) => noteMatchesSearch(n, query));
}

function formatDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "날짜 없음";
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function getPreview(content) {
  const line = content.trim().split("\n")[0];
  return line || "빈 메모";
}

function getActiveNote() {
  return notes.find((n) => n.id === activeNoteId) ?? null;
}

function sortNotes() {
  notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function persist() {
  if (!storageWritable) {
    showSaveStatus(
      "error",
      "저장소를 사용할 수 없습니다. 내보내기로 메모를 백업하세요."
    );
    return false;
  }

  const ok = saveNotes(notes);
  if (ok) {
    showSaveStatus("saved");
  } else {
    showSaveStatus(
      "error",
      "저장하지 못했습니다. 내보내기로 메모를 백업하세요."
    );
  }
  return ok;
}

let saveStatusTimer = null;

function showSaveStatus(state, message = "") {
  clearTimeout(saveStatusTimer);
  saveStatusEl.classList.remove("saving", "saved", "error", "warning");

  if (state === "saving") {
    saveStatusEl.textContent = "저장 중...";
    saveStatusEl.classList.add("saving");
  } else if (state === "saved") {
    saveStatusEl.textContent = "저장됨";
    saveStatusEl.classList.add("saved");
    saveStatusTimer = setTimeout(() => {
      saveStatusEl.classList.remove("saved");
    }, 2000);
  } else {
    saveStatusEl.textContent = message;
    saveStatusEl.classList.add(state);
  }
}

function renderNoteList() {
  noteListEl.innerHTML = "";
  const filtered = getFilteredNotes();

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "note-list-empty";
    empty.textContent = "검색 결과 없음";
    noteListEl.appendChild(empty);
    return;
  }

  filtered.forEach((note) => {
    const li = document.createElement("li");
    li.className = "note-item" + (note.id === activeNoteId ? " active" : "");
    li.dataset.id = note.id;
    li.tabIndex = 0;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(note.id === activeNoteId));

    const dateSpan = document.createElement("div");
    dateSpan.textContent = formatDate(note.updatedAt);

    const previewSpan = document.createElement("div");
    previewSpan.className = "note-item-preview";
    previewSpan.textContent = getPreview(note.content);

    li.appendChild(dateSpan);
    li.appendChild(previewSpan);
    li.addEventListener("click", () => selectNote(note.id));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectNote(note.id);
      }
    });
    li.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, note.id);
    });
    noteListEl.appendChild(li);
  });
}

function updateEditorUI() {
  const note = getActiveNote();
  if (!note) {
    editorEl.value = "";
    noteDateEl.textContent = "";
    deleteNoteBtn.disabled = true;
    return;
  }

  editorEl.value = note.content;
  noteDateEl.textContent = `작성: ${formatDate(note.createdAt)} · 수정: ${formatDate(note.updatedAt)}`;
  deleteNoteBtn.disabled = notes.length <= 1;
}

function selectNote(id) {
  commitPendingSave();
  activeNoteId = id;
  renderNoteList();
  updateEditorUI();
  editorEl.focus();
}

function createNote() {
  commitPendingSave();
  const note = createNoteObject();
  notes.unshift(note);
  activeNoteId = note.id;
  searchInputEl.value = "";
  persist();
  renderNoteList();
  updateEditorUI();
  editorEl.focus();
}

function deleteNote(id) {
  commitPendingSave();
  if (notes.length <= 1) return;
  if (!confirm("이 메모를 삭제할까요?")) return;

  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return;

  const previousNotes = notes.slice();
  const previousActiveNoteId = activeNoteId;
  notes.splice(index, 1);
  sortNotes();

  if (activeNoteId === id) {
    activeNoteId = notes[0].id;
  }

  if (!persist()) {
    notes = previousNotes;
    activeNoteId = previousActiveNoteId;
  }
  syncActiveNoteWithFilter();
  renderNoteList();
  updateEditorUI();
}

function showContextMenu(x, y, noteId) {
  contextMenuTargetId = noteId;
  contextDeleteBtn.disabled = notes.length <= 1;

  contextMenuEl.classList.remove("hidden");
  contextMenuEl.style.left = `${x}px`;
  contextMenuEl.style.top = `${y}px`;

  const rect = contextMenuEl.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    contextMenuEl.style.left = `${x - rect.width}px`;
  }
  if (rect.bottom > window.innerHeight) {
    contextMenuEl.style.top = `${y - rect.height}px`;
  }
}

function hideContextMenu() {
  contextMenuEl.classList.add("hidden");
  contextMenuTargetId = null;
}

function handleInput() {
  const note = getActiveNote();
  if (!note) return;

  showSaveStatus("saving");
  note.content = editorEl.value;
  note.updatedAt = new Date().toISOString();
  pendingSave = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(commitPendingSave, 400);
}

function commitPendingSave() {
  if (!pendingSave) return true;

  clearTimeout(saveTimer);
  pendingSave = false;
  sortNotes();
  const ok = persist();
  renderNoteList();

  const note = getActiveNote();
  if (note) {
    noteDateEl.textContent = `작성: ${formatDate(
      note.createdAt
    )} · 수정: ${formatDate(note.updatedAt)}`;
  }

  return ok;
}

function syncActiveNoteWithFilter() {
  const filtered = getFilteredNotes();
  if (!filtered.some((note) => note.id === activeNoteId)) {
    activeNoteId = filtered[0]?.id ?? null;
  }
}

function handleSearchInput() {
  commitPendingSave();
  syncActiveNoteWithFilter();
  renderNoteList();
  updateEditorUI();
}

function exportNotes() {
  commitPendingSave();

  const payload = createExportPayload(notes);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `전화메모-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importNotes(file) {
  if (!file) return;

  try {
    const result = parseImportPayload(await file.text());
    if (!result.ok) {
      showSaveStatus("error", result.message);
      return;
    }

    if (!confirm(`메모 ${result.notes.length}개로 현재 내용을 교체할까요?`)) {
      return;
    }

    if (!saveNotes(result.notes)) {
      showSaveStatus("error", "가져온 메모를 저장하지 못했습니다.");
      return;
    }

    notes = result.notes;
    storageWritable = true;
    sortNotes();
    activeNoteId = notes[0].id;
    searchInputEl.value = "";
    renderNoteList();
    updateEditorUI();
    showSaveStatus("saved");
  } catch (e) {
    console.warn("메모 가져오기 실패:", e);
    showSaveStatus("error", "백업 파일을 읽지 못했습니다.");
  } finally {
    importFileInput.value = "";
  }
}

function initializeNotes() {
  const result = loadNotes();

  if (result.status === "ok" && result.notes.length > 0) {
    notes = result.notes;
    return null;
  }

  if (result.status === "empty" || result.status === "ok") {
    notes = [createNoteObject()];
    if (!saveNotes(notes)) {
      storageWritable = false;
      return {
        state: "error",
        message: "초기 메모를 저장하지 못했습니다. 내보내기를 사용하세요.",
      };
    }
    return null;
  }

  if (result.status === "unavailable") {
    notes = [createNoteObject()];
    storageWritable = false;
    return { state: "error", message: result.message };
  }

  const recoveryKey = backupCorruptData(result.raw);
  notes = result.notes.length > 0 ? result.notes : [createNoteObject()];

  if (!recoveryKey) {
    storageWritable = false;
    return {
      state: "error",
      message:
        "손상된 원본을 백업하지 못해 자동 저장을 중지했습니다. 내보내기를 사용하세요.",
    };
  }

  if (!saveNotes(notes)) {
    storageWritable = false;
    return {
      state: "error",
      message: "복구한 메모를 저장하지 못했습니다. 내보내기를 사용하세요.",
    };
  }

  return {
    state: "warning",
    message: `${result.message} 손상된 원본은 복구용으로 보관했습니다.`,
  };
}

function init() {
  const initializationMessage = initializeNotes();

  if (notes.length === 0) notes.push(createNoteObject());

  sortNotes();
  activeNoteId = notes[0].id;

  renderNoteList();
  updateEditorUI();
  if (initializationMessage) {
    showSaveStatus(
      initializationMessage.state,
      initializationMessage.message
    );
  }

  editorEl.addEventListener("input", handleInput);
  searchInputEl.addEventListener("input", handleSearchInput);
  newNoteBtn.addEventListener("click", createNote);
  deleteNoteBtn.addEventListener("click", () => deleteNote(activeNoteId));
  exportBtn.addEventListener("click", exportNotes);
  importBtn.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", () =>
    importNotes(importFileInput.files[0])
  );

  contextDeleteBtn.addEventListener("click", () => {
    if (contextMenuTargetId) {
      deleteNote(contextMenuTargetId);
    }
    hideContextMenu();
  });

  contextMenuEl.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", hideContextMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    if (!contextMenuEl.classList.contains("hidden")) {
      hideContextMenu();
    } else if (searchInputEl.value) {
      searchInputEl.value = "";
      handleSearchInput();
    }
  });
  window.addEventListener("beforeunload", commitPendingSave);
}

document.addEventListener("DOMContentLoaded", init);
