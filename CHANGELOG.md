# Changelog

All notable changes to NoteDock are recorded here. Format: newest first.

## 1.18.0 — 2026-08-07

- Removed the "System" theme option — just Dark and Light now.
- Added custom accent colors in Settings, replacing the old fixed blue.
  Two independent pickers per theme — "Borders & text" and "Buttons"
  (button fill and border always match) — each with 4 small swatches:
  Blue, Purple, Green, and Rose/Pink. Light theme's swatches are darker
  and saturated for contrast against a light background; Dark theme's
  are lighter/pastel for contrast against a dark one. All 8 checked
  against WCAG AA — the lowest is 4.66:1, most are well above 5:1. Each
  theme remembers its own picks independently, so switching Dark/Light
  doesn't reset either one.

## 1.17.1 — 2026-08-07

- Fixed the "Save to sidebar" toggle getting stuck as if it were off even
  after turning it back on. The panel-is-open flag was a plain variable in
  background.js, which Chrome resets when it recycles the (normally idle)
  background service worker — after that, nothing was left to set it back
  to true until the panel was fully closed and reopened. It now lives in
  chrome.storage.session, which survives that recycling.

## 1.17.0 — 2026-08-07

- Dark theme palette redone, modeled on GitHub's Dark theme — one of the
  most widely used dark UI systems, and centered on the same blue-tinted
  "light blue" direction requested instead of neutral gray. Background
  pushed toward true near-black, all muted/secondary text now has a
  distinct blue-gray hue instead of flat gray (and still clears WCAG AA:
  "Notes"-style section titles are 5.07:1, was 3.44:1 the version before),
  and the accent blue, success green, danger red, and Quick Copy orange
  are all more saturated and vivid.
- New toggle next to the "Saved from pages" title: turns the on-page
  "Save to sidebar" prompt off entirely. When off, or whenever NoteDock's
  side panel itself is closed, no prompt appears on any page — only shows
  when the panel is genuinely open AND the toggle is on. Detecting
  "panel is open" uses a live port connection from the panel to
  background.js (the standard way to do this in a Chrome extension,
  since there's no direct open/close event); the content script asks
  background.js "is it OK to show the prompt right now?" for every
  selection instead of assuming.

## 1.16.0 — 2026-08-07

- Removed the item/word count from "Saved from pages" — the counting
  logic is still there (unused for now), just not shown.
- Reworked the Dark theme palette for legibility and a punchier, more
  pastel feel: background pushed closer to true black, primary text
  brightened, and — the main fix — `--text-faint` (used everywhere:
  section titles, placeholders, hints, icon borders) was only 3.44:1
  contrast against the background, below the WCAG AA minimum. It's now
  5.52:1. Accent blue, success green, danger red, and the Quick Copy
  scope-all orange are all brighter/more saturated too. Also fixed a
  latent bug this surfaced: the delete-button hover state used hardcoded
  white text on the danger color, which fails contrast once danger is
  brighter — now uses the same dark-on-bright text token buttons use.
  Light theme is unchanged.

## 1.15.3 — 2026-08-07

- Fixed the Notes quip getting cut off with "..." on longer lines. It now
  sits on its own full-width line under the title and wraps to a second
  (or third) line instead of truncating, so the whole quip is always
  readable even at the narrowest panel width.

## 1.15.2 — 2026-08-07

- Fixed the Capture hint's wording: it now reads "Paste ↑ or →", spelling
  out both ways to get a screenshot in — paste from your OS tool above
  (into Notes) or click Capture — instead of a single arrow.

## 1.15.1 — 2026-08-07

- Added a small "Paste →" hint next to the Screenshots Capture button, so
  the paste-a-screenshot behavior (explained in the info tooltip) is
  visible at a glance instead of only on hover.
- Fixed low-contrast text on all accent-colored buttons (Capture, Add,
  Download, Export data) in Light theme — the near-black label text was
  only legible against the brighter blue used in Dark theme; against
  Light theme's more saturated blue it fell to a 3.79:1 contrast ratio,
  below the WCAG AA minimum. Button text color is now theme-aware (white
  on Light's accent, near-black on Dark's) — 5.17:1 and 5.91:1
  respectively.

## 1.15.0 — 2026-08-07

- The Notes counter is now a movie-quip generator instead of a plain
  word/char count. Every 25 characters (up to 1,000, then wider bands)
  pulls a random line from a pool of Marvel, DC, Star Wars, Harry Potter,
  Lord of the Rings/Hobbit, and Chuck Norris references — picked the
  moment you cross into that length range, held steady while you keep
  typing so it doesn't flicker every keystroke, and never repeating the
  same line back-to-back for that specific range even if you bounce
  across the boundary. Each note tab has its own independent quip memory.
  Purely cosmetic — no data collected, nothing sent anywhere.

## 1.14.0 — 2026-08-07

- New defaults for first install: Light theme, Medium text, System font
  (previously Dark/Medium/System).
- Removed the background image feature — with opaque panels sitting on
  top of it, an uploaded photo mostly just got covered, defeating the
  point. May come back later as purpose-built artwork designed to work
  with the panel layout instead of a generic photo.
- Fixed the screenshot Capture button's permission error ("Either the
  '<all_urls>' or 'activeTab' permission is required"): host_permissions
  now declares the literal `<all_urls>` pattern — `captureVisibleTab`
  specifically checks for that exact permission string rather than
  treating the equivalent `http://*/*` + `https://*/*` wildcards as
  sufficient, unlike most other APIs.
- New: paste a screenshot straight from your OS's own screenshot tool
  (Win+Shift+S, Cmd+Shift+4, etc.) into Notes — it's detected and moved
  into the Screenshots gallery automatically instead of pasting broken
  image data as text. Works alongside the existing Capture button;
  useful when you need a freeform region or something outside the
  browser tab entirely, which Capture can't do.

## 1.13.0 — 2026-08-07

- No more manual page refresh after a NoteDock update: when the
  extension updates, it now automatically re-injects the new
  `content.js` into every already-open tab (and their frames), so a
  page you can't afford to reload — e.g. a call-center agent's softphone
  running inside a CRM tab — picks up the fix without navigating away.
  New `scripting` permission, used only for this.
- content.js is now safe to inject more than once into the same page:
  it tears down its previous listeners/pill before attaching new ones,
  so re-injection on update can't cause duplicate pills or double-saved
  highlights. Verified directly: injecting twice in the same page still
  produces exactly one pill and exactly one save call.

## 1.12.0 — 2026-08-07

- Saved from pages is now collapsible, same pattern as Quick copy
  (chevron next to the trash icon, remembers your preference).
- Simplified saved highlights: capture the plain page URL instead of a
  deep "scroll to this exact text" link — one less thing that can go
  wrong, and the source is shown as a small link icon next to Copy
  instead of a clickable hostname, for a more compact row. Existing
  saved highlights with the old deep-link format still work fine.

## 1.11.2 — 2026-08-07

- Fixed another highlight-to-save gap: `all_frames` alone doesn't reach
  iframes with no real URL (`about:blank`/`about:srcdoc`) — the common
  pattern for rich-text editors (e.g. a Zendesk-style reply composer)
  that build an iframe in JS rather than loading a page into it. Added
  `match_origin_as_fallback: true` so those inherit their parent's
  origin for content-script matching.

## 1.11.1 — 2026-08-07

- Simplified Quick copy scope: removed the "This tab only" checkbox from
  the Add row — it was a second control doing the same job as the
  per-row scope dot. New snippets now always start as "All tabs"; click
  the dot right after adding one if you want it tab-only, same as any
  existing entry.

## 1.11.0 — 2026-08-07

- Quick copy split: snippets can now be "All tabs" (today's behavior —
  visible everywhere, orange ring, legend dot next to the info tooltip)
  or "This tab only" (visible only on the tab that created them, normal
  look). All-tabs entries always sort above this-tab-only ones; each
  group reorders independently via drag (can't mix groups).
  - New snippets: a "This tab only" checkbox in the Add row.
  - Existing snippets: a small toggle dot in edit mode flips scope —
    filled orange for All tabs, hollow for this-tab-only.
  - Search, Undo, and Recently Deleted are all scope-aware — search
    shows a "<tab name> only" hint and switches tabs when you click a
    tab-specific result; Undo only offers deletions relevant to what's
    currently visible.
  - Snippets created before this update default to "All tabs" — nothing
    changes for existing data.

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
