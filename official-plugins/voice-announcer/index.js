import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_VOICE = "Microsoft Xiaoxiao Online";
const FALLBACK_ZH = "Microsoft Huihui";
const EN_VOICE = "Microsoft AvaMultilingual Online";
const FALLBACK_EN = "Microsoft Zira Desktop";
const DONE_MARK = "<<<DONE_9f3a>>>";

// 一句话总结默认指令：按内容形态自适应（问答→结论，工作→复盘）
const DEFAULT_SUMMARY_PROMPT = "你是对话总结助手。根据下面的回复内容，用一句自然、口语化的中文总结（60 到 120 字，可直接朗读），按内容形态选择总结方式：如果回复是解答问题或闲聊，总结为：回答了什么问题、结论或关键信息是什么；如果回复是工作/任务过程，总结为：做了什么、为什么这么做、遇到什么错误或坑、思路发生了什么变化。只输出那一句话，不要解释、不要前缀、不要引号、不要编号、不要分点。";

// 播报历史：内存环形 + 落盘（dataDir/history.json），最多 20 条
const HISTORY_MAX = 20;
const HISTORY_TEXT_MAX = 300;

let ps = null;

/* ── PowerShell 常驻进程（裸 REPL，stdin 逐行执行） ── */

function ensurePs() {
  return new Promise((resolve) => {
    if (ps && ps.exitCode === null) { resolve(true); return; }
    const proc = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass"], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    ps = proc;
    proc.stderr.on("data", () => {});
    proc.on("error", () => { if (ps === proc) ps = null; resolve(false); });
    proc.on("exit", () => { if (ps === proc) ps = null; });
    proc.stdin.setDefaultEncoding("utf8");
    // 预热：加载 System.Speech，一次性成本提前付
    const warm = `Add-Type -AssemblyName System.Speech; Write-Output '${DONE_MARK}'`;
    const onData = (d) => {
      if (d.toString().includes(DONE_MARK)) {
        proc.stdout.off("data", onData);
        resolve(true);
      }
    };
    proc.stdout.on("data", onData);
    proc.stdin.write(warm + "\n");
  });
}

function execPs(cmd, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const proc = ps;
    if (!proc || proc.exitCode !== null) { resolve(false); return; }
    let done = false;
    const onData = (d) => {
      if (!done && d.toString().includes(DONE_MARK)) { done = true; cleanup(); resolve(true); }
    };
    const onExit = () => { if (!done) { done = true; cleanup(); resolve(false); } };
    const cleanup = () => {
      proc.stdout.off("data", onData);
      proc.off("exit", onExit);
      clearTimeout(timer);
    };
    const timer = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(false); } }, timeoutMs);
    proc.stdout.on("data", onData);
    proc.on("exit", onExit);
    proc.stdin.write(cmd + "\n");
  });
}

function shutdownPs() {
  if (ps && ps.exitCode === null) {
    try { ps.kill(); } catch {}
    try { ps.stdin.end(); } catch {}
    ps = null;
  }
}

/* ── 文本处理 ── */

function b64(s) {
  return Buffer.from(s, "utf8").toString("base64");
}

// 卡片 HTML → 可朗读文本
function htmlToText(html) {
  let t = String(html || "");
  t = t.replace(/<script[\s\S]*?<\/script>/gi, " ");
  t = t.replace(/<style[\s\S]*?<\/style>/gi, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  t = t.replace(/\s+/g, " ");
  return t.trim();
}

export function cleanForSpeech(raw) {
  let t = String(raw || "");
  t = t.replace(/<mood>[\s\S]*?<\/mood>/g, " ");
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]*)`/g, "$1");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // 裸链接 / 域名 / 邮箱：不念，直接跳过（URL 内部允许英文标点，在空白/中文标点处截断）
  t = t.replace(/https?:\/\/[^\s，。！？；、'"（）()【】\[\]《》<>]+/g, " ");
  t = t.replace(/www\.[^\s，。！？；、'"（）()【】\[\]《》<>]+/g, " ");
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ");
  t = t.replace(/^#{1,6}\s*/gm, "");
  t = t.replace(/^[\s]*[-*+]\s+/gm, "");
  t = t.replace(/^[\s]*\d+[.、)]\s*/gm, "");
  t = t.replace(/^>\s?/gm, "");
  t = t.replace(/^\s*\|?[\s:-]+\|[\s:-]+\|?\s*$/gm, "");
  t = t.replace(/\|/g, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/\*+/g, " ");
  t = t.replace(/_+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// 中英文分段（保留备用，当前单语音模式不切换语音，英文由晓晓直接读）
function splitLang(text) {
  const re = /[A-Za-z][A-Za-z'\-]*(?:\s+[A-Za-z][A-Za-z'\-]*)*/g;
  const out = [];
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ lang: "zh", text: text.slice(last, m.index) });
    out.push({ lang: "en", text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ lang: "zh", text: text.slice(last) });
  return out;
}

/* ── 朗读 ── */

export async function speak(text, { voice, rate = 0, volume = 100 } = {}) {
  const clean = cleanForSpeech(text);
  if (!clean) return true;
  const zhVoice = (voice || DEFAULT_VOICE).replace(/'/g, "''");
  const r = Math.max(-10, Math.min(10, Number(rate) || 0));
  const vol = Math.max(0, Math.min(100, Number(volume) ?? 100));
  const enc = `[System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64(clean)}'))`;

  const cmds = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    `try { $s.SelectVoice('${zhVoice}') } catch { try { $s.SelectVoice('${FALLBACK_ZH}') } catch {} }`,
    `$s.Rate = ${r}`,
    `$s.Volume = ${vol}`,
    `$s.Speak(${enc})`,
    `Write-Output '${DONE_MARK}'`
  ];

  const ok = await ensurePs();
  if (!ok) return false;
  return execPs(cmds.join("; "));
}

/* ── 流式实时朗读（SpeakAsync 队列，复用合成器对象） ── */

// 异步追加朗读：立即返回，SAPI 内部队列连续播放；$s 跨命令复用，语音按名称比对保证正确
async function speakChunk(text, { voice, rate = 0, volume = 100 } = {}) {
  const clean = cleanForSpeech(text);
  if (!clean) return true;
  const v = (voice || DEFAULT_VOICE).replace(/'/g, "''");
  const r = Math.max(-10, Math.min(10, Number(rate) || 0));
  const vol = Math.max(0, Math.min(100, Number(volume) ?? 100));
  const cmds = [
    `$v = '${v}'`,
    `if ($null -eq $s -or $s.Voice.Name -ne $v) { Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; try { $s.SelectVoice($v) } catch { try { $s.SelectVoice('${FALLBACK_ZH}') } catch {} } }`,
    `$s.Rate = ${r}`,
    `$s.Volume = ${vol}`,
    `$s.SpeakAsync([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64(clean)}'))) | Out-Null`,
    `Write-Output '${DONE_MARK}'`
  ];
  const ok = await ensurePs();
  if (!ok) return false;
  return execPs(cmds.join("; "));
}

// 取消所有排队/正在播放的语音（保留进程与合成器）
async function cancelSpeech() {
  if (!ps || ps.exitCode !== null) return true;
  return execPs(`if ($null -ne $s) { $s.SpeakAsyncCancelAll() }; Write-Output '${DONE_MARK}'`);
}

/* ── AI 一句话总结（model:sample-text，无依赖走 bus） ── */

// 用工具模型把回复总结成一句中文，失败返回空串（由调用方降级）
async function summarizeOneLiner(ctx, sessionPath, content, customPrompt) {
  const src = String(content || "").slice(0, 3000);
  if (!src.trim()) return "";
  const systemPrompt = (typeof customPrompt === "string" && customPrompt.trim())
    ? customPrompt.trim()
    : DEFAULT_SUMMARY_PROMPT;
  try {
    const resp = await ctx.bus.request("model:sample-text", {
      operation: "voice-announcer-one-liner",
      sessionPath: typeof sessionPath === "string" && sessionPath.trim() ? sessionPath.trim() : null,
      systemPrompt,
      messages: [{ role: "user", content: "内容：\n" + src }],
      maxTokens: 300,
      temperature: 0.4
    }, { timeout: 20000 });
    const t = resp && typeof resp.text === "string" ? resp.text.trim() : "";
    return t && t.length <= 300 ? t : "";
  } catch (e) {
    return "";
  }
}

/* ── 播报历史（内存 + dataDir 落盘） ── */

function loadHistory(dataDir) {
  try {
    const raw = fs.readFileSync(path.join(dataDir, "history.json"), "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, HISTORY_MAX) : [];
  } catch { return []; }
}

function createHistoryStore(dataDir) {
  let items = loadHistory(dataDir);
  return {
    // 追加一条（最新在前），异步落盘不阻塞播报队列
    push(entry) {
      const e = {
        ts: Date.now(),
        mode: String(entry.mode || "full"),
        text: String(entry.text || "").slice(0, HISTORY_TEXT_MAX)
      };
      items = [e, ...items].slice(0, HISTORY_MAX);
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, "history.json"), JSON.stringify(items, null, 2));
      } catch { /* 历史落盘失败不影响朗读 */ }
    },
    list() { return items; },
    clear() {
      items = [];
      try { fs.writeFileSync(path.join(dataDir, "history.json"), "[]"); } catch {}
    }
  };
}

/* ── 插件主逻辑 ── */

function agentFromPath(sp) {
  if (!sp) return null;
  const m = String(sp).match(/agents[\\\/]([^\\\/]+)[\\\/]/);
  return m ? m[1] : null;
}

/* ── 依赖自动安装（NaturalVoiceSAPIAdapter 桥接 Edge 在线语音） ── */

function listVoices() {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
      "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }"
    ], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.on("error", () => resolve([]));
    child.on("exit", () => resolve(out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)));
  });
}

function buildInstallScript(zipPath, destDir, resultFile) {
  return `$ErrorActionPreference = 'Stop'
$zip = '${zipPath.replace(/'/g, "''")}'
$dest = '${destDir.replace(/'/g, "''")}'
$result = '${resultFile.replace(/'/g, "''")}'
try {
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  Expand-Archive -Path $zip -DestinationPath $dest -Force
  $r64 = Start-Process -FilePath 'regsvr32.exe' -ArgumentList @('/s', ('"' + $dest + '\\x64\\NaturalVoiceSAPIAdapter.dll' + '"')) -Wait -PassThru
  $r86 = Start-Process -FilePath 'C:\\Windows\\SysWOW64\\regsvr32.exe' -ArgumentList @('/s', ('"' + $dest + '\\x86\\NaturalVoiceSAPIAdapter.dll' + '"')) -Wait -PassThru
  $cfg = 'HKCU:\\SOFTWARE\\NaturalVoiceSAPIAdapter'
  New-Item -Path ($cfg + '\\Enumerator') -Force | Out-Null
  Set-ItemProperty -Path $cfg -Name 'LogLevel' -Value 2 -Type DWord
  Set-ItemProperty -Path ($cfg + '\\Enumerator') -Name 'NoNarratorVoices' -Value 1 -Type DWord
  Set-ItemProperty -Path ($cfg + '\\Enumerator') -Name 'NoEdgeVoices' -Value 0 -Type DWord
  Set-ItemProperty -Path ($cfg + '\\Enumerator') -Name 'NoAzureVoices' -Value 1 -Type DWord
  Set-ItemProperty -Path ($cfg + '\\Enumerator') -Name 'EdgeVoiceAllLanguages' -Value 0 -Type DWord
  Set-ItemProperty -Path ($cfg + '\\Enumerator') -Name 'EdgeVoiceAllMultilingual' -Value 1 -Type DWord
  Set-ItemProperty -Path ($cfg + '\\Enumerator') -Name 'EdgeVoiceLanguages' -Value 'zh-CN'
  Set-ItemProperty -Path ($cfg + '\\Enumerator') -Name 'NarratorVoicePath' -Value ''
  if ($r64.ExitCode -ne 0 -or $r86.ExitCode -ne 0) { throw ('regsvr32 exit codes: ' + $r64.ExitCode + '/' + $r86.ExitCode) }
  'OK' | Out-File -FilePath $result -Encoding ascii
} catch {
  ('ERR: ' + $_.Exception.Message) | Out-File -FilePath $result -Encoding ascii
}`;
}

// 检测并安装依赖；已装则跳过。返回状态字符串
async function ensureDependency(ctx) {
  const { log, dataDir, pluginDir } = ctx;
  try {
    const voices = await listVoices();
    if (voices.some((v) => /Xiaoxiao Online|Yunxi Online|Yunyang Online/.test(v))) {
      log.info("[voice-announcer] Edge voice dependency already installed");
      return "ok";
    }
    const zipPath = path.join(pluginDir, "assets", "natural-voice-adapter.zip");
    if (!fs.existsSync(zipPath)) {
      log.warn("[voice-announcer] adapter zip missing in assets, cannot auto-install");
      return "missing-assets";
    }
    const destDir = path.join(dataDir, "adapter");
    const resultFile = path.join(dataDir, "install-result.txt");
    const ps1File = path.join(dataDir, "install-adapter.ps1");
    try { fs.unlinkSync(resultFile); } catch {}
    fs.writeFileSync(ps1File, buildInstallScript(zipPath, destDir, resultFile));
    log.info("[voice-announcer] Edge voice dependency missing, launching installer (UAC prompt)...");
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
      `Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${ps1File.replace(/'/g, "''")}'`
    ], { windowsHide: true, stdio: "ignore" });
    // 等待结果（最多 90 秒）
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      if (fs.existsSync(resultFile)) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (fs.existsSync(resultFile)) {
      const res = fs.readFileSync(resultFile, "utf-8").trim();
      if (res === "OK") {
        const after = await listVoices();
        const ok = after.some((v) => /Xiaoxiao Online|Yunxi Online/.test(v));
        log.info("[voice-announcer] adapter install done, voices ok: " + ok);
        return ok ? "installed" : "installed-no-voice";
      }
      log.warn("[voice-announcer] adapter install failed: " + res);
      return "failed";
    }
    log.warn("[voice-announcer] adapter install timed out (UAC cancelled?)");
    return "timeout";
  } catch (e) {
    log.warn("[voice-announcer] dependency check error: " + e.message);
    return "error";
  }
}

// 按句切分：换行 / 句末标点
function splitSentences(text) {
  const m = text.match(/[^。！？；\n.!?;]+[。！？；\n.!?;]*/g);
  return m && m.length ? m : [text];
}

function extractText(msg) {
  if (!msg || msg.role !== "assistant") return "";
  if (msg.stopReason === "aborted") return "";
  const parts = Array.isArray(msg.content) ? msg.content : [];
  const texts = [];
  for (const c of parts) {
    if (!c) continue;
    if (c.type === "text" && typeof c.text === "string" && c.text.trim()) {
      texts.push(c.text);
    } else if (c.type === "toolCall" && c.name === "show_card" && c.arguments && typeof c.arguments.code === "string") {
      const cardText = htmlToText(c.arguments.code);
      if (cardText) texts.push(cardText);
    }
  }
  return texts.join(" ").trim();
}

export default class VoiceAnnouncerPlugin {
  async onload() {
    const { config, log, bus } = this.ctx;
    const state = { queue: Promise.resolve() };
    const stream = { buffer: "", pending: [], timer: null };
    const isStreaming = () => config.get("streaming") === true;

    // 实时朗读：句子积累 400ms 合并成段再读，减少在线语音的网络调用次数
    function flushStream() {
      stream.timer = null;
      if (!stream.pending.length) return;
      const text = stream.pending.join("").trim();
      stream.pending = [];
      if (text) {
        const voice = config.get("voice") || DEFAULT_VOICE;
        const rate = Number(config.get("rate") ?? 0) || 0;
        state.queue = state.queue.then(() => speakChunk(text, { voice, rate })).catch(() => {});
      }
    }

    function scheduleFlush() {
      if (stream.timer) return;
      stream.timer = setTimeout(flushStream, 400);
    }

    // 用户一开口（插话 / 新建会话），立即停止当前播报并清空队列
    function stopSpeaking() {
      cancelSpeech();
      shutdownPs();
      state.queue = Promise.resolve();
      if (stream.timer) { clearTimeout(stream.timer); stream.timer = null; }
      stream.buffer = "";
      stream.pending = [];
    }

    // 实时朗读：把新增文本按句切分，积累后合并朗读
    function feedStream(delta) {
      if (!delta) return;
      stream.buffer += delta;
      const open = (stream.buffer.match(/<mood>/g) || []).length;
      const close = (stream.buffer.match(/<\/mood>/g) || []).length;
      if (open > close) return; // mood 未闭合，等待
      const parts = splitSentences(stream.buffer);
      if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
          const s = parts[i].trim();
          if (s) stream.pending.push(s);
        }
        stream.buffer = parts[parts.length - 1];
        scheduleFlush();
      }
    }

    // 预热常驻进程（不阻塞加载）
    ensurePs().then((ok) => {
      if (ok) log.info("[voice-announcer] speaker process ready");
    });

    // 依赖自动安装（异步，不阻塞）：缺 Edge 在线语音时自动安装桥接
    ensureDependency(this.ctx).then((st) => {
      log.info("[voice-announcer] dependency status: " + st);
    });

    // 播报历史（内存 + 落盘）
    const history = createHistoryStore(this.ctx.dataDir);

    const unsub = bus.subscribe((ev, ssp) => {
      try {
        // 用户一开口（插话 / 新建会话）：唯一停止信号，工具链内部 turn 不打断
        if (ev?.type === "message_end" && ev.message?.role === "user") {
          stopSpeaking();
          return;
        }

        const agentId = agentFromPath(ssp);
        const agents = config.get("agents");
        if (Array.isArray(agents) && agents.length > 0 && (!agentId || !agents.includes(agentId))) return;
        const enabled = config.get("enabled");
        if (enabled === false) return;
        // 只读总结 / 一句话总结：正文一律不念（含实时流式），前者只念卡片，后者等 AI 生成一句
        const readSummaryOnly = config.get("readSummaryOnly") === true;
        const oneLiner = config.get("summaryOneLiner") === true;

        // 实时模式：流式增量 → 句子级朗读
        if (ev?.type === "message_update" && isStreaming()) {
          const ae = ev.assistantMessageEvent;
          if (!readSummaryOnly && !oneLiner && ae && ae.type === "text_delta" && typeof ae.delta === "string") {
            feedStream(ae.delta);
          }
          return;
        }
        if (ev?.type !== "message_end") return;

        // 被中止的回复：清掉流式缓冲，不读
        if (ev.message?.stopReason === "aborted") {
          if (stream.timer) { clearTimeout(stream.timer); stream.timer = null; }
          stream.buffer = "";
          stream.pending = [];
          return;
        }

        const text = extractText(ev.message);
        const parts = Array.isArray(ev.message?.content) ? ev.message.content : [];
        const cardText = parts
          .filter((c) => c && c.type === "toolCall" && c.name === "show_card" && c.arguments && typeof c.arguments.code === "string")
          .map((c) => htmlToText(c.arguments.code))
          .filter(Boolean)
          .join(" ");
        if (!text && !cardText) return; // 中间工具消息：不打断流式缓冲

        const maxLen = Number(config.get("maxLength")) || 500;
        const limited = text.length > maxLen ? text.slice(0, maxLen) + "……" : text;
        const voice = config.get("voice") || DEFAULT_VOICE;
        const rate = Number(config.get("rate") ?? 0) || 0;
        const volume = Number(config.get("volume") ?? 100);

        // AI 一句话总结：正文与卡片都不直接念，生成一句后朗读；失败降级
        const enqueueOneLiner = () => {
          const src = (text + "\n" + cardText).trim();
          const customPrompt = config.get("summaryCustomPrompt");
          state.queue = state.queue
            .then(() => summarizeOneLiner(this.ctx, ssp, src, customPrompt))
            .then((summary) => {
              if (summary) {
                history.push({ mode: "one-liner", text: summary });
                return speak(summary, { voice, rate, volume });
              }
              // 降级：有卡片念卡片，否则念正文（截断）
              if (cardText) {
                history.push({ mode: "card", text: cardText });
                return speak(cardText, { voice, rate, volume });
              }
              if (text) {
                history.push({ mode: "full", text: limited });
                return speak(limited, { voice, rate, volume });
              }
              return true;
            })
            .catch((e) => log.warn("[voice-announcer] one-liner failed:", e?.message));
        };

        if (isStreaming()) {
          // 实时模式：合并尾巴 + 卡片收尾
          if (stream.timer) { clearTimeout(stream.timer); stream.timer = null; }
          if (text && !readSummaryOnly && !oneLiner) {
            const tail = stream.buffer.trim();
            const pend = stream.pending.join("").trim();
            stream.buffer = "";
            stream.pending = [];
            const rest = (pend + tail).trim();
            if (rest) state.queue = state.queue.then(() => speakChunk(rest, { voice, rate, volume })).catch(() => {});
          } else {
            stream.buffer = "";
            stream.pending = [];
          }
          if (cardText && !oneLiner) state.queue = state.queue.then(() => speakChunk(cardText, { voice, rate, volume })).catch(() => {});
          if (oneLiner) enqueueOneLiner();
          // 历史：实时模式记录一条总览
          history.push({ mode: "streaming", text: (text + (cardText ? "\n" + cardText : "")).trim() });
        } else if (oneLiner) {
          enqueueOneLiner();
        } else if (readSummaryOnly) {
          // 只读总结：跳过正文，只念总结卡片
          if (cardText) {
            history.push({ mode: "card", text: cardText });
            state.queue = state.queue.then(() => speak(cardText, { voice, rate, volume })).catch((e) => log.warn("[voice-announcer] speak failed:", e?.message));
          }
        } else {
          history.push({ mode: "full", text: limited });
          state.queue = state.queue
            .then(() => speak(limited, { voice, rate, volume }))
            .catch((e) => log.warn("[voice-announcer] speak failed:", e?.message));
        }
      } catch (e) {
        /* ignore per-message errors */
      }
    });

    this.register(() => {
      unsub();
      cancelSpeech();
      shutdownPs();
    });

    // 共享控制句柄给 routes（侧边栏设置面板用）
    this.ctx._va = {
      stop: () => stopSpeaking(),
      speak: (text, opts) => speak(text, opts),
      getConfig: () => ({
        enabled: config.get("enabled") ?? true,
        streaming: config.get("streaming") === true,
        readSummaryOnly: config.get("readSummaryOnly") === true,
        summaryOneLiner: config.get("summaryOneLiner") === true,
        summaryCustomPrompt: config.get("summaryCustomPrompt") || "",
        voice: config.get("voice") || DEFAULT_VOICE,
        rate: Number(config.get("rate") ?? 0) || 0,
        volume: Number(config.get("volume") ?? 100),
        maxLength: Number(config.get("maxLength")) || 500,
        agents: Array.isArray(config.get("agents")) ? config.get("agents") : []
      }),
      save: async (patch) => {
        if (patch && typeof patch === "object") {
          for (const k of ["enabled", "streaming", "readSummaryOnly", "summaryOneLiner", "summaryCustomPrompt", "voice", "rate", "volume", "maxLength", "agents"]) {
            if (k in patch && patch[k] !== undefined) await config.set(k, patch[k]);
          }
        }
      },
      history: () => history.list(),
      clearHistory: () => history.clear()
    };
    log.info("[voice-announcer] loaded (voice: " + (config.get("voice") || DEFAULT_VOICE) + ", streaming: " + isStreaming() + ")");
  }
}
