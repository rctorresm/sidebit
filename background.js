// background.js — service worker
// Keeps almost no state of its own: chrome.storage.local is the single
// source of truth so the side panel (open or closed) and content scripts
// on any tab always agree on what's saved.

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function defaultTab(n) {
  return { id: uid(), name: `Note ${n}`, notes: "", highlights: [] };
}

// First install: seed with one example tab and one example snippet so the
// panel isn't blank, but everything is editable/removable immediately.
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["tabs", "snippets", "activeTabId", "settings"]);
  if (!existing.tabs || existing.tabs.length === 0) {
    const firstTab = defaultTab(1);
    await chrome.storage.local.set({
      tabs: [firstTab],
      activeTabId: firstTab.id,
      snippets: existing.snippets && existing.snippets.length
        ? existing.snippets
        : [
            { id: uid(), label: "Support line", value: "1-800-555-0100" },
            { id: uid(), label: "Documents team email", value: "documents@example.com" }
          ]
    });
  }
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: { theme: "dark", backgroundImage: null } });
  }
});

// Open the side panel when the toolbar icon is clicked.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SAVE_HIGHLIGHT") {
    (async () => {
      const { tabs = [], activeTabId } = await chrome.storage.local.get(["tabs", "activeTabId"]);
      let targetTabs = tabs;
      let targetActiveId = activeTabId;

      // Safety net: if for some reason there is no active note tab yet,
      // create one so the highlight has somewhere to land.
      if (!targetTabs.length || !targetTabs.some(t => t.id === targetActiveId)) {
        const fresh = defaultTab(targetTabs.length + 1);
        targetTabs = [...targetTabs, fresh];
        targetActiveId = fresh.id;
      }

      const updated = targetTabs.map(t => {
        if (t.id !== targetActiveId) return t;
        return {
          ...t,
          highlights: [
            {
              id: uid(),
              text: message.text,
              source: message.source || "",
              title: message.title || "",
              url: message.url || "",
              time: Date.now()
            },
            ...t.highlights
          ]
        };
      });

      await chrome.storage.local.set({ tabs: updated, activeTabId: targetActiveId });
      sendResponse({ ok: true });
    })();
    return true; // keep the message channel open for the async response
  }
});
