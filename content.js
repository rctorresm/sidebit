// content.js — runs on every page.
// Stays completely idle (no DOM nodes, no timers) until the user selects
// text. Only then does it create one small shadow-DOM pill near the
// selection. Everything is torn down again as soon as it's not needed.

(() => {
  // When the extension updates, background.js re-injects this file into
  // already-open tabs so users don't have to manually refresh a page
  // they can't afford to reload (e.g. a call-center agent mid-call).
  // That means this IIFE can run more than once in the same page/frame —
  // tear down whatever the previous instance attached first, so listeners
  // never double up.
  if (window.__sidebitCleanup) {
    try { window.__sidebitCleanup(); } catch { /* ignore */ }
  }

  let host = null;
  let hideTimer = null;
  let lastMouseUp = { x: 0, y: 0 };

  // Text-bearing input types where selectionStart/End are safe to read in
  // Chrome (some types, e.g. number/date/color, throw). "password" is
  // deliberately excluded — not offering to save that.
  const TEXT_INPUT_TYPES = new Set(["text", "search", "url", "tel", "email", ""]);

  // window.getSelection() only sees regular page text — it can't see into
  // <input>/<textarea> values, since those keep their own separate
  // selection model. This covers that gap by reading the focused field's
  // own selection directly.
  function getFormFieldSelection() {
    const active = document.activeElement;
    if (!active) return null;
    const isTextarea = active.tagName === "TEXTAREA";
    const isTextInput = active.tagName === "INPUT" && TEXT_INPUT_TYPES.has((active.type || "text").toLowerCase());
    if (!isTextarea && !isTextInput) return null;

    const start = active.selectionStart;
    const end = active.selectionEnd;
    if (start == null || end == null || start === end) return null;

    const text = active.value.slice(start, end).trim();
    if (!text) return null;

    // Browsers don't expose per-character geometry for native form fields,
    // so anchor the pill near the last mouse-up position if it's inside
    // the field (mouse-driven selection), otherwise near the field itself
    // (keyboard-driven selection, e.g. shift+arrow).
    const fieldRect = active.getBoundingClientRect();
    const mouseInField =
      lastMouseUp.x >= fieldRect.left && lastMouseUp.x <= fieldRect.right &&
      lastMouseUp.y >= fieldRect.top && lastMouseUp.y <= fieldRect.bottom;
    const rect = mouseInField
      ? { left: lastMouseUp.x, right: lastMouseUp.x, top: lastMouseUp.y, bottom: lastMouseUp.y }
      : fieldRect;

    return { text, rect };
  }

  // Plain page URL (no text-fragment deep link) — just the general
  // source address, with any existing hash stripped.
  function pageLink() {
    return location.href.split("#")[0];
  }

  function removePill() {
    if (host) {
      host.remove();
      host = null;
    }
  }

  function showPill(rect, text) {
    removePill();

    host = document.createElement("div");
    host.style.all = "initial";
    host.style.position = "fixed";
    host.style.zIndex = "2147483647";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      .pill {
        all: initial;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: #E6EDF3;
        background: #161B22;
        border: 1px solid #3D444D;
        border-radius: 999px;
        padding: 6px 12px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        cursor: pointer;
        user-select: none;
        transition: background 120ms ease, transform 120ms ease;
      }
      .pill:hover { background: #1C2128; transform: translateY(-1px); }
      .pill svg { width: 12px; height: 12px; flex: none; }
      .pill.saved { background: #12301E; border-color: #2EA043; color: #56D364; }
    `;
    shadow.appendChild(style);

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Save to sidebar</span>
    `;
    shadow.appendChild(pill);

    // Position near the end of the selection, clamped to the viewport.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pillWidth = 140;
    let left = Math.min(Math.max(rect.right - pillWidth, 8), vw - pillWidth - 8);
    let top = rect.bottom + 8;
    if (top > vh - 40) top = rect.top - 36;
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;

    pill.addEventListener("mousedown", e => e.preventDefault()); // don't clear selection
    pill.addEventListener("click", () => {
      chrome.runtime.sendMessage(
        {
          type: "SAVE_HIGHLIGHT",
          text,
          source: location.hostname,
          title: document.title,
          url: pageLink()
        },
        () => {
          pill.classList.add("saved");
          pill.querySelector("span").textContent = "Saved";
          clearTimeout(hideTimer);
          hideTimer = setTimeout(removePill, 900);
        }
      );
    });
  }

  // Only shows the pill if Sidebit's side panel is actually open right now
  // AND the "Save to sidebar" prompt hasn't been toggled off — otherwise
  // there's nowhere for a click on it to save to.
  function showPillIfAllowed(rect, text) {
    chrome.runtime.sendMessage({ type: "CAN_SHOW_SAVE_PILL" }, response => {
      if (chrome.runtime.lastError) return; // extension reloaded/updated mid-flight
      if (response && response.allowed) showPill(rect, text);
    });
  }

  function handleSelectionChange() {
    const formSelection = getFormFieldSelection();
    if (formSelection) {
      if (formSelection.text.length > 4000) return; // avoid absurdly large blobs
      showPillIfAllowed(formSelection.rect, formSelection.text);
      return;
    }

    const selection = window.getSelection();
    const text = selection && selection.toString().trim();
    if (!text || text.length < 1) {
      removePill();
      return;
    }
    if (text.length > 4000) return; // avoid absurdly large blobs
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      showPillIfAllowed(rect, text);
    } catch {
      /* selection API can throw on some pages mid-edit; ignore */
    }
  }

  function onMouseUp(e) {
    lastMouseUp = { x: e.clientX, y: e.clientY };
    clearTimeout(hideTimer);
    hideTimer = setTimeout(handleSelectionChange, 10);
  }
  function onKeyUp(e) {
    if (e.shiftKey || e.key === "Shift") {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(handleSelectionChange, 10);
    }
  }
  function onScroll() {
    removePill();
  }
  function onMouseDown(e) {
    if (host && !host.contains(e.target)) removePill();
  }
  function onKeyDown(e) {
    if (e.key === "Escape") removePill();
  }

  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("scroll", onScroll, true);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("keydown", onKeyDown);

  window.__sidebitCleanup = () => {
    clearTimeout(hideTimer);
    removePill();
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("scroll", onScroll, true);
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
  };
})();
