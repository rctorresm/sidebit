# Sidebit — Development Retrospective

Raw, factual build history for turning into a LinkedIn post / resume bullets
later. Reconstructed from `git log`, `CHANGELOG.md`, `README.md`, and
`WEBSTORE_SUBMISSION.md`. Chronological, not polished copy.

Project: **Sidebit** (originally named **NoteDock**, renamed mid-project —
see Phase 3). A Chrome Manifest V3 side-panel extension: docked notes with
per-tab organization, quick-copy snippets, save-highlighted-text-from-any-page,
and a screenshot gallery. Built solo, driven by a real daily-use need
(call-center/workplace-agent tooling — the motivating context was the
author's own job, with tools like Zendesk embedding Amazon Connect).

---

## Phase 0 — Initial build (2026-08-06, v1.0.0)

**Problem being solved:** needed a persistent, always-visible place to keep
notes and quick-reference text while working across many browser tabs and
embedded tools (support tickets, CRM panels, etc.), without the tool being
tied to any one specific job or workflow.

**What was built:**
- Side panel UI using Chrome's native Side Panel API (`chrome.sidePanel`),
  chosen specifically because it stays docked and persists across tab
  switches, unlike a popup that closes as soon as focus moves away.
- Note tabs — create, rename (double-click), close — each with its own
  notes and its own list of saved highlights.
- Quick-copy snippets: a user-managed list of fixed text (phone numbers,
  email templates) with one-click copy.
- Highlight-to-save: selecting text on any page shows a small "Save to
  sidebar" pill; clicking it saves the text to the active note tab, tagged
  with the source page.
- Autosave for notes (debounced).

**Foundational technical/privacy decision made at day one, not bolted on
later:** all data stored locally via `chrome.storage.local`, zero network
requests anywhere in the extension. This wasn't a later hardening pass —
it was the starting architecture, and it stayed true through every
subsequent version (re-verified by code audit multiple times later, see
Phase 4).

**Design decision:** deliberately job-agnostic. "Note" tabs are generic
containers for whatever the user is currently focused on — not modeled
around any specific workflow (ticketing, sales, etc.), even though the
motivating use case was one specific job.

---

## Phase 1 — Rapid feature build-out (2026-08-07, v1.1.0 – v1.9.0)

All shipped in a single day, each as its own version bump and commit.
Problem being solved in this phase: the v1.0.0 core was usable but thin —
no way to customize appearance, no backup, no way to capture more than
plain text, no way to find anything once it accumulated, and no safety
net for deletions.

- **v1.1.0** — Settings panel (theme, background image), draggable
  snippet reordering, and highlight source links using the same
  text-fragment deep-link mechanism as Chrome's built-in "Copy link to
  highlight." Added `unlimitedStorage` permission to fit background
  images.
- **v1.2.0** — Text size / font settings. Also: first explicit security
  hardening pass, ahead of eventually shipping to the Web Store — the
  background service worker started verifying message sender identity
  and sanitizing/capping fields on incoming highlight-save messages.
  Framed explicitly as defense-in-depth: no known exploit existed yet,
  hardened anyway.
- **v1.2.1** — Delete All for saved highlights.
- **v1.3.0** — Export/Import as a JSON backup file, with a clarifying
  note that `chrome.storage.local` already survives restarts on its own —
  backup is insurance against uninstall/profile loss, not a "save
  button."
- **v1.4.0** — Screenshot capture (`chrome.tabs.captureVisibleTab`) with a
  per-note-tab gallery and a lightbox (Download via `chrome.downloads`,
  Copy to clipboard, Delete). New `downloads` permission, scoped
  narrowly to this one button.
- **v1.5.0** — Global search across note names/notes, snippets, and
  highlights, with click-to-jump results.
- **v1.6.0** — Recently Deleted trash covering every deletable thing
  (tabs, highlights, snippets, screenshots) — restorable, capped at the
  last 50 entries, carried through backups.
- **v1.7.0** — Live word/char counters, notes auto-grow, Quick Copy made
  collapsible, hover info tooltips added throughout. Also: first-install
  seed data (example snippets) removed — decided an empty starting state
  was better than fake examples.
- **v1.8.0** — First real-world compatibility fixes (see Phase 2 below —
  this is where the two phases start overlapping).
- **v1.9.0** — Per-section Undo (tabs, snippets, highlights,
  screenshots), targeting the single most recent deletion in that
  section, layered on top of the full trash from v1.6.0 rather than
  replacing it.

**A visible iteration pattern starts here and repeats throughout the
project:** v1.10.0 added tab pinning/reordering plus a confirmation
prompt before closing a non-empty tab. v1.11.0 added a "this tab only"
checkbox to Quick Copy's scoping system — then **v1.11.1, the very next
version, removed that same checkbox**, because it was a second control
doing the same job as the existing per-row scope toggle. Ship, observe,
simplify.

---

## Phase 2 — Real-world compatibility bug hunting (2026-08-07, v1.8.0 – v1.13.0)

**Problem being solved:** the extension was built against plain web pages,
but the actual daily-use target (a support-ticket tool with an embedded
softphone panel) is full of edge cases plain pages don't have: form
fields, iframes, and iframes with no real URL at all.

- **v1.8.0** — Two fixes at once: (1) "Save to sidebar" wasn't appearing
  for text highlighted inside an `<input>`/`<textarea>` — the page's
  normal text-selection API can't see into form fields, so this reads
  the field's own selection directly instead (`type="password"`
  deliberately excluded). (2) The content script now runs inside
  embedded iframes too (`all_frames: true`), so highlighting inside an
  embedded dashboard/widget works the same as the main page. Also noted
  as a hard platform limit: the Chrome Web Store's own pages are
  permanently off-limits to any extension's content scripts — not
  something to work around.
- **v1.11.2** — A deeper version of the same iframe problem: `all_frames`
  alone doesn't reach iframes with no real URL (`about:blank`/
  `about:srcdoc`) — the common pattern for a JS-built rich-text editor,
  e.g. a reply composer. Fixed with `match_origin_as_fallback: true` so
  those iframes inherit their parent's origin for content-script
  matching.
- **v1.13.0** — The extension needed a way to update itself on
  already-open tabs without asking the user to refresh — refreshing an
  agent's live softphone session mid-call isn't acceptable. Solved by
  re-injecting `content.js` into every open tab (and frame) automatically
  on a genuine Chrome extension "update" event. Required a new
  `scripting` permission, scoped to only that one re-injection call.
  Paired with a correctness fix: content.js was made idempotent (tears
  down its own previous listeners/pill before attaching new ones), and
  this was verified directly — injecting it twice into the same page
  still produces exactly one pill and exactly one save call, not two.

This phase shows a recurring habit: whenever a "should just work" fix
landed, the next step was asking what *other* edge case the same root
cause might also be hitting (form fields → iframes → blank/srcdoc
iframes → double-injection safety), rather than closing the issue after
the first visible symptom was gone.

---

## Phase 3 — Visual/accessibility iteration and the rename (2026-08-07, v1.14.0 – v1.22.1)

**Problem being solved:** by this point the feature set was fairly
complete; this phase is almost entirely about making the thing pleasant
and legible to actually live in all day, plus a significant identity
change partway through.

- **v1.14.0** — Removed the background-image feature entirely: with
  opaque panels sitting on top, an uploaded photo mostly just got
  covered, defeating the point. (Explicitly logged as "may come back
  later as purpose-built artwork" rather than a dead end.) Also fixed a
  real permission gotcha: `captureVisibleTab` specifically requires the
  literal `<all_urls>` host permission string — the equivalent
  `http://*/*` + `https://*/*` wildcard pair is *not* treated as
  sufficient by that one API, unlike most others. Added the ability to
  paste a screenshot straight from the OS's own snipping tool.
- **v1.15.0** — A genuine feature pivot: replaced the plain word/char
  counter with a movie-quip generator (Marvel/DC/Star Wars/Harry
  Potter/LOTR/Chuck Norris one-liners keyed to note length), with
  explicit care taken that it never repeats the same line back-to-back
  for a given length range, and each note tab gets independent memory.
  Logged as "purely cosmetic — no data collected, nothing sent
  anywhere," i.e. checked against the zero-network-calls principle even
  for a joke feature.
- **v1.15.1 – v1.15.3** — Three rapid-fire polish fixes on the same
  feature: contrast (button text was failing WCAG AA against Light
  theme's more saturated blue — measured at 3.79:1, fixed to
  theme-aware text hitting 5.17:1/5.91:1), a paste hint added, then
  fixed wording, then fixed truncation so long quips wrap instead of
  getting cut off with "...".
- **v1.16.0 – v1.17.0** — Two full Dark theme palette rewrites in a row.
  The first fixed a specific measured failure (`--text-faint` at 3.44:1,
  below WCAG AA, brought to 5.52:1). The second was a bigger rework
  modeled explicitly on GitHub's Dark theme, chosen because it's one of
  the most widely used dark UI systems and matched a "blue-tinted" look
  being asked for over flat gray — re-measured afterward (5.07:1, up
  from 3.44:1 the version before). Same version added a toggle to turn
  off the on-page "Save to sidebar" prompt entirely, using a live port
  connection between the panel and the background service worker as the
  correct way to detect "is the panel actually open right now" (there's
  no built-in open/close event for a side panel).
- **v1.17.1 — a real bug with a specific root cause worth noting
  technically:** the "is the panel open" flag from v1.17.0 was stored in
  a plain JS variable in the background service worker. Chrome recycles
  an idle service worker after a short timeout, silently resetting plain
  variables back to their default — so the toggle would appear to get
  stuck "off" even after switching it back on, because nothing was left
  to re-set the flag. Fixed by moving that flag into
  `chrome.storage.session`, which survives service-worker recycling but
  still clears on browser close (the correct persistence tier for this
  specific kind of state). This is a reusable Manifest V3 lesson: any
  "is X currently true" state in a service worker needs to live in
  `chrome.storage.session`, not a plain variable, or it will silently
  drift wrong.
- **v1.18.0** — Removed the "System" theme option, added customizable
  accent colors (two independent pickers per theme — text/borders and
  buttons — 4 swatches each). All 8 color combinations were explicitly
  checked against WCAG AA before shipping (lowest measured 4.66:1, most
  above 5:1) — accessibility checking had become a standing habit by
  this point, not a one-off fix.
- **v1.19.0 – v1.19.1** — Screenshot multi-select (Delete/Download) with
  a deliberate scope decision: multi-select intentionally does *not*
  offer bulk "Copy," because the system clipboard can only hold one
  image at a time regardless of what any app does — Download was chosen
  as the real equivalent instead of building a fake bulk-copy that
  couldn't actually work. Also a full icon redesign, checked for
  legibility at all three shipped sizes against both light and dark
  toolbar backgrounds at true 16px.
- **v1.20.0 – v1.20.1** — Removed a duplicate in-app header (it
  duplicated Chrome's own side panel title bar), made the search bar
  permanently visible instead of hidden behind a toggle, and increased
  the notes box's starting height.

**v1.21.0 — the rename: NoteDock → Sidebit.** This is the single largest
identity pivot in the project. Everything user-visible was renamed:
manifest name, page title, backup file naming
(`sidebitBackup`/`sidebit-backup-*.json`/`sidebit-screenshot-*.png`), all
in-app copy, the README, and the (separately maintained) published
privacy policy. The icon was deliberately left untouched — it was
already an abstract "two-block docked panel" mark that never spelled out
the old name, so a rename didn't require a redesign. A real technical
constraint shaped how this rename was executed: Chrome derives an
unpacked extension's ID from a hash of its local folder's absolute path
(when the manifest has no explicit `key`), and `chrome.storage.local` is
scoped per-ID. Renaming the local dev folder to match the product name
would have generated a *new* extension ID and made all existing local
notes/screenshots appear to vanish (orphaned under the old ID). The
decision made: rename everything *except* the local working-directory
path, to keep the extension ID — and therefore all existing local data —
stable across the rename. Old backup files still import fine after the
rename, since the backup validator only ever checked data shape, not the
marker field.

- **v1.22.0 – v1.22.1** — Reworked the accent-color system again (added
  a neutral "Default" swatch as an easy escape hatch back to an uncolored
  look), and restored the text-fragment deep-link for saved highlights
  (it had been simplified to a plain URL back in an earlier version to
  rule it out as the cause of a bug that turned out to be unrelated and
  was already fixed separately — so the simplification was reverted once
  it no longer served a purpose).

---

## Phase 4 — Security hardening and Chrome Web Store submission (2026-08-07 – 2026-08-08)

**Problem being solved:** turning a working local extension into
something safely and honestly listable on a public store, for an
audience broader than the author.

Key decisions and reasoning, reconstructed from `WEBSTORE_SUBMISSION.md`
and the commit history:

- **LICENSE: all-rights-reserved, not MIT.** Deliberate — wanted public
  installability via the Store, but not to grant code-reuse rights.
  Copyright holder filled in as a real name.
- **Permission justifications written per-permission**, each grounded in
  a specific feature rather than a blanket "trust us": `storage` for the
  core data model; `unlimitedStorage` because screenshots are stored as
  uncompressed PNGs and would silently hit Chrome's default quota;
  `sidePanel` for the persistent-panel UX; `downloads` scoped to the
  screenshot lightbox's explicit user-click download only, never
  automatic; `scripting` scoped to only the update-time content-script
  re-injection described in Phase 2, nothing else; `host_permissions:
  <all_urls>` justified by the two specific APIs that need it
  (`captureVisibleTab`'s exact-string requirement, and highlight
  detection needing to run on any page) — with an explicit note that
  neither feature reads, modifies, or transmits page content beyond the
  specific text a user selects and clicks to save.
- **Data-disclosure form: "No" collection for every listed category**
  (PII, health, financial, auth, communications, location, web history,
  activity, website content) — backed by a fresh codebase audit at
  submission time specifically grepping for `eval`/dynamic
  import/external script sources, which found none. This was the *n*th
  time the "zero network calls" claim was actually re-verified against
  the real code rather than just carried forward as an assumption from
  v1.0.0.
- **Privacy policy** written and published externally, with the contact
  email later verified to be a real, checkable one (`rob.sidebit@gmail.com`).
- **Icon and 4 store-listing screenshots** produced at the required exact
  1280×800, using synthetic multi-industry demo data (fake company
  names, `.example` domains) — deliberately not any real data from the
  author's actual job, even though that job was the motivating use case.
- **Visibility: Unlisted, not Public.** Confirmed this still allows full
  installability via a direct link — it only opts out of Store
  search/category discovery, and can be switched to Public later without
  a new review.
- **A separate Google account** was set up specifically for the $5 Chrome
  Web Store developer registration, kept off the personal account.
- **A real process gotcha hit and logged for next time:** the publisher
  account's contact email must be set *and verified* under Settings >
  Profile before *any* item can publish — separate from the item's own
  privacy-policy contact email — and this wasn't discovered until the
  very end of the submission flow. Worth front-loading next time.
- **Expected friction correctly identified as non-blocking:** submitting
  with the `<all_urls>` permission triggered Chrome's standard
  "in-depth review" delay warning — recognized as the normal cost of a
  broad host permission, not a rejection signal, and confirmed as a real
  requirement here (the highlight-save feature needs the content script
  running proactively on every page — `activeTab` alone can't support
  that) rather than something to try to scope down just to dodge the
  warning.
- **v1.26.0** (last version before this first submission) shipped a
  Clear-notes button with the same confirm+trash-recoverable pattern
  used everywhere else in the app, then the package was submitted for
  review on 2026-08-08.

---

## Phase 5 — Post-submission polish while awaiting review (2026-08-08, v1.23.0 – v1.26.0)

Smaller UX refinements, several shipped the same day as the eventual
submission, showing the project didn't pause just because a submission
was in flight:

- **v1.23.0** — "Save to sidebar" now also copies the highlighted text
  to clipboard, with a best-effort fallback (if the clipboard write
  fails, e.g. an unfocused iframe, the save still goes through).
- **v1.24.0** — Settings icon sized up, text-size tiers shifted up
  across the board (Small was uncomfortably tight), default changed from
  Large to Medium now that Medium was sized comfortably enough.
- **v1.24.1 – v1.24.2** — A small reorder, immediately followed by a
  revert: a highlight "link icon" button introduced was reverted the
  very next version because it was too small to comfortably resize —
  reverted back to the original hyperlinked-hostname pattern. Same
  build-observe-simplify loop as v1.11.0/v1.11.1.
- **v1.25.0** — Screenshot "Select" turned into a labeled button instead
  of a small icon (discoverability fix), per-thumbnail delete added, and
  every delete icon in the app was unified to the same red so delete
  actions are consistently recognizable at a glance.

---

## Phase 6 — This session's work (2026-08-14, v1.27.0 – v1.28.0)

Driven by a direct user "laundry list" of small requests, worked through
one at a time with recommendations given for each before implementing.

- **v1.27.0** — Four small fixes: a visible border added to "Saved from
  pages" cards (was `border: 1px solid transparent` — already wired up,
  just needed a color, matched to the existing `--border-strong` token
  used elsewhere rather than inventing a new one); a "Link" button added
  next to "Copy" on any highlight with a source URL; the Screenshots
  paste-hint text darkened for legibility (from `--text-faint` to
  `--text-dim`); and the Quick Copy info tooltip expanded to explain
  what the "All tabs" orange dot actually means, since a passive legend
  wasn't enough for people to understand the toggle. **Two requested
  items from the same list were explicitly ruled out as genuine Chrome
  platform limits**, not implemented: shrinking the side panel's native
  minimum resizable width, and adding a collapse button next to Chrome's
  own toolbar pin icon — confirmed via code audit that no CSS/manifest
  setting controls the former, and there's no `chrome.sidePanel.close()`
  API or any way for an extension to add controls into Chrome's own
  toolbar chrome for the latter.
- **v1.28.0 — Spanish localization**, the most architecturally
  significant addition since the initial build. Key decisions:
  - **Deliberately did not use Chrome's built-in `chrome.i18n` system**,
    despite it being the "obvious" platform-native choice. Reasoning:
    `chrome.i18n` auto-matches the browser's own UI language and has no
    mechanism for an in-app manual language switch — which is exactly
    what was wanted (pick English or Spanish from Settings, independent
    of what language Chrome itself is set to). Built a lightweight
    custom system instead: a `locales.js` file with `LOCALES.en`/
    `LOCALES.es` dictionaries (~150 keys) and a `t(key, vars)`
    lookup/substitution helper, wired into static HTML via `data-i18n*`
    attributes and into dynamically-created elements by calling `t()`
    directly at creation time.
  - **Scope deliberately limited to English + Spanish**, not expanded to
    Portuguese/French/German even though they were discussed and would
    have been low marginal *build* cost. Reasoning made explicit at the
    time: every language added is a **permanent recurring cost**, not a
    one-time one — every future UI string this app ever gains has to be
    translated into every supported language, forever. English+Spanish
    was the confirmed real need (the author speaks Spanish and could
    personally verify translation quality); the other languages were
    speculative. Chinese/Japanese were ruled out for concrete technical
    reasons, not just "too many dialects" — the current font stack
    (Verdana/Georgia/system-ui) doesn't render CJK glyphs well, and CJK
    involves real text-length/layout differences the current CSS
    wasn't built for.
  - **Character quips deliberately not translated.** The Marvel/DC/Star
    Wars/etc. one-liners from v1.15.0 are English wordplay that doesn't
    translate; rather than ship a mistranslated joke, Spanish mode shows
    a plain "N palabras" word count instead, with real translation
    left as a possible future pass.
  - **Zero new permissions, zero network calls** — verified as a design
    constraint before building anything, not an afterthought: both
    language dictionaries are plain bundled files shipped in the same
    package as everything else, same trust model as `sidepanel.html`
    itself.
  - **A real bug caught during implementation, not after:** the new
    global `t()` translator function collided with `t` — the
    codebase's long-standing, pervasive per-tab loop variable name
    (`state.tabs.map(t => ...)` appears throughout `sidepanel.js`).
    Calling `t("some.key")` from inside one of those callbacks silently
    resolved to the tab object instead of the translator and would have
    thrown at runtime. Caught while wiring the backup-import fallback
    name, fixed by hoisting the translated string outside the callback
    before the shadowing collision could bite — verified with a targeted
    harness test afterward rather than assumed fixed.
  - Verified end-to-end in a browser test harness before shipping: full
    UI translated, confirm-dialog text translates with correct
    singular/plural phrasing, quips correctly suppressed in Spanish,
    search results and swatch tooltips translate, switching back to
    English cleanly restores quips.

Both versions were tested in a local harness (mocked `chrome.*` APIs,
mocked clipboard, mocked `confirm()`/`alert()` to capture and verify
translated dialog text) before being committed, tagged, and pushed —
consistent with the testing discipline established earlier in the
project.

---

## Phase 7 — Store approval and the update pipeline (2026-08-14)

The original v1.26.0 submission was approved and went live on the Chrome
Web Store. Updating it for v1.27.0/v1.28.0 turned out to be simpler than
the original submission specifically *because* of decisions made back in
Phase 4: since neither update changed any permission or host permission,
none of the privacy-practices/permission-justification paperwork needed
to be redone — only the package itself (a zip of the same file set used
originally, plus the new `locales.js`) needed to be uploaded as a normal
update through the dashboard's Package tab.

---

## Patterns across the whole project

- **Speed of the initial build:** the entire core feature set (v1.0.0
  through v1.20.1 — tabs, snippets, highlights, screenshots, search,
  trash, undo, theming, backup) shipped in a single day (2026-08-07),
  with the rename and Web Store submission following within the next
  24–48 hours. Iteration since then has been steadier, smaller-batch
  work.
- **A consistent build → observe → simplify loop**, visible at least
  three separate times: the "this tab only" checkbox added then removed
  a version later (v1.11.0 → v1.11.1) once it was redundant with an
  existing control; the highlight link-icon button added then reverted
  a version later (v1.24.1 → v1.24.2) once it proved too small in
  practice; and the highlight-link simplification from v1.12.0 restored
  in v1.22.1 once the reason for simplifying it no longer applied. None
  of these needed a user bug report to trigger — each was caught and
  corrected from the author's own use.
- **Accessibility contrast checking became a standing habit, not a
  one-off fix.** WCAG AA was explicitly measured and cited by number at
  least four separate times across the Dark/Light palette work
  (v1.15.1, v1.16.0, v1.17.0, v1.18.0), each time with specific
  before/after contrast ratios recorded in the changelog itself — not
  just "looks better," but checked and quantified.
- **Security/privacy posture was set on day one and re-verified
  repeatedly, not just claimed once.** "Zero network requests, local
  storage only" is stated in the very first README and was independently
  re-audited by grep at the Web Store submission (Phase 4) and again as
  an explicit design constraint for the Spanish localization feature
  (Phase 6) — the same property checked three separate times across the
  project's life as new features were added, rather than assumed to
  still hold.
- **Permissions were added one at a time, each tied to a specific
  feature, and each independently justified in writing** at submission
  time (`unlimitedStorage` → screenshots, `downloads` → the lightbox
  button, `scripting` → update-time re-injection only, `<all_urls>` →
  two named APIs) — never requested speculatively ahead of a feature
  that needed them.
- **Real-world testing against the actual target environment**, not
  just plain web pages: several fixes (v1.8.0, v1.11.2) exist
  specifically because the extension was tested against an embedded,
  iframe-heavy support tool (the kind used in the author's actual job),
  which surfaced edge cases a simple test page never would have.
  Manifest V3 service-worker lifecycle bugs were also caught this way
  (v1.17.1) — a bug that only shows up after the service worker goes
  idle and gets recycled, not on first use.
- **Scope was actively kept in check.** The README's "Known gaps"
  section explicitly lists deferred ideas (auto-tab-creation from
  external triggers, AI-assisted features, real cross-device sync,
  automated tests) as *known and deliberate* omissions with reasoning
  for each, rather than silently missing or vaguely implied as
  "someday." The same discipline shows up in Phase 6: two explicitly
  requested features (shrinking the side panel, a toolbar collapse
  button) were investigated and then explicitly declined once confirmed
  to be outside what a Chrome extension can actually do — not silently
  dropped, not half-implemented.
- **A deliberate identity change (NoteDock → Sidebit) was executed
  carefully rather than casually**, specifically preserving the local
  extension ID (and therefore existing user data) by understanding a
  non-obvious platform detail (extension ID derived from folder path)
  before touching anything.
- **Consistent process discipline throughout:** every shipped version
  got its own commit, a matching git tag, and a changelog entry written
  *before* the commit — over 40 tagged versions by the end of this
  retrospective, all following the same pattern from v1.0.0 to v1.28.0.
- **Feature architecture decisions were made by weighing the actual
  requirement against the "obvious" platform-native option, not
  defaulting to whichever was easiest to reach for.** The clearest
  example is Phase 6's i18n work: Chrome ships a built-in localization
  system, but it was deliberately bypassed in favor of a custom one
  because the built-in system didn't actually fit the specific UX being
  asked for (manual in-app switching vs. automatic browser-language
  matching).
