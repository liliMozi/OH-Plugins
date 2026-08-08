# Hanako Code Forge

一款用于强化 Hanako 编程执行质量的 Hana 插件。它把需求澄清、改动范围、验收标准、测试证据和风险回滚固定成一套可重复工作流。

## 首版能力

### 1. Hanako 编程协议 Skill

插件内置并默认启用 `hanako-code-forge` Skill。Hanako 接到开发、修 Bug、重构或代码审查任务时，会遵循以下节奏：

1. 先读取仓库规则、相关实现、调用方与测试。
2. 写出最小改动计划，避免夹带无关重构。
3. 修改后按成本递增运行验证。
4. 用实际证据报告结果、残余风险和未覆盖项。

### 2. Agent 工具

- `forge_coding_brief`：把目标、技术栈、上下文、约束和验收标准整理成工程简报。
- `review_coding_plan`：检查实施计划是否覆盖上下文、改动范围、验证、风险与回滚。

两个工具均为只读分析工具，不会直接修改用户项目。

### 3. Code Forge 工作台

插件提供完整页面和侧栏 Widget：

- 输入目标、技术栈、已知上下文、工程约束和验收标准。
- 实时生成结构化工程任务。
- 一键复制给 Hanako，作为编程任务的稳定起点。

## 安装

这是无需构建的 direct 插件，源码目录可直接用于 Hana：

1. 打开 Hana 设置。
2. 进入插件管理。
3. 安装本目录或交付的 zip 包。
4. 启用 `Hanako Code Forge`。

若要使用 Agent 开发调试工具，请先在 `设置 → 插件` 打开 **Allow Agent plugin dev tools**。

## 信任、权限与隐私

页面、Widget、自定义路由和生命周期入口使插件以 Hana 的 `full-access` 信任级别运行。这是宿主对插件代码的技术信任边界，不等同于只授予剪贴板权限；安装前应像审查本地应用扩展一样审查来源和版本。

当前 v0.1.2 代码经过发布审查，实际行为限定为：

- 在本地 iframe 中编辑和生成工程简报。
- 用户明确点击按钮时，通过 WebView 的浏览器剪贴板 API 写入简报；若宿主不允许剪贴板访问，页面提示用户从预览区手动复制。
- 注册 `hanako-code-forge:status` 生命周期 EventBus 处理器，仅返回插件 id、名称与就绪状态，并记录加载/卸载日志。
- 提供两个只读文本分析工具和一份编程工作流 Skill。

当前版本不声明或使用外部网络、用户项目文件读写、子进程、环境变量、凭据或密钥访问能力。这里描述的是经审查版本的实际行为，不代表 `full-access` 在技术上永久禁止未来版本增加能力；升级时请重新查看权限说明。

工程目标、错误信息、内部接口和约束可能包含敏感开发上下文。预览数据只在本地页面中处理，复制仅由用户显式触发。插件不使用 `postMessage` 向父页面传递工程简报，也不接收或信任 URL 中声明的宿主 origin。不要把敏感内容粘贴到不受信任的第三方页面或会话。

## 文件结构

```text
hanako-code-forge/
├─ manifest.json
├─ index.js
├─ routes/ui.js
├─ assets/
│  ├─ panel.js
│  └─ panel.css
├─ tools/
│  ├─ forge-coding-brief.js
│  └─ create-note.js
└─ skills/hanako-code-forge/SKILL.md
```

## 使用建议

- 简单、明确的小改动可以直接让 Hanako 开工。
- 涉及多文件、状态、兼容性或未知调用链时，先让 Hanako 调用 `forge_coding_brief`。
- 已经有实施方案但担心遗漏时，调用 `review_coding_plan`。
- 工作台适合把口头想法整理成稳定需求，再复制到新会话或交给团队中的其他 Agent。
