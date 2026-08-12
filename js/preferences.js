const THEME_STORAGE_KEY = "callNotesTheme";
const FONT_SIZE_STORAGE_KEY = "callNotesFontSize";
const DEFAULT_EDITOR_FONT_SIZE = 16;
const MIN_EDITOR_FONT_SIZE = 14;
const MAX_EDITOR_FONT_SIZE = 24;
const EDITOR_FONT_SIZE_STEP = 2;

let currentTheme = "light";
let currentEditorFontSize = DEFAULT_EDITOR_FONT_SIZE;

// 저장소가 차단된 환경에서도 화면 설정 자체는 계속 사용할 수 있게 합니다.
function readPreference(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn("화면 설정을 불러오지 못했습니다:", error);
    return null;
  }
}

function writePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn("화면 설정을 저장하지 못했습니다:", error);
  }
}

function getInitialTheme() {
  const savedTheme = readPreference(THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function normalizeEditorFontSize(value) {
  if (value === null || value === "") return DEFAULT_EDITOR_FONT_SIZE;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_EDITOR_FONT_SIZE;

  const clamped = Math.min(
    MAX_EDITOR_FONT_SIZE,
    Math.max(MIN_EDITOR_FONT_SIZE, parsed)
  );
  return (
    MIN_EDITOR_FONT_SIZE +
    Math.round((clamped - MIN_EDITOR_FONT_SIZE) / EDITOR_FONT_SIZE_STEP) *
      EDITOR_FONT_SIZE_STEP
  );
}

function applyTheme(theme, persist = false) {
  currentTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = currentTheme;
  document.documentElement.style.colorScheme = currentTheme;

  const darkModeEnabled = currentTheme === "dark";
  themeToggleBtn.textContent = darkModeEnabled ? "라이트 모드" : "다크 모드";
  themeToggleBtn.setAttribute("aria-pressed", String(darkModeEnabled));
  themeToggleBtn.setAttribute(
    "aria-label",
    darkModeEnabled ? "라이트 모드로 전환" : "다크 모드로 전환"
  );

  if (persist) writePreference(THEME_STORAGE_KEY, currentTheme);
}

function toggleTheme() {
  applyTheme(currentTheme === "dark" ? "light" : "dark", true);
}

function applyEditorFontSize(value, persist = false) {
  currentEditorFontSize = normalizeEditorFontSize(value);
  document.documentElement.style.setProperty(
    "--editor-font-size",
    `${currentEditorFontSize}px`
  );
  fontSizeValueEl.textContent = `${currentEditorFontSize}px`;
  fontDecreaseBtn.disabled =
    currentEditorFontSize <= MIN_EDITOR_FONT_SIZE;
  fontIncreaseBtn.disabled =
    currentEditorFontSize >= MAX_EDITOR_FONT_SIZE;

  if (persist) {
    writePreference(FONT_SIZE_STORAGE_KEY, String(currentEditorFontSize));
  }
}

function decreaseEditorFontSize() {
  applyEditorFontSize(currentEditorFontSize - EDITOR_FONT_SIZE_STEP, true);
}

function increaseEditorFontSize() {
  applyEditorFontSize(currentEditorFontSize + EDITOR_FONT_SIZE_STEP, true);
}

function initializePreferences() {
  applyTheme(getInitialTheme());
  applyEditorFontSize(readPreference(FONT_SIZE_STORAGE_KEY));
}
