// 앱이 실행되는 동안 유지되는 메모 목록과 현재 선택된 메모 ID입니다.
let notes = [];
let activeNoteId = null;

// HTML에서 앱의 화면 요소를 찾아 이후 렌더링과 이벤트 처리에 사용합니다.
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

// 우클릭 메뉴, 저장 가능 여부, 지연 저장 상태를 관리합니다.
let contextMenuTargetId = null;
let storageWritable = true;
let pendingSave = false;
let saveTimer = null;
