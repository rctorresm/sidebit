// content.js — runs on every page.
// Stays completely idle (no DOM nodes, no timers) until the user selects
// text. Only then does it create one small shadow-DOM pill near the
// selection. Everything is torn down again as soon as it's not needed.

(() => {
  let host = null;
  let hideTimer = null;

  // Builds a URL that scrolls straight to the highlighted text when opened,
  // using the same text-fragment mechanism as Chrome's built-in "Copy link
  // to highlight". Capped at 300 chars — long fragments just fail to match
  // and the link still opens the page fine, no error either way.
  function buildHighlightLink(text) {
    const clean = text.replace(/\s+/g, " ").trim().slice(0, 300);
    const base = location.href.split("#")[0];
    if (!clean) return base;
    return `${base}#:~:text=${encodeURIComponent(clean)}`;
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
        color: #E8E9EC;
        background: #1C2027;
        border: 1px solid #343B47;
        border-radius: 999px;
        padding: 6px 12px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        cursor: pointer;
        user-select: none;
        transition: background 120ms ease, transform 120ms ease;
      }
      .pill:hover { background: #262B34; transform: translateY(-1px); }
      .pill svg { width: 12px; height: 12px; flex: none; }
      .pill.saved { background: #1E3A2C; border-color: #2F6E4C; color: #7BE6A6; }
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
          url: buildHighlightLink(text)
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

  function handleSelectionChange() {
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
      showPill(rect, text);
    } catch {
      /* selection API can throw on some pages mid-edit; ignore */
    }
  }

  document.addEventListener("mouseup", () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(handleSelectionChange, 10);
  });
  document.addEventListener("keyup", e => {
    if (e.shiftKey || e.key === "Shift") {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(handleSelectionChange, 10);
    }
  });
  document.addEventListener("scroll", removePill, true);
  document.addEventListener("mousedown", e => {
    if (host && !host.contains(e.target)) removePill();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") removePill();
  });
})();
