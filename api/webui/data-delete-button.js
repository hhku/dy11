(function () {
  const STYLE_ID = "mc-data-delete-style";
  const BUTTON_CLASS = "mc-data-delete-button";
  let fileMap = new Map();
  let refreshPending = false;

  async function refreshFiles() {
    const response = await fetch("/api/data/files");
    if (!response.ok) return;
    const data = await response.json();
    fileMap = new Map((data.files || []).map((file) => [file.name, file]));
  }

  function encodePath(path) {
    return path.split(/[\\/]/).map(encodeURIComponent).join("/");
  }

  function findFileCards() {
    return Array.from(document.querySelectorAll("[role='dialog'] h3[title]"))
      .map((title) => {
        const card = title.closest(".group");
        if (!card) return null;
        return { card, title };
      })
      .filter(Boolean);
  }

  async function deleteFile(file, button) {
    const ok = window.confirm(`确定删除这个数据文件吗？\n\n${file.name}`);
    if (!ok) return;

    button.disabled = true;
    button.textContent = "删除中";

    try {
      const response = await fetch(`/api/data/files/${encodePath(file.path)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || "删除失败");

      await refreshFiles();
      injectButtons();
      clickRescanButton();
    } catch (error) {
      button.disabled = false;
      button.textContent = "删除";
      window.alert(error.message);
    }
  }

  function clickRescanButton() {
    const buttons = Array.from(document.querySelectorAll("[role='dialog'] button"));
    const rescanButton = buttons.find((button) => button.textContent.includes("重新扫描"));
    if (rescanButton) rescanButton.click();
  }

  function injectButtons() {
    findFileCards().forEach(({ card, title }) => {
      if (card.querySelector(`.${BUTTON_CLASS}`)) return;

      const file = fileMap.get(title.getAttribute("title"));
      if (!file) {
        if (!refreshPending) {
          refreshPending = true;
          refreshFiles().finally(() => {
            refreshPending = false;
            injectButtons();
          });
        }
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = BUTTON_CLASS;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      `;
      button.setAttribute("aria-label", "删除数据文件");
      button.title = "删除这个数据文件";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteFile(file, button);
      });
      card.appendChild(button);
    });
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${BUTTON_CLASS} {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 2;
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1px solid rgba(236, 72, 153, 0.45);
        border-radius: 6px;
        background: rgba(248, 250, 252, 0.82);
        color: rgb(219, 39, 119);
        cursor: pointer;
        opacity: 0.72;
        transition: opacity 0.15s ease, background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
      }
      .${BUTTON_CLASS}:hover {
        opacity: 1;
        border-color: rgba(236, 72, 153, 0.75);
        background: rgba(236, 72, 153, 0.12);
        transform: translateY(-1px);
      }
      .${BUTTON_CLASS}:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .${BUTTON_CLASS} svg {
        width: 15px;
        height: 15px;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
      }
    `;
    document.head.appendChild(style);
  }

  async function boot() {
    addStyles();
    await refreshFiles();
    injectButtons();

    const observer = new MutationObserver(() => {
      injectButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  boot();
})();
