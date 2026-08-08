# Chrome Web Store submission — copy-paste reference

Not part of the extension itself — this is reference text for filling out
the Chrome Web Store Developer Dashboard's submission form. Keep it out of
the packaged zip.

## Single purpose description

> Sidebit is a side-panel note-taking tool. It lets users keep notes,
> quick-copy snippets, highlighted text, and screenshots organized in one
> place while browsing, without leaving the current tab.

## Store listing — short description (132 char max)

> Always-on side panel for notes, quick-copy snippets, and saving
> highlighted text or screenshots from any page.

## Store listing — detailed description

> Sidebit is a Chrome side panel for keeping notes docked open while you
> browse.
>
> - Separate note tabs for whatever you're working on — pin the ones you
>   use often, drag to reorder
> - Quick-copy snippets, either available everywhere or scoped to a single
>   tab
> - Highlight text on any page and save it to your notes in one click,
>   with a link back to the source
> - Capture a screenshot of the current tab, or paste one from your OS's
>   own screenshot tool — it's organized into a gallery automatically
> - Global search across everything you've saved
> - A Recently Deleted trash with undo, per section
> - Export/import your data as a backup file
>
> Sidebit stores everything locally in your browser. It makes no network
> requests, has no account or sign-in, and does not collect, transmit, or
> sell any data. See the full privacy policy for details.
>
> Built to be job-agnostic — "note" tabs are generic containers for
> whatever you're focused on, not tied to any specific workflow.

## Privacy policy URL

> https://claude.ai/code/artifact/75fc2ca2-2612-4480-8720-53e04043608c

(Or your own hosted copy — see note in the chat about publishing this
somewhere under your own control long-term.)

## Permission justifications

**storage**
> Used to save the user's notes, quick-copy snippets, saved highlights,
> screenshots, and settings locally via chrome.storage.local. No data
> leaves the device.

**unlimitedStorage**
> Screenshots are stored as uncompressed PNG image data and can add up
> quickly. This permission lifts Chrome's default per-extension storage
> quota so saving several screenshots doesn't silently fail once the
> default cap is hit.

**sidePanel**
> Sidebit's entire UI lives in Chrome's native side panel (via the
> chrome.sidePanel API) rather than a popup, so notes stay visible and
> persist across tab switches while the user browses.

**downloads**
> Powers the "Download" button on saved screenshots, letting the user
> save a copy of a screenshot to their computer via chrome.downloads.
> Only triggered by an explicit user click; never automatic.

**scripting**
> Used only in background.js to re-inject the already-approved content
> script into tabs that were already open at the time of an extension
> update, so the fix is live without the user having to manually refresh
> every open tab (some workflows, e.g. a support agent's live call
> session, can't tolerate a page refresh mid-task). Not used for
> injecting any other code, and not triggered by anything other than the
> extension's own update event.

**host_permissions — `<all_urls>`**
> Two features need to work on any page the user visits, so scoping to a
> smaller set of sites isn't possible: (1) capturing a screenshot of the
> current tab via chrome.tabs.captureVisibleTab, which specifically
> requires this exact permission string rather than the equivalent
> `http://*/*` + `https://*/*` wildcard pair; and (2) detecting a text
> selection to offer a "Save to sidebar" prompt, via a content script
> that must be able to run on any page. Neither feature reads, modifies,
> or transmits page content beyond the specific text the user explicitly
> selects and clicks to save.

## Data disclosure tab (Privacy practices)

Chrome Web Store asks you to certify what categories of user data the
extension collects. For every category listed (personally identifiable
information, health info, financial info, authentication info, personal
communications, location, web history, user activity, website content),
the honest answer is **No, this item does not collect that data** — the
"single purpose" and "privacy policy" sections above back this up, and
the codebase audit backing this document found zero outbound network
calls anywhere in the extension.

You'll also be asked to certify:
- Whether the extension uses remote code — **No** (everything ships in
  the package; no CDN scripts, no eval, no dynamically fetched code).
- Whether you comply with the Developer Program Policies — yes, nothing
  here should be a problem given the above.

## Before you submit — still open

- [x] Fill in your real contact email in the privacy policy page — done
      (rob.sidebit@gmail.com, re-published 2026-08-08).
- [x] Fill in your name/entity in `LICENSE` — done (Roberto Torres).
      Also fixed a leftover "NoteDock" reference in the same file that
      should have been renamed to "Sidebit" along with everything else.
- [ ] Privacy policy hosting: the Claude Artifact URL works for the
      review, but **it must be set to Shared, not private** — Google's
      reviewers load it without being signed into your account, so a
      private artifact will look broken to them. Open the link and check
      the share menu before submitting; this can't be set programmatically.
      Recommendation: fine to launch on the Artifact URL, but consider
      moving it to something you control (GitHub Pages, a personal
      domain) later so it isn't dependent on a Claude session existing.
- [ ] Store listing screenshots (1280x800 or 640x400) — not yet created.
      Recommendation: 3-4 shots of the real loaded extension (not a mock)
      with realistic-but-fake sample content (no real coworker names,
      ticket numbers, or company data, since these become public) —
      e.g. the main panel with a couple of note tabs and Quick Copy
      entries, the Settings panel showing theme/accent options, and the
      screenshot gallery. Ask to have this driven next when ready.
- [x] Icon redesign — done (dark badge, two-block "docked panel" mark).
- [ ] Public vs. Unlisted visibility. Recommendation: start **Unlisted**.
      Nothing here is risky to make public (zero data collection, no
      backend), but Unlisted still gives full Store installability via a
      direct link — for you and anyone you share it with — without
      showing up in Chrome Web Store search results or inviting reviews/
      support requests from strangers who found it by browsing. Visibility
      can be switched to Public later at any time without a new review.
- [x] Separate Google account for the $5 CWS developer registration —
      already decided (yes, keep it off your personal account).
