# NoteDock

A Chrome side panel for keeping notes docked open while you browse: separate
note tabs for whatever you're working on, a set of fixed "quick copy"
snippets you manage yourself, and the ability to save highlighted text from
any page straight into your notes with one click.

Built to be job-agnostic — it doesn't assume call-center work, sales, support,
or any specific workflow. "Note" tabs are generic containers for whatever the
user is currently focused on.

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
- `sidepanel.html/css/js` — the panel UI itself. Renders note tabs, the
  quick-copy snippet list (with an edit mode), the list of highlights saved
  to the active note tab, and a notes textarea that autosaves (debounced,
  400ms) per tab.
- Data model in `chrome.storage.local`:
  ```
  {
    tabs: [{ id, name, notes, highlights: [{ id, text, source, title, time }] }],
    activeTabId: string,
    snippets: [{ id, label, value }]
  }
  ```
- The panel listens for `chrome.storage.onChanged` so it stays in sync
  whether a highlight was saved from a background tab or storage changed in
  another window.

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
- **No sync across devices.** Currently `chrome.storage.local` (5MB cap,
  device-local). Could move to `chrome.storage.sync` (much smaller cap,
  ~100KB) or a real backend if cross-device persistence becomes a
  requirement.
- **No automated tests.** It's small enough that this was done manually so
  far; a `tests/` folder with basic DOM/unit tests around the storage-sync
  logic in `sidepanel.js` would be the highest-value addition.
- **Icons are placeholder-quality**, generated programmatically — worth a
  real design pass if this becomes a public listing.

## Version history

See `CHANGELOG.md`.
