const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const DEFAULT_SETTINGS = { theme: "dark", backgroundImage: null, font: "system", textSize: "medium" };

// Three self-contained, universally pre-installed fonts chosen for on-screen
// readability — no bundled font files, no CSP/network concerns.
const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  verdana: "Verdana, Geneva, sans-serif"
};
const TEXT_SCALES = { small: 0.92, medium: 1, large: 1.15 };

let state = { tabs: [], activeTabId: null, snippets: [], settings: { ...DEFAULT_SETTINGS } };
let editingSnippets = false;
let notesSaveTimer = null;
let dragSrcId = null;
let systemThemeQuery = null;

const el = {
  tabsRow: document.getElementById("tabsRow"),
  newTabBtn: document.getElementById("newTabBtn"),
  snippetsList: document.getElementById("snippetsList"),
  toggleEditSnippets: document.getElementById("toggleEditSnippets"),
  addSnippetRow: document.getElementById("addSnippetRow"),
  newSnippetLabel: document.getElementById("newSnippetLabel"),
  newSnippetValue: document.getElementById("newSnippetValue"),
  addSnippetBtn: document.getElementById("addSnippetBtn"),
  highlightsList: document.getElementById("highlightsList"),
  clearHighlightsBtn: document.getElementById("clearHighlightsBtn"),
  notesArea: document.getElementById("notesArea"),
  saveIndicator: document.getElementById("saveIndicator"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  themeChoices: document.getElementById("themeChoices"),
  sizeChoices: document.getElementById("sizeChoices"),
  fontChoices: document.getElementById("fontChoices"),
  bgBackdrop: document.getElementById("bgBackdrop"),
  bgPreview: document.getElementById("bgPreview"),
  bgFileInput: document.getElementById("bgFileInput"),
  removeBgBtn: document.getElementById("removeBgBtn"),
  bgStatus: document.getElementById("bgStatus"),
  exportDataBtn: document.getElementById("exportDataBtn"),
  importDataInput: document.getElementById("importDataInput"),
  backupStatus: document.getElementById("backupStatus")
};

function activeTab() {
  return state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0];
}

async function persist(partial) {
  Object.assign(state, partial);
  await chrome.storage.local.set(partial);
}

async function loadState() {
  const data = await chrome.storage.local.get(["tabs", "activeTabId", "snippets", "settings"]);
  state.tabs = data.tabs || [];
  state.activeTabId = data.activeTabId || (state.tabs[0] && state.tabs[0].id) || null;
  state.snippets = data.snippets || [];
  state.settings = Object.assign({ ...DEFAULT_SETTINGS }, data.settings || {});
  renderAll();
  applyTheme(state.settings.theme);
  applyBackground(state.settings.backgroundImage);
  applyFont(state.settings.font);
  applyTextScale(state.settings.textSize);
}

// Re-render if data changes elsewhere (a highlight saved from a page,
// or storage synced from another window).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.tabs) state.tabs = changes.tabs.newValue || [];
  if (changes.activeTabId) state.activeTabId = changes.activeTabId.newValue;
  if (changes.snippets) state.snippets = changes.snippets.newValue || [];
  if (changes.settings) {
    state.settings = Object.assign({ ...DEFAULT_SETTINGS }, changes.settings.newValue || {});
    applyTheme(state.settings.theme);
    applyBackground(state.settings.backgroundImage);
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
  renderSettingsUI();
}

/* ---------------- Settings: theme + background image ---------------- */

function applyTheme(theme) {
  const root = document.documentElement;

  if (systemThemeQuery) {
    systemThemeQuery.removeEventListener("change", handleSystemThemeChange);
    systemThemeQuery = null;
  }

  if (theme === "system") {
    systemThemeQuery = window.matchMedia("(prefers-color-scheme: light)");
    systemThemeQuery.addEventListener("change", handleSystemThemeChange);
    root.dataset.theme = systemThemeQuery.matches ? "light" : "dark";
  } else {
    root.dataset.theme = theme === "light" ? "light" : "dark";
  }
}

function handleSystemThemeChange(e) {
  document.documentElement.dataset.theme = e.matches ? "light" : "dark";
}

function applyFont(fontKey) {
  const stack = FONT_STACKS[fontKey] || FONT_STACKS.system;
  document.documentElement.style.setProperty("--app-font", stack);
}

function applyTextScale(sizeKey) {
  const scale = TEXT_SCALES[sizeKey] ?? 1;
  document.documentElement.style.setProperty("--text-scale", scale);
}

function applyBackground(dataUrl) {
  if (dataUrl) {
    el.bgBackdrop.style.backgroundImage = `url("${dataUrl}")`;
    document.body.classList.add("has-bg-image");
  } else {
    el.bgBackdrop.style.backgroundImage = "";
    document.body.classList.remove("has-bg-image");
  }
}

function renderSettingsUI() {
  const theme = state.settings.theme || "dark";
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

  if (state.settings.backgroundImage) {
    el.bgPreview.style.backgroundImage = `url("${state.settings.backgroundImage}")`;
    el.bgPreview.classList.remove("empty");
    el.bgPreview.textContent = "";
  } else {
    el.bgPreview.style.backgroundImage = "";
    el.bgPreview.classList.add("empty");
  }
}

el.settingsBtn.addEventListener("click", () => el.settingsModal.classList.remove("hidden"));
el.closeSettingsBtn.addEventListener("click", () => el.settingsModal.classList.add("hidden"));
el.settingsModal.addEventListener("click", e => {
  if (e.target === el.settingsModal) el.settingsModal.classList.add("hidden");
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

el.removeBgBtn.addEventListener("click", async () => {
  const settings = { ...state.settings, backgroundImage: null };
  await persist({ settings });
  applyBackground(null);
  renderSettingsUI();
  el.bgStatus.textContent = "";
  el.bgFileInput.value = "";
});

el.bgFileInput.addEventListener("change", async () => {
  const file = el.bgFileInput.files && el.bgFileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    el.bgStatus.textContent = "That file isn't an image.";
    el.bgStatus.classList.add("error");
    return;
  }
  el.bgStatus.classList.remove("error");
  el.bgStatus.textContent = "Processing...";
  try {
    const dataUrl = await compressImageFile(file, 1600, 0.82);
    const settings = { ...state.settings, backgroundImage: dataUrl };
    await persist({ settings });
    applyBackground(dataUrl);
    renderSettingsUI();
    el.bgStatus.textContent = "Background updated.";
    setTimeout(() => { el.bgStatus.textContent = ""; }, 1800);
  } catch (err) {
    el.bgStatus.textContent = err && err.message ? err.message : "Couldn't set that image.";
    el.bgStatus.classList.add("error");
  } finally {
    el.bgFileInput.value = "";
  }
});

el.exportDataBtn.addEventListener("click", () => {
  const backup = {
    noteDockBackup: 1,
    exportedAt: new Date().toISOString(),
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    snippets: state.snippets,
    settings: state.settings
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const dateStamp = backup.exportedAt.slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `notedock-backup-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  el.backupStatus.classList.remove("error");
  el.backupStatus.textContent = "Backup downloaded.";
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
      throw new Error("That file doesn't look like a NoteDock backup.");
    }
    const tabCount = data.tabs.length;
    const ok = confirm(
      `Import ${tabCount} note tab${tabCount === 1 ? "" : "s"} from this backup? ` +
      `This replaces everything currently in NoteDock — that can't be undone.`
    );
    if (!ok) {
      el.backupStatus.textContent = "";
      return;
    }

    const tabs = data.tabs.map(t => ({
      id: t.id,
      name: t.name || "Note",
      notes: typeof t.notes === "string" ? t.notes : "",
      highlights: Array.isArray(t.highlights) ? t.highlights : []
    }));
    const activeTabId = tabs.some(t => t.id === data.activeTabId) ? data.activeTabId : (tabs[0] && tabs[0].id) || null;
    const snippets = Array.isArray(data.snippets) ? data.snippets : [];
    const settings = Object.assign({ ...DEFAULT_SETTINGS }, data.settings && typeof data.settings === "object" ? data.settings : {});

    await persist({ tabs, activeTabId, snippets, settings });
    applyTheme(settings.theme);
    applyBackground(settings.backgroundImage);
    applyFont(settings.font);
    applyTextScale(settings.textSize);
    renderAll();

    el.backupStatus.textContent = "Backup imported.";
    setTimeout(() => { el.backupStatus.textContent = ""; }, 1800);
  } catch (err) {
    el.backupStatus.textContent = err && err.message ? err.message : "Couldn't read that backup file.";
    el.backupStatus.classList.add("error");
  } finally {
    el.importDataInput.value = "";
  }
});

// Resizes/compresses to a JPEG data URL, backing off quality if the result
// is still too big for comfortable chrome.storage.local usage.
function compressImageFile(file, maxDimension, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let q = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length > 2_000_000 && q > 0.4) {
          q -= 0.15;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        if (dataUrl.length > 2_000_000) {
          reject(new Error("Image is too large even after compression — try a smaller one."));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------------- Tabs ---------------- */

function renderTabs() {
  el.tabsRow.innerHTML = "";
  state.tabs.forEach(tab => {
    const row = document.createElement("div");
    row.className = "note-tab" + (tab.id === state.activeTabId ? " active" : "");

    const label = document.createElement("span");
    label.textContent = tab.name;
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    row.appendChild(label);

    const closeX = document.createElement("span");
    closeX.className = "close-x";
    closeX.textContent = "✕";
    closeX.title = "Close this note";
    closeX.addEventListener("click", async e => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    row.appendChild(closeX);

    row.addEventListener("click", () => {
      if (tab.id !== state.activeTabId) {
        persist({ activeTabId: tab.id }).then(renderAll);
      }
    });

    row.addEventListener("dblclick", () => startRename(row, tab, label));

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
  let remaining = state.tabs.filter(t => t.id !== tabId);
  let newActive = state.activeTabId;
  if (remaining.length === 0) {
    const fresh = { id: uid(), name: "Note 1", notes: "", highlights: [] };
    remaining = [fresh];
    newActive = fresh.id;
  } else if (tabId === state.activeTabId) {
    newActive = remaining[remaining.length - 1].id;
  }
  await persist({ tabs: remaining, activeTabId: newActive });
  renderAll();
}

el.newTabBtn.addEventListener("click", async () => {
  const n = state.tabs.length + 1;
  const fresh = { id: uid(), name: `Note ${n}`, notes: "", highlights: [] };
  const tabs = [...state.tabs, fresh];
  await persist({ tabs, activeTabId: fresh.id });
  renderAll();
  el.notesArea.focus();
});

/* ---------------- Snippets ---------------- */

function flashCopied(btn) {
  const original = btn.textContent;
  btn.textContent = "Copied";
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("copied");
  }, 1100);
}

function renderSnippets() {
  el.snippetsList.innerHTML = "";

  if (state.snippets.length === 0 && !editingSnippets) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No quick-copy snippets yet. Click the pencil to add one.";
    el.snippetsList.appendChild(empty);
  }

  state.snippets.forEach(snippet => {
    const row = document.createElement("div");
    row.className = "snippet-row" + (editingSnippets ? " edit-mode" : "");

    if (editingSnippets) {
      const handle = document.createElement("span");
      handle.className = "drag-handle";
      handle.title = "Drag to reorder";
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
        e.preventDefault();
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", async e => {
        e.preventDefault();
        row.classList.remove("drag-over");
        if (!dragSrcId || dragSrcId === snippet.id) return;
        const from = state.snippets.findIndex(s => s.id === dragSrcId);
        const to = state.snippets.findIndex(s => s.id === snippet.id);
        if (from === -1 || to === -1) return;
        const reordered = [...state.snippets];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        await persist({ snippets: reordered });
        renderSnippets();
      });

      row.appendChild(handle);

      const labelInput = document.createElement("input");
      labelInput.className = "snippet-label-input";
      labelInput.value = snippet.label;
      labelInput.placeholder = "Label";

      const valueInput = document.createElement("input");
      valueInput.className = "snippet-value-input";
      valueInput.value = snippet.value;
      valueInput.placeholder = "Value";

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
      del.title = "Delete snippet";
      del.innerHTML = trashIcon();
      del.addEventListener("click", async () => {
        const updated = state.snippets.filter(s => s.id !== snippet.id);
        await persist({ snippets: updated });
        renderSnippets();
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
      copyBtn.textContent = "Copy";
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

el.toggleEditSnippets.addEventListener("click", () => {
  editingSnippets = !editingSnippets;
  el.toggleEditSnippets.classList.toggle("active", editingSnippets);
  el.addSnippetRow.classList.toggle("hidden", !editingSnippets);
  renderSnippets();
});

el.addSnippetBtn.addEventListener("click", async () => {
  const label = el.newSnippetLabel.value.trim();
  const value = el.newSnippetValue.value.trim();
  if (!label || !value) return;
  const snippets = [...state.snippets, { id: uid(), label, value }];
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
  el.highlightsList.innerHTML = "";
  const tab = activeTab();
  const highlights = tab ? tab.highlights || [] : [];

  el.clearHighlightsBtn.classList.toggle("hidden", highlights.length === 0);

  if (highlights.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Highlight text on any page, then click \u201cSave to sidebar\u201d to collect it here for this note.";
    el.highlightsList.appendChild(empty);
    return;
  }

  highlights.forEach(h => {
    const row = document.createElement("div");
    row.className = "highlight-row";

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
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(h.text);
      flashCopied(copyBtn);
    });

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.title = "Remove";
    del.innerHTML = trashIcon();
    del.addEventListener("click", async () => {
      const updatedTabs = state.tabs.map(t =>
        t.id === tab.id ? { ...t, highlights: t.highlights.filter(x => x.id !== h.id) } : t
      );
      await persist({ tabs: updatedTabs });
      renderHighlights();
    });

    actions.appendChild(copyBtn);
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
  const ok = confirm(`Delete all ${count} saved highlight${count === 1 ? "" : "s"} for "${tab.name}"? This can't be undone.`);
  if (!ok) return;
  const updatedTabs = state.tabs.map(t => (t.id === tab.id ? { ...t, highlights: [] } : t));
  await persist({ tabs: updatedTabs });
  renderHighlights();
});

/* ---------------- Notes ---------------- */

function renderNotes() {
  const tab = activeTab();
  const value = tab ? tab.notes || "" : "";
  if (document.activeElement !== el.notesArea) {
    el.notesArea.value = value;
  }
}

el.notesArea.addEventListener("input", () => {
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(async () => {
    const tab = activeTab();
    if (!tab) return;
    const updatedTabs = state.tabs.map(t =>
      t.id === tab.id ? { ...t, notes: el.notesArea.value } : t
    );
    await persist({ tabs: updatedTabs });
    el.saveIndicator.textContent = "Saved";
    el.saveIndicator.classList.add("visible");
    setTimeout(() => el.saveIndicator.classList.remove("visible"), 900);
  }, 400);
});

loadState();
