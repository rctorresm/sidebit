# Changelog

All notable changes to NoteDock are recorded here. Format: newest first.

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
