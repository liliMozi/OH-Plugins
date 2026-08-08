// routes/sidebar.js — 语音播报侧边栏（设置面板）
const VOICE_GROUPS = [
  {
    label: "在线音色",
    list: [
      { id: "Microsoft Xiaoxiao Online", label: "晓晓（女）" },
      { id: "Microsoft Xiaoyi Online", label: "晓伊（女）" },
      { id: "Microsoft Yunxi Online", label: "云希（男）" },
      { id: "Microsoft Yunyang Online", label: "云扬（男）" },
      { id: "Microsoft Yunjian Online", label: "云健（男）" },
      { id: "Microsoft Yunxia Online", label: "云夏（男）" },
      { id: "Microsoft Xiaobei Online", label: "晓北（女）" },
      { id: "Microsoft Xiaoni Online", label: "晓妮（女）" }
    ]
  },
  {
    label: "本地音色",
    list: [
      { id: "Microsoft Huihui", label: "慧慧（女）" },
      { id: "Microsoft Kangkang", label: "康康（男）" },
      { id: "Microsoft Yaoyao", label: "瑶瑶（女）" }
    ]
  }
];

const WIDGET_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-ui, system-ui, sans-serif); color: var(--text, #2A2622); background: transparent; }
.card { background: var(--bg-card, #FBF7EE); border: 0.5px solid var(--border, #D8CFBE); border-radius: var(--radius-chat-card, 4px); padding: 24px 20px 18px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.title { display: flex; align-items: center; gap: 8px; font-family: var(--font-serif, serif); font-size: 16px; font-weight: 500; color: var(--text, #2A2622); letter-spacing: 0.04em; }
.t-icon { width: 17px; height: 17px; color: var(--accent, #537D96); flex: none; }
.badge { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted, #6B6158); }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent, #537D96); }
.dot.off { background: var(--border, #D8CFBE); }
.grp { padding: 15px 0; }
.grp + .grp { border-top: 0.5px solid var(--border, #D8CFBE); }
.grp-label { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--text-muted, #6B6158); letter-spacing: 0.14em; margin-bottom: 11px; }
.grp-label::after { content: ""; flex: 1; height: 0.5px; background: var(--border, #D8CFBE); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--text-light, #4A433C); }
.row-t { line-height: 1.4; }
.sw { position: relative; display: inline-block; width: 34px; height: 19px; flex: none; }
.sw input { opacity: 0; width: 0; height: 0; }
.sl { position: absolute; inset: 0; border-radius: 10px; background: var(--border, #D8CFBE); transition: background .15s; cursor: pointer; }
.sl:before { content: ""; position: absolute; width: 15px; height: 15px; left: 2px; top: 2px; border-radius: 50%; background: #FFFDF7; box-shadow: 0 1px 2px rgba(42,38,34,.18); transition: transform .15s; }
.sw input:checked + .sl { background: var(--accent, #537D96); }
.sw input:checked + .sl:before { transform: translateX(15px); }
.select-wrap { position: relative; }
.select-wrap select { appearance: none; -webkit-appearance: none; width: 100%; border: 0.5px solid var(--border, #D8CFBE); border-radius: var(--radius-chat-card, 4px); background: var(--accent-light, rgba(83,125,150,.04)); color: var(--text, #2A2622); padding: 9px 30px 9px 12px; font-size: 12.5px; font-family: inherit; cursor: pointer; }
.select-wrap select:hover { background: var(--accent-light, rgba(83,125,150,.08)); }
.select-wrap select:focus { outline: none; border-color: var(--accent, #537D96); }
.select-wrap .arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; color: var(--text-muted, #6B6158); pointer-events: none; }
input[type=range] { -webkit-appearance: none; appearance: none; flex: 1; height: 20px; background: transparent; cursor: pointer; }
input[type=range]::-webkit-slider-runnable-track { height: 3px; border-radius: 2px; background: var(--border, #D8CFBE); }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent, #537D96); margin-top: -5.5px; border: 2.5px solid var(--bg-card, #FBF7EE); box-shadow: 0 1px 2px rgba(42,38,34,.18); }
input[type=range]::-moz-range-track { height: 3px; border-radius: 2px; background: var(--border, #D8CFBE); }
input[type=range]::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--accent, #537D96); border: none; }
.rate-v { min-width: 30px; text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; color: var(--accent, #537D96); }
.rate-hint { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-muted, #6B6158); margin-top: 3px; padding: 0 3px; }
.num-wrap { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted, #6B6158); }
.num-wrap input { width: 64px; border: 0.5px solid var(--border, #D8CFBE); border-radius: var(--radius-chat-card, 4px); background: transparent; color: var(--text, #2A2622); padding: 7px 8px; font-size: 12.5px; text-align: right; font-variant-numeric: tabular-nums; }
.num-wrap input:focus { outline: none; border-color: var(--accent, #537D96); }
.btns { display: flex; gap: 10px; }
.btn { flex: 1; padding: 10px 0; font-size: 12.5px; font-weight: 500; font-family: var(--font-serif, serif); border: 0.5px solid var(--border, #D8CFBE); border-radius: var(--radius-chat-card, 4px); background: transparent; color: var(--accent, #537D96); cursor: pointer; text-align: center; letter-spacing: 0.06em; transition: background .15s; }
.btn:hover { background: var(--accent-light, rgba(83,125,150,.08)); }
.btn.stop { color: var(--danger, #8B2C1F); }
.btn.stop:hover { background: rgba(139,44,31,.06); }
.btn.primary { border-color: var(--accent, #537D96); background: var(--accent, #537D96); color: #FFFDF7; }
.btn.primary:hover { background: var(--accent-hover, #3F6179); }
.st { font-size: 11px; color: var(--text-muted, #6B6158); min-height: 15px; line-height: 1.5; margin-top: 12px; text-align: center; letter-spacing: 0.04em; }
`;

const WIDGET_JS = `
(function(){
"use strict";
var base = window.location.pathname.replace(/\\/sidebar\\/?$/, "") || "/api/plugins/voice-announcer";
var q = window.location.search || "";
var $ = function(id){ return document.getElementById(id); };

function esc(s){ return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function setSt(msg){ $("st").textContent = msg || ""; }

function render(d){
  var cfg = d.config || {};
  var enabled = cfg.enabled !== false;
  var streaming = cfg.streaming === true;
  var voice = cfg.voice || "Microsoft Xiaoxiao Online";
  var rate = (typeof cfg.rate === "number") ? cfg.rate : 0;
  var maxLen = cfg.maxLength || 500;

  $("sw").checked = enabled;
  $("swStream").checked = streaming;
  $("dot").className = "dot" + (enabled ? "" : " off");
  $("badgeText").textContent = enabled ? (streaming ? "实时播报中" : "自动播报中") : "已暂停";

  var groups = d.voiceGroups;
  if (groups) {
    var html = "";
    for (var g = 0; g < groups.length; g++) {
      html += '<optgroup label="' + esc(groups[g].label) + '">';
      var list = groups[g].list || [];
      for (var i = 0; i < list.length; i++) {
        html += '<option value="' + esc(list[i].id) + '"' + (list[i].id === voice ? " selected" : "") + '>' + esc(list[i].label) + '</option>';
      }
      html += '</optgroup>';
    }
    $("voice").innerHTML = html;
  }
  $("rate").value = rate;
  $("rateV").textContent = rate > 0 ? "+" + rate : String(rate);
  $("maxLen").value = maxLen;
}

function collect(){
  return {
    enabled: $("sw").checked,
    streaming: $("swStream").checked,
    voice: $("voice").value,
    rate: Number($("rate").value),
    maxLength: Number($("maxLen").value) || 500
  };
}

function load(){
  fetch(base + "/sidebar/data" + q).then(function(r){ return r.json(); }).then(function(d){
    if (d && d.ok) { render(d); setSt(""); }
  }).catch(function(){ setSt("配置加载失败"); });
}

function save(){
  var body = collect();
  fetch(base + "/sidebar/data" + q, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d && d.ok) { render(d); setSt("已保存"); }
      else setSt("保存失败");
    })
    .catch(function(){ setSt("保存失败"); });
}

function doStop(){
  fetch(base + "/sidebar/stop" + q, { method: "POST" }).then(function(){ setSt("已停止播报"); }).catch(function(){});
}

function doTest(){
  var body = collect();
  fetch(base + "/sidebar/test" + q, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(function(){ setSt("正在朗读测试…"); })
    .catch(function(){ setSt("测试失败"); });
}

$("sw").addEventListener("change", save);
$("swStream").addEventListener("change", save);
$("voice").addEventListener("change", save);
$("rate").addEventListener("input", function(){ var v = Number($("rate").value); $("rateV").textContent = v > 0 ? "+" + v : String(v); });
$("rate").addEventListener("change", save);
$("maxLen").addEventListener("change", save);
$("stopBtn").addEventListener("click", doStop);
$("testBtn").addEventListener("click", doTest);

load();
try { parent.postMessage({ source: "hana-plugin", type: "ready" }, "*"); } catch(e){}
})();
`;

export default function (app, ctx) {
  app.get("/sidebar", (c) => {
    const th = c.req.query("hana-theme") || "inherit";
    return c.html(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${WIDGET_CSS}</style>
</head><body data-hana-theme="${th}" data-surface="widget">
<div class="card">
  <div class="head">
    <div class="title"><svg class="t-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>语音播报</div>
    <div class="badge"><span class="dot" id="dot"></span><span id="badgeText">自动播报中</span></div>
  </div>

  <div class="grp">
    <div class="grp-label">开关</div>
    <div class="row">
      <span class="row-t">回复完成后朗读</span>
      <label class="sw"><input type="checkbox" id="sw"><span class="sl"></span></label>
    </div>
    <div class="row" style="margin-top:12px">
      <span class="row-t">实时朗读（边生成边读）</span>
      <label class="sw"><input type="checkbox" id="swStream"><span class="sl"></span></label>
    </div>
  </div>

  <div class="grp">
    <div class="grp-label">音色</div>
    <div class="select-wrap">
      <select id="voice"></select>
      <svg class="arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l4 4 4-4"/></svg>
    </div>
  </div>

  <div class="grp">
    <div class="grp-label">语速</div>
    <div class="row">
      <input type="range" id="rate" min="-10" max="10" step="1">
      <span class="rate-v" id="rateV">-2</span>
    </div>
    <div class="rate-hint"><span>慢</span><span>快</span></div>
  </div>

  <div class="grp">
    <div class="grp-label">长文截断</div>
    <div class="row">
      <span class="row-t">超过该字数不再念</span>
      <div class="num-wrap"><input type="number" id="maxLen" min="50" max="5000" step="50"><span>字</span></div>
    </div>
  </div>

  <div class="grp">
    <div class="btns">
      <div class="btn stop" id="stopBtn">停止播报</div>
      <div class="btn primary" id="testBtn">测试声音</div>
    </div>
  </div>

  <div class="st" id="st"></div>
</div>
<script>${WIDGET_JS}</script>
</body></html>`);
  });

  app.get("/sidebar/data", (c) => {
    const va = ctx._va;
    return c.json({ ok: true, config: va ? va.getConfig() : {}, voiceGroups: VOICE_GROUPS });
  });

  app.post("/sidebar/data", async (c) => {
    const va = ctx._va;
    if (!va) return c.json({ ok: false, error: "not ready" }, 503);
    let body = {};
    try { body = await c.req.json(); } catch {}
    await va.save(body);
    return c.json({ ok: true, config: va.getConfig(), voiceGroups: VOICE_GROUPS });
  });

  app.post("/sidebar/stop", (c) => {
    ctx._va?.stop();
    return c.json({ ok: true });
  });

  app.post("/sidebar/test", async (c) => {
    const va = ctx._va;
    if (!va) return c.json({ ok: false, error: "not ready" }, 503);
    let body = {};
    try { body = await c.req.json(); } catch {}
    va.speak("你好，这是语音播报的测试朗读。Hello, this is a test.", body).then(() => {});
    return c.json({ ok: true });
  });
}
