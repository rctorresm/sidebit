// background.js — service worker
// Keeps almost no state of its own: chrome.storage.local is the single
// source of truth so the side panel (open or closed) and content scripts
// on any tab always agree on what's saved.

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function defaultTab(n) {
  return { id: uid(), name: `Note ${n}`, notes: "", highlights: [], screenshots: [], pinned: false };
}

// First install: seed one blank note tab so there's somewhere to type —
// no example snippets or placeholder content. Everything starts empty.
chrome.runtime.onInstalled.addListener(async details => {
  const existing = await chrome.storage.local.get(["tabs", "snippets", "activeTabId", "settings"]);
  if (!existing.tabs || existing.tabs.length === 0) {
    const firstTab = defaultTab(1);
    await chrome.storage.local.set({
      tabs: [firstTab],
      activeTabId: firstTab.id,
      snippets: existing.snippets || []
    });
  }
  if (!existing.settings) {
    await chrome.storage.local.set({
      settings: {
        theme: "light",
        font: "system",
        textSize: "medium",
        quickCopyCollapsed: false,
        savedPagesCollapsed: false
      }
    });
  }

  // On update, re-inject the new content.js into tabs that were already
  // open — otherwise they'd keep running the old version until manually
  // refreshed, which isn't an option for e.g. a call-center agent mid-call
  // on a page hosting their softphone.
  if (details.reason === "update") {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["content.js"]
        });
      } catch {
        // Not injectable (chrome://, the Web Store, a not-yet-loaded tab,
        // another extension's page, etc.) — skip it silently.
      }
    }
  }
});

// Open the side panel when the toolbar icon is clicked.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const MAX_HIGHLIGHT_LEN = 4000;
const MAX_META_LEN = 500;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // onMessage already only fires for this extension's own contexts (its
  // content scripts, side panel, etc.) — external pages/extensions land in
  // onMessageExternal instead, which we never register. This check is
  // belt-and-suspenders against a misconfigured future change to that.
  if (sender.id !== chrome.runtime.id) return;

  if (message?.type === "SAVE_HIGHLIGHT" && typeof message.text === "string" && message.text.trim()) {
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
              text: message.text.slice(0, MAX_HIGHLIGHT_LEN),
              source: String(message.source || "").slice(0, MAX_META_LEN),
              title: String(message.title || "").slice(0, MAX_META_LEN),
              url: String(message.url || "").slice(0, MAX_HIGHLIGHT_LEN + 200),
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
