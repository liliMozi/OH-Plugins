export const name = "review_coding_plan";
export const description = "审查一份编程实施计划是否覆盖上下文、范围、验证、风险和回滚，并返回缺口清单。适合在动手修改代码前调用。";
export const parameters = {
  type: "object",
  required: ["plan"],
  properties: {
    plan: {
      type: "string",
      description: "待审查的实施计划。"
    },
    acceptance: {
      type: "array",
      items: { type: "string" },
      description: "计划应满足的验收标准。"
    }
  }
};

export const sessionPermission = { readOnly: true };

const MAX_PLAN_LENGTH = 12000;
const MAX_ACCEPTANCE_ITEMS = 30;
const MAX_ITEM_LENGTH = 1000;

const DIMENSIONS = [
  {
    name: "上下文证据",
    patterns: [/搜索|检索|查看|读取|调用方|入口|现有实现|规则|上下文|search|inspect|read|caller|entry|context|repository/i],
    advice: "补充要查看的仓库规则、相关实现、调用方与测试位置。"
  },
  {
    name: "改动范围",
    patterns: [/文件|模块|组件|函数|接口|schema|配置|类型|目录|file|module|component|function|interface|config|type|directory/i],
    advice: "列出预计修改的文件或模块，以及每处变化的职责。"
  },
  {
    name: "验证方法",
    patterns: [/测试|构建|lint|类型检查|验证|复现|断言|检查|test|build|type.?check|verify|assert/i],
    advice: "写明将运行的具体测试、静态检查或构建命令。"
  },
  {
    name: "风险分析",
    patterns: [/风险|兼容|边界|异常|错误|并发|安全|回归|risk|compatib|boundary|error|concurr|security|regression/i],
    advice: "标出最可能回归的接口、边界输入与错误路径。"
  },
  {
    name: "回滚策略",
    patterns: [/回滚|撤销|恢复|备份|可逆|rollback|revert|restore|backup|reversible/i],
    advice: "说明失败时如何撤销新增文件、配置、迁移或依赖变化。"
  }
];

export async function execute(input = {}) {
  const plan = typeof input.plan === "string" ? input.plan.trim() : "";
  if (!plan) throw new Error("review_coding_plan requires a non-empty plan");
  if (plan.length > MAX_PLAN_LENGTH) throw new Error(`plan 不能超过 ${MAX_PLAN_LENGTH} 个字符`);
  if (Array.isArray(input.acceptance) && input.acceptance.length > MAX_ACCEPTANCE_ITEMS) {
    throw new Error(`acceptance 不能超过 ${MAX_ACCEPTANCE_ITEMS} 项`);
  }

  const acceptance = Array.isArray(input.acceptance)
    ? input.acceptance.filter((item) => typeof item === "string" && item.trim()).map((item) => {
      const text = item.trim();
      if (text.length > MAX_ITEM_LENGTH) throw new Error(`acceptance 单项不能超过 ${MAX_ITEM_LENGTH} 个字符`);
      return text;
    })
    : [];

  const results = DIMENSIONS.map((dimension) => ({
    ...dimension,
    covered: dimension.patterns.some((pattern) => pattern.test(plan))
  }));
  const covered = results.filter((item) => item.covered).length;
  const score = Math.round((covered / results.length) * 100);
  const status = score >= 80 ? "可以开工" : score >= 60 ? "建议补强后开工" : "暂不建议开工";
  const matrix = results.map((item) => `- ${item.covered ? "[x]" : "[ ]"} ${item.name}${item.covered ? "" : `：${item.advice}`}`).join("\n");
  const acceptanceSection = acceptance.length
    ? acceptance.map((item) => `- [ ] ${item}`).join("\n")
    : "- [ ] 尚未提供验收标准；至少补充一条用户可观察的通过条件。";

  const report = `# 编程计划审查\n\n**结论：${status}**\n\n覆盖度：${score}%（${covered}/${results.length}）\n\n## 工程维度\n${matrix}\n\n## 验收对齐\n${acceptanceSection}\n\n## 审查提醒\n关键词覆盖只能提示结构性缺口，不能证明技术方案正确。开工前仍需核对真实仓库、调用链和测试。`;

  return {
    content: [{ type: "text", text: report }],
    details: { score, status, dimensions: results.map(({ name, covered, advice }) => ({ name, covered, advice })) }
  };
}
