# NoteDock

A Chrome side panel for keeping notes docked open while you browse: separate
note tabs for whatever you're working on, a set of fixed "quick copy"
snippets you manage yourself, the ability to save highlighted text (and
screenshots) from any page straight into your notes with one click, and
appearance/backup settings on top.

Built to be job-agnostic — it doesn't assume call-center work, sales, support,
or any specific workflow. "Note" tabs are generic containers for whatever the
user is currently focused on. Everything lives in `chrome.storage.local`;
the extension makes zero network requests.

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
  quick-copy snippet list (drag-to-reorder in edit mode), the list of
  highlights saved to the active note tab, a notes textarea that autosaves
  (debounced, 400ms) per tab, a per-tab screenshot gallery, and a Settings
  modal (theme, text size, font, background image, JSON export/import).
- Data model in `chrome.storage.local`:
  ```
  {
    tabs: [{
      id, name, notes,
      highlights: [{ id, text, source, title, url, time }],
      screenshots: [{ id, dataUrl, time }]
    }],
    activeTabId: string,
    snippets: [{ id, label, value }],
    settings: { theme, backgroundImage, font, textSize }
  }
  ```
  `highlights[].url` is a text-fragment deep link (`#:~:text=...`) back to
  the exact highlighted passage, the same mechanism behind Chrome's
  built-in "Copy link to highlight". `screenshots[].dataUrl` comes from
  `chrome.tabs.captureVisibleTab` (viewport-only, not full-page).
- The panel listens for `chrome.storage.onChanged` so it stays in sync
  whether a highlight was saved from a background tab or storage changed in
  another window.
- `unlimitedStorage` and `downloads` permissions exist specifically for
  background images / screenshots and for the screenshot lightbox's
  Download button (`chrome.downloads.download` with `saveAs: true`, so it
  always prompts for a location rather than silently saving).

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
- **Icons are placeholder-quality**, generated programmatically — worth a
  real design pass before a public Chrome Web Store listing.

## Version history

See `CHANGELOG.md`.
