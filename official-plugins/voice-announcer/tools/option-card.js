// tools/option-card.js — 对话内选项卡片（原型）
// 工具：把问题与选项落盘到插件数据目录，返回 webview 卡片。
// 用户点击按钮后由 routes/card.js 负责把选择注入会话（session:send）。
import path from "path";
import { promises as fs } from "fs";

export const name = "option_card";
export const description =
  "在对话中渲染一张可点击的选项卡片，用户点击某个选项后，会自动作为一条消息" +
  "（格式：『（选项卡片）<问题>\n我选择：<选项>』）发回当前会话并触发 agent 继续处理。\n\n" +
  "何时使用（自动触发的触发契约）：\n" +
  "- 需要用户在多个方案/选项中选一个（如选方案 A 还是 B、吃什么、用哪个风格、选哪个时间）\n" +
  "- 需要用户确认是否执行某个操作（是 / 否 / 稍后）\n" +
  "- 任何需要用户拍板、做决策或提供偏好的场景\n" +
  "- 注意：即使只有 2 个选项（如 是/否、A/B 二选一），也要用本工具渲染卡片，不要用纯文字提问让用户打字回复\n\n" +
  "何时不使用：\n" +
  "- 没有决策点、只是陈述或提问\n" +
  "- 答案只有一个可能（用普通对话即可）\n" +
  "- 需要用户输入自由文本（不适合做成选项）\n\n" +
  "参数：question 为问题本身（简洁，卡片标题），options 为 2~6 个候选选项。" +
  "选项不超过 3 个时自动横排并排，超过 3 个自动竖列。\n\n" +
  "用户点击后回传的消息格式为『（选项卡片）<问题>\n我选择：<选项>』，" +
  "收到该格式消息时，应把它视为用户对之前问题的选择结果，继续执行对应分支，不再重复提问。";

export const parameters = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description: "需要用户选择的问题，会作为卡片标题与回传消息的前缀",
    },
    options: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 6,
      description: "候选选项（2~6 个），每个渲染为一个可点击按钮",
    },
  },
  required: ["question", "options"],
};

export async function execute(input, ctx) {
  const question = String(input.question || "").trim();
  const options = (Array.isArray(input.options) ? input.options : [])
    .map((o) => String(o).trim())
    .filter(Boolean)
    .slice(0, 6);

  if (!question) throw new Error("question is required");
  if (options.length < 2) throw new Error("at least 2 options required");

  const cid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const choicesDir = path.join(ctx.dataDir, "choices");
  await fs.mkdir(choicesDir, { recursive: true });
  await fs.writeFile(
    path.join(choicesDir, `${cid}.json`),
    JSON.stringify({
      question,
      options,
      createdAt: Date.now(),
      sessionId: ctx.sessionId || null,
      sessionRef: ctx.sessionRef || null,
      sessionPath: ctx.sessionPath || null,
    }),
    "utf-8"
  );

  // 按选项数估算卡片高度（宽度宿主固定 400px）：横排按钮高 60~76px，竖排行高约 48px，
  // 顶部问题 45px + 常驻输入框 76px + 底部入口 89px + 卡片 padding 38px + 余量。宿主用 aspectRatio 算初始高度。
  function estimateCardHeight() {
    const base = 45 + 76 + 89 + 38 + 12; // 问题 + 输入框 + 底部入口 + padding + 余量
    if (options.length <= 3) {
      return base + (options.length === 2 ? 76 : 60);
    }
    return base + options.length * 48;
  }

  return {
    content: [{ type: "text", text: `已向用户展示选项卡片：${question}` }],
    details: {
      card: {
        type: "webview",
        route: `/card?cid=${cid}`,
        title: question,
        description: `${question}｜请在下方点击选项`,
        aspectRatio: `400:${estimateCardHeight()}`,
      },
    },
  };
}
