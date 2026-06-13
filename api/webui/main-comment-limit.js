(function () {
  const STYLE_ID = "mc-main-comment-limit-style";
  const CONTROL_ID = "mc-main-comment-limit";
  const STORAGE_KEY = "mc_main_comment_limit";
  const DEFAULT_LIMIT = "10";

  function getLimit() {
    const input = document.getElementById(CONTROL_ID);
    const rawValue = input ? input.value : localStorage.getItem(STORAGE_KEY) || DEFAULT_LIMIT;
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 1) return Number(DEFAULT_LIMIT);
    return Math.floor(value);
  }

  function patchFetch() {
    if (window.__mcMainCommentFetchPatched) return;
    window.__mcMainCommentFetchPatched = true;
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : input && input.url;
      if (url && url.includes("/api/crawler/start") && init && init.body) {
        try {
          const body = JSON.parse(init.body);
          body.max_comments_count = getLimit();
          init = { ...init, body: JSON.stringify(body) };
        } catch {}
      }
      return originalFetch.call(this, input, init);
    };
  }

  function patchXHR() {
    if (window.__mcMainCommentXHRPatched) return;
    window.__mcMainCommentXHRPatched = true;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__mcUrl = url;
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      if (this.__mcUrl && String(this.__mcUrl).includes("/api/crawler/start") && body) {
        try {
          const data = JSON.parse(body);
          data.max_comments_count = getLimit();
          body = JSON.stringify(data);
        } catch {}
      }
      return originalSend.call(this, body);
    };
  }

  function findStartArea() {
    const buttons = Array.from(document.querySelectorAll("button"));
    const startButton = buttons.find((button) => button.textContent.includes("开始爬虫"));
    if (!startButton) return null;
    return startButton.closest(".w-full") || startButton.parentElement;
  }

  function injectControl() {
    if (document.getElementById(CONTROL_ID)) return;
    const startArea = findStartArea();
    if (!startArea || !startArea.parentElement) return;

    const wrapper = document.createElement("div");
    wrapper.className = "mc-main-comment-limit-wrap";
    wrapper.innerHTML = `
      <label class="mc-main-comment-limit-label" for="${CONTROL_ID}">每条视频评论数</label>
      <input id="${CONTROL_ID}" class="mc-main-comment-limit-input" type="number" min="1" step="1" value="${localStorage.getItem(STORAGE_KEY) || DEFAULT_LIMIT}" />
    `;
    const input = wrapper.querySelector("input");
    input.addEventListener("input", () => {
      localStorage.setItem(STORAGE_KEY, String(getLimit()));
    });

    startArea.parentElement.insertBefore(wrapper, startArea);
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .mc-main-comment-limit-wrap {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        margin: -2px 0 10px;
        font: 12px "JetBrains Mono", Consolas, monospace;
      }
      .mc-main-comment-limit-label {
        color: rgb(71, 85, 105);
        white-space: nowrap;
      }
      .mc-main-comment-limit-input {
        width: 96px;
        height: 34px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #e2e8f0;
        color: #0f172a;
        padding: 0 10px;
        outline: none;
      }
      .mc-main-comment-limit-input:focus {
        border-color: rgba(6, 182, 212, 0.6);
        box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.12);
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    patchFetch();
    patchXHR();
    addStyles();
    injectControl();
    new MutationObserver(injectControl).observe(document.body, { childList: true, subtree: true });
  }

  boot();
})();
