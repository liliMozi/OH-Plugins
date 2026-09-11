# Hana Minimal Mode（极简模式 × dsh-routing-suite router-standard）

> 把 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) 的 `router-standard`（v1.20.0）**1:1 移植**到 HanaAgent 的极简模式插件：T0 锚定、四阶段渐进披露、按任务释放平台工具包、按模型路由、跨版本三档通道适配；全程保留 Hana 原生功能（非破坏原则）。

**作者：2990927961** · 市场 ID：`hana-minimal-mode` · **更新记录（Releases）：https://github.com/17308265071-pixel/hana-minimal-mode/releases**

## 解决什么痛点

- **工具面噪音**：平台内置工具包、MCP、插件工具一屏几十个，模型容易乱用工具、把简单任务做重。
- **任务跑偏**：复杂任务直接开干，缺少"先对齐目标与验收标准"的确认轮，返工成本高。
- **上下文浪费**：把全套工具描述塞进每一轮请求，挤占上下文、拖慢响应。
- **管理分散**：想给某个助手单独开"极简模式"，没有一个集中的注册/取消入口。
- **不能破坏原生体验**：任何路由方案都不应屏蔽 Hana 的记忆、思考档位等原生能力。

本插件在**请求管线内**工作：首轮锚定（确认轮）→ 四阶段渐进披露 → 锚定后工具全量释放；对 Hana 原生功能只做增强、不做破坏。

## 功能

- **T0 锚定（确认轮）**：首轮注入 RL persona、锚定提示与**能力地图**（从当轮实际工具列表生成），模型据此说明本任务所需工具族与做法；锚定轮不启动任务本身。
- **四阶段渐进披露**：了解/对齐 → 拟合方案 → 开发 → 验证；完成信号自动晋级（一次一级），阶段为流程指引，锚定轮之后工具面**全量释放**（R29），不再拦截任何调用。
- **按任务释放平台工具包**：二轮起按任务关键词自动打开文档/表格/PPT/浏览器/桌面/媒体等工具包；模型直接调用包内工具时也会自动打开对应包；`request_tools` 可手动预打开。
- **按模型路由**：识别模型家族，`router_status` 展示当前阶段、档位与目标助手。
- **跨版本三档自适应**：每轮按实际工具列表运行时探测 `native` / `bridge` / `legacy` 三档，不依赖 Hana 版本号硬编码，新版本自动适配。
- **右侧栏「极简模式」面板**：单选注册目标助手（注册即替换，删除即清空），折叠列表展示已注册；切换/清除会同步清理注册与旧助手会话阶段状态。面板 UI 严格遵循 Hana KAMI 设计语言：全部颜色/边框取自宿主注入的主题变量，**自动适配全部内置主题皮肤**（暖纸 / 青夜 / 草香 / 高对比等），扁平表面、4px 圆角、0.5px 结构线。
- **对话开关**：在对话中说「开启/关闭极简模式」即可把当前助手设为目标或取消目标（可在设置中关闭该行为）。
- **非破坏原则**：system prompt 只做追加（标记块、幂等）；工具面仅在锚定轮做裁剪；Hana 的记忆工具（`search_memory` / `recall_experience` / `current_status`）与 Thinking 插件工具在锚定轮始终保留。

## 安装

**方式 A — 插件市场**：Hana 设置 → 插件 → 打开插件市场 → 搜索 "Minimal Mode" → 安装。

**方式 B — Release zip（推荐）**：在 [Releases](https://github.com/17308265071-pixel/hana-minimal-mode/releases) 下载最新 `hana-minimal-mode-vX.Y.Z.zip`，设置 → 插件 → 从 zip 安装（支持覆盖安装，无需重启）。

**方式 C — 源码目录**：把本仓库克隆/复制到 `${HANA_HOME}/plugins/hana-minimal-mode`.

安装后：设置 → 插件 → Hana Minimal Mode → 打开**全权（full-access）**开关。

## 配置项

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | 总开关 |
| `routerMode` | enum | `auto` | 路由模式覆盖（`auto` 为标准渐进流程；其余值记录并展示） |
| `stagedUnlock` | boolean | `true` | 四阶段渐进流程（阶段为流程指引，锚定后工具全量释放） |
| `zeroToolAnchor` | boolean | `true` | 首轮锚定（确认轮）；关闭后不再注入锚定提示 |
| `bootstrapMaxTokens` | integer | `1024` | 锚定轮输出预算（0=不限） |
| `dynamicPacks` | boolean | `true` | 按任务自动释放平台工具包 |
| `postAnchorInjection` | boolean | `true` | 锚定后注入 persona/阶段/工具引导 |
| `networkGuard` | boolean | `false` | 网络命令守卫（拦截 shell 网络命令；默认关） |
| `conversationControl` | boolean | `true` | 对话开关（「开启/关闭极简模式」） |

## 使用

1. 打开右侧栏「**极简模式**」面板，从下拉中选择助手并点击「注册」（单选：注册即替换；点「删除」即取消该目标）。
2. 新开一个会话开始工作：首轮为锚定确认轮（模型复述目标、说明工具族与做法），下一轮起按阶段推进。
3. 完成信号（阶段完成、交付确认）会自动晋级；也可直接对话「开启/关闭极简模式」切换目标。

## 目录结构

```
hana-minimal-mode/
├── manifest.json          # id/version、minAppVersion、configuration（9 项）+ widget
├── index.js               # 生命周期：注册、面板路由、配置同步
├── state.js               # 共享状态与阶段桶
├── policy.js              # 锚定/阶段/注入策略（含能力地图 digest）
├── router-core.js         # 分类/band/persona/工具包目录（移植自 dsh router-core）
├── stage-engine.js        # 阶段状态机与自动晋级（移植自 dsh router-bootstrap）
├── compat.js              # native/bridge/legacy 运行时探测
├── target-service.js      # 单目标注册服务
├── routing-store.js       # 目标注册持久化
├── registration-store.js  # 注册信息存储
├── config-legacy.js       # 旧配置迁移
├── agent-catalog.js       # 助手目录
├── network-guard.js       # 网络命令守卫
├── commands/minimal.js    # 「开启/关闭极简模式」对话命令
├── extensions/router.js   # Pi SDK 扩展：请求管线注入/裁剪
├── routes/api.js          # 面板 API
├── routes/widget.js       # 右侧栏面板页面
└── tools/                 # 8 个元工具（phase_begin / phase_advance / delivery_check /
                           #   request_tools / router_status / tools_catalog / tools_help /
                           #   persona_reconcile）
```

## 兼容性

- **最低 Hana 版本**：0.447.4（`manifest.json` `minAppVersion`）
- **Hana ≥ 0.447.4**：`native` 档（插件工具直调）或 `bridge` 档（经 `mcp_call`，工具带 `hana-minimal-mode_` 前缀）；`legacy` 档自动安全降级（工具全量、调用即释放）
- **平台**：Windows / macOS / Linux；零 npm 依赖，Node ESM

## 更新记录

历史版本的完整更新说明与可下载 zip 见 **GitHub Releases**：

**https://github.com/17308265071-pixel/hana-minimal-mode/releases**

## 作者

- **2990927961**
- 反馈/问题：在本仓库提 Issue
