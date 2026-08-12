// 전체 메모를 JSON 백업 파일로 만들어 사용자의 기기에 다운로드합니다.
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

// 선택한 JSON 백업을 검증하고, 사용자 확인 후 현재 메모 전체를 가져온 내용으로 교체합니다.
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
  } catch (error) {
    console.warn("메모 가져오기 실패:", error);
    showSaveStatus("error", "백업 파일을 읽지 못했습니다.");
  } finally {
    importFileInput.value = "";
  }
}

// 저장 데이터를 불러오고 빈 저장소, 접근 불가, 손상 데이터 등의 초기 상태를 복구합니다.
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
