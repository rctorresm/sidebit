const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

let state = { tabs: [], activeTabId: null, snippets: [] };
let editingSnippets = false;
let notesSaveTimer = null;

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
  notesArea: document.getElementById("notesArea"),
  saveIndicator: document.getElementById("saveIndicator")
};

function activeTab() {
  return state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0];
}

async function persist(partial) {
  Object.assign(state, partial);
  await chrome.storage.local.set(partial);
}

async function loadState() {
  const data = await chrome.storage.local.get(["tabs", "activeTabId", "snippets"]);
  state.tabs = data.tabs || [];
  state.activeTabId = data.activeTabId || (state.tabs[0] && state.tabs[0].id) || null;
  state.snippets = data.snippets || [];
  renderAll();
}

// Re-render if data changes elsewhere (a highlight saved from a page,
// or storage synced from another window).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.tabs) state.tabs = changes.tabs.newValue || [];
  if (changes.activeTabId) state.activeTabId = changes.activeTabId.newValue;
  if (changes.snippets) state.snippets = changes.snippets.newValue || [];
  renderAll();
});

function renderAll() {
  renderTabs();
  renderSnippets();
  renderHighlights();
  renderNotes();
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

    const source = document.createElement("span");
    source.className = "highlight-source";
    source.textContent = h.source || "";
    source.title = h.title || "";

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
