// extensions/rules-inject.js — 声律规则注入（v0.2.8）
// 在 before_agent_start 时把 RULES.md 中启用的行为规则注入 system prompt。
// 与 RULES.md「本文件管项目资产与分发」互为表里：本扩展管运行时注入。
//
// 实现说明：
// - 工厂函数签名 (pi: ExtensionAPI) => void，在 session 创建时被 Pi SDK 调用
// - pi.on("before_agent_start", handler)，handler 返回 { systemPrompt } 覆盖注入
// - 规则来源：插件根目录 RULES.md（随项目版本管理）
// - 启用状态：plugin-data/voice-announcer/rules-state.json（侧边栏开关/自定义），
//   文件不存在或读取失败时默认全部启用
// - 防重复：注入内容包裹在 <!-- voice-announcer-rules:start/end --> 标记内，
//   重复触发时替换旧区块而非追加，避免累加膨胀

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const START_MARK = "<!-- voice-announcer-rules:start -->";
const END_MARK = "<!-- voice-announcer-rules:end -->";

// extensions/ 的上一级即插件根目录
const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULES_PATH = path.join(PLUGIN_ROOT, "RULES.md");

// 候选 dataDir：~/.hanako/plugin-data/voice-announcer/rules-state.json
// （从插件根上溯两级到 ~/.hanako，再进 plugin-data）
const RULES_STATE_CANDIDATES = [
  path.join(PLUGIN_ROOT, "..", "..", "plugin-data", "voice-announcer", "rules-state.json"),
  path.join(PLUGIN_ROOT, "..", "..", "..", "plugin-data", "voice-announcer", "rules-state.json"),
];

function loadRulesState() {
  for (const p of RULES_STATE_CANDIDATES) {
    try {
      if (!existsSync(p)) continue;
      const obj = JSON.parse(readFileSync(p, "utf8"));
      if (obj && typeof obj === "object") return obj;
    } catch { /* try next candidate */ }
  }
  return {};
}

// 与 routes/sidebar.js parseRules 同源：解析 RULES.md 的 ## 小节与 - / 1. 要点
function parseRules() {
  try {
    const md = readFileSync(RULES_PATH, "utf8");
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

// 组装注入文本：仅启用中的规则，自定义内容优先
function buildRulesText() {
  const state = loadRulesState();
  const rules = parseRules().filter((r) => {
    const st = state[r.title];
    return !st || st.enabled !== false;
  });
  if (!rules.length) return null;

  const lines = ["# 声律注入的行为规则（voice-announcer 项目资产）", ""];
  for (const r of rules) {
    const st = state[r.title];
    lines.push("## " + r.title, "");
    const custom = st && typeof st.custom === "string" && st.custom.trim();
    if (custom) {
      lines.push(custom.trim(), "");
    } else {
      for (const p of r.points) lines.push("- " + p);
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

function injectRules(systemPrompt, rulesText) {
  const block = `${START_MARK}\n${rulesText}\n${END_MARK}`;
  if (systemPrompt.includes(START_MARK) && systemPrompt.includes(END_MARK)) {
    // 已有旧区块：替换中间内容，保持幂等
    const head = systemPrompt.slice(0, systemPrompt.indexOf(START_MARK));
    const tail = systemPrompt.slice(systemPrompt.indexOf(END_MARK) + END_MARK.length);
    return (head + block + tail).replace(/\n{3,}/g, "\n\n");
  }
  return systemPrompt.replace(/\s*$/, "\n\n") + block + "\n";
}

export default function (pi) {
  pi.on("before_agent_start", (event) => {
    try {
      const rulesText = buildRulesText();
      if (!rulesText) return undefined; // 无启用规则：不注入
      const current = typeof event.systemPrompt === "string" ? event.systemPrompt : "";
      const next = injectRules(current, rulesText);
      return next === current ? undefined : { systemPrompt: next };
    } catch {
      return undefined; // 注入失败不影响主流程
    }
  });
}
