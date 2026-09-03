# Changelog

All notable changes to Sidebit (formerly NoteDock) are recorded here.
Format: newest first.

## 1.31.0 — 2026-09-03

- Added a "What's new" icon (gift icon, next to Settings) that gets a small
  dot whenever Sidebit updates itself in the background — since the
  extension auto-updates silently, this is the first visible way to learn
  that something changed and what it was. Click it to open a hosted
  changelog page in a new tab (kept outside the extension package so it can
  be edited any time without shipping a new version); the dot clears the
  moment it's clicked. Lights up only on a real update
  (`chrome.runtime.onInstalled` with `reason === "update"`, the same signal
  already used for re-injecting `content.js`) — never on a fresh install.
- Reminder time entry now formats itself as you type: entering `915` shows
  `9:15` as soon as the third digit lands, and it keeps reshaping live
  (`1030` → `10:30` as the fourth digit arrives) — typing is still just
  numbers, nothing new to learn. The colon is inserted before the last two
  digits, which is exactly how the field already decided hour vs. minutes,
  so nothing about validation or saving changed, only the display.
  Reopening a saved reminder now shows the colon too instead of the raw
  digits it used to. Placeholder text and a small hint under the field spell
  out that only numbers need to be typed.
- An accidental leading zero (e.g. typing `0510` instead of `510`) is now
  dropped once a later digit makes clear more of the number is coming, so it
  still reads as `5:10` instead of `05:10` — a leading zero was never a real
  hour digit on this 12-hour, AM/PM-toggle field to begin with.

## 1.30.0 — 2026-09-02

- A reminder firing now also surfaces its note tab: it moves to the front
  of your unpinned tabs (right after any pinned ones) instead of relying
  only on the flash and the notification to be noticed. Backup for the
  case where you miss the notification or hit "OK" by mistake with a
  dozen tabs open and no idea which one it was for.
- It never jumps ahead of another tab that's still flashing from an
  earlier, not-yet-opened reminder — a newly-fired tab lands right after
  those, so whichever reminder has been waiting longest always stays
  frontmost. A pinned tab's reminder firing doesn't move it at all, since
  pinned tabs already sort above everything else.
- This is a one-time move at the moment it fires, not a standing rule —
  drag it anywhere afterward (before or after opening it) and it stays
  put, same as any other tab.

## 1.29.0 — 2026-09-02

- Added per-note reminders: hover a note tab to reveal a bell icon (stays
  visible once a reminder is set); click it to pick a date (native calendar
  picker) and a time. The time field just takes typed digits — `915` →
  9:15, `1001` → 10:01 — plus an AM/PM toggle, so there's no fiddly
  click-between-preset-slots. Only one reminder per note tab; setting a new
  one replaces the old.
- When a reminder fires — even if the panel or browser was closed at the
  time — a notification appears ("Reminder for '<note name>'") with two
  buttons: "OK" just dismisses it, and "Take me there" opens the side panel
  and switches straight to that note. Either way, the note tab itself
  starts flashing red and keeps flashing (independent of the notification)
  until that note is actually opened — clicking its tab, "Take me there",
  or a matching search result all clear it; dismissing the notification
  alone does not.
- New `alarms` and `notifications` permissions, both purely on-device —
  reminders don't add any network requests.
- Closing a note tab cancels its pending reminder outright rather than
  carrying it into Recently Deleted, so a restored tab never comes back
  with a stale alarm or a phantom flash.
- Fixed "Take me there": it correctly stopped the flash and switched the
  active tab internally, but if Notes still had focus (e.g. you were mid-
  typing when the reminder fired), the textarea kept showing the old note
  instead of the one you were taken to — a guard meant to protect
  in-progress typing from being overwritten by unrelated syncs was also
  blocking the deliberate tab switch. Fixed alongside it: typing in Notes,
  then switching tabs before the 400ms autosave debounce finishes, could
  save that text into the wrong note (or have it overwritten before it
  saved) — the debounce now captures both the target note and the typed
  text at keystroke time instead of reading them again when the timer
  fires.

## 1.28.0 — 2026-08-14

- Added Spanish as a second language. New "Language" section at the top of
  Settings — switching is instant, no reload needed, and it's independent
  of what language Chrome itself is set to. Covers every button, label,
  tooltip, and confirmation dialog in the app.
- Quips (the Marvel/DC/Star Wars/etc. one-liners next to the Notes word
  count) are English wordplay that doesn't translate — in Spanish mode
  they're replaced with a plain word count instead of a mistranslated joke.
  Still English-only for now; may get a real Spanish pass later.
- Purely local: no new permissions, no network calls. Both languages ship
  as plain text files bundled in the extension package, same as everything
  else here.

## 1.27.0 — 2026-08-14

- Saved from pages: each card now has a subtle border (matches the border
  color used elsewhere in the app) so cards are easier to visually separate.
- Saved from pages: added a "Link" button next to "Copy" on any highlight
  that has a source page — copies the link back to where it was
  highlighted, so you don't have to open the page just to grab the URL.
  Highlights with no source URL still show just Copy, as before.
- Screenshots: the "Paste ↑ or →" hint is now a darker gray — it was
  blending into the background too much to read comfortably.
- Quick copy: the "i" info tooltip now explains what the orange dot / "All
  tabs" label actually means and how to toggle a snippet between "All
  tabs" and "this note only" from Manage snippets — that distinction
  wasn't obvious from the small dot alone.

## 1.26.0 — 2026-08-08

- Notes: a red trash-can button (top-right of the Notes header, only
  shown when there's something to clear) wipes the current note's text
  in one click instead of select-all-and-delete. Prompts for
  confirmation first, and — matching every other delete in the app — the
  cleared text is recoverable from Settings > Recently deleted. If you'd
  already typed something new before restoring, the restored text is
  placed above it instead of overwriting it.

## 1.25.0 — 2026-08-08

- Screenshots: "Select" is now a labeled button next to Capture (Capture
  first, Select after) instead of a small, easy-to-miss icon.
- Screenshot thumbnails get a second hover button — a delete icon at the
  bottom-right (copy stays top-right) — for removing a single screenshot
  without opening it first. Asks for confirmation before deleting, same
  as every other delete in the app, and the deleted screenshot is still
  recoverable from Recently Deleted.
- Every trash-can icon in the app (Clear all highlights, Delete selected
  screenshots, the new per-thumbnail delete, and the existing snippet/
  highlight delete buttons) now uses the same vibrant red so delete
  actions are easy to spot at a glance.

## 1.24.2 — 2026-08-08

- Reverted the "Saved from pages" link icon button — too small to
  comfortably resize. Back to how it started: the source hostname itself
  is the clickable link to the highlighted spot (underlines on hover),
  no separate button next to Copy.

## 1.24.1 — 2026-08-08

- Quick copy's header buttons now match Saved from Pages: collapse
  chevron is always the rightmost button, with Manage snippets (pencil)
  before it instead of after.

## 1.24.0 — 2026-08-08

- Settings gear icon is a bit bigger (14px → 18px) — it was reading as
  too small, especially against the larger text sizes below.
- Text size tiers shifted up ~2px across the board (Small/Medium/Large
  scale factors: 0.92/1/1.15 → 1.07/1.15/1.3) — Small was uncomfortably
  tight, so the whole range moved up a notch. New Medium renders at
  roughly the old Large size.
- Default text size is now Medium instead of Large, since Medium is now
  sized comfortably enough to be the everyday default. (Existing
  installs keep whatever size they already have selected — this only
  affects fresh installs.)

## 1.23.0 — 2026-08-08

- "Save to sidebar" now also copies the highlighted text to the
  clipboard, so pasting right after saving grabs what you just
  highlighted instead of whatever was on the clipboard before. The pill
  reads "Saved & copied" when both succeed. Best-effort: if the clipboard
  write fails (e.g. an unfocused iframe), the save still goes through and
  the pill just reads "Saved" as before.

## 1.22.1 — 2026-08-08

- Restored the "link back to the exact spot" behavior for saved
  highlights: the source link now uses a `#:~:text=` deep-link fragment
  again (same mechanism as Chrome's built-in "Copy link to highlight"),
  instead of just linking the plain page URL. This was simplified away in
  v1.12.0 to rule it out as a cause of the Zendesk "Save to sidebar" pill
  not appearing — that turned out to be unrelated and was fixed
  separately in v1.13.0 (iframe re-injection), so there was no longer a
  reason to keep the plain-URL version. Existing saved highlights with
  the plain-URL format still open fine.

## 1.22.0 — 2026-08-08

- Reworked the accent color settings: the "Borders & text" row is now
  "Borders & boxes" — general UI text (panel titles, quips, tooltips, tab
  labels) is back to a flat neutral gray (`--text-dim`) regardless of the
  chosen accent, while the accent color now also outlines and lightly
  tints the four main panel boxes (Quick Copy, Saved from Pages, Notes,
  Screenshots), on top of what it already colored (borders, active tab,
  focus rings, etc.). The actual notes textarea is untouched either way.
- Added a gray "Default" swatch as the first option in all four accent
  rows (light/dark × borders-and-boxes/buttons) — an easy way back to an
  uncolored look without hunting for the original blue.
- New installs now default to the Verdana font and Large text size
  instead of System/Medium.

## 1.21.0 — 2026-08-08

- Renamed the extension from NoteDock to Sidebit — the manifest name,
  page title, backup file naming (`sidebitBackup` marker,
  `sidebit-backup-*.json`, `sidebit-screenshot-*.png`), all in-app copy,
  README, and the published privacy policy. The icon didn't need any
  rework — it's an abstract mark that never spelled out the old name.
  Older backup files still import fine; the validator never actually
  checked the marker field, only the data shape. Historical changelog
  entries below keep the old name since they're an accurate record of
  what was true at the time.

## 1.20.1 — 2026-08-07

- Notes box now starts at 15 lines tall instead of ~4. Still grows with
  content up to 25 lines, then scrolls internally past that — that part
  was already built, only the starting height changed.

## 1.20.0 — 2026-08-07

- Removed the in-app "NoteDock" header (icon + wordmark) — it duplicated
  Chrome's own side panel title bar, which already shows the name and
  the new icon. The header is now just the search bar, made permanently
  visible instead of hidden behind a magnifying-glass toggle, plus the
  Settings gear in the corner as before.

## 1.19.1 — 2026-08-07

- Redesigned the extension icon (16/48/128px) — a dark navy badge with a
  simple two-block glyph: a wide "page" block and a narrower "docked
  panel" block in accent blue, literally depicting what the extension
  does. Replaces the placeholder-quality programmatically-generated
  icons. Checked for legibility at all three shipped sizes, including
  against both light and dark toolbar backgrounds at true 16px.

## 1.19.0 — 2026-08-07

- Screenshots gallery: new Select mode (icon button next to Capture, shown
  once you have screenshots) — pick individual thumbnails or Select all,
  then Delete or Download the batch. Deliberately not called "copy" for
  the multi-select case: the system clipboard can only hold one image at
  a time regardless of what any app does, so a real multi-copy isn't
  possible — Download is the equivalent that actually works for grabbing
  several at once. Deleted screenshots still go through Recently Deleted
  individually, so each stays undoable. Bulk downloads skip the per-file
  save dialog (straight to the Downloads folder) — prompting once per
  file would be unusable for more than one or two images.
- Added a small copy icon directly on each screenshot thumbnail (hover to
  reveal) — copies that one image to the clipboard without opening the
  lightbox first, for quickly grabbing one screenshot after another.

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
