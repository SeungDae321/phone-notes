// 전화번호를 비교하기 쉽도록 숫자가 아닌 문자를 모두 제거합니다.
function normalizePhone(str) {
  return str.replace(/\D/g, "");
}

// 메모 내용이 일반 문자열 또는 전화번호 형태의 검색어와 일치하는지 확인합니다.
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

// 현재 검색창 값에 맞는 메모만 반환하며, 검색어가 없으면 전체를 반환합니다.
function getFilteredNotes() {
  const query = searchInputEl.value.trim();
  if (!query) return notes;
  return notes.filter((note) => noteMatchesSearch(note, query));
}

// 현재 메모가 검색 결과에서 사라졌다면 첫 번째 검색 결과를 대신 선택합니다.
function syncActiveNoteWithFilter() {
  const filtered = getFilteredNotes();
  if (!filtered.some((note) => note.id === activeNoteId)) {
    activeNoteId = filtered[0]?.id ?? null;
  }
}

// 검색어가 바뀌면 편집 내용을 저장한 뒤 선택 상태, 목록, 편집기를 동기화합니다.
function handleSearchInput() {
  commitPendingSave();
  syncActiveNoteWithFilter();
  renderNoteList();
  updateEditorUI();
}
