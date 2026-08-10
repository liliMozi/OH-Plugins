// routes/card.js — 选项卡片（声律 v0.2.4：≤3 横排、>3 竖列、自定义输入、跳过）
// GET  /card?cid=xxx         渲染按钮页（iframe 页面，带 pluginSurfaceSession）
// POST /card/choose          接收用户点击/输入/跳过，session:send 注入当前会话
import path from "path";
import { promises as fs } from "fs";

const TTL_MS = 24 * 60 * 60 * 1000;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export default function (app, ctx) {
  const choicesDir = path.join(ctx.dataDir, "choices");

  async function loadChoice(cid) {
    const file = path.join(choicesDir, `${cid}.json`);
    const raw = await fs.readFile(file, "utf-8");
    const data = JSON.parse(raw);
    if (Date.now() - (data.createdAt || 0) > TTL_MS) throw Object.assign(new Error("expired"), { code: "EXPIRED" });
    return data;
  }

  app.get("/card", async (c) => {
    const cid = c.req.query("cid");
    if (!cid || !/^[\w-]+$/.test(cid)) return c.text("missing cid", 400);
    let data;
    try {
      data = await loadChoice(cid);
    } catch (err) {
      return c.text(err.code === "EXPIRED" ? "choice expired" : "choice not found", 404);
    }
    const hanaCss = c.req.query("hana-css") || "";
    const hcLink = hanaCss ? `<link rel="stylesheet" href="${esc(hanaCss)}">` : "";
    const layout = data.options.length > 3 ? "v" : "h";
    const cols = data.options.length; // 横排时 2~3 列

    const question = escapeHtml(data.question);
    const buttons = data.options
      .map((opt, i) => {
        const idx = String(i + 1).padStart(2, "0");
        const label = escapeHtml(opt);
        const value = escapeHtml(opt);
        return `<button class="oc-row" data-i="${i}" data-v="${value}" aria-label="选择 ${label}">
  <span class="oc-idx">${idx}</span>
  <span class="oc-label">${label}</span>
  <svg class="oc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
</button>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>选项卡片</title>
${hcLink}
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-serif, 'Noto Serif SC', serif); background: transparent; padding: 2px; }
.oc-card {
  background: transparent;
  border: 0.5px solid var(--border, #D8CFBE);
  border-radius: var(--radius-chat-card, 4px);
  padding: 22px 18px 14px;
}
.oc-q { font-size: 18px; font-weight: 500; line-height: 1.5; color: var(--text, #2A2622); margin-bottom: 18px; }
.oc-status { margin-top: 14px; display: flex; align-items: center; gap: 7px; min-height: 16px; font-family: var(--font-ui, system-ui, sans-serif); font-size: 12px; color: var(--text-muted, #6B6158); }
.oc-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border, #D8CFBE); flex: none; }
.oc-status.busy { color: var(--text-light, #4A433C); }
.oc-status.busy .oc-dot { background: var(--accent, #537D96); }
.oc-status.ok { color: var(--green, #4A6B4A); }
.oc-status.ok .oc-dot { background: var(--green, #4A6B4A); }
.oc-status.err { color: var(--danger, #8B2C1F); }
.oc-status.err .oc-dot { background: var(--danger, #8B2C1F); }

/* ── 横排（≤3 个）：按选项数动态分列，块面更饱满 ── */
body.oc-layout-h .oc-list { display: grid; gap: 10px; }
body.oc-cols-2 .oc-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
body.oc-cols-3 .oc-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
body.oc-layout-h .oc-row {
  display: flex; align-items: center; justify-content: center;
  min-height: 60px;
  margin: 0; padding: 14px 12px;
  background: transparent;
  border: 0.5px solid var(--border, #D8CFBE);
  border-radius: 8px;
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 14px; font-weight: 500; text-align: center;
  color: var(--text, #2A2622);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
body.oc-cols-2 .oc-row { min-height: 76px; font-size: 15.5px; }
body.oc-layout-h .oc-row:hover { background: var(--accent-light, rgba(83,125,150,0.08)); border-color: var(--accent, #537D96); }
body.oc-layout-h .oc-row:disabled { cursor: default; }
body.oc-layout-h .oc-row.oc-picked {
  background: var(--accent-light, rgba(83,125,150,0.08));
  border-color: var(--accent, #537D96);
  color: var(--accent-hover, #3F6179);
}
body.oc-layout-h .oc-row:not(.oc-picked):disabled { opacity: 0.35; }
body.oc-layout-h .oc-idx, body.oc-layout-h .oc-arrow { display: none; }
body.oc-layout-h .oc-label { flex: none; }

/* ── 竖排（>3 个）：目录列表 ── */
body.oc-layout-v .oc-list { display: flex; flex-direction: column; }
body.oc-layout-v .oc-row {
  display: flex; align-items: center; gap: 14px; width: 100%;
  margin: 0 -18px; padding: 15px 18px;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  border-bottom: 0.5px solid var(--border, #D8CFBE);
  border-radius: 0;
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 13.5px; font-weight: 500; text-align: left;
  color: var(--text, #2A2622);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
body.oc-layout-v .oc-list .oc-row:last-child { border-bottom: none; }
body.oc-layout-v .oc-row:hover { background: var(--accent-light, rgba(83,125,150,0.08)); }
body.oc-layout-v .oc-row:disabled { cursor: default; }
body.oc-layout-v .oc-row.oc-picked {
  background: var(--accent-light, rgba(83,125,150,0.08));
  border-left-color: var(--accent, #537D96);
  color: var(--accent-hover, #3F6179);
}
body.oc-layout-v .oc-row:not(.oc-picked):disabled { opacity: 0.35; }
body.oc-layout-v .oc-idx { font-family: var(--font-mono, ui-monospace, monospace); font-size: 11px; color: var(--text-muted, #6B6158); min-width: 20px; flex: none; }
body.oc-layout-v .oc-label { flex: 1; }
body.oc-layout-v .oc-arrow { width: 13px; height: 13px; color: var(--text-muted, #6B6158); flex: none; transition: color 0.15s ease; }
body.oc-layout-v .oc-row:hover .oc-arrow, body.oc-layout-v .oc-row.oc-picked .oc-arrow { color: var(--accent, #537D96); }

/* ── 次级入口：自定义输入 / 跳过 ── */
.oc-extras {
  display: flex; align-items: center; gap: 30px;
  margin-top: 14px; padding-top: 13px;
  border-top: 0.5px solid var(--border, #D8CFBE);
}
.oc-extra {
  display: inline-flex; align-items: center; gap: 12px;
  background: transparent; border: none;
  padding: 10px 4px;
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 28px; font-weight: 500;
  color: var(--text-muted, #6B6158);
  cursor: pointer;
  transition: color 0.15s ease;
}
.oc-extra:hover { color: var(--accent, #537D96); }
.oc-extra:disabled { cursor: default; opacity: 0.4; }
.oc-extra svg { width: 28px; height: 28px; flex: none; }
#oc-skip-btn {
  flex: none;
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 14px; font-weight: 500;
  color: #FFF7EE;
  background: var(--danger, #C0392B);
  border: none;
  border-radius: 8px;
  padding: 11px 22px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
#oc-skip-btn:hover { opacity: 0.85; }
#oc-skip-btn:disabled { opacity: 0.4; cursor: default; }
.oc-custom { margin-top: 12px; padding-top: 12px; border-top: 0.5px solid var(--border, #D8CFBE); }
.oc-custom-row { display: flex; gap: 8px; }
.oc-custom-input {
  flex: 1; min-width: 0;
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 15px; color: var(--text, #2A2622);
  background: transparent;
  border: 0.5px solid var(--border, #D8CFBE);
  border-radius: var(--radius-chat-card, 4px);
  padding: 15px 16px;
  outline: none;
  transition: border-color 0.15s ease;
}
.oc-custom-input:focus { border-color: var(--accent, #537D96); }
.oc-custom-input::placeholder { color: var(--text-muted, #6B6158); }
.oc-custom-send {
  flex: none;
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 14px; font-weight: 500;
  color: var(--bg-card, #FBF7EE);
  background: var(--accent, #537D96);
  border: none;
  border-radius: 8px;
  padding: 11px 22px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.oc-custom-send:hover { opacity: 0.85; }
.oc-custom-send:disabled { opacity: 0.4; cursor: default; }
</style>
</head>
<body class="oc-layout-${layout}${layout === "h" ? ` oc-cols-${cols}` : ""}">
<div class="oc-card">
  <div class="oc-q">${question}</div>
  <div class="oc-list">${buttons}</div>
  <div class="oc-custom">
    <div class="oc-custom-row">
      <input class="oc-custom-input" id="oc-custom-input" type="text" maxlength="200" placeholder="输入你的答案…" aria-label="自定义答案">
    </div>
  </div>
  <div class="oc-extras">
    <button class="oc-custom-send" id="oc-custom-send">发送</button>
    <button class="oc-extra" id="oc-skip-btn" aria-label="跳过">
      跳过
    </button>
  </div>
  <div id="oc-status" class="oc-status" style="display:none"><span class="oc-dot"></span><span id="oc-status-text"></span></div>
</div>
<script>
(function () {
  var surfaceSession = new URLSearchParams(location.search).get("pluginSurfaceSession");
  var cid = new URLSearchParams(location.search).get("cid");
  var statusEl = document.getElementById("oc-status");
  var statusText = document.getElementById("oc-status-text");
  var customInput = document.getElementById("oc-custom-input");
  var skipBtn = document.getElementById("oc-skip-btn");
  var sendBtn = document.getElementById("oc-custom-send");
  var picked = false;

  function setStatus(text, cls) {
    statusEl.style.display = "flex";
    statusText.textContent = text;
    statusEl.className = "oc-status" + (cls ? " " + cls : "");
  }
  function lockAll() {
    document.querySelectorAll(".oc-row").forEach(function (b) { b.disabled = true; });
    skipBtn.disabled = true;
    sendBtn.disabled = true;
    customInput.disabled = true;
  }
  function submit(value, mode) {
    if (picked) return;
    picked = true;
    lockAll();
    setStatus("正在发送…", "busy");
    fetch("card/choose", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hana-Plugin-Surface-Session": surfaceSession || ""
      },
      body: JSON.stringify({ cid: cid, choice: value, mode: mode })
    }).then(function (res) {
      return res.json();
    }).then(function (data) {
      if (data.ok) {
        setStatus("已发送 · " + (mode === "skip" ? "跳过" : value), "ok");
      } else if (data.error === "session_busy") {
        setStatus("会话忙碌中，请等回复结束后再点", "err");
      } else {
        setStatus("发送失败：" + (data.error || "unknown"), "err");
      }
    }).catch(function (e) {
      setStatus("发送失败：" + e.message, "err");
    });
  }

  document.querySelectorAll(".oc-row").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (picked) return;
      btn.classList.add("oc-picked");
      submit(btn.getAttribute("data-v"), "option");
    });
  });

  sendBtn.addEventListener("click", function () {
    if (picked) return;
    var v = customInput.value.trim();
    if (!v) return;
    submit(v, "custom");
  });
  customInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendBtn.click();
    }
  });
  skipBtn.addEventListener("click", function () {
    if (picked) return;
    submit("", "skip");
  });

  function reportSize() {
    var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    var w = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    try {
      window.parent.postMessage(
        { protocol: "hana.plugin.ui", version: 1, kind: "event", type: "ui.resize", payload: { width: w, height: h } },
        "*"
      );
    } catch (e) {}
  }
  if (window.ResizeObserver) {
    new ResizeObserver(reportSize).observe(document.body);
  }
  reportSize();
  window.addEventListener("load", reportSize);
})();
</script>
</body>
</html>`;
    return c.html(html);
  });

  app.post("/card/choose", async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "invalid json" }, 400);
    }
    const { cid, choice, mode } = body || {};
    const m = mode === "custom" || mode === "skip" ? mode : "option";
    if (!cid || !/^[\w-]+$/.test(String(cid))) {
      return c.json({ ok: false, error: "cid is required" }, 400);
    }
    if ((m === "option" || m === "custom") && (typeof choice !== "string" || !choice.trim())) {
      return c.json({ ok: false, error: "choice is required for this mode" }, 400);
    }
    let data;
    try {
      data = await loadChoice(cid);
    } catch {
      return c.json({ ok: false, error: "choice not found or expired" }, 404);
    }
    const text = m === "skip"
      ? `（选项卡片）${data.question}\n跳过，不做选择`
      : m === "custom"
        ? `（选项卡片）${data.question}\n我选择（自定义）：${choice.trim()}`
        : `（选项卡片）${data.question}\n我选择：${choice.trim()}`;
    try {
      // 只传 sessionPath：sessionId 会触发 manifest 解析，桌面会话可能未注册
      // manifest 而报 session_manifest_not_found；getSessionIdForPath 从文件头解析
      const result = await ctx.bus.request("session:send", {
        text,
        sessionPath: data.sessionPath || (data.sessionRef && data.sessionRef.sessionPath) || undefined,
      });
      return c.json({ ok: true, ...result });
    } catch (err) {
      return c.json({ ok: false, error: err.message, code: err.code || null }, 500);
    }
  });
}
