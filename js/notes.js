// 현재 메모 목록을 브라우저 저장소에 기록하고 저장 상태를 화면에 알립니다.
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

// 저장 대기 중인 변경을 먼저 확정한 뒤 지정한 메모를 선택하고 편집기로 이동합니다.
function selectNote(id) {
  commitPendingSave();
  activeNoteId = id;
  renderNoteList();
  updateEditorUI();
  closeMobileSidebar(false);
  editorEl.focus();
}

// 새 메모를 생성해 선택하고, 검색 상태를 초기화한 뒤 즉시 저장합니다.
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

// 확인 후 메모를 삭제하며, 저장 실패 시 삭제 전 상태로 되돌립니다.
function deleteNote(id) {
  commitPendingSave();
  if (notes.length <= 1) return;
  if (!confirm("이 메모를 삭제할까요?")) return;

  const index = notes.findIndex((note) => note.id === id);
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

// 편집 내용을 메모에 반영하고, 마지막 입력 400ms 후 저장되도록 디바운스합니다.
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

// 대기 중인 편집 내용을 실제로 저장하고 목록 순서와 수정 날짜를 갱신합니다.
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
