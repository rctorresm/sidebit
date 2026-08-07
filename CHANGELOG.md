# Changelog

All notable changes to NoteDock are recorded here. Format: newest first.

## 1.10.0 — 2026-08-07

- Pin & reorder note tabs: hover a tab to reveal a pin icon (always
  visible once pinned); pinned tabs always sort before unpinned ones.
  Drag to reorder tabs within their own group — pinned and unpinned
  tabs can't be mixed by dragging.
- Closing a tab that has notes, highlights, or screenshots now asks for
  confirmation first (mentioning it can still be undone or restored from
  Recently Deleted). Closing a genuinely empty tab skips the prompt.

## 1.9.0 — 2026-08-07

- Undo: a small undo icon now appears next to "+ New note", in Quick
  copy, Saved from pages, and Screenshots — but only when there's
  something recent to undo for that section. Restores the most recent
  matching deletion (repeatable — the next click naturally targets the
  next-most-recent one). Deeper history still lives in Settings >
  Recently deleted.

## 1.8.0 — 2026-08-07

- Fixed: "Save to sidebar" now appears for text highlighted inside a
  form field (`<input>`/`<textarea>`) — e.g. a reply box or a data table
  cell that's actually an editable field. The page's normal text
  selection API can't see into form fields at all, so this reads the
  field's own selection directly instead. (`type="password"` fields are
  deliberately excluded.)
- Fixed: the content script now runs inside embedded iframes too
  (`all_frames: true`), so highlighting text inside an embedded
  widget/dashboard (e.g. an Amazon Connect panel) works the same as the
  main page.
- Note: the Chrome Web Store itself is permanently off-limits to every
  extension's content scripts — that's a Chrome-enforced restriction, not
  something an extension can work around.

## 1.7.0 — 2026-08-07

- Word/character counters: Notes shows a live count while typing; Saved
  from pages shows a running total ("3 items · 187 words") for the active
  note.
- Notes now auto-grows with content instead of stretching to fill the
  panel — starts around 4 lines, grows up to ~25 lines, then scrolls
  internally past that. Screenshots (which live below Notes in the same
  panel) get pushed down as Notes grows, with the page scrolling normally
  once everything doesn't fit.
- Quick copy: collapsible (chevron next to the pencil, remembers your
  preference) and rows are more compact. A hover/focus "i" info tooltip
  was added to Quick copy, Saved from pages, Notes, and Screenshots,
  explaining what each section is for.
- Quick copy's edit-mode value field is now an auto-growing textarea
  (paragraph-friendly) instead of a single-line input that scrolled
  sideways; the read-only preview afterward is unchanged.
- First install no longer seeds example snippets ("Support line",
  "Documents team email") — Quick copy starts empty. Still seeds one
  blank note tab so there's somewhere to type.

## 1.6.0 — 2026-08-07

- Recently Deleted (Settings > Recently deleted): closing a note tab,
  deleting a highlight (single or "Delete All"), deleting a snippet, or
  deleting a screenshot now lands in a unified, restorable trash list
  instead of disappearing immediately. Each entry shows a type tag, an
  excerpt, and a relative time; Restore puts it back (in its original
  position where that's meaningful), recreating the parent note tab by
  name first if that was deleted too. Capped at the last 50 deletions,
  oldest dropped silently past that — no time-based expiry. "Empty trash"
  clears it permanently. Trash is carried through Export/Import backups.
- Fixed: the Settings modal had no scroll handling, so on a full panel it
  could overflow past the visible area with no way to reach the rest —
  now scrolls properly.

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
