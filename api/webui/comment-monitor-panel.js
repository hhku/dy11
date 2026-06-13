(function () {
  const PANEL_ID = "mc-comment-monitor-panel";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  async function api(path, options) {
    const response = await fetch(`/api/comment-monitor${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.message || "请求失败");
    return data;
  }

  function getVideoUrls(panel) {
    return panel
      .querySelector(".mccm-urls")
      .value.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((url, index, urls) => urls.indexOf(url) === index);
  }

  function renderStatus(panel, status) {
    const statusText = panel.querySelector(".mccm-status");
    if (!statusText) return;

    if (status.running) {
      const nextRun = status.next_run_at
        ? new Date(status.next_run_at).toLocaleTimeString()
        : "本轮抓取中";
      const total = status.total_videos || status.video_urls?.length || 1;
      const current = status.current_index || 0;
      const progress = current > 0 ? `第 ${current}/${total} 条` : `${total} 条已排队`;
      const subComments = status.enable_sub_comments ? "，含子评论" : "";
      statusText.textContent = `运行中，${progress}${subComments}，已完成 ${status.completed_rounds || 0} 轮，下一轮 ${nextRun}`;
      statusText.classList.add("running");
    } else {
      statusText.textContent = "未运行";
      statusText.classList.remove("running");
    }
  }

  async function refreshStatus(panel) {
    try {
      renderStatus(panel, await api("/status"));
    } catch {
      renderStatus(panel, { running: false });
    }
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = el("section", "", "");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="mccm-title">视频评论持续抓取</div>
      <textarea class="mccm-urls" rows="4" placeholder="一行一个抖音视频或图文链接"></textarea>
      <div class="mccm-row">
        <label>每轮间隔秒</label>
        <input class="mccm-interval" type="number" min="30" value="60" />
        <label>每条评论数</label>
        <input class="mccm-max" type="number" min="1" value="200" />
      </div>
      <label class="mccm-check">
        <input class="mccm-sub-comments" type="checkbox" />
        <span>采集子评论</span>
      </label>
      <div class="mccm-actions">
        <button class="mccm-start" type="button">开始监控</button>
        <button class="mccm-stop" type="button">停止</button>
      </div>
      <div class="mccm-status">未运行</div>
    `;

    panel.querySelector(".mccm-start").addEventListener("click", async () => {
      const videoUrls = getVideoUrls(panel);
      const intervalSeconds = Number(panel.querySelector(".mccm-interval").value || 60);
      const maxCommentsCount = Number(panel.querySelector(".mccm-max").value || 200);
      const enableSubComments = panel.querySelector(".mccm-sub-comments").checked;
      const statusText = panel.querySelector(".mccm-status");

      if (videoUrls.length === 0) {
        statusText.textContent = "请先粘贴视频链接，一行一个";
        return;
      }

      try {
        statusText.textContent = "启动中...";
        await api("/start", {
          method: "POST",
          body: JSON.stringify({
            video_urls: videoUrls,
            interval_seconds: intervalSeconds,
            max_comments_count: maxCommentsCount,
            enable_sub_comments: enableSubComments,
          }),
        });
        await refreshStatus(panel);
      } catch (error) {
        statusText.textContent = error.message;
      }
    });

    panel.querySelector(".mccm-stop").addEventListener("click", async () => {
      const statusText = panel.querySelector(".mccm-status");
      try {
        statusText.textContent = "停止中...";
        await api("/stop", { method: "POST" });
        await refreshStatus(panel);
      } catch (error) {
        statusText.textContent = error.message;
      }
    });

    document.body.appendChild(panel);
    refreshStatus(panel);
    window.setInterval(() => refreshStatus(panel), 5000);
  }

  function addStyles() {
    if (document.getElementById("mc-comment-monitor-style")) return;
    const style = document.createElement("style");
    style.id = "mc-comment-monitor-style";
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 9000;
        width: min(380px, calc(100vw - 36px));
        padding: 12px;
        border: 1px solid rgba(6, 182, 212, 0.45);
        border-radius: 8px;
        background: rgba(248, 250, 252, 0.96);
        box-shadow: 0 10px 32px rgba(15, 23, 42, 0.18);
        color: #0f172a;
        font: 12px "JetBrains Mono", Consolas, monospace;
      }
      #${PANEL_ID} .mccm-title {
        color: rgb(6, 182, 212);
        font-weight: 700;
        margin-bottom: 8px;
      }
      #${PANEL_ID} input,
      #${PANEL_ID} textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #e2e8f0;
        color: #0f172a;
        padding: 8px;
        outline: none;
      }
      #${PANEL_ID} input {
        height: 32px;
        padding: 0 8px;
      }
      #${PANEL_ID} textarea {
        min-height: 92px;
        line-height: 1.5;
        resize: vertical;
      }
      #${PANEL_ID} .mccm-row {
        display: grid;
        grid-template-columns: auto 72px auto 72px;
        gap: 8px;
        align-items: center;
        margin-top: 8px;
      }
      #${PANEL_ID} .mccm-check {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        color: #334155;
        cursor: pointer;
      }
      #${PANEL_ID} .mccm-check input {
        width: 16px;
        height: 16px;
        padding: 0;
        accent-color: rgb(6, 182, 212);
      }
      #${PANEL_ID} .mccm-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }
      #${PANEL_ID} button {
        flex: 1;
        height: 32px;
        border-radius: 6px;
        border: 1px solid rgba(6, 182, 212, 0.55);
        background: rgba(6, 182, 212, 0.12);
        color: rgb(8, 145, 178);
        cursor: pointer;
      }
      #${PANEL_ID} .mccm-stop {
        border-color: rgba(236, 72, 153, 0.45);
        background: rgba(236, 72, 153, 0.1);
        color: rgb(219, 39, 119);
      }
      #${PANEL_ID} .mccm-status {
        margin-top: 8px;
        color: #64748b;
        min-height: 18px;
        line-height: 1.45;
      }
      #${PANEL_ID} .mccm-status.running {
        color: rgb(22, 163, 74);
      }
    `;
    document.head.appendChild(style);
  }

  addStyles();
  createPanel();
})();
