const STORAGE_KEY = "callNotes";
const STORAGE_VERSION = 1;

function loadNotes() {
  let raw;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn("메모 저장소 접근 실패:", e);
    return {
      status: "unavailable",
      notes: [],
      raw: null,
      message: "브라우저 저장소에 접근할 수 없습니다.",
    };
  }

  if (!raw) {
    return { status: "empty", notes: [], raw: null, message: "" };
  }

  try {
    const parsed = JSON.parse(raw);
    const validation = validateNotes(parsed);

    if (validation.valid) {
      return { status: "ok", notes: validation.notes, raw, message: "" };
    }

    return {
      status: "corrupt",
      notes: validation.notes,
      raw,
      message: validation.message,
    };
  } catch (e) {
    console.warn("메모 불러오기 실패:", e);
    return {
      status: "corrupt",
      notes: [],
      raw,
      message: "저장된 메모 JSON을 읽을 수 없습니다.",
    };
  }
}

function saveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch (e) {
    console.warn("메모 저장 실패:", e);
    return false;
  }
}

function validateNotes(value) {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      notes: [],
      message: "메모 데이터가 배열 형식이 아닙니다.",
    };
  }

  const notes = [];
  const ids = new Set();
  let invalidCount = 0;

  value.forEach((note) => {
    const valid =
      note &&
      typeof note === "object" &&
      typeof note.id === "string" &&
      note.id.length > 0 &&
      !ids.has(note.id) &&
      typeof note.content === "string" &&
      isValidDate(note.createdAt) &&
      isValidDate(note.updatedAt);

    if (!valid) {
      invalidCount += 1;
      return;
    }

    ids.add(note.id);
    notes.push({
      id: note.id,
      createdAt: new Date(note.createdAt).toISOString(),
      updatedAt: new Date(note.updatedAt).toISOString(),
      content: note.content,
    });
  });

  return {
    valid: invalidCount === 0,
    notes,
    message: invalidCount
      ? `형식이 잘못된 메모 ${invalidCount}개를 제외했습니다.`
      : "",
  };
}

function isValidDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function backupCorruptData(raw) {
  if (typeof raw !== "string") return null;

  const key = `${STORAGE_KEY}_recovery_${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}`;

  try {
    localStorage.setItem(key, raw);
    return key;
  } catch (e) {
    console.warn("손상 데이터 백업 실패:", e);
    return null;
  }
}

function createExportPayload(notes) {
  return {
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    notes,
  };
}

function parseImportPayload(raw) {
  try {
    const parsed = JSON.parse(raw);
    const candidate = Array.isArray(parsed) ? parsed : parsed?.notes;
    const validation = validateNotes(candidate);

    if (!validation.valid || validation.notes.length === 0) {
      return {
        ok: false,
        notes: [],
        message:
          validation.message || "가져올 수 있는 메모가 없습니다.",
      };
    }

    return { ok: true, notes: validation.notes, message: "" };
  } catch (e) {
    return {
      ok: false,
      notes: [],
      message: "올바른 JSON 백업 파일이 아닙니다.",
    };
  }
}

function createNoteObject() {
  const now = new Date().toISOString();
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: now,
    updatedAt: now,
    content: "",
  };
}
