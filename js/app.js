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

let contextMenuTargetId = null;

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
  const ok = saveNotes(notes);
  if (ok) {
    showSaveStatus("saved");
  }
  return ok;
}

let saveStatusTimer = null;

function showSaveStatus(state) {
  saveStatusEl.classList.remove("saving", "saved");
  if (state === "saving") {
    saveStatusEl.textContent = "저장 중...";
    saveStatusEl.classList.add("saving");
  } else {
    saveStatusEl.textContent = "저장됨";
    saveStatusEl.classList.add("saved");
    clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(() => {
      saveStatusEl.classList.remove("saved");
    }, 2000);
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

    const dateSpan = document.createElement("div");
    dateSpan.textContent = formatDate(note.updatedAt);

    const previewSpan = document.createElement("div");
    previewSpan.className = "note-item-preview";
    previewSpan.textContent = getPreview(note.content);

    li.appendChild(dateSpan);
    li.appendChild(previewSpan);
    li.addEventListener("click", () => selectNote(note.id));
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
  activeNoteId = id;
  renderNoteList();
  updateEditorUI();
  editorEl.focus();
}

function createNote() {
  const note = createNoteObject();
  notes.unshift(note);
  activeNoteId = note.id;
  persist();
  renderNoteList();
  updateEditorUI();
  editorEl.focus();
}

function deleteNote(id) {
  if (notes.length <= 1) return;
  if (!confirm("이 메모를 삭제할까요?")) return;

  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return;

  notes.splice(index, 1);
  sortNotes();

  if (activeNoteId === id) {
    activeNoteId = notes[0].id;
  }

  persist();
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
  persist();
  renderNoteList();
}

function init() {
  notes = loadNotes();

  if (notes.length === 0) {
    const note = createNoteObject();
    notes.push(note);
    saveNotes(notes);
  }

  sortNotes();
  activeNoteId = notes[0].id;

  renderNoteList();
  updateEditorUI();

  editorEl.addEventListener("input", handleInput);
  searchInputEl.addEventListener("input", renderNoteList);
  newNoteBtn.addEventListener("click", createNote);
  deleteNoteBtn.addEventListener("click", () => deleteNote(activeNoteId));

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
      renderNoteList();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
