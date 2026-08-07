# Changelog

All notable changes to NoteDock are recorded here. Format: newest first.

## 1.5.0 — 2026-08-07

- Global search (magnifying-glass icon in the header): searches note tab
  names/notes, quick-copy snippets, and saved highlights all at once,
  grouped results with the matched text marked. Clicking a result jumps to
  it — switches note tab if needed, selects the matched text in Notes,
  or scrolls to and briefly highlights the matching snippet/highlight row.

## 1.4.0 — 2026-08-07

- Screenshots: a Capture button at the bottom of Notes grabs the visible
  page (`chrome.tabs.captureVisibleTab`) and adds it to a per-note-tab
  thumbnail gallery, newest first. Click a thumbnail to open it in a
  lightbox with Download (real "Save As" prompt via `chrome.downloads`,
  new `downloads` permission), Copy (image to clipboard), and Delete.
- Screenshots carry over correctly through Export/Import backups.

## 1.3.0 — 2026-08-07

- Settings: Export data downloads everything (tabs, snippets, settings) as
  a dated JSON backup file. Import data restores from one, after a
  confirmation since it replaces everything currently stored. Clarifies
  that `chrome.storage.local` already survives browser/computer restarts
  on its own — this is insurance against uninstall, profile loss, or
  moving to a new machine, not a "save button" for day-to-day use.

## 1.2.1 — 2026-08-07

- "Saved from pages" panel: added a Delete All action (with confirmation)
  next to the section heading, for clearing out an active note's saved
  highlights in one step. Only appears when there's something to clear.

## 1.2.0 — 2026-08-07

- Settings: Text size (Small/Medium/Large) and Font (System, Georgia,
  Verdana — chosen for on-screen readability) apply live across the whole
  panel. Purely visual: copy/paste still moves plain text, unaffected by
  either choice.
- Security hardening ahead of Chrome Web Store submission: the background
  service worker now verifies message sender identity and caps/sanitizes
  all fields on incoming highlight-save messages (defense-in-depth; no
  vulnerability was exploitable before this, see audit notes).

## 1.1.0 — 2026-08-07

- Quick-copy snippets can be reordered by dragging the handle on each row
  while in edit mode.
- Settings panel (gear icon in the header): choose Dark, Light, or System
  theme, and set a custom background image (auto-compressed on upload,
  scales to cover the panel at any width).
- Saved highlights now link the source hostname to the exact highlighted
  text on the original page, using the same text-fragment mechanism as
  Chrome's built-in "Copy link to highlight".
- Added `unlimitedStorage` permission to comfortably fit background images
  alongside notes/highlights in `chrome.storage.local`.

## 1.0.0 — 2026-08-06

Initial version.

- Side panel UI (Chrome native Side Panel API) that stays docked while
  browsing.
- Note tabs: create, rename (double-click), close. Each tab has its own
  notes and its own list of saved highlights.
- Quick-copy snippets: user-managed list of fixed text (e.g. phone numbers,
  emails) with one-click copy, editable in place.
- Highlight-to-save: selecting text on any page shows a small "Save to
  sidebar" pill; clicking it saves the text to the active note tab, tagged
  with the source page.
- Notes autosave per tab (debounced).
- All data stored locally via `chrome.storage.local`.
