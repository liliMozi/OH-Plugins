// routes/sidebar.js — 声律侧边栏（设置面板）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function parseRules() {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  try {
    const md = fs.readFileSync(path.join(root, "RULES.md"), "utf8");
    const rules = [];
    let cur = null;
    for (const line of md.split(/\r?\n/)) {
      const m = line.match(/^##\s+(.+)$/);
      if (m) { cur = { title: m[1].trim(), points: [] }; rules.push(cur); continue; }
      if (!cur) continue;
      if (/^\s*[-*]\s+/.test(line)) cur.points.push(line.replace(/^\s*[-*]\s+/, "").trim());
      else if (/^\s*\d+\.\s+/.test(line)) cur.points.push(line.replace(/^\s*\d+\.\s+/, "").trim());
    }
    return rules;
  } catch { return []; }
}

function rulesStateFile(ctx) {
  return path.join(ctx.dataDir, "rules-state.json");
}
function loadRulesState(ctx) {
  try {
    const raw = fs.readFileSync(rulesStateFile(ctx), "utf8");
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch { return {}; }
}
function saveRulesState(ctx, state) {
  try {
    fs.mkdirSync(ctx.dataDir, { recursive: true });
    fs.writeFileSync(rulesStateFile(ctx), JSON.stringify(state, null, 2), "utf8");
  } catch {}
}

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
.select-wrap select option,
.select-wrap select optgroup { color: var(--text-light, #4A433C); background: var(--bg-card, #FBF7EE); }
.select-wrap select option:checked { background: var(--accent-light, rgba(83,125,150,.12)); color: var(--text, #2A2622); }
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
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
.tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; font-size: 11.5px; border-radius: 10px; background: var(--accent-light, rgba(83,125,150,.08)); color: var(--accent-hover, #3F6179); }
.tag-x { cursor: pointer; opacity: .6; font-size: 12px; line-height: 1; }
.tag-x:hover { opacity: 1; }
.agent-add { display: flex; gap: 8px; }
.agent-add input { flex: 1; border: 0.5px solid var(--border, #D8CFBE); border-radius: var(--radius-chat-card, 4px); background: transparent; color: var(--text, #2A2622); padding: 7px 10px; font-size: 12px; font-family: inherit; }
.agent-add input:focus { outline: none; border-color: var(--accent, #537D96); }
.btn.sm { flex: none; padding: 7px 12px; font-size: 12px; }
.hint { font-size: 10.5px; color: var(--text-muted, #6B6158); margin-top: 7px; }
.hist { display: flex; flex-direction: column; gap: 7px; }
.hist-empty { font-size: 11.5px; color: var(--text-muted, #6B6158); padding: 4px 0; }
.hist-item { border: 0.5px solid var(--border, #D8CFBE); border-radius: var(--radius-chat-card, 4px); padding: 8px 10px; }
.hist-top { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
.hist-mode { font-size: 10.5px; padding: 1px 6px; border-radius: 8px; background: var(--accent-light, rgba(83,125,150,.08)); color: var(--accent-hover, #3F6179); }
.hist-ts { font-size: 10.5px; color: var(--text-muted, #6B6158); }
.hist-txt { font-size: 11.5px; color: var(--text-light, #4A433C); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rule-b textarea { width: 100%; min-height: 74px; border: 0.5px solid var(--border, #D8CFBE); border-radius: var(--radius-chat-card, 4px); background: transparent; color: var(--text, #2A2622); padding: 8px 10px; font-size: 11.5px; font-family: inherit; line-height: 1.6; resize: vertical; }
.rule-b textarea:focus { outline: none; border-color: var(--accent, #537D96); }
.prompt-btns { display: flex; gap: 8px; margin-top: 8px; }
.prompt-btns .btn { padding: 6px 0; font-size: 11.5px; }
.rules { display: flex; flex-direction: column; gap: 8px; }
.rule { border: 0.5px solid var(--border, #D8CFBE); border-radius: var(--radius-chat-card, 4px); overflow: hidden; }
.rule.off .rule-b { opacity: 0.45; }
.rule-h { display: flex; align-items: center; gap: 7px; padding: 9px 11px; font-size: 12px; font-weight: 500; color: var(--text, #2A2622); cursor: pointer; user-select: none; letter-spacing: 0.03em; }
.rule-h:hover { background: var(--accent-light, rgba(83,125,150,.08)); }
.rule-h .rule-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rule-switch { width: 30px; height: 16px; border-radius: 8px; border: 0.5px solid var(--border, #D8CFBE); background: transparent; position: relative; cursor: pointer; flex: none; transition: background .15s, border-color .15s; }
.rule-switch .knob { position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--text-muted, #6B6158); transition: left .15s, background .15s; }
.rule-switch.on { background: var(--accent-light, rgba(83,125,150,.08)); border-color: var(--accent, #537D96); }
.rule-switch.on .knob { left: 16px; background: var(--accent, #537D96); }
.rule-custom { white-space: pre-wrap; }
.rule-edit { display: none; margin-top: 8px; }
.rule-edit.show { display: block; }
.rule-actions { display: flex; gap: 8px; margin-top: 8px; }
.rule-actions .btn { padding: 4px 0; font-size: 11.5px; }
.arr { width: 11px; height: 11px; color: var(--text-muted, #6B6158); transition: transform .15s; flex: none; }
.rule.open .arr { transform: rotate(90deg); }
.rule-b { display: none; padding: 9px 13px 11px; border-top: 0.5px solid var(--border, #D8CFBE); font-size: 11.5px; color: var(--text-light, #4A433C); line-height: 1.65; }
.rule.open .rule-b { display: block; }
.rule-b ul { list-style: none; margin: 0; padding: 0; }
.rule-b li { padding-left: 11px; position: relative; }
.rule-b li::before { content: ""; position: absolute; left: 0; top: 0.62em; width: 4px; height: 4px; border-radius: 50%; background: var(--accent, #537D96); opacity: .55; }
.rule-b li + li { margin-top: 4px; }
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
  var readSummaryOnly = cfg.readSummaryOnly === true;
  var oneLiner = cfg.summaryOneLiner === true;
  var voice = cfg.voice || "Microsoft Xiaoxiao Online";
  var rate = (typeof cfg.rate === "number") ? cfg.rate : 0;
  var volume = (typeof cfg.volume === "number") ? cfg.volume : 100;
  var maxLen = cfg.maxLength || 500;

  $("sw").checked = enabled;
  $("swStream").checked = streaming;
  $("swSummary").checked = readSummaryOnly;
  $("swOne").checked = oneLiner;
  $("dot").className = "dot" + (enabled ? "" : " off");
  $("badgeText").textContent = !enabled ? "已暂停" : (oneLiner ? "一句话总结中" : (readSummaryOnly ? "只读总结中" : (streaming ? "实时播报中" : "自动播报中")));

  renderAgents(cfg.agents);
  renderHistory(d.history || []);
  $("sumPrompt").value = cfg.summaryCustomPrompt || "";

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
  $("volume").value = volume;
  $("volumeV").textContent = String(volume);
  $("maxLen").value = maxLen;
}

function renderAgents(agents){
  var list = Array.isArray(agents) ? agents : [];
  var box = $("agentTags");
  if (!box) return;
  if (!list.length) {
    box.innerHTML = '<span class="hist-empty">播报全部 Agent</span>';
    return;
  }
  var html = "";
  for (var i = 0; i < list.length; i++){
    html += '<span class="tag">' + esc(list[i]) + '<span class="tag-x" data-a="' + esc(list[i]) + '">×</span></span>';
  }
  box.innerHTML = html;
  var xs = box.querySelectorAll(".tag-x");
  for (var j = 0; j < xs.length; j++){
    xs[j].addEventListener("click", function(){
      var cur = Array.isArray(loadAgents()) ? loadAgents() : [];
      saveAgents(cur.filter(function(a){ return a !== this.getAttribute("data-a"); }.bind(this)));
    });
  }
}

function loadAgents(){
  var tags = document.querySelectorAll("#agentTags .tag");
  var out = [];
  for (var i = 0; i < tags.length; i++){
    var t = tags[i].childNodes[0];
    if (t && t.nodeValue) out.push(t.nodeValue.trim());
  }
  return out;
}

function saveAgents(list){
  fetch(base + "/sidebar/data" + q, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agents: list }) })
    .then(function(r){ return r.json(); })
    .then(function(d){ if (d && d.ok) { render(d); setSt("已保存"); } else setSt("保存失败"); })
    .catch(function(){ setSt("保存失败"); });
}

function renderHistory(list){
  var box = $("hist");
  if (!box) return;
  if (!list || !list.length) {
    box.innerHTML = '<span class="hist-empty">还没有播报记录</span>';
    return;
  }
  var MODES = { "full": "全文", "card": "卡片", "one-liner": "一句话", "streaming": "实时" };
  var html = "";
  for (var i = 0; i < list.length; i++){
    var e = list[i];
    var d = new Date(e.ts);
    var pad = function(n){ return n < 10 ? "0" + n : String(n); };
    var ts = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    html += '<div class="hist-item"><div class="hist-top"><span class="hist-mode">' + (MODES[e.mode] || e.mode) + '</span><span class="hist-ts">' + ts + '</span></div><div class="hist-txt">' + esc(e.text) + '</div></div>';
  }
  box.innerHTML = html;
}

function collect(){
  return {
    enabled: $("sw").checked,
    streaming: $("swStream").checked,
    readSummaryOnly: $("swSummary").checked,
    summaryOneLiner: $("swOne").checked,
    voice: $("voice").value,
    rate: Number($("rate").value),
    volume: Number($("volume").value),
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
$("swSummary").addEventListener("change", save);
$("swOne").addEventListener("change", save);
$("voice").addEventListener("change", save);
$("rate").addEventListener("input", function(){ var v = Number($("rate").value); $("rateV").textContent = v > 0 ? "+" + v : String(v); });
$("rate").addEventListener("change", save);
$("volume").addEventListener("input", function(){ $("volumeV").textContent = String(Number($("volume").value)); });
$("volume").addEventListener("change", save);
$("maxLen").addEventListener("change", save);
$("stopBtn").addEventListener("click", doStop);
$("testBtn").addEventListener("click", doTest);

function addAgent(){
  var v = $("agentInput").value.trim();
  if (!v) return;
  var cur = loadAgents();
  if (cur.indexOf(v) >= 0) { $("agentInput").value = ""; return; }
  cur.push(v);
  saveAgents(cur);
  $("agentInput").value = "";
}
$("agentAdd").addEventListener("click", addAgent);
$("agentInput").addEventListener("keydown", function(e){ if (e.key === "Enter") { e.preventDefault(); addAgent(); } });

$("histClear").addEventListener("click", function(){
  fetch(base + "/sidebar/history/clear" + q, { method: "POST" })
    .then(function(r){ return r.json(); })
    .then(function(d){ if (d && d.ok) { renderHistory([]); setSt("历史已清空"); } })
    .catch(function(){ setSt("清空失败"); });
});

$("promptSave").addEventListener("click", function(){
  var v = $("sumPrompt").value;
  fetch(base + "/sidebar/data" + q, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summaryCustomPrompt: v }) })
    .then(function(r){ return r.json(); })
    .then(function(d){ if (d && d.ok) { render(d); setSt("prompt 已保存"); } else setSt("保存失败"); })
    .catch(function(){ setSt("保存失败"); });
});
$("promptReset").addEventListener("click", function(){
  $("sumPrompt").value = "";
  fetch(base + "/sidebar/data" + q, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summaryCustomPrompt: "" }) })
    .then(function(r){ return r.json(); })
    .then(function(d){ if (d && d.ok) { render(d); setSt("已恢复内置 prompt"); } else setSt("保存失败"); })
    .catch(function(){ setSt("保存失败"); });
});

function renderRules(list){
  var html = "";
  for (var i = 0; i < list.length; i++){
    var r = list[i];
    var on = r.enabled !== false;
    var custom = r.custom && r.custom.trim();
    var defaultText = (r.points || []).map(function(p){ return "- " + p; }).join("\\n");
    var bodyHtml = custom
      ? '<div class="rule-custom">' + esc(custom) + '</div>'
      : '<ul>' + r.points.map(function(p){ return '<li>' + esc(p) + '</li>'; }).join("") + '</ul>';
    html += '<div class="rule' + (on ? "" : " off") + '"><div class="rule-h"><svg class="arr" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l4 4-4 4"/></svg><span class="rule-t">' + esc(r.title) + '</span><span class="rule-switch' + (on ? " on" : "") + '" data-title="' + esc(r.title) + '" role="switch" aria-checked="' + on + '" title="' + (on ? "点击关闭该规则" : "点击启用该规则") + '"><span class="knob"></span></span></div><div class="rule-b">'
      + bodyHtml
      + '<div class="rule-edit" data-title="' + esc(r.title) + '"><textarea>' + esc(custom || defaultText) + '</textarea><div class="prompt-btns"><div class="btn rule-edit-save">保存</div><div class="btn rule-edit-cancel">取消</div></div></div>'
      + '<div class="rule-actions"><div class="btn sm rule-edit-btn">' + (custom ? "编辑" : "自定义") + '</div>'
      + (custom ? '<div class="btn sm rule-edit-reset">恢复默认</div>' : '')
      + '</div></div></div>';
  }
  $("rules").innerHTML = html;
  var hs = document.querySelectorAll(".rule-h");
  for (var k = 0; k < hs.length; k++){
    hs[k].addEventListener("click", function(e){
      if (e.target.closest && e.target.closest(".rule-switch")) return;
      this.parentNode.classList.toggle("open");
    });
  }
  var sws = document.querySelectorAll(".rule-switch");
  for (var s = 0; s < sws.length; s++){
    sws[s].addEventListener("click", function(){
      var self = this;
      var title = self.getAttribute("data-title");
      var next = !self.classList.contains("on");
      fetch(base + "/sidebar/rules/toggle" + q, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title, enabled: next })
      }).then(function(r){ return r.json(); }).then(function(d){
        if (d && d.ok) { loadRules(); }
      }).catch(function(){});
    });
  }
  var ebs = document.querySelectorAll(".rule-edit-btn");
  for (var e = 0; e < ebs.length; e++){
    ebs[e].addEventListener("click", function(){
      var rule = this.closest(".rule");
      var edit = rule.querySelector(".rule-edit");
      edit.classList.toggle("show");
      if (edit.classList.contains("show")) {
        var ta = edit.querySelector("textarea");
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    });
  }
  var svs = document.querySelectorAll(".rule-edit-save");
  for (var v = 0; v < svs.length; v++){
    svs[v].addEventListener("click", function(){
      var rule = this.closest(".rule");
      var edit = rule.querySelector(".rule-edit");
      var title = edit.getAttribute("data-title");
      var content = edit.querySelector("textarea").value;
      fetch(base + "/sidebar/rules/custom" + q, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title, content: content })
      }).then(function(r){ return r.json(); }).then(function(d){
        if (d && d.ok) { loadRules(); }
      }).catch(function(){});
    });
  }
  var cvs = document.querySelectorAll(".rule-edit-cancel");
  for (var c = 0; c < cvs.length; c++){
    cvs[c].addEventListener("click", function(){
      this.closest(".rule-edit").classList.remove("show");
    });
  }
  var rss = document.querySelectorAll(".rule-edit-reset");
  for (var z = 0; z < rss.length; z++){
    rss[z].addEventListener("click", function(){
      var rule = this.closest(".rule");
      var edit = rule.querySelector(".rule-edit");
      var title = edit.getAttribute("data-title");
      fetch(base + "/sidebar/rules/custom" + q, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title, content: "" })
      }).then(function(r){ return r.json(); }).then(function(d){
        if (d && d.ok) { loadRules(); }
      }).catch(function(){});
    });
  }
}

function loadRules(){
  fetch(base + "/sidebar/rules" + q).then(function(r){ return r.json(); }).then(function(d){
    if (d && d.ok) { renderRules(d.rules || []); }
  }).catch(function(){});
}

load();
loadRules();
try { parent.postMessage({ source: "hana-plugin", type: "ready" }, "*"); } catch(e){}
})();
`;

function esc(v) { return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

export default function (app, ctx) {
  app.get("/sidebar", (c) => {
    const th = c.req.query("hana-theme") || "inherit";
    const hanaCss = c.req.query("hana-css") || "";
    const hcLink = hanaCss ? `<link rel="stylesheet" href="${esc(hanaCss)}">` : "";
    return c.html(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${hcLink}
<style>${WIDGET_CSS}</style>
</head><body data-hana-theme="${th}" data-surface="widget">
<div class="card">
  <div class="head">
    <div class="title"><svg class="t-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>声律</div>
    <div class="badge"><span class="dot" id="dot"></span><span id="badgeText">自动播报中</span></div>
  </div>

    <div class="grp">
    <div class="grp-label">开关</div>
    <div class="row">
      <span class="row-t">回复完成后读总结</span>
      <label class="sw"><input type="checkbox" id="sw"><span class="sl"></span></label>
    </div>
    <div class="row" style="margin-top:12px">
      <span class="row-t">只读总结（不念正文）</span>
      <label class="sw"><input type="checkbox" id="swSummary"><span class="sl"></span></label>
    </div>
    <div class="row" style="margin-top:12px">
      <span class="row-t">一句话总结（AI 生成）</span>
      <label class="sw"><input type="checkbox" id="swOne"><span class="sl"></span></label>
    </div>
    <div class="row" style="margin-top:12px">
      <span class="row-t">实时朗读（边生成边读）</span>
      <label class="sw"><input type="checkbox" id="swStream"><span class="sl"></span></label>
    </div>
  </div>

  <div class="grp">
    <div class="grp-label">播报 Agent</div>
    <div class="tags" id="agentTags"></div>
    <div class="agent-add">
      <input type="text" id="agentInput" placeholder="agent id，回车添加">
      <div class="btn sm" id="agentAdd">添加</div>
    </div>
    <div class="hint">留空播报全部 Agent</div>
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
    <div class="grp-label">音量</div>
    <div class="row">
      <input type="range" id="volume" min="0" max="100" step="1">
      <span class="rate-v" id="volumeV">100</span>
    </div>
    <div class="rate-hint"><span>静音</span><span>最大</span></div>
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

  <div class="grp">
    <div class="grp-label">播报历史</div>
    <div class="hist" id="hist"></div>
    <div class="row" style="margin-top:10px">
      <span class="hint" style="margin-top:0">最多保留 20 条</span>
      <div class="btn sm" id="histClear">清空</div>
    </div>
  </div>

  <div class="grp">
    <div class="grp-label">总结 prompt</div>
    <div class="rule">
      <div class="rule-h"><svg class="arr" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l4 4-4 4"/></svg>自定义生成指令</div>
      <div class="rule-b">
        <textarea id="sumPrompt" placeholder="留空使用内置：问答→结论，工作→复盘"></textarea>
        <div class="prompt-btns">
          <div class="btn" id="promptSave">保存</div>
          <div class="btn" id="promptReset">恢复默认</div>
        </div>
      </div>
    </div>
  </div>

  <div class="grp">
    <div class="grp-label">规则资产</div>
    <div class="rules" id="rules"></div>
  </div>

  <div class="st" id="st"></div>
</div>
<script>${WIDGET_JS}</script>
</body></html>`);
  });

  app.get("/sidebar/data", (c) => {
    const va = ctx._va;
    return c.json({ ok: true, config: va ? va.getConfig() : {}, history: va ? va.history() : [], voiceGroups: VOICE_GROUPS });
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

  app.post("/sidebar/history/clear", (c) => {
    ctx._va?.clearHistory();
    return c.json({ ok: true });
  });

  app.get("/sidebar/rules", (c) => {
    const state = loadRulesState(ctx);
    const rules = parseRules().map((r) => {
      const st = state[r.title];
      return { ...r, enabled: !st || st.enabled !== false, custom: (st && typeof st.custom === "string") ? st.custom : null };
    });
    return c.json({ ok: true, rules });
  });

  app.post("/sidebar/rules/toggle", async (c) => {
    let body = {};
    try { body = await c.req.json(); } catch {}
    const { title, enabled } = body || {};
    if (typeof title !== "string" || !title.trim()) {
      return c.json({ ok: false, error: "title required" }, 400);
    }
    const state = loadRulesState(ctx);
    const prev = state[title.trim()];
    state[title.trim()] = { enabled: !!enabled, custom: (prev && typeof prev.custom === "string") ? prev.custom : null };
    saveRulesState(ctx, state);
    return c.json({ ok: true, title: title.trim(), enabled: state[title.trim()].enabled });
  });

  app.post("/sidebar/rules/custom", async (c) => {
    let body = {};
    try { body = await c.req.json(); } catch {}
    const { title, content } = body || {};
    if (typeof title !== "string" || !title.trim()) {
      return c.json({ ok: false, error: "title required" }, 400);
    }
    const state = loadRulesState(ctx);
    const prev = state[title.trim()];
    state[title.trim()] = {
      enabled: !prev || prev.enabled !== false,
      custom: (typeof content === "string" && content.trim()) ? content.trim() : null,
    };
    saveRulesState(ctx, state);
    return c.json({ ok: true, title: title.trim(), custom: state[title.trim()].custom });
  });

  app.get("/sidebar/rules/active", (c) => {
    const state = loadRulesState(ctx);
    return c.json({
      ok: true,
      rules: parseRules()
        .filter((r) => { const st = state[r.title]; return !st || st.enabled !== false; })
        .map((r) => {
          const st = state[r.title];
          return { ...r, custom: (st && typeof st.custom === "string") ? st.custom : null };
        }),
    });
  });

  app.post("/sidebar/test", async (c) => {
    const va = ctx._va;
    if (!va) return c.json({ ok: false, error: "not ready" }, 503);
    let body = {};
    try { body = await c.req.json(); } catch {}
    va.speak("你好，这是声律的测试朗读。Hello, this is a test.", body).then(() => {});
    return c.json({ ok: true });
  });
}
