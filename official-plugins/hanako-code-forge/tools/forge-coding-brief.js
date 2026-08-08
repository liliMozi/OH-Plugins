const PRIORITY_LABELS = {
  low: "低风险",
  medium: "中等风险",
  high: "高风险",
};
const MAX_FIELD_LENGTH = 6000;
const MAX_LIST_ITEMS = 30;
const MAX_ITEM_LENGTH = 1000;

export const name = "forge_coding_brief";
export const description = "把编程需求整理成 Hanako 可直接执行的工程简报，包含范围、验收、风险、验证矩阵和回滚策略。适合在开始编码前调用。";
export const parameters = {
  type: "object",
  required: ["goal"],
  properties: {
    goal: {
      type: "string",
      description: "要实现或修复的目标，说明用户可观察到的结果。"
    },
    stack: {
      type: "string",
      description: "语言、框架、运行时或仓库类型。"
    },
    context: {
      type: "string",
      description: "已知代码位置、现状、错误信息或相关背景。"
    },
    constraints: {
      type: "array",
      items: { type: "string" },
      description: "必须遵守的约束，例如不新增依赖、兼容旧 API。"
    },
    acceptance: {
      type: "array",
      items: { type: "string" },
      description: "可验证的完成标准。"
    },
    riskLevel: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "预估改动风险。"
    }
  }
};

export const sessionPermission = { readOnly: true };

function cleanText(value, fallback = "待确认") {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const text = value.trim();
  if (text.length > MAX_FIELD_LENGTH) throw new Error(`字段长度不能超过 ${MAX_FIELD_LENGTH} 个字符`);
  return text;
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_LIST_ITEMS) throw new Error(`列表不能超过 ${MAX_LIST_ITEMS} 项`);
  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => {
      const text = item.trim();
      if (text.length > MAX_ITEM_LENGTH) throw new Error(`列表单项不能超过 ${MAX_ITEM_LENGTH} 个字符`);
      return text;
    });
}

function bullets(items, fallback) {
  const values = items.length ? items : [fallback];
  return values.map((item) => `- [ ] ${item}`).join("\n");
}

function inferChecks(stack) {
  const text = stack.toLowerCase();
  const checks = ["运行与改动范围直接相关的最小测试集"];
  if (/typescript|javascript|react|vue|node|npm|pnpm|yarn/.test(text)) {
    checks.push("运行类型检查或项目构建", "运行 lint（若仓库已配置）");
  }
  if (/python|django|flask|fastapi|pytest/.test(text)) {
    checks.push("运行目标模块的 pytest 或现有测试命令", "执行静态检查（若仓库已配置）");
  }
  if (/java|kotlin|gradle|maven/.test(text)) {
    checks.push("运行目标模块测试", "执行编译或打包检查");
  }
  if (/rust|cargo/.test(text)) {
    checks.push("运行 cargo test", "运行 cargo check 或 clippy（若已配置）");
  }
  if (/go|golang/.test(text)) {
    checks.push("运行目标包 go test", "运行 go vet（若仓库已配置）");
  }
  checks.push("人工复核关键交互、错误路径与兼容性");
  return [...new Set(checks)];
}

export async function execute(input = {}) {
  const goal = cleanText(input.goal, "未提供目标");
  const stack = cleanText(input.stack);
  const context = cleanText(input.context);
  const constraints = cleanList(input.constraints);
  const acceptance = cleanList(input.acceptance);
  const riskLevel = PRIORITY_LABELS[input.riskLevel] || "待评估";
  const checks = inferChecks(stack);

  const brief = `# Hanako 工程简报\n\n## 目标\n${goal}\n\n## 技术环境\n${stack}\n\n## 已知上下文\n${context}\n\n## 约束\n${bullets(constraints, "确认允许修改的目录、依赖与兼容范围")}\n\n## 验收标准\n${bullets(acceptance, "把目标改写为至少一条可观察、可复现的通过条件")}\n\n## 执行协议\n1. 先检索仓库规则、相关实现、测试和调用链，再确定改动点。\n2. 写出最小实施计划，列明预计修改的文件及每个文件的职责。\n3. 优先复用现有抽象，避免顺手重构与无关格式化。\n4. 修改后运行最小且充分的验证；失败时先读错误，再针对原因修复。\n5. 收尾报告改动、验证证据、残余风险及未覆盖项。\n\n## 验证矩阵\n${bullets(checks, "运行仓库已有验证命令")}\n\n## 风险与回滚\n- 风险等级：${riskLevel}\n- 重点检查：公共接口、状态持久化、异常路径、并发或边界输入。\n- 回滚原则：保持改动聚焦；记录新增文件、配置和依赖；必要时可逐项撤销。\n\n## 开工前缺口\n- [ ] 是否已找到仓库级与目录级开发规则？\n- [ ] 是否确认了真实入口和调用方，而非只看文件名猜测？\n- [ ] 是否存在应同步更新的测试、类型、文档或迁移？`;

  return {
    content: [{ type: "text", text: brief }],
    details: {
      brief: {
        goal,
        stack,
        context,
        constraints,
        acceptance,
        riskLevel,
        checks
      }
    }
  };
}
