// 앱 상태와 첫 화면을 준비하고 모든 사용자 동작에 대한 이벤트를 연결합니다.
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

  contextMenuEl.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", hideContextMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (!contextMenuEl.classList.contains("hidden")) {
      hideContextMenu();
    } else if (searchInputEl.value) {
      searchInputEl.value = "";
      handleSearchInput();
    }
  });
  window.addEventListener("beforeunload", commitPendingSave);
}

// HTML 문서가 준비된 뒤에만 요소를 조회하고 앱을 초기화합니다.
document.addEventListener("DOMContentLoaded", init);
