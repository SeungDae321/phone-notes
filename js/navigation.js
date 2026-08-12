const MOBILE_NAVIGATION_QUERY = "(max-width: 600px)";

let mobileSidebarOpen = false;

function isMobileNavigation() {
  if (typeof window.matchMedia === "function") {
    return window.matchMedia(MOBILE_NAVIGATION_QUERY).matches;
  }
  return window.innerWidth <= 600;
}

function syncMobileSidebarAccessibility() {
  const hidden = isMobileNavigation() && !mobileSidebarOpen;
  sidebarToggleBtn.setAttribute("aria-expanded", String(mobileSidebarOpen));
  sidebarToggleBtn.setAttribute(
    "aria-label",
    mobileSidebarOpen ? "메모 목록 닫기" : "메모 목록 열기"
  );
  sidebarEl.setAttribute("aria-hidden", String(hidden));
  sidebarBackdropEl.setAttribute(
    "aria-hidden",
    String(!mobileSidebarOpen)
  );
}

function setMobileSidebarOpen(open, returnFocus = true) {
  mobileSidebarOpen = isMobileNavigation() && Boolean(open);
  document.body.classList[
    mobileSidebarOpen ? "add" : "remove"
  ]("sidebar-open");
  syncMobileSidebarAccessibility();

  if (mobileSidebarOpen) {
    searchInputEl.focus();
  } else if (returnFocus && isMobileNavigation()) {
    sidebarToggleBtn.focus();
  }
}

function toggleMobileSidebar() {
  setMobileSidebarOpen(!mobileSidebarOpen);
}

function closeMobileSidebar(returnFocus = true) {
  setMobileSidebarOpen(false, returnFocus);
}

function isMobileSidebarOpen() {
  return mobileSidebarOpen;
}

function initializeMobileNavigation() {
  mobileSidebarOpen = false;
  document.body.classList.remove("sidebar-open");
  syncMobileSidebarAccessibility();
}

function handleNavigationViewportChange() {
  if (!isMobileNavigation()) {
    mobileSidebarOpen = false;
    document.body.classList.remove("sidebar-open");
  }
  syncMobileSidebarAccessibility();
}
