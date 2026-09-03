const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function countWords(text) {
  const trimmed = (text || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const DEFAULT_SETTINGS = {
  theme: "light",
  font: "verdana",
  textSize: "medium",
  language: "en",
  quickCopyCollapsed: false,
  savedPagesCollapsed: false,
  highlightPromptEnabled: true,
  lightAccentLine: "#2563eb",
  lightAccentButton: "#2563eb",
  darkAccentLine: "#58a6ff",
  darkAccentButton: "#58a6ff"
};

// "Default" (a neutral gray, matching --text-dim) leads each row as an
// escape hatch back to an uncolored look; the four saturated options after
// it are each chosen for solid contrast against that theme's background —
// darker/saturated for Light, lighter/pastel for Dark — so every
// combination stays readable regardless of which one someone picks for
// "borders & boxes" vs. "buttons".
const ACCENT_SWATCHES = {
  light: [
    { color: "#565c68", nameKey: "settings.swatchDefault" },
    { color: "#2563eb", nameKey: "settings.swatchBlue" },
    { color: "#7c3aed", nameKey: "settings.swatchPurple" },
    { color: "#047857", nameKey: "settings.swatchGreen" },
    { color: "#be185d", nameKey: "settings.swatchRose" }
  ],
  dark: [
    { color: "#9198a1", nameKey: "settings.swatchDefault" },
    { color: "#58a6ff", nameKey: "settings.swatchBlue" },
    { color: "#bc8cff", nameKey: "settings.swatchPurple" },
    { color: "#56d364", nameKey: "settings.swatchGreen" },
    { color: "#f778ba", nameKey: "settings.swatchPink" }
  ]
};

// Keeping this port open (for as long as the side panel document is open)
// is how background.js knows whether to answer "yes" to a content script
// asking whether it's OK to show the "Save to sidebar" prompt — that
// prompt should never appear while Sidebit itself is closed.
chrome.runtime.connect({ name: "sidepanel" });

// Three self-contained, universally pre-installed fonts chosen for on-screen
// readability — no bundled font files, no CSP/network concerns.
const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  verdana: "Verdana, Geneva, sans-serif"
};
// Shifted up ~2px across the board (on the 13px body-text baseline) from
// the original 0.92/1/1.15 — Small was uncomfortably tight, so the whole
// range moved up a notch and Medium is now the comfortable everyday size.
const TEXT_SCALES = { small: 1.07, medium: 1.15, large: 1.3 };

const MAX_TRASH = 50;

// Hosted separately (not bundled) so the "what changed" copy can be edited
// any time without shipping a new extension version just to fix a typo.
const WHATS_NEW_URL = "https://claude.ai/code/artifact/562fea3a-25c0-4817-aca3-781656e60ca6";

let state = { tabs: [], activeTabId: null, snippets: [], settings: { ...DEFAULT_SETTINGS }, trash: [], hasUnseenUpdate: false };
let editingSnippets = false;
let notesSaveTimer = null;
let dragSrcId = null;
let dragTabSrcId = null;

const el = {
  tabsRow: document.getElementById("tabsRow"),
  newTabBtn: document.getElementById("newTabBtn"),
  undoTabBtn: document.getElementById("undoTabBtn"),
  undoSnippetBtn: document.getElementById("undoSnippetBtn"),
  undoHighlightBtn: document.getElementById("undoHighlightBtn"),
  undoScreenshotBtn: document.getElementById("undoScreenshotBtn"),
  snippetsBody: document.getElementById("snippetsBody"),
  snippetsList: document.getElementById("snippetsList"),
  toggleCollapseSnippets: document.getElementById("toggleCollapseSnippets"),
  toggleEditSnippets: document.getElementById("toggleEditSnippets"),
  addSnippetRow: document.getElementById("addSnippetRow"),
  newSnippetLabel: document.getElementById("newSnippetLabel"),
  newSnippetValue: document.getElementById("newSnippetValue"),
  addSnippetBtn: document.getElementById("addSnippetBtn"),
  highlightsBody: document.getElementById("highlightsBody"),
  toggleCollapseHighlights: document.getElementById("toggleCollapseHighlights"),
  highlightsList: document.getElementById("highlightsList"),
  highlightsCounter: document.getElementById("highlightsCounter"),
  highlightPromptToggle: document.getElementById("highlightPromptToggle"),
  clearHighlightsBtn: document.getElementById("clearHighlightsBtn"),
  notesArea: document.getElementById("notesArea"),
  notesCounter: document.getElementById("notesCounter"),
  saveIndicator: document.getElementById("saveIndicator"),
  clearNotesBtn: document.getElementById("clearNotesBtn"),
  updatesBtn: document.getElementById("updatesBtn"),
  updatesBadge: document.getElementById("updatesBadge"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  languageChoices: document.getElementById("languageChoices"),
  themeChoices: document.getElementById("themeChoices"),
  lightLineSwatches: document.getElementById("lightLineSwatches"),
  lightButtonSwatches: document.getElementById("lightButtonSwatches"),
  darkLineSwatches: document.getElementById("darkLineSwatches"),
  darkButtonSwatches: document.getElementById("darkButtonSwatches"),
  sizeChoices: document.getElementById("sizeChoices"),
  fontChoices: document.getElementById("fontChoices"),
  exportDataBtn: document.getElementById("exportDataBtn"),
  importDataInput: document.getElementById("importDataInput"),
  backupStatus: document.getElementById("backupStatus"),
  captureBtn: document.getElementById("captureBtn"),
  screenshotsStrip: document.getElementById("screenshotsStrip"),
  screenshotsNormalActions: document.getElementById("screenshotsNormalActions"),
  screenshotsSelectActions: document.getElementById("screenshotsSelectActions"),
  selectScreenshotsBtn: document.getElementById("selectScreenshotsBtn"),
  selectAllScreenshotsBtn: document.getElementById("selectAllScreenshotsBtn"),
  screenshotSelectionCount: document.getElementById("screenshotSelectionCount"),
  downloadSelectedScreenshotsBtn: document.getElementById("downloadSelectedScreenshotsBtn"),
  deleteSelectedScreenshotsBtn: document.getElementById("deleteSelectedScreenshotsBtn"),
  cancelSelectScreenshotsBtn: document.getElementById("cancelSelectScreenshotsBtn"),
  screenshotModal: document.getElementById("screenshotModal"),
  closeScreenshotBtn: document.getElementById("closeScreenshotBtn"),
  lightboxImg: document.getElementById("lightboxImg"),
  lightboxDownloadBtn: document.getElementById("lightboxDownloadBtn"),
  lightboxCopyBtn: document.getElementById("lightboxCopyBtn"),
  lightboxDeleteBtn: document.getElementById("lightboxDeleteBtn"),
  lightboxStatus: document.getElementById("lightboxStatus"),
  searchBar: document.getElementById("searchBar"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  trashList: document.getElementById("trashList"),
  emptyTrashBtn: document.getElementById("emptyTrashBtn"),
  reminderModal: document.getElementById("reminderModal"),
  reminderModalHeading: document.getElementById("reminderModalHeading"),
  closeReminderBtn: document.getElementById("closeReminderBtn"),
  reminderDateInput: document.getElementById("reminderDateInput"),
  reminderTimeInput: document.getElementById("reminderTimeInput"),
  reminderAmPmChoices: document.getElementById("reminderAmPmChoices"),
  reminderStatus: document.getElementById("reminderStatus"),
  clearReminderBtn: document.getElementById("clearReminderBtn"),
  saveReminderBtn: document.getElementById("saveReminderBtn")
};

let currentLightboxShot = null;
let screenshotSelectionMode = false;
let selectedScreenshotIds = new Set();
let selectionRenderedForTabId = null; // switching note tabs exits selection mode

function activeTab() {
  return state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0];
}

async function persist(partial) {
  Object.assign(state, partial);
  await chrome.storage.local.set(partial);
}

async function loadState() {
  const data = await chrome.storage.local.get(["tabs", "activeTabId", "snippets", "settings", "trash", "hasUnseenUpdate"]);
  state.tabs = data.tabs || [];
  state.activeTabId = data.activeTabId || (state.tabs[0] && state.tabs[0].id) || null;
  state.snippets = data.snippets || [];
  state.settings = Object.assign({ ...DEFAULT_SETTINGS }, data.settings || {});
  state.trash = data.trash || [];
  state.hasUnseenUpdate = !!data.hasUnseenUpdate;
  applyLanguage(state.settings.language);
  renderAll();
  applyTheme(state.settings.theme);
  applyFont(state.settings.font);
  applyTextScale(state.settings.textSize);
}

// Applies the active language everywhere: static markup via applyI18n(),
// the accent-swatch titles built once at startup (buildSwatchRow doesn't
// re-run on every render, so they need a separate refresh here), and
// everything else by re-rendering, since dynamically-created elements call
// t() directly at creation time anyway.
function applyLanguage(lang) {
  document.documentElement.lang = lang === "es" ? "es" : "en";
  applyI18n();
  document.querySelectorAll(".swatch-btn[data-name-key]").forEach(btn => {
    const label = t(btn.dataset.nameKey);
    btn.title = label;
    btn.setAttribute("aria-label", label);
  });
}

// Re-render if data changes elsewhere (a highlight saved from a page,
// or storage synced from another window).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.tabs) state.tabs = changes.tabs.newValue || [];
  if (changes.activeTabId) state.activeTabId = changes.activeTabId.newValue;
  if (changes.snippets) state.snippets = changes.snippets.newValue || [];
  if (changes.trash) state.trash = changes.trash.newValue || [];
  if (changes.hasUnseenUpdate) state.hasUnseenUpdate = !!changes.hasUnseenUpdate.newValue;
  if (changes.settings) {
    state.settings = Object.assign({ ...DEFAULT_SETTINGS }, changes.settings.newValue || {});
    applyLanguage(state.settings.language);
    applyTheme(state.settings.theme);
    applyFont(state.settings.font);
    applyTextScale(state.settings.textSize);
    renderSettingsUI();
  }
  renderAll();
});

function renderAll() {
  renderTabs();
  renderSnippets();
  renderHighlights();
  renderNotes();
  renderScreenshots();
  renderSettingsUI();
  renderTrash();
  renderUpdatesBadge();
}

function renderUpdatesBadge() {
  el.updatesBadge.classList.toggle("hidden", !state.hasUnseenUpdate);
}

el.updatesBtn.addEventListener("click", async () => {
  window.open(WHATS_NEW_URL, "_blank", "noopener");
  if (state.hasUnseenUpdate) {
    await persist({ hasUnseenUpdate: false });
    renderUpdatesBadge();
  }
});

/* ---------------- Trash (recently deleted) ---------------- */

async function trashItem(entry) {
  const trash = [{ id: uid(), deletedAt: Date.now(), ...entry }, ...state.trash].slice(0, MAX_TRASH);
  await persist({ trash });
}

function trashTypeLabel(type) {
  return {
    tab: t("trash.typeTab"),
    highlight: t("trash.typeHighlight"),
    snippet: t("trash.typeSnippet"),
    screenshot: t("trash.typeScreenshot"),
    note: t("trash.typeNotes")
  }[type] || type;
}

function relativeTime(ms) {
  const diff = Math.max(0, Date.now() - ms);
  const min = Math.round(diff / 60000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minAgo", { m: min });
  const hr = Math.round(min / 60);
  if (hr < 24) return t("time.hourAgo", { h: hr });
  return t("time.dayAgo", { d: Math.round(hr / 24) });
}

function renderTrash() {
  el.trashList.innerHTML = "";
  el.emptyTrashBtn.classList.toggle("hidden", state.trash.length === 0);

  if (state.trash.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state trash-empty";
    empty.textContent = t("trash.empty");
    el.trashList.appendChild(empty);
    return;
  }

  state.trash.forEach(entry => {
    const row = document.createElement("div");
    row.className = "trash-row";

    const tag = document.createElement("span");
    tag.className = "trash-tag";
    tag.textContent = trashTypeLabel(entry.type);

    const text = document.createElement("div");
    text.className = "trash-text";
    const title = document.createElement("div");
    title.className = "trash-title";
    title.textContent = trashEntryTitle(entry);
    const time = document.createElement("div");
    time.className = "trash-time";
    time.textContent = relativeTime(entry.deletedAt);
    text.appendChild(title);
    text.appendChild(time);

    const restoreBtn = document.createElement("button");
    restoreBtn.className = "small-btn";
    restoreBtn.textContent = t("trash.restore");
    restoreBtn.addEventListener("click", () => restoreTrashEntry(entry.id));

    row.appendChild(tag);
    row.appendChild(text);
    row.appendChild(restoreBtn);
    el.trashList.appendChild(row);
  });
}

// Trash is stored newest-first, so this naturally returns the most recent
// matching deletion — repeated undo clicks step further back each time.
function findLastTrash(type, filterFn) {
  return state.trash.find(e => e.type === type && (!filterFn || filterFn(e)));
}

function wireUndoButton(btn, type, filterFn) {
  const entry = findLastTrash(type, filterFn);
  btn.classList.toggle("hidden", !entry);
  if (entry) btn.title = t("common.undoRestore", { title: trashEntryTitle(entry) });
}

function trashEntryTitle(entry) {
  if (entry.type === "tab") return entry.tab.name;
  if (entry.type === "highlight") return entry.highlight.text.slice(0, 60);
  if (entry.type === "snippet") return entry.snippet.label;
  if (entry.type === "screenshot") return t("trash.screenshotTitle", { name: entry.tabName });
  if (entry.type === "note") return entry.notes.slice(0, 60);
  return "";
}

// Restores a highlight/screenshot into its original note tab, recreating
// that tab (by name) first if it was also deleted since.
function resolveOwningTab(tabs, entry) {
  let target = tabs.find(t => t.id === entry.tabId);
  if (target) return { tabs, tab: target };
  const fresh = { id: entry.tabId, name: entry.tabName || t("tabs.restoredName"), notes: "", highlights: [], screenshots: [], pinned: false, reminder: null };
  return { tabs: [...tabs, fresh], tab: fresh };
}

async function restoreTrashEntry(entryId) {
  const entry = state.trash.find(e => e.id === entryId);
  if (!entry) return;
  const remainingTrash = state.trash.filter(e => e.id !== entryId);

  if (entry.type === "tab") {
    const tabs = [...state.tabs];
    const idx = Math.min(Math.max(entry.index ?? tabs.length, 0), tabs.length);
    tabs.splice(idx, 0, entry.tab);
    await persist({ tabs, activeTabId: entry.tab.id, trash: remainingTrash });
  } else if (entry.type === "snippet") {
    const snippets = [...state.snippets];
    const idx = Math.min(Math.max(entry.index ?? snippets.length, 0), snippets.length);
    snippets.splice(idx, 0, entry.snippet);
    await persist({ snippets, trash: remainingTrash });
  } else if (entry.type === "highlight") {
    const { tabs, tab } = resolveOwningTab(state.tabs, entry);
    const updatedTabs = tabs.map(t => {
      if (t.id !== tab.id) return t;
      const highlights = [...(t.highlights || [])];
      const idx = Math.min(Math.max(entry.index ?? 0, 0), highlights.length);
      highlights.splice(idx, 0, entry.highlight);
      return { ...t, highlights };
    });
    await persist({ tabs: updatedTabs, activeTabId: tab.id, trash: remainingTrash });
  } else if (entry.type === "screenshot") {
    const { tabs, tab } = resolveOwningTab(state.tabs, entry);
    const updatedTabs = tabs.map(t => {
      if (t.id !== tab.id) return t;
      const screenshots = [...(t.screenshots || [])];
      const idx = Math.min(Math.max(entry.index ?? 0, 0), screenshots.length);
      screenshots.splice(idx, 0, entry.screenshot);
      return { ...t, screenshots };
    });
    await persist({ tabs: updatedTabs, activeTabId: tab.id, trash: remainingTrash });
  } else if (entry.type === "note") {
    const { tabs, tab } = resolveOwningTab(state.tabs, entry);
    // Notes is a single field, not a list — if something's been typed since
    // the clear, put the restored text back above it instead of overwriting.
    const updatedTabs = tabs.map(t => {
      if (t.id !== tab.id) return t;
      const current = t.notes || "";
      const notes = current ? `${entry.notes}\n\n${current}` : entry.notes;
      return { ...t, notes };
    });
    await persist({ tabs: updatedTabs, activeTabId: tab.id, trash: remainingTrash });
  }

  renderAll();
}

el.emptyTrashBtn.addEventListener("click", async () => {
  if (!state.trash.length) return;
  const ok = confirm(
    state.trash.length === 1
      ? t("trash.confirmEmptyOne")
      : t("trash.confirmEmptyMany", { count: state.trash.length })
  );
  if (!ok) return;
  await persist({ trash: [] });
  renderTrash();
});

el.undoTabBtn.addEventListener("click", async () => {
  const entry = findLastTrash("tab");
  if (entry) await restoreTrashEntry(entry.id);
});
el.undoSnippetBtn.addEventListener("click", async () => {
  const entry = findLastTrash("snippet", e => isSnippetVisible(e.snippet));
  if (entry) await restoreTrashEntry(entry.id);
});
el.undoHighlightBtn.addEventListener("click", async () => {
  const entry = findLastTrash("highlight", e => e.tabId === state.activeTabId);
  if (entry) await restoreTrashEntry(entry.id);
});
el.undoScreenshotBtn.addEventListener("click", async () => {
  const entry = findLastTrash("screenshot", e => e.tabId === state.activeTabId);
  if (entry) await restoreTrashEntry(entry.id);
});

/* ---------------- Settings: theme + background image ---------------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  applyAccentColors();
}

// Reads whichever theme is currently active and pushes that theme's chosen
// swatches onto :root as inline custom properties — inline styles win over
// the :root[data-theme] rules that hold the *default* swatch (first option
// in ACCENT_SWATCHES), so switching themes or picking a different swatch
// both funnel through here to stay in sync.
function applyAccentColors() {
  const isLight = document.documentElement.dataset.theme === "light";
  const line = isLight ? state.settings.lightAccentLine : state.settings.darkAccentLine;
  const button = isLight ? state.settings.lightAccentButton : state.settings.darkAccentButton;
  const fallback = ACCENT_SWATCHES[isLight ? "light" : "dark"][0].color;
  document.documentElement.style.setProperty("--accent-line", line || fallback);
  document.documentElement.style.setProperty("--accent-button", button || fallback);
}

function applyFont(fontKey) {
  const stack = FONT_STACKS[fontKey] || FONT_STACKS.system;
  document.documentElement.style.setProperty("--app-font", stack);
}

function applyTextScale(sizeKey) {
  const scale = TEXT_SCALES[sizeKey] ?? 1;
  document.documentElement.style.setProperty("--text-scale", scale);
}

function renderSettingsUI() {
  const language = state.settings.language || "en";
  [...el.languageChoices.children].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.languageChoice === language);
  });

  const theme = state.settings.theme || "light";
  [...el.themeChoices.children].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.themeChoice === theme);
  });

  const textSize = state.settings.textSize || "medium";
  [...el.sizeChoices.children].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.sizeChoice === textSize);
  });

  const font = state.settings.font || "system";
  [...el.fontChoices.children].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.fontChoice === font);
  });

  syncSwatchRow(el.lightLineSwatches, state.settings.lightAccentLine);
  syncSwatchRow(el.lightButtonSwatches, state.settings.lightAccentButton);
  syncSwatchRow(el.darkLineSwatches, state.settings.darkAccentLine);
  syncSwatchRow(el.darkButtonSwatches, state.settings.darkAccentButton);
}

function syncSwatchRow(container, selectedColor) {
  [...container.children].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.color === selectedColor);
  });
}

// Built once from ACCENT_SWATCHES rather than hand-written in the HTML, so
// the colors only need to be defined in one place.
function buildSwatchRow(container, themeKey, settingsKey) {
  ACCENT_SWATCHES[themeKey].forEach(({ color, nameKey }) => {
    const btn = document.createElement("button");
    btn.className = "swatch-btn";
    btn.type = "button";
    btn.dataset.color = color;
    btn.dataset.nameKey = nameKey;
    btn.title = t(nameKey);
    btn.setAttribute("aria-label", t(nameKey));
    btn.style.setProperty("--swatch-color", color);
    container.appendChild(btn);
  });

  container.addEventListener("click", async e => {
    const btn = e.target.closest(".swatch-btn");
    if (!btn) return;
    const settings = { ...state.settings, [settingsKey]: btn.dataset.color };
    await persist({ settings });
    applyAccentColors();
    renderSettingsUI();
  });
}

buildSwatchRow(el.lightLineSwatches, "light", "lightAccentLine");
buildSwatchRow(el.lightButtonSwatches, "light", "lightAccentButton");
buildSwatchRow(el.darkLineSwatches, "dark", "darkAccentLine");
buildSwatchRow(el.darkButtonSwatches, "dark", "darkAccentButton");

el.settingsBtn.addEventListener("click", () => el.settingsModal.classList.remove("hidden"));
el.closeSettingsBtn.addEventListener("click", () => el.settingsModal.classList.add("hidden"));
el.settingsModal.addEventListener("click", e => {
  if (e.target === el.settingsModal) el.settingsModal.classList.add("hidden");
});

el.languageChoices.addEventListener("click", async e => {
  const btn = e.target.closest(".choice-btn");
  if (!btn) return;
  const language = btn.dataset.languageChoice;
  const settings = { ...state.settings, language };
  await persist({ settings });
  applyLanguage(language);
  renderAll();
});

el.themeChoices.addEventListener("click", async e => {
  const btn = e.target.closest(".choice-btn");
  if (!btn) return;
  const theme = btn.dataset.themeChoice;
  const settings = { ...state.settings, theme };
  await persist({ settings });
  applyTheme(theme);
  renderSettingsUI();
});

el.sizeChoices.addEventListener("click", async e => {
  const btn = e.target.closest(".choice-btn");
  if (!btn) return;
  const textSize = btn.dataset.sizeChoice;
  const settings = { ...state.settings, textSize };
  await persist({ settings });
  applyTextScale(textSize);
  renderSettingsUI();
});

el.fontChoices.addEventListener("click", async e => {
  const btn = e.target.closest(".choice-btn");
  if (!btn) return;
  const font = btn.dataset.fontChoice;
  const settings = { ...state.settings, font };
  await persist({ settings });
  applyFont(font);
  renderSettingsUI();
});

el.exportDataBtn.addEventListener("click", () => {
  const backup = {
    sidebitBackup: 1,
    exportedAt: new Date().toISOString(),
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    snippets: state.snippets,
    settings: state.settings,
    trash: state.trash
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const dateStamp = backup.exportedAt.slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sidebit-backup-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  el.backupStatus.classList.remove("error");
  el.backupStatus.textContent = t("settings.backupDownloaded");
  setTimeout(() => { el.backupStatus.textContent = ""; }, 1800);
});

function isValidBackupShape(data) {
  return data
    && Array.isArray(data.tabs)
    && data.tabs.every(t => t && typeof t.id === "string" && typeof t.name === "string")
    && (data.snippets === undefined || Array.isArray(data.snippets));
}

el.importDataInput.addEventListener("change", async () => {
  const file = el.importDataInput.files && el.importDataInput.files[0];
  if (!file) return;
  el.backupStatus.classList.remove("error");
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!isValidBackupShape(data)) {
      throw new Error(t("settings.backupInvalidShape"));
    }
    const tabCount = data.tabs.length;
    const ok = confirm(
      tabCount === 1
        ? t("settings.confirmImportOne")
        : t("settings.confirmImportMany", { count: tabCount })
    );
    if (!ok) {
      el.backupStatus.textContent = "";
      return;
    }

    const untitledFallback = t("tabs.untitled");
    const tabs = data.tabs.map(t => ({
      id: t.id,
      name: t.name || untitledFallback,
      notes: typeof t.notes === "string" ? t.notes : "",
      highlights: Array.isArray(t.highlights) ? t.highlights : [],
      screenshots: Array.isArray(t.screenshots) ? t.screenshots : [],
      pinned: !!t.pinned
    }));
    const activeTabId = tabs.some(t => t.id === data.activeTabId) ? data.activeTabId : (tabs[0] && tabs[0].id) || null;
    const snippets = Array.isArray(data.snippets) ? data.snippets : [];
    const settings = Object.assign({ ...DEFAULT_SETTINGS }, data.settings && typeof data.settings === "object" ? data.settings : {});
    const trash = Array.isArray(data.trash) ? data.trash : [];

    await persist({ tabs, activeTabId, snippets, settings, trash });
    applyLanguage(settings.language);
    applyTheme(settings.theme);
    applyFont(settings.font);
    applyTextScale(settings.textSize);
    renderAll();

    el.backupStatus.textContent = t("settings.backupImported");
    setTimeout(() => { el.backupStatus.textContent = ""; }, 1800);
  } catch (err) {
    el.backupStatus.textContent = err && err.message ? err.message : t("settings.backupReadError");
    el.backupStatus.classList.add("error");
  } finally {
    el.importDataInput.value = "";
  }
});

// Reads an image file (from a paste event) as a data URL. Only touches a
// canvas — losing the PNG's lossless quality — if it's actually oversized;
// a normal-sized snip passes through untouched at its original quality.
function readScreenshotFile(file, maxDimension) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(t("screenshots.readError")));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(t("screenshots.readError")));
      img.onload = () => {
        if (img.width <= maxDimension && img.height <= maxDimension) {
          resolve(reader.result);
          return;
        }
        const scale = maxDimension / Math.max(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------------- Tabs ---------------- */

function isTabEmpty(tab) {
  return !(tab.notes || "").trim() && !(tab.highlights || []).length && !(tab.screenshots || []).length;
}

// Returns an updated tabs array with the given tab's fired reminder cleared,
// or null if there's nothing to clear — a fired reminder only stops once
// the note is actually opened (see openNoteTab below), never just from
// dismissing the notification.
function tabsWithReminderCleared(tabId) {
  const tab = state.tabs.find(t => t.id === tabId);
  if (!tab || !tab.reminder || !tab.reminder.fired) return null;
  return state.tabs.map(t => (t.id === tabId ? { ...t, reminder: null } : t));
}

async function openNoteTab(tabId) {
  const switching = tabId !== state.activeTabId;
  const clearedTabs = tabsWithReminderCleared(tabId);
  if (!switching && !clearedTabs) return;
  const updates = {};
  if (switching) updates.activeTabId = tabId;
  if (clearedTabs) updates.tabs = clearedTabs;
  await persist(updates);
  renderAll();
}

function renderTabs() {
  wireUndoButton(el.undoTabBtn, "tab");
  el.tabsRow.innerHTML = "";
  // Pinned tabs always render first — computed fresh here rather than
  // relied on in storage order, so display is correct even if the raw
  // array ever ends up interleaved (import, restore, etc.).
  const ordered = [...state.tabs.filter(t => t.pinned), ...state.tabs.filter(t => !t.pinned)];

  ordered.forEach(tab => {
    const row = document.createElement("div");
    const isFlashing = !!(tab.reminder && tab.reminder.fired);
    row.className = "note-tab" + (tab.id === state.activeTabId ? " active" : "") + (isFlashing ? " reminder-flash" : "");
    row.dataset.tabId = tab.id;
    row.draggable = true;

    const pinBtn = document.createElement("button");
    pinBtn.className = "pin-btn" + (tab.pinned ? " pinned" : "");
    pinBtn.title = tab.pinned ? t("tabs.unpin") : t("tabs.pinToTop");
    pinBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>`;
    pinBtn.addEventListener("click", async e => {
      e.stopPropagation();
      const updatedTabs = state.tabs.map(t => (t.id === tab.id ? { ...t, pinned: !t.pinned } : t));
      await persist({ tabs: updatedTabs });
      renderAll();
    });
    row.appendChild(pinBtn);

    const reminderBtn = document.createElement("button");
    reminderBtn.className = "reminder-btn" + (tab.reminder ? " has-reminder" : "");
    reminderBtn.title = isFlashing
      ? t("reminder.firedTitle")
      : tab.reminder
        ? t("reminder.setTitle", { time: formatReminderTime(tab.reminder.time) })
        : t("reminder.addTitle");
    reminderBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
    reminderBtn.addEventListener("click", e => {
      e.stopPropagation();
      openReminderModal(tab.id);
    });
    row.appendChild(reminderBtn);

    const label = document.createElement("span");
    label.textContent = tab.name;
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    row.appendChild(label);

    const closeX = document.createElement("span");
    closeX.className = "close-x";
    closeX.textContent = "✕";
    closeX.title = t("tabs.closeTitle");
    closeX.addEventListener("click", async e => {
      e.stopPropagation();
      if (!isTabEmpty(tab)) {
        const ok = confirm(t("tabs.confirmClose", { name: tab.name }));
        if (!ok) return;
      }
      closeTab(tab.id);
    });
    row.appendChild(closeX);

    row.addEventListener("click", () => openNoteTab(tab.id));

    row.addEventListener("dblclick", () => startRename(row, tab, label));

    row.addEventListener("dragstart", e => {
      dragTabSrcId = tab.id;
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      [...el.tabsRow.children].forEach(r => r.classList.remove("drag-over"));
      dragTabSrcId = null;
    });
    row.addEventListener("dragover", e => {
      if (!dragTabSrcId || dragTabSrcId === tab.id) return;
      const draggedTab = state.tabs.find(t => t.id === dragTabSrcId);
      if (!draggedTab || !!draggedTab.pinned !== !!tab.pinned) return; // no mixing groups
      e.preventDefault();
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", async e => {
      e.preventDefault();
      row.classList.remove("drag-over");
      if (!dragTabSrcId || dragTabSrcId === tab.id) return;
      const draggedTab = state.tabs.find(t => t.id === dragTabSrcId);
      if (!draggedTab || !!draggedTab.pinned !== !!tab.pinned) return;

      const isPinnedGroup = !!tab.pinned;
      const group = state.tabs.filter(t => !!t.pinned === isPinnedGroup);
      const otherGroup = state.tabs.filter(t => !!t.pinned !== isPinnedGroup);
      const from = group.findIndex(t => t.id === dragTabSrcId);
      const to = group.findIndex(t => t.id === tab.id);
      if (from === -1 || to === -1) return;
      const reorderedGroup = [...group];
      const [moved] = reorderedGroup.splice(from, 1);
      reorderedGroup.splice(to, 0, moved);

      // Rebuild fully grouped regardless of prior storage order —
      // self-heals the invariant on every reorder.
      const newTabs = isPinnedGroup ? [...reorderedGroup, ...otherGroup] : [...otherGroup, ...reorderedGroup];
      await persist({ tabs: newTabs });
      renderAll();
    });

    el.tabsRow.appendChild(row);
  });
}

function startRename(row, tab, labelEl) {
  const input = document.createElement("input");
  input.value = tab.name;
  row.replaceChild(input, labelEl);
  input.focus();
  input.select();
  const commit = async () => {
    const newName = input.value.trim() || tab.name;
    const updatedTabs = state.tabs.map(t => (t.id === tab.id ? { ...t, name: newName } : t));
    await persist({ tabs: updatedTabs });
    renderAll();
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") { input.value = tab.name; input.blur(); }
  });
}

async function closeTab(tabId) {
  const closedIndex = state.tabs.findIndex(t => t.id === tabId);
  const closedTab = state.tabs[closedIndex];

  let remaining = state.tabs.filter(t => t.id !== tabId);
  let newActive = state.activeTabId;
  if (remaining.length === 0) {
    const fresh = { id: uid(), name: t("tabs.defaultName", { n: 1 }), notes: "", highlights: [], screenshots: [], pinned: false, reminder: null };
    remaining = [fresh];
    newActive = fresh.id;
  } else if (tabId === state.activeTabId) {
    newActive = remaining[remaining.length - 1].id;
  }
  await persist({ tabs: remaining, activeTabId: newActive });
  if (closedTab) {
    // A closed tab's pending reminder is cancelled outright rather than
    // carried into the trash — restoring the tab later shouldn't bring back
    // an alarm that no longer exists (or a stale "fired" flash).
    if (closedTab.reminder) chrome.alarms.clear(`reminder-${tabId}`);
    await trashItem({ type: "tab", tab: { ...closedTab, reminder: null }, index: closedIndex });
  }
  notesQuipPickers.delete(tabId);
  renderAll();
}

el.newTabBtn.addEventListener("click", async () => {
  const n = state.tabs.length + 1;
  const fresh = { id: uid(), name: t("tabs.defaultName", { n }), notes: "", highlights: [], screenshots: [], pinned: false, reminder: null };
  const tabs = [...state.tabs, fresh];
  await persist({ tabs, activeTabId: fresh.id });
  renderAll();
  el.notesArea.focus();
});

/* ---------------- Reminders ---------------- */

let reminderModalTabId = null;
let reminderAmPm = "AM";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatReminderTime(epochMs) {
  return new Date(epochMs).toLocaleString(state.settings.language === "es" ? "es" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function toDateInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Turns whatever digits were typed into a 12-hour {hour, minute}. The field
// itself caps input at 4 characters (see the input listener below), so a
// "huge invalid number" can't reach here in the first place:
//   1-2 digits -> that hour, on the :00        ("9" -> 9:00, "12" -> 12:00)
//   3 digits   -> first digit = hour, rest = minutes  ("915" -> 9:15)
//   4 digits   -> first two = hour, rest = minutes    ("1001" -> 10:01)
// An hour or minute outside the valid range clamps to the closest valid
// value instead of being rejected.
// A leading zero can't be a real hour digit on a 12-hour clock, so once a
// later digit shows there's more of the number coming, drop it — typing
// "0510" (an accidental extra 0 before "510") reads the same as "510":
// 5:10, not 05:10. A lone "0" (nothing after it yet) is left alone so the
// field doesn't look like the keystroke was swallowed. Allows up to 5 raw
// digits in so a single stray leading zero doesn't push a real digit past
// the 4-digit cap.
function stripLeadingZero(digits) {
  return /[1-9]/.test(digits) ? digits.replace(/^0+/, "") : digits;
}
function normalizeTypedTimeDigits(raw) {
  return stripLeadingZero(raw.replace(/\D/g, "").slice(0, 5)).slice(0, 4);
}

function parseTypedTime(raw) {
  const digits = normalizeTypedTimeDigits(raw);
  if (!digits) return null;
  let hour, minute;
  if (digits.length <= 2) {
    hour = parseInt(digits, 10);
    minute = 0;
  } else if (digits.length === 3) {
    hour = parseInt(digits.slice(0, 1), 10);
    minute = parseInt(digits.slice(1), 10);
  } else {
    hour = parseInt(digits.slice(0, 2), 10);
    minute = parseInt(digits.slice(2), 10);
  }
  if (hour === 0) hour = 12;
  if (hour > 12) hour = 12;
  if (minute > 59) minute = 59;
  return { hour, minute };
}

// Right-anchors the last two typed digits as minutes, same as parseTypedTime
// above interprets them — so the live display never disagrees with what
// typing "915" or "1030" actually saves as. No colon until there's a 3rd
// digit, since with only 1-2 digits it's still ambiguous whether the hour
// is done or minutes just haven't started yet.
function formatTypedTimeDisplay(digits) {
  return digits.length >= 3 ? `${digits.slice(0, -2)}:${digits.slice(-2)}` : digits;
}

function syncReminderAmPmButtons() {
  [...el.reminderAmPmChoices.children].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.ampm === reminderAmPm);
  });
}

function openReminderModal(tabId) {
  const tab = state.tabs.find(t => t.id === tabId);
  if (!tab) return;
  reminderModalTabId = tabId;

  const now = new Date();
  let datePart = now;
  let hour12 = null;
  let minute = null;
  let ampm = now.getHours() < 12 ? "AM" : "PM";

  if (tab.reminder && tab.reminder.time) {
    datePart = new Date(tab.reminder.time);
    const h24 = datePart.getHours();
    hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
    minute = datePart.getMinutes();
    ampm = h24 < 12 ? "AM" : "PM";
  }

  el.reminderModalHeading.textContent = t("reminder.heading");
  el.reminderDateInput.min = toDateInputValue(now);
  el.reminderDateInput.value = toDateInputValue(datePart);
  el.reminderTimeInput.value = hour12 != null ? formatTypedTimeDisplay(`${hour12}${pad2(minute)}`) : "";
  reminderAmPm = ampm;
  syncReminderAmPmButtons();
  el.reminderStatus.textContent = "";
  el.reminderStatus.classList.remove("error");
  el.clearReminderBtn.classList.toggle("hidden", !tab.reminder);
  el.reminderModal.classList.remove("hidden");
  el.reminderTimeInput.focus();
}

function closeReminderModal() {
  el.reminderModal.classList.add("hidden");
  reminderModalTabId = null;
}

el.reminderTimeInput.addEventListener("input", () => {
  const digits = normalizeTypedTimeDigits(el.reminderTimeInput.value);
  el.reminderTimeInput.value = formatTypedTimeDisplay(digits);
});
el.reminderTimeInput.addEventListener("keydown", e => {
  if (e.key === "Enter") el.saveReminderBtn.click();
});

el.reminderAmPmChoices.addEventListener("click", e => {
  const btn = e.target.closest(".choice-btn");
  if (!btn) return;
  reminderAmPm = btn.dataset.ampm;
  syncReminderAmPmButtons();
});

el.closeReminderBtn.addEventListener("click", closeReminderModal);
el.reminderModal.addEventListener("click", e => {
  if (e.target === el.reminderModal) closeReminderModal();
});

el.saveReminderBtn.addEventListener("click", async () => {
  const tabId = reminderModalTabId;
  const tab = state.tabs.find(t => t.id === tabId);
  if (!tab) return;

  const parsed = parseTypedTime(el.reminderTimeInput.value);
  if (!parsed || !el.reminderDateInput.value) {
    el.reminderStatus.textContent = t("reminder.errorIncomplete");
    el.reminderStatus.classList.add("error");
    return;
  }

  const [y, m, d] = el.reminderDateInput.value.split("-").map(Number);
  let hour24 = parsed.hour % 12;
  if (reminderAmPm === "PM") hour24 += 12;
  const when = new Date(y, m - 1, d, hour24, parsed.minute, 0, 0).getTime();

  if (when <= Date.now()) {
    el.reminderStatus.textContent = t("reminder.errorPast");
    el.reminderStatus.classList.add("error");
    return;
  }

  const reminder = { id: uid(), time: when, fired: false };
  const updatedTabs = state.tabs.map(t => (t.id === tabId ? { ...t, reminder } : t));
  await persist({ tabs: updatedTabs });
  // Creating an alarm with a name that's already in use replaces the
  // existing one, so any previously pending reminder for this tab is
  // implicitly cancelled.
  chrome.alarms.create(`reminder-${tabId}`, { when });
  closeReminderModal();
  renderAll();
});

el.clearReminderBtn.addEventListener("click", async () => {
  const tabId = reminderModalTabId;
  if (!tabId) return;
  const updatedTabs = state.tabs.map(t => (t.id === tabId ? { ...t, reminder: null } : t));
  await persist({ tabs: updatedTabs });
  chrome.alarms.clear(`reminder-${tabId}`);
  closeReminderModal();
  renderAll();
});

/* ---------------- Snippets ---------------- */

function flashCopied(btn) {
  const original = btn.textContent;
  btn.textContent = t("common.copied");
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("copied");
  }, 1100);
}

// Snippets with no scope field (pre-dating this feature) count as global.
function isSnippetGlobal(s) {
  return s.scope !== "tab";
}
function isSnippetVisible(s) {
  return isSnippetGlobal(s) || s.tabId === state.activeTabId;
}

function renderSnippets() {
  wireUndoButton(el.undoSnippetBtn, "snippet", e => isSnippetVisible(e.snippet));

  const collapsed = !!state.settings.quickCopyCollapsed;
  el.snippetsBody.classList.toggle("hidden", collapsed);
  el.toggleCollapseSnippets.classList.toggle("collapsed", collapsed);
  el.toggleCollapseSnippets.title = collapsed ? t("quickCopy.expandTitle") : t("quickCopy.collapseTitle");

  el.snippetsList.innerHTML = "";

  // All-tabs entries always render above this-tab-only ones; entries
  // belonging to a different tab don't show at all.
  const visible = state.snippets.filter(isSnippetVisible);
  const ordered = [...visible.filter(isSnippetGlobal), ...visible.filter(s => !isSnippetGlobal(s))];

  if (ordered.length === 0 && !editingSnippets) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t("quickCopy.empty");
    el.snippetsList.appendChild(empty);
  }

  ordered.forEach(snippet => {
    const row = document.createElement("div");
    row.className = "snippet-row" + (editingSnippets ? " edit-mode" : "");
    if (!editingSnippets && isSnippetGlobal(snippet)) row.classList.add("scope-all");
    row.dataset.snippetId = snippet.id;

    if (editingSnippets) {
      const handle = document.createElement("span");
      handle.className = "drag-handle";
      handle.title = t("quickCopy.dragTitle");
      handle.draggable = true;
      handle.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`;

      handle.addEventListener("dragstart", e => {
        dragSrcId = snippet.id;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      handle.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        [...el.snippetsList.children].forEach(r => r.classList.remove("drag-over"));
        dragSrcId = null;
      });
      row.addEventListener("dragover", e => {
        if (!dragSrcId || dragSrcId === snippet.id) return;
        const draggedSnippet = state.snippets.find(s => s.id === dragSrcId);
        if (!draggedSnippet || isSnippetGlobal(draggedSnippet) !== isSnippetGlobal(snippet)) return;
        e.preventDefault();
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", async e => {
        e.preventDefault();
        row.classList.remove("drag-over");
        if (!dragSrcId || dragSrcId === snippet.id) return;
        const draggedSnippet = state.snippets.find(s => s.id === dragSrcId);
        if (!draggedSnippet || isSnippetGlobal(draggedSnippet) !== isSnippetGlobal(snippet)) return;

        const isGlobalGroup = isSnippetGlobal(snippet);
        const group = state.snippets.filter(s => isSnippetGlobal(s) === isGlobalGroup);
        const rest = state.snippets.filter(s => isSnippetGlobal(s) !== isGlobalGroup);
        const from = group.findIndex(s => s.id === dragSrcId);
        const to = group.findIndex(s => s.id === snippet.id);
        if (from === -1 || to === -1) return;
        const reorderedGroup = [...group];
        const [moved] = reorderedGroup.splice(from, 1);
        reorderedGroup.splice(to, 0, moved);

        const reordered = isGlobalGroup ? [...reorderedGroup, ...rest] : [...rest, ...reorderedGroup];
        await persist({ snippets: reordered });
        renderSnippets();
      });

      row.appendChild(handle);

      const scopeToggle = document.createElement("button");
      scopeToggle.className = "scope-toggle-btn" + (isSnippetGlobal(snippet) ? " scope-all" : "");
      scopeToggle.title = isSnippetGlobal(snippet)
        ? t("quickCopy.scopeAllTitle")
        : t("quickCopy.scopeTabTitle");
      scopeToggle.addEventListener("click", async () => {
        const updated = state.snippets.map(s => {
          if (s.id !== snippet.id) return s;
          return isSnippetGlobal(s)
            ? { ...s, scope: "tab", tabId: state.activeTabId }
            : { ...s, scope: "all", tabId: null };
        });
        await persist({ snippets: updated });
        renderSnippets();
      });
      row.appendChild(scopeToggle);

      const labelInput = document.createElement("input");
      labelInput.className = "snippet-label-input";
      labelInput.value = snippet.label;
      labelInput.placeholder = t("common.label");

      const valueInput = document.createElement("textarea");
      valueInput.className = "snippet-value-input";
      valueInput.rows = 1;
      valueInput.value = snippet.value;
      valueInput.placeholder = t("common.value");
      const autoGrowValue = () => {
        valueInput.style.height = "auto";
        valueInput.style.height = valueInput.scrollHeight + "px";
      };
      valueInput.addEventListener("input", autoGrowValue);
      requestAnimationFrame(autoGrowValue);

      const commitEdit = async () => {
        const updated = state.snippets.map(s =>
          s.id === snippet.id
            ? { ...s, label: labelInput.value.trim() || s.label, value: valueInput.value }
            : s
        );
        await persist({ snippets: updated });
      };
      labelInput.addEventListener("blur", commitEdit);
      valueInput.addEventListener("blur", commitEdit);

      const del = document.createElement("button");
      del.className = "delete-btn";
      del.title = t("quickCopy.deleteTitle");
      del.innerHTML = trashIcon();
      del.addEventListener("click", async () => {
        const sIndex = state.snippets.findIndex(s => s.id === snippet.id);
        const updated = state.snippets.filter(s => s.id !== snippet.id);
        await persist({ snippets: updated });
        await trashItem({ type: "snippet", snippet, index: sIndex });
        renderSnippets();
        renderTrash();
      });

      row.appendChild(labelInput);
      row.appendChild(valueInput);
      row.appendChild(del);
    } else {
      const textWrap = document.createElement("div");
      textWrap.className = "snippet-text";
      const labelDiv = document.createElement("div");
      labelDiv.className = "snippet-label";
      labelDiv.textContent = snippet.label;
      const valueDiv = document.createElement("div");
      valueDiv.className = "snippet-value";
      valueDiv.textContent = snippet.value;
      textWrap.appendChild(labelDiv);
      textWrap.appendChild(valueDiv);

      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.textContent = t("common.copy");
      copyBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(snippet.value);
        flashCopied(copyBtn);
      });

      row.appendChild(textWrap);
      row.appendChild(copyBtn);
    }

    el.snippetsList.appendChild(row);
  });
}

function trashIcon() {
  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path><path d="M14 11v6"></path>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
  </svg>`;
}

el.toggleEditSnippets.addEventListener("click", async () => {
  editingSnippets = !editingSnippets;
  el.toggleEditSnippets.classList.toggle("active", editingSnippets);
  el.addSnippetRow.classList.toggle("hidden", !editingSnippets);
  // Editing a collapsed list doesn't make sense — expand it first.
  if (editingSnippets && state.settings.quickCopyCollapsed) {
    await persist({ settings: { ...state.settings, quickCopyCollapsed: false } });
  }
  renderSnippets();
});

el.toggleCollapseSnippets.addEventListener("click", async () => {
  const quickCopyCollapsed = !state.settings.quickCopyCollapsed;
  await persist({ settings: { ...state.settings, quickCopyCollapsed } });
  renderSnippets();
});

el.toggleCollapseHighlights.addEventListener("click", async () => {
  const savedPagesCollapsed = !state.settings.savedPagesCollapsed;
  await persist({ settings: { ...state.settings, savedPagesCollapsed } });
  renderHighlights();
});

el.highlightPromptToggle.addEventListener("change", async () => {
  const highlightPromptEnabled = el.highlightPromptToggle.checked;
  await persist({ settings: { ...state.settings, highlightPromptEnabled } });
});

el.addSnippetBtn.addEventListener("click", async () => {
  const label = el.newSnippetLabel.value.trim();
  const value = el.newSnippetValue.value.trim();
  if (!label || !value) return;
  // New snippets always start as "All tabs" — click the scope dot right
  // after adding if you want this one tab-only, same as any other entry.
  const fresh = { id: uid(), label, value, scope: "all", tabId: null };
  const snippets = [...state.snippets, fresh];
  await persist({ snippets });
  el.newSnippetLabel.value = "";
  el.newSnippetValue.value = "";
  el.newSnippetLabel.focus();
  renderSnippets();
});
[el.newSnippetLabel, el.newSnippetValue].forEach(input => {
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") el.addSnippetBtn.click();
  });
});

/* ---------------- Highlights ---------------- */

function renderHighlights() {
  wireUndoButton(el.undoHighlightBtn, "highlight", e => e.tabId === state.activeTabId);

  el.highlightPromptToggle.checked = state.settings.highlightPromptEnabled !== false;

  const collapsed = !!state.settings.savedPagesCollapsed;
  el.highlightsBody.classList.toggle("hidden", collapsed);
  el.toggleCollapseHighlights.classList.toggle("collapsed", collapsed);
  el.toggleCollapseHighlights.title = collapsed ? t("highlights.expandTitle") : t("highlights.collapseTitle");

  el.highlightsList.innerHTML = "";
  const tab = activeTab();
  const highlights = tab ? tab.highlights || [] : [];

  el.clearHighlightsBtn.classList.toggle("hidden", highlights.length === 0);

  if (highlights.length === 0) {
    el.highlightsCounter.textContent = "";
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t("highlights.empty");
    el.highlightsList.appendChild(empty);
    return;
  }

  // Item/word count is intentionally not shown in the UI right now \u2014 kept
  // here (unused) in case it's wanted again later.
  const totalWords = highlights.reduce((sum, h) => sum + countWords(h.text), 0);
  el.highlightsCounter.textContent = "";

  highlights.forEach(h => {
    const row = document.createElement("div");
    row.className = "highlight-row";
    row.dataset.highlightId = h.id;

    const text = document.createElement("p");
    text.className = "highlight-text";
    text.textContent = h.text;

    const meta = document.createElement("div");
    meta.className = "highlight-meta";

    const source = document.createElement(h.url ? "a" : "span");
    source.className = "highlight-source";
    source.textContent = h.source || "";
    source.title = h.title || "";
    if (h.url) {
      source.href = h.url;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
    }

    const actions = document.createElement("div");
    actions.className = "highlight-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = t("common.copy");
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(h.text);
      flashCopied(copyBtn);
    });
    actions.appendChild(copyBtn);

    if (h.url) {
      const copyLinkBtn = document.createElement("button");
      copyLinkBtn.className = "copy-btn";
      copyLinkBtn.textContent = t("highlights.linkBtn");
      copyLinkBtn.title = t("highlights.linkTitle");
      copyLinkBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(h.url);
        flashCopied(copyLinkBtn);
      });
      actions.appendChild(copyLinkBtn);
    }

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.title = t("common.remove");
    del.innerHTML = trashIcon();
    del.addEventListener("click", async () => {
      const hIndex = tab.highlights.findIndex(x => x.id === h.id);
      const updatedTabs = state.tabs.map(t =>
        t.id === tab.id ? { ...t, highlights: t.highlights.filter(x => x.id !== h.id) } : t
      );
      await persist({ tabs: updatedTabs });
      await trashItem({ type: "highlight", highlight: h, tabId: tab.id, tabName: tab.name, index: hIndex });
      renderHighlights();
      renderTrash();
    });

    actions.appendChild(del);
    meta.appendChild(source);
    meta.appendChild(actions);
    row.appendChild(text);
    row.appendChild(meta);
    el.highlightsList.appendChild(row);
  });
}

el.clearHighlightsBtn.addEventListener("click", async () => {
  const tab = activeTab();
  if (!tab || !(tab.highlights || []).length) return;
  const count = tab.highlights.length;
  const ok = confirm(
    count === 1
      ? t("highlights.confirmClearAllOne", { name: tab.name })
      : t("highlights.confirmClearAllMany", { count, name: tab.name })
  );
  if (!ok) return;
  const removed = [...tab.highlights];
  const updatedTabs = state.tabs.map(t => (t.id === tab.id ? { ...t, highlights: [] } : t));
  await persist({ tabs: updatedTabs });
  // Trashed in original order so restoring one-by-one later re-inserts at
  // sensible indices relative to each other.
  for (let i = 0; i < removed.length; i++) {
    await trashItem({ type: "highlight", highlight: removed[i], tabId: tab.id, tabName: tab.name, index: i });
  }
  renderHighlights();
  renderTrash();
});

/* ---------------- Notes ---------------- */

// One quip picker per note tab, created lazily, so each tab's "no repeat
// within a range" memory is independent of the others.
const notesQuipPickers = new Map();

function getNotesQuipPicker(tabId) {
  if (!notesQuipPickers.has(tabId)) {
    notesQuipPickers.set(tabId, createQuipPicker());
  }
  return notesQuipPickers.get(tabId);
}

function autoGrowNotes() {
  el.notesArea.style.height = "auto";
  el.notesArea.style.height = el.notesArea.scrollHeight + "px";
}

function updateNotesCounter() {
  const text = el.notesArea.value;
  const tab = activeTab();
  if (!tab || !text) {
    el.notesCounter.textContent = "";
    return;
  }
  // Quips are English-language jokes that don't translate — in any
  // non-English UI, show a plain word count instead of picking a quip.
  if ((state.settings.language || "en") !== "en") {
    const words = countWords(text);
    el.notesCounter.textContent = words === 1 ? t("notes.plainCounterOne") : t("notes.plainCounterMany", { count: words });
    return;
  }
  el.notesCounter.textContent = getNotesQuipPicker(tab.id).get(text.length);
}

// Tracks which tab's notes the textarea currently displays, independent of
// state.activeTabId, so a render can tell "the same tab changed under me"
// (e.g. a sync from another window while typing — never clobber that) apart
// from "the active tab itself changed" (e.g. a reminder's "Take me there" —
// that always has to show up, focused or not, since nothing else drives it).
let notesAreaTabId = null;

function renderNotes() {
  const tab = activeTab();
  const value = tab ? tab.notes || "" : "";
  const tabId = tab ? tab.id : null;
  if (document.activeElement !== el.notesArea || tabId !== notesAreaTabId) {
    el.notesArea.value = value;
  }
  notesAreaTabId = tabId;
  el.clearNotesBtn.classList.toggle("hidden", !value.trim());
  autoGrowNotes();
  updateNotesCounter();
}

el.clearNotesBtn.addEventListener("click", async () => {
  const tab = activeTab();
  if (!tab || !(tab.notes || "").trim()) return;
  const ok = confirm(t("notes.confirmClear", { name: tab.name }));
  if (!ok) return;
  const removedNotes = tab.notes;
  const updatedTabs = state.tabs.map(t => (t.id === tab.id ? { ...t, notes: "" } : t));
  await persist({ tabs: updatedTabs });
  await trashItem({ type: "note", notes: removedNotes, tabId: tab.id, tabName: tab.name });
  renderNotes();
  renderTrash();
});

el.notesArea.addEventListener("input", () => {
  autoGrowNotes();
  updateNotesCounter();
  // Both captured now, not when the timer fires: if the active tab changes
  // during this 400ms window (e.g. a reminder's "Take me there" switches
  // tabs while this debounce is still pending), that switch immediately
  // repaints the textarea with the *new* tab's notes (see renderNotes) --
  // reading el.notesArea.value from inside the timeout at that point would
  // save the wrong tab's just-displayed text right back over itself. Taking
  // both the target tab and the typed value as of this exact keystroke
  // keeps the save correct regardless of what the textarea shows later.
  const savingTab = activeTab();
  const savingValue = el.notesArea.value;
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(async () => {
    if (!savingTab) return;
    const updatedTabs = state.tabs.map(t =>
      t.id === savingTab.id ? { ...t, notes: savingValue } : t
    );
    await persist({ tabs: updatedTabs });
    el.saveIndicator.textContent = t("notes.saved");
    el.saveIndicator.classList.add("visible");
    setTimeout(() => el.saveIndicator.classList.remove("visible"), 900);
  }, 400);
});

// Pasting an image (e.g. from Win+Shift+S or Cmd+Shift+4, copied to the
// clipboard) into Notes moves it straight to Screenshots instead of
// dumping broken image data into the text — textareas can't hold images
// anyway, so intercepting this is the only sane behavior.
el.notesArea.addEventListener("paste", async e => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  const imageItem = [...items].find(it => it.type && it.type.startsWith("image/"));
  if (!imageItem) return;

  e.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;
  const tab = activeTab();
  if (!tab) return;

  try {
    const dataUrl = await readScreenshotFile(file, 1800);
    const shot = { id: uid(), dataUrl, time: Date.now() };
    const updatedTabs = state.tabs.map(t =>
      t.id === tab.id ? { ...t, screenshots: [shot, ...(t.screenshots || [])] } : t
    );
    await persist({ tabs: updatedTabs });
    renderScreenshots();
    const newThumb = el.screenshotsStrip.querySelector(".screenshot-thumb");
    if (newThumb) {
      newThumb.classList.add("just-added");
      setTimeout(() => newThumb.classList.remove("just-added"), 1200);
    }
  } catch (err) {
    alert(err && err.message ? err.message : t("screenshots.pasteError"));
  }
});

/* ---------------- Screenshots ---------------- */

function flashIconCopied(btn) {
  const original = btn.title;
  btn.classList.add("copied");
  btn.title = t("common.copied");
  setTimeout(() => {
    btn.classList.remove("copied");
    btn.title = original;
  }, 1100);
}

async function copyScreenshotToClipboard(shot, btn) {
  try {
    const res = await fetch(shot.dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    flashIconCopied(btn);
  } catch {
    btn.title = t("screenshots.couldntCopy");
  }
}

function toggleScreenshotSelected(id) {
  if (selectedScreenshotIds.has(id)) selectedScreenshotIds.delete(id);
  else selectedScreenshotIds.add(id);
  renderScreenshots();
}

function renderScreenshots() {
  wireUndoButton(el.undoScreenshotBtn, "screenshot", e => e.tabId === state.activeTabId);

  const tab = activeTab();

  // Switching note tabs exits selection mode — selected IDs from another
  // tab's screenshots shouldn't silently carry over.
  if (tab && tab.id !== selectionRenderedForTabId) {
    screenshotSelectionMode = false;
    selectedScreenshotIds.clear();
  }
  selectionRenderedForTabId = tab ? tab.id : null;

  const shots = tab ? tab.screenshots || [] : [];

  el.selectScreenshotsBtn.classList.toggle("hidden", shots.length === 0);
  el.screenshotsNormalActions.classList.toggle("hidden", screenshotSelectionMode);
  el.screenshotsSelectActions.classList.toggle("hidden", !screenshotSelectionMode);
  el.screenshotsStrip.classList.toggle("selecting", screenshotSelectionMode);

  const selectedCount = shots.filter(s => selectedScreenshotIds.has(s.id)).length;
  el.screenshotSelectionCount.textContent = selectedCount === 1 ? t("screenshots.selectedCountOne") : t("screenshots.selectedCountMany", { count: selectedCount });
  el.downloadSelectedScreenshotsBtn.disabled = selectedCount === 0;
  el.deleteSelectedScreenshotsBtn.disabled = selectedCount === 0;
  const allSelected = shots.length > 0 && selectedCount === shots.length;
  el.selectAllScreenshotsBtn.title = allSelected ? t("screenshots.deselectAll") : t("screenshots.selectAll");
  el.selectAllScreenshotsBtn.classList.toggle("all-selected", allSelected);

  el.screenshotsStrip.innerHTML = "";

  if (shots.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state screenshots-empty";
    empty.textContent = t("screenshots.empty");
    el.screenshotsStrip.appendChild(empty);
    return;
  }

  shots.forEach(shot => {
    const thumb = document.createElement("div");
    thumb.className = "screenshot-thumb";
    if (selectedScreenshotIds.has(shot.id)) thumb.classList.add("selected");
    thumb.tabIndex = 0;
    thumb.setAttribute("role", "button");
    thumb.style.backgroundImage = `url("${shot.dataUrl}")`;
    thumb.title = new Date(shot.time).toLocaleString();

    const check = document.createElement("span");
    check.className = "thumb-check";
    check.setAttribute("aria-hidden", "true");
    thumb.appendChild(check);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "thumb-copy-btn";
    copyBtn.title = t("screenshots.copyImageTitle");
    copyBtn.setAttribute("aria-label", t("screenshots.copyImageTitle"));
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyBtn.addEventListener("click", e => {
      e.stopPropagation();
      copyScreenshotToClipboard(shot, copyBtn);
    });
    thumb.appendChild(copyBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "thumb-delete-btn";
    deleteBtn.title = t("screenshots.deleteImageTitle");
    deleteBtn.setAttribute("aria-label", t("screenshots.deleteImageTitle"));
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>`;
    deleteBtn.addEventListener("click", async e => {
      e.stopPropagation();
      const ok = confirm(t("screenshots.confirmDeleteOne"));
      if (!ok) return;
      const index = (tab.screenshots || []).findIndex(s => s.id === shot.id);
      const updatedTabs = state.tabs.map(t =>
        t.id === tab.id ? { ...t, screenshots: (t.screenshots || []).filter(s => s.id !== shot.id) } : t
      );
      await persist({ tabs: updatedTabs });
      await trashItem({ type: "screenshot", screenshot: shot, tabId: tab.id, tabName: tab.name, index });
      renderScreenshots();
      renderTrash();
    });
    thumb.appendChild(deleteBtn);

    function activate() {
      if (screenshotSelectionMode) toggleScreenshotSelected(shot.id);
      else openLightbox(shot);
    }
    thumb.addEventListener("click", activate);
    thumb.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
    });

    el.screenshotsStrip.appendChild(thumb);
  });
}

el.selectScreenshotsBtn.addEventListener("click", () => {
  screenshotSelectionMode = true;
  selectedScreenshotIds.clear();
  renderScreenshots();
});

el.cancelSelectScreenshotsBtn.addEventListener("click", () => {
  screenshotSelectionMode = false;
  selectedScreenshotIds.clear();
  renderScreenshots();
});

el.selectAllScreenshotsBtn.addEventListener("click", () => {
  const tab = activeTab();
  const shots = tab ? tab.screenshots || [] : [];
  const allSelected = shots.length > 0 && shots.every(s => selectedScreenshotIds.has(s.id));
  if (allSelected) selectedScreenshotIds.clear();
  else shots.forEach(s => selectedScreenshotIds.add(s.id));
  renderScreenshots();
});

el.deleteSelectedScreenshotsBtn.addEventListener("click", async () => {
  const tab = activeTab();
  if (!tab) return;
  const toDelete = (tab.screenshots || []).filter(s => selectedScreenshotIds.has(s.id));
  if (!toDelete.length) return;
  const ok = confirm(
    toDelete.length === 1
      ? t("screenshots.confirmDeleteSelectedOne")
      : t("screenshots.confirmDeleteSelectedMany", { count: toDelete.length })
  );
  if (!ok) return;

  const updatedTabs = state.tabs.map(t =>
    t.id === tab.id ? { ...t, screenshots: (t.screenshots || []).filter(s => !selectedScreenshotIds.has(s.id)) } : t
  );
  await persist({ tabs: updatedTabs });
  for (const shot of toDelete) {
    const index = (tab.screenshots || []).findIndex(s => s.id === shot.id);
    await trashItem({ type: "screenshot", screenshot: shot, tabId: tab.id, tabName: tab.name, index });
  }
  screenshotSelectionMode = false;
  selectedScreenshotIds.clear();
  renderScreenshots();
  renderTrash();
});

el.downloadSelectedScreenshotsBtn.addEventListener("click", async () => {
  const tab = activeTab();
  if (!tab) return;
  const toDownload = (tab.screenshots || []).filter(s => selectedScreenshotIds.has(s.id));
  el.downloadSelectedScreenshotsBtn.disabled = true;
  for (const shot of toDownload) {
    const stamp = new Date(shot.time).toISOString().slice(0, 19).replace(/[:T]/g, "-");
    try {
      const res = await fetch(shot.dataUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      // No saveAs here (unlike the single-image lightbox download) — with
      // several files, a save dialog per file would be unusable. These go
      // straight to the default Downloads folder instead.
      await chrome.downloads.download({ url, filename: `sidebit-screenshot-${stamp}.png` });
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      /* one failed download shouldn't stop the rest */
    }
  }
  el.downloadSelectedScreenshotsBtn.disabled = selectedScreenshotIds.size === 0;
});

el.captureBtn.addEventListener("click", async () => {
  const tab = activeTab();
  if (!tab) return;
  el.captureBtn.disabled = true;
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: "png" });
    const shot = { id: uid(), dataUrl, time: Date.now() };
    const updatedTabs = state.tabs.map(t =>
      t.id === tab.id ? { ...t, screenshots: [shot, ...(t.screenshots || [])] } : t
    );
    await persist({ tabs: updatedTabs });
    renderScreenshots();
  } catch (err) {
    // Fails on chrome:// pages, the Web Store, other extension pages, or if
    // called more than ~2x/second (Chrome's built-in rate limit).
    alert(err && err.message ? err.message : t("screenshots.captureError"));
  } finally {
    el.captureBtn.disabled = false;
  }
});

function openLightbox(shot) {
  currentLightboxShot = shot;
  el.lightboxImg.src = shot.dataUrl;
  el.lightboxStatus.textContent = "";
  el.lightboxStatus.classList.remove("error");
  el.screenshotModal.classList.remove("hidden");
}

function closeLightbox() {
  el.screenshotModal.classList.add("hidden");
  currentLightboxShot = null;
}

el.closeScreenshotBtn.addEventListener("click", closeLightbox);
el.screenshotModal.addEventListener("click", e => {
  if (e.target === el.screenshotModal) closeLightbox();
});

el.lightboxDownloadBtn.addEventListener("click", async () => {
  if (!currentLightboxShot) return;
  const stamp = new Date(currentLightboxShot.time).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  try {
    // Use a Blob URL rather than the raw data: URL — more reliable with
    // chrome.downloads for larger images.
    const res = await fetch(currentLightboxShot.dataUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({ url, filename: `sidebit-screenshot-${stamp}.png`, saveAs: true });
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) {
    el.lightboxStatus.textContent = t("lightbox.downloadError");
    el.lightboxStatus.classList.add("error");
  }
});

el.lightboxCopyBtn.addEventListener("click", async () => {
  if (!currentLightboxShot) return;
  try {
    const res = await fetch(currentLightboxShot.dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    flashCopied(el.lightboxCopyBtn);
  } catch (err) {
    el.lightboxStatus.textContent = t("lightbox.copyError");
    el.lightboxStatus.classList.add("error");
  }
});

el.lightboxDeleteBtn.addEventListener("click", async () => {
  if (!currentLightboxShot) return;
  const ok = confirm(t("screenshots.confirmDeleteOne"));
  if (!ok) return;
  const tab = activeTab();
  if (!tab) return;
  const shotId = currentLightboxShot.id;
  const shotIndex = (tab.screenshots || []).findIndex(s => s.id === shotId);
  const updatedTabs = state.tabs.map(t =>
    t.id === tab.id ? { ...t, screenshots: (t.screenshots || []).filter(s => s.id !== shotId) } : t
  );
  await persist({ tabs: updatedTabs });
  await trashItem({ type: "screenshot", screenshot: currentLightboxShot, tabId: tab.id, tabName: tab.name, index: shotIndex });
  renderScreenshots();
  renderTrash();
  closeLightbox();
});

/* ---------------- Search ---------------- */

const SEARCH_MAX_PER_GROUP = 8;

function buildSearchResults(rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return { tabs: [], snippets: [], highlights: [] };

  const tabs = state.tabs
    .filter(t => t.name.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q))
    .map(t => ({ tab: t, matchedNotes: !t.name.toLowerCase().includes(q) && (t.notes || "").toLowerCase().includes(q) }));

  const snippets = state.snippets.filter(s =>
    s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
  );

  const highlights = [];
  state.tabs.forEach(t => {
    (t.highlights || []).forEach(h => {
      const hay = `${h.text} ${h.source || ""} ${h.title || ""}`.toLowerCase();
      if (hay.includes(q)) highlights.push({ tab: t, highlight: h });
    });
  });

  return { tabs, snippets, highlights };
}

function excerpt(text, q, radius) {
  const hay = text.toLowerCase();
  const idx = hay.indexOf(q.toLowerCase());
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

// Builds text nodes around a <mark>, never HTML — safe for page-derived text.
function highlightMatch(text, q) {
  const frag = document.createDocumentFragment();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1 || !q) {
    frag.appendChild(document.createTextNode(text));
    return frag;
  }
  frag.appendChild(document.createTextNode(text.slice(0, idx)));
  const mark = document.createElement("mark");
  mark.className = "search-mark";
  mark.textContent = text.slice(idx, idx + q.length);
  frag.appendChild(mark);
  frag.appendChild(document.createTextNode(text.slice(idx + q.length)));
  return frag;
}

function flashElement(target) {
  if (!target) return;
  target.classList.add("search-flash");
  setTimeout(() => target.classList.remove("search-flash"), 1200);
}

function closeSearch() {
  el.searchInput.value = "";
  el.searchResults.innerHTML = "";
  el.searchResults.classList.add("hidden");
}

async function selectTabResult(tabId, query) {
  const switching = tabId !== state.activeTabId;
  const clearedTabs = tabsWithReminderCleared(tabId);
  if (switching || clearedTabs) {
    const updates = {};
    if (switching) updates.activeTabId = tabId;
    if (clearedTabs) updates.tabs = clearedTabs;
    await persist(updates);
    renderAll();
  }
  closeSearch();
  const tab = state.tabs.find(t => t.id === tabId);
  const notes = (tab && tab.notes) || "";
  const idx = query ? notes.toLowerCase().indexOf(query.toLowerCase()) : -1;
  requestAnimationFrame(() => {
    if (idx !== -1) {
      el.notesArea.focus();
      el.notesArea.setSelectionRange(idx, idx + query.length);
      el.notesArea.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      const row = el.tabsRow.querySelector(`[data-tab-id="${tabId}"]`);
      if (row) row.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      flashElement(row);
    }
  });
}

async function selectSnippetResult(snippetId) {
  const snippet = state.snippets.find(s => s.id === snippetId);
  if (snippet && !isSnippetGlobal(snippet) && snippet.tabId !== state.activeTabId && state.tabs.some(t => t.id === snippet.tabId)) {
    await persist({ activeTabId: snippet.tabId });
    renderAll();
  }
  closeSearch();
  requestAnimationFrame(() => {
    const row = el.snippetsList.querySelector(`[data-snippet-id="${snippetId}"]`);
    if (row) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      flashElement(row);
    }
  });
}

async function selectHighlightResult(tabId, highlightId) {
  if (tabId !== state.activeTabId) {
    await persist({ activeTabId: tabId });
    renderAll();
  }
  if (state.settings.savedPagesCollapsed) {
    await persist({ settings: { ...state.settings, savedPagesCollapsed: false } });
    renderHighlights();
  }
  closeSearch();
  requestAnimationFrame(() => {
    const row = el.highlightsList.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (row) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      flashElement(row);
    }
  });
}

function renderSearchResults(rawQuery) {
  const q = rawQuery.trim();
  el.searchResults.innerHTML = "";

  if (!q) {
    el.searchResults.classList.add("hidden");
    return;
  }

  const results = buildSearchResults(q);
  const total = results.tabs.length + results.snippets.length + results.highlights.length;

  if (total === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state search-empty";
    empty.textContent = t("search.noMatches", { query: q });
    el.searchResults.appendChild(empty);
    el.searchResults.classList.remove("hidden");
    return;
  }

  function addGroup(label, items, renderItem) {
    if (!items.length) return;
    const heading = document.createElement("div");
    heading.className = "search-group-label";
    heading.textContent = label;
    el.searchResults.appendChild(heading);
    items.slice(0, SEARCH_MAX_PER_GROUP).forEach(renderItem);
    if (items.length > SEARCH_MAX_PER_GROUP) {
      const more = document.createElement("div");
      more.className = "search-more";
      more.textContent = t("search.moreResults", { count: items.length - SEARCH_MAX_PER_GROUP });
      el.searchResults.appendChild(more);
    }
  }

  addGroup(t("search.groupTabs"), results.tabs, ({ tab, matchedNotes }) => {
    const row = document.createElement("button");
    row.className = "search-result";
    const title = document.createElement("div");
    title.className = "search-result-title";
    title.appendChild(highlightMatch(tab.name, q));
    const sub = document.createElement("div");
    sub.className = "search-result-sub";
    sub.textContent = matchedNotes ? excerpt(tab.notes, q, 40) : t("trash.typeTab");
    row.appendChild(title);
    row.appendChild(sub);
    row.addEventListener("click", () => selectTabResult(tab.id, q));
    el.searchResults.appendChild(row);
  });

  addGroup(t("quickCopy.heading"), results.snippets, snippet => {
    const row = document.createElement("button");
    row.className = "search-result";
    const title = document.createElement("div");
    title.className = "search-result-title";
    title.appendChild(highlightMatch(snippet.label, q));
    const sub = document.createElement("div");
    sub.className = "search-result-sub";
    const scopeHint = !isSnippetGlobal(snippet)
      ? t("search.scopeHintOnly", { name: (state.tabs.find(t => t.id === snippet.tabId) || {}).name || t("search.aTabFallback") })
      : "";
    sub.textContent = scopeHint + snippet.value;
    row.appendChild(title);
    row.appendChild(sub);
    row.addEventListener("click", () => selectSnippetResult(snippet.id));
    el.searchResults.appendChild(row);
  });

  addGroup(t("highlights.heading"), results.highlights, ({ tab, highlight }) => {
    const row = document.createElement("button");
    row.className = "search-result";
    const title = document.createElement("div");
    title.className = "search-result-title";
    title.appendChild(highlightMatch(excerpt(highlight.text, q, 40), q));
    const sub = document.createElement("div");
    sub.className = "search-result-sub";
    sub.textContent = `${tab.name} · ${highlight.source || ""}`;
    row.appendChild(title);
    row.appendChild(sub);
    row.addEventListener("click", () => selectHighlightResult(tab.id, highlight.id));
    el.searchResults.appendChild(row);
  });

  el.searchResults.classList.remove("hidden");
}

el.searchInput.addEventListener("input", () => renderSearchResults(el.searchInput.value));

el.searchInput.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeSearch();
    el.searchInput.blur();
  }
});

loadState();
