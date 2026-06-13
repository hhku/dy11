(function () {
  const MODAL_ID = "mc-comment-profile-qr";

  function getCellText(cell) {
    return (cell.getAttribute("title") || cell.textContent || "").trim();
  }

  function readRow(row) {
    const table = row.closest("table");
    if (!table) return null;

    const headers = Array.from(table.querySelectorAll("thead th"))
      .slice(1)
      .map((th) => (th.textContent || "").trim());
    const cells = Array.from(row.querySelectorAll("td")).slice(1);

    if (!headers.length || headers.length !== cells.length) return null;

    const data = {};
    headers.forEach((name, index) => {
      data[name] = getCellText(cells[index]);
    });
    return data;
  }

  function isCommentRow(data) {
    return Boolean(data && data.comment_id && data.sec_uid && data.content);
  }

  function getProfileUrl(data) {
    if (!data.sec_uid || data.sec_uid === "nan") return "";
    return `https://www.douyin.com/user/${encodeURIComponent(data.sec_uid)}`;
  }

  function getQrUrl(url) {
    return `https://quickchart.io/qr?size=220&margin=2&text=${encodeURIComponent(url)}`;
  }

  function removeModal() {
    const old = document.getElementById(MODAL_ID);
    if (old) old.remove();
  }

  function stopModalEvent(event) {
    const target = event.target;
    const modal = document.getElementById(MODAL_ID);
    if (!modal || !(target instanceof Element) || !modal.contains(target)) return;

    if (target.closest("[data-close='1']")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      removeModal();
      return;
    }

    if (target.closest(".mcqr-copy")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const link = modal.querySelector(".mcqr-link");
      if (link) copyText(link.textContent || "");
      return;
    }

    event.stopImmediatePropagation();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  function showModal(data, sourceRow) {
    const profileUrl = getProfileUrl(data);
    if (!profileUrl) return;

    removeModal();

    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="mcqr-backdrop" data-close="1"></div>
      <div class="mcqr-panel" role="dialog" aria-modal="true" aria-label="评论人主页二维码">
        <button class="mcqr-close" type="button" aria-label="关闭" data-close="1">×</button>
        <div class="mcqr-title">评论人主页二维码</div>
        <div class="mcqr-body">
          <img class="mcqr-code" alt="评论人主页二维码" src="${getQrUrl(profileUrl)}" />
          <div class="mcqr-info">
            <div class="mcqr-name">${escapeHtml(data.nickname || "未知用户")}</div>
            <div class="mcqr-comment">${escapeHtml(data.content || "")}</div>
            <a class="mcqr-link" href="${profileUrl}" target="_blank" rel="noopener noreferrer">${profileUrl}</a>
            <button class="mcqr-copy" type="button">复制主页链接</button>
          </div>
        </div>
      </div>
    `;

    ["pointerdown", "mousedown", "mouseup", "click", "touchstart"].forEach((eventName) => {
      window.addEventListener(eventName, stopModalEvent, true);
    });

    document.body.appendChild(modal);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function addStyles() {
    if (document.getElementById("mc-comment-profile-qr-style")) return;

    const style = document.createElement("style");
    style.id = "mc-comment-profile-qr-style";
    style.textContent = `
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: auto;
      }
      #${MODAL_ID} .mcqr-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(4px);
        pointer-events: auto;
      }
      #${MODAL_ID} .mcqr-panel {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 2147483647;
        width: min(720px, calc(100vw - 32px));
        transform: translate(-50%, -50%);
        border: 1px solid rgba(0, 255, 255, 0.45);
        border-radius: 8px;
        background: #0d1117;
        box-shadow: 0 0 24px rgba(0, 255, 255, 0.18);
        color: #e6edf3;
        font-family: Inter, system-ui, sans-serif;
        padding: 20px;
        pointer-events: auto;
      }
      #${MODAL_ID} .mcqr-close {
        position: absolute;
        right: 14px;
        top: 10px;
        border: 0;
        background: transparent;
        color: #8b949e;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
      }
      #${MODAL_ID} .mcqr-title {
        color: #00ffff;
        font: 700 16px "JetBrains Mono", monospace;
        margin-bottom: 16px;
      }
      #${MODAL_ID} .mcqr-body {
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr);
        gap: 20px;
        align-items: start;
      }
      #${MODAL_ID} .mcqr-code {
        width: 220px;
        height: 220px;
        padding: 10px;
        border-radius: 6px;
        background: #fff;
      }
      #${MODAL_ID} .mcqr-name {
        font-weight: 700;
        color: #e6edf3;
        margin-bottom: 10px;
      }
      #${MODAL_ID} .mcqr-comment {
        max-height: 120px;
        overflow: auto;
        white-space: pre-wrap;
        border: 1px solid #30363d;
        border-radius: 6px;
        background: #161b22;
        color: #c9d1d9;
        padding: 10px;
        font-size: 13px;
        line-height: 1.5;
        margin-bottom: 12px;
      }
      #${MODAL_ID} .mcqr-link {
        display: block;
        color: #00ffff;
        font: 12px "JetBrains Mono", monospace;
        overflow-wrap: anywhere;
        margin-bottom: 12px;
      }
      #${MODAL_ID} .mcqr-copy {
        height: 34px;
        border: 1px solid rgba(0, 255, 255, 0.45);
        border-radius: 6px;
        background: rgba(0, 255, 255, 0.08);
        color: #00ffff;
        cursor: pointer;
        padding: 0 12px;
        font: 12px "JetBrains Mono", monospace;
      }
      @media (max-width: 640px) {
        #${MODAL_ID} .mcqr-body {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  addStyles();

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, input, textarea, select")) return;

    const row = target.closest("tbody tr");
    if (!row) return;

    const data = readRow(row);
    if (!isCommentRow(data)) return;

    showModal(data, row);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") removeModal();
  });
})();
