# Changelog

All notable changes to NoteDock are recorded here. Format: newest first.

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
