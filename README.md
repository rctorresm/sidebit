# Sidebit

A Chrome side panel for keeping notes docked open while you browse: separate
note tabs for whatever you're working on, quick-copy snippets (global or
scoped to a single tab), the ability to save highlighted text and
screenshots from any page straight into your notes with one click, per-note
reminders, and appearance/backup settings on top.

Built to be job-agnostic — it doesn't assume call-center work, sales, support,
or any specific workflow. "Note" tabs are generic containers for whatever the
user is currently focused on. Everything lives in `chrome.storage.local`;
the extension makes zero network requests — reminders use Chrome's own
on-device `alarms`/`notifications` APIs, not a remote service.

## Install (unpacked)

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Pin the extension so it's always visible, then click it to open the side
   panel.

## How it works, for anyone picking this up

- `manifest.json` — Manifest V3, uses the native `sidePanel` API so the panel
  persists across tab switches without being injected into every page.
- `background.js` — service worker. Owns nothing in memory; `chrome.storage.local`
  is the single source of truth. Seeds default data on install, and is the
  landing point for `SAVE_HIGHLIGHT` messages from content scripts so a
  highlight can be saved even if the panel isn't currently open.
- `content.js` — runs on every page. Completely idle until the user makes a
  text selection; then it renders one small Shadow DOM pill near the
  selection ("Save to sidebar") and tears it down again immediately after.
  No persistent overlay, no polling, no page mutation.
- `sidepanel.html/css/js` — the panel UI itself. Renders note tabs
  (pin + drag-to-reorder, pinned always sort first; each has a bell icon
  for setting a reminder), the quick-copy snippet list (drag-to-reorder in
  edit mode, split into global "All tabs" and single-tab-scoped entries),
  the highlights saved to the active note tab, a notes textarea that
  autosaves (debounced, 400ms) and auto-grows with content, a per-tab
  screenshot gallery, global search, a Recently Deleted trash with
  per-section Undo, and a Settings modal (theme, text size, font, JSON
  export/import).
- Data model in `chrome.storage.local`:
  ```
  {
    tabs: [{
      id, name, notes, pinned,
      highlights: [{ id, text, source, title, url, time }],
      screenshots: [{ id, dataUrl, time }],
      reminder: { id, time, fired } | null
    }],
    activeTabId: string,
    snippets: [{ id, label, value, scope: "all" | "tab", tabId }],
    settings: { theme, font, textSize, quickCopyCollapsed, savedPagesCollapsed },
    trash: [{ id, type, deletedAt, index, ...typeSpecificFields }]
  }
  ```
  A reminder is scheduled as a `chrome.alarms` entry named
  `reminder-<tabId>`, created/cleared directly from `sidepanel.js`. When it
  fires, `background.js` (woken by the alarm even if the panel and browser
  were closed) flips `reminder.fired` to `true` and shows a
  `chrome.notifications` popup with "OK" and "Take me there" buttons. The
  note tab flashes red the whole time `fired` is `true` — dismissing the
  notification doesn't clear it; only actually opening that note (clicking
  its tab, "Take me there", or a search result) does, by setting
  `reminder` back to `null`. The same alarm handler also moves the fired
  tab to the front of the unpinned tabs (a pinned tab's firing doesn't move
  it) as a backup for missing the notification — but never ahead of another
  tab that's still flashing from an earlier, not-yet-opened reminder, so
  the longest-waiting one stays frontmost. It's a one-time move at fire
  time, not an ongoing sort, so dragging a tab afterward sticks. Closing a
  note tab cancels any pending alarm and drops its reminder rather than
  carrying a stale one into the trash.
  `highlights[].url` is the plain source page URL. `screenshots[].dataUrl`
  comes either from `chrome.tabs.captureVisibleTab` (viewport-only, not
  full-page) or from pasting an image (e.g. from the OS's own snipping
  tool) directly into the Notes textarea, which moves it to the
  screenshot gallery instead of pasting broken image data as text.
- The panel listens for `chrome.storage.onChanged` so it stays in sync
  whether a highlight was saved from a background tab or storage changed in
  another window.
- Permission notes: `alarms` schedules per-note reminders so they still fire
  after the panel or browser was closed; `notifications` shows the popup
  when one does. Neither involves a network call — both are on-device
  Chrome APIs. `unlimitedStorage` is for screenshots (potentially many,
  uncompressed PNGs); `downloads` is for the screenshot lightbox's Download
  button (`chrome.downloads.download` with `saveAs: true`, always prompts
  for a location rather than silently saving); `scripting` is used only by
  `background.js` to re-inject `content.js` into already-open tabs when the
  extension updates, so a page you can't afford to refresh — e.g. a
  call-center agent's softphone running inside a CRM tab — still picks up
  the fix. `host_permissions` is `<all_urls>` rather than separate
  `http`/`https` patterns because `chrome.tabs.captureVisibleTab` (used by
  the screenshot Capture button) specifically checks for that permission
  string rather than treating equivalent wildcard patterns as sufficient.

## Known gaps / good next steps for a developer

- **No auto-creation of a new note tab based on external triggers.** One
  motivating use case was call-center work, where a new note tab should
  ideally appear automatically when a new customer call starts (e.g.
  detecting state in Zendesk or Amazon Connect). That would mean either
  watching the DOM of a specific site from a scoped content script, or
  listening for a webhook / extension messaging API if the platform exposes
  one. Kept out of this version because it's tightly coupled to whatever
  specific tool the user is on at a given job — the hook point in
  `background.js` (the `SAVE_HIGHLIGHT` message handler) is a reasonable
  model to copy for a `NEW_NOTE` trigger.
- **No AI-assisted features yet** (e.g., auto-flagging keywords on a page,
  summarizing highlights, structured extraction from a page). Nothing in the
  current architecture blocks adding this — a content script could post page
  text to a background call to a summarization API, or highlights could be
  batch-processed on save.
- **No real cross-device sync.** Export/Import (Settings > Backup) covers
  manual transfer between machines; there's no automatic sync.
  `chrome.storage.sync` exists but caps out around 100KB total — nowhere
  near enough once screenshots are involved. Real sync means a backend.
- **No automated tests.** It's small enough that this was done manually so
  far; a `tests/` folder with basic DOM/unit tests around the storage-sync
  logic in `sidepanel.js` would be the highest-value addition.

## Version history

See `CHANGELOG.md`.
