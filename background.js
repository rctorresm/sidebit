// background.js — service worker
// Keeps almost no state of its own: chrome.storage.local is the single
// source of truth so the side panel (open or closed) and content scripts
// on any tab always agree on what's saved.

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function defaultTab(n) {
  return { id: uid(), name: `Note ${n}`, notes: "", highlights: [], screenshots: [], pinned: false, reminder: null };
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
        savedPagesCollapsed: false,
        highlightPromptEnabled: true
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

    // Lights up the "what's new" badge in the header — cleared the moment
    // someone clicks it. A fresh install has nothing to announce, so this
    // only fires for an actual update.
    await chrome.storage.local.set({ hasUnseenUpdate: true });
  }
});

// Open the side panel when the toolbar icon is clicked.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// The side panel document holds this port open for as long as it's open —
// closing the panel (or navigating away from it) fires onDisconnect. This
// is how content.js knows whether Sidebit is actually open right now,
// so the "Save to sidebar" prompt never shows up with nothing there to
// save to.
//
// The open/closed flag itself lives in chrome.storage.session rather than
// a plain variable: this service worker gets torn down and restarted by
// Chrome after ~30s idle, which would silently reset a plain variable back
// to its default (false) even while the panel is still genuinely open,
// with nothing left to fire onConnect again and correct it. storage.session
// survives that restart — it only clears when the browser itself closes,
// which is the lifetime this actually needs.
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== "sidepanel") return;
  chrome.storage.session.set({ sidePanelOpen: true });
  port.onDisconnect.addListener(() => {
    chrome.storage.session.set({ sidePanelOpen: false });
  });
});

const MAX_HIGHLIGHT_LEN = 4000;
const MAX_META_LEN = 500;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // onMessage already only fires for this extension's own contexts (its
  // content scripts, side panel, etc.) — external pages/extensions land in
  // onMessageExternal instead, which we never register. This check is
  // belt-and-suspenders against a misconfigured future change to that.
  if (sender.id !== chrome.runtime.id) return;

  if (message?.type === "CAN_SHOW_SAVE_PILL") {
    (async () => {
      const [{ settings }, { sidePanelOpen }] = await Promise.all([
        chrome.storage.local.get(["settings"]),
        chrome.storage.session.get(["sidePanelOpen"])
      ]);
      const enabled = !settings || settings.highlightPromptEnabled !== false;
      sendResponse({ allowed: !!sidePanelOpen && enabled });
    })();
    return true;
  }

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

/* ---------------- Reminders ---------------- */
// A reminder is scheduled as a chrome.alarms entry named "reminder-<tabId>"
// (sidepanel.js creates/clears these directly — the alarms permission is
// extension-wide, not background-only). Alarms persist and fire even with
// the panel and browser closed, which is why the follow-through — flipping
// reminder.fired and showing the notification — has to live here rather
// than in the panel's own script.
//
// Notification copy is duplicated here in plain English/Spanish rather than
// pulled from locales.js: that file is only loaded by sidepanel.html, and
// background.js is a separate service worker script with no DOM to load it
// into.
const REMINDER_ALARM_PREFIX = "reminder-";
const REMINDER_NOTIF_PREFIX = "reminder-note-";
const REMINDER_TEXT = {
  en: { title: name => `Reminder for "${name}"`, dismiss: "OK", takeThere: "Take me there" },
  es: { title: name => `Recordatorio para "${name}"`, dismiss: "Aceptar", takeThere: "Llévame allí" }
};

function reminderCopy(settings) {
  return REMINDER_TEXT[settings && settings.language === "es" ? "es" : "en"];
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm.name.startsWith(REMINDER_ALARM_PREFIX)) return;
  const tabId = alarm.name.slice(REMINDER_ALARM_PREFIX.length);

  const { tabs = [], settings } = await chrome.storage.local.get(["tabs", "settings"]);
  const tab = tabs.find(t => t.id === tabId);
  if (!tab || !tab.reminder) return; // cleared or the tab was closed before this fired

  const firedTab = { ...tab, reminder: { ...tab.reminder, fired: true } };
  let updatedTabs;
  if (firedTab.pinned) {
    // Pinned tabs already sort above everything else — nothing to move.
    updatedTabs = tabs.map(t => (t.id === tabId ? firedTab : t));
  } else {
    // Surface the fired tab as a backup for missing or dismissing the OS
    // notification: move it to the front of the unpinned tabs. It never
    // jumps ahead of another tab that's still flashing from an earlier,
    // not-yet-opened reminder though — it lands right after those, so the
    // longest-unopened reminder always stays frontmost.
    const pinned = tabs.filter(t => t.pinned);
    const unpinnedRest = tabs.filter(t => !t.pinned && t.id !== tabId);
    const stillFlashing = unpinnedRest.filter(t => t.reminder && t.reminder.fired);
    const notFlashing = unpinnedRest.filter(t => !(t.reminder && t.reminder.fired));
    updatedTabs = [...pinned, ...stillFlashing, firedTab, ...notFlashing];
  }
  await chrome.storage.local.set({ tabs: updatedTabs });

  const copy = reminderCopy(settings);
  chrome.notifications.create(`${REMINDER_NOTIF_PREFIX}${tabId}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: copy.title(tab.name),
    // `message` is a required field, but the note name is already in the
    // title above — no need to repeat it, so this is just a single space.
    message: " ",
    buttons: [{ title: copy.dismiss }, { title: copy.takeThere }]
  });
});

// Only a fired reminder is cleared here — a defensive check in case this
// somehow runs before the alarm handler above has flipped it.
async function activateNoteTabFromNotification(tabId) {
  const { tabs = [] } = await chrome.storage.local.get(["tabs"]);
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  const updatedTabs = tab.reminder && tab.reminder.fired
    ? tabs.map(t => (t.id === tabId ? { ...t, reminder: null } : t))
    : tabs;
  await chrome.storage.local.set({ tabs: updatedTabs, activeTabId: tabId });

  try {
    const win = await chrome.windows.getLastFocused({ populate: false });
    if (win && win.id !== undefined) await chrome.sidePanel.open({ windowId: win.id });
  } catch {
    // No focused window to open the panel into — nothing more we can do.
  }
}

// Clicking the notification body itself (not a button) just dismisses it,
// same as the "OK" button below — no navigation.
chrome.notifications.onClicked.addListener(notificationId => {
  chrome.notifications.clear(notificationId);
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (!notificationId.startsWith(REMINDER_NOTIF_PREFIX)) return;
  const tabId = notificationId.slice(REMINDER_NOTIF_PREFIX.length);
  chrome.notifications.clear(notificationId);
  if (buttonIndex === 1) await activateNoteTabFromNotification(tabId);
});
