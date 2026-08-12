// ISO 날짜 문자열을 목록과 편집기에 표시할 짧은 현지 시간 형식으로 바꿉니다.
function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "날짜 없음";
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

// 메모의 첫 줄을 목록 미리보기로 사용하고, 내용이 없으면 기본 문구를 표시합니다.
function getPreview(content) {
  const line = content.trim().split("\n")[0];
  return line || "빈 메모";
}

// 현재 선택된 ID에 해당하는 메모를 찾고, 없으면 null을 반환합니다.
function getActiveNote() {
  return notes.find((note) => note.id === activeNoteId) ?? null;
}

// 최근 수정된 메모가 목록 위에 오도록 메모 배열을 정렬합니다.
function sortNotes() {
  notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

// 저장 완료 문구를 일정 시간 뒤 숨기기 위한 타이머입니다.
let saveStatusTimer = null;

// 저장 중, 저장 완료, 경고, 오류 상태에 맞게 상태 문구와 스타일을 갱신합니다.
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

// 검색 결과를 기준으로 메모 목록 DOM을 새로 만들고 선택·키보드·우클릭 이벤트를 연결합니다.
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
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNote(note.id);
      }
    });
    li.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY, note.id);
    });
    noteListEl.appendChild(li);
  });
}

// 현재 선택된 메모의 내용과 날짜를 편집기에 표시하고 삭제 가능 여부를 갱신합니다.
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

// 우클릭한 위치에 삭제 메뉴를 표시하되 화면 바깥으로 나가지 않도록 위치를 보정합니다.
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

// 우클릭 메뉴를 닫고 대상 메모 정보를 초기화합니다.
function hideContextMenu() {
  contextMenuEl.classList.add("hidden");
  contextMenuTargetId = null;
}
