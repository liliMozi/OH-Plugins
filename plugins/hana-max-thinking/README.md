# Max Thinking (hana-max-thinking)

> 强制 HanaAgent 会话与频道中的**所有模型**默认运行在它支持的最高思考等级——修复 GLM 5.3 Flash 等模型在频道里"不说话"的痛点。

**作者：2990927961** · Hana 插件市场 ID：`hana-max-thinking` · **更新记录（Releases）：https://github.com/17308265071-pixel/hana-max-thinking/releases**

## 解决什么痛点

GLM 5.3 Flash / DeepSeek V4 Flash 等模型的回答质量与**思考链（thinking）强相关**：

- **频道/群聊里 agent 失语**：GLM 系列在协议层思考是开/关制，思考等级被 Hana 以 agent 级配置或频道执行器默认的 `medium` 创建后，模型可能因思考不足而输出空回复、卡在"正在准备回复"（典型现象：`@某agent 为什么不说话`）。
- **界面档位不能表达最高档**：Hana 思考选择器只显示 关闭/中等/深度（GLM 无 Max 档），无法一键固定最高档。
- **手动改档不持久**：agent 级配置是静态值，会话休眠恢复、模型切换后回落，用户要点很多次。
- **Hana 更新会冲掉手工 JSON 修改**：改 `config.json` 的思考等级，一次更新就没了。

本插件在**请求管线内**每轮强制最高思考等级，并把结果同步进会话元数据，让前端选择器落实显示——不依赖任何 Hana 配置 JSON 字段，应用更新不影响。

## 功能

- **全表面覆盖**：桌面会话、频道/DM（执行器默认 `medium` 的会话也会被纠正）、Bridge 会话。
- **按模型自适应**：请求 Pi SDK 最高档 `xhigh`，SDK 自动按模型能力收敛——支持 Max 的模型（GPT-5.2+、Claude opus-5/sonnet-5、DeepSeek V4 Flash 等）→ Max；不支持的推理模型 → 该模型最高档（如深度）；非推理模型 → 无害保持。
- **创建即启用**：`session_created` 总线事件 → 新会话/频道立刻写入最高档；旧频道通过文件系统扫描尽力补齐。
- **前端落实**：通过总线 `session:update` 把强制等级写回会话元数据——思考档位选择器立即显示被强制的档位；点击低档位约 2 秒自动弹回。
- **每轮自我修复**：手动下调、模型切换回落、休眠恢复旧值都会在下一轮自动纠正。
- **必读说明注入**：扩展在系统提示追加 `[max-thinking-guide]` 块（每请求幂等、按本轮工具通道自适应），保证模型知道"档位被强制的机制 + 查询口径 + 先查证再回答"；设置项 `injectGuide` 可关。
- **只读诊断工具**：`thinking_status` 让 agent 直接报告真实运行时等级（非静态配置值）。
- **文件日志**：`plugin-data/hana-max-thinking/enforce.log`（JSONL）记录每次强制的会话/模型/before→after。
- **更新安全**：插件装在 `${HANA_HOME}/plugins/`（用户数据目录），配置持久化在 `plugin-data/`，不解析任何 Hana 内部配置 JSON，应用更新不会覆盖或破坏；版本化模块导入保证覆盖安装不撞 ESM 缓存。

## 安装

**方式 A — 插件市场**：Hana 设置 → 插件 → 打开插件市场 → 搜索 "Max Thinking" → 安装。

**方式 B — 手动（Release zip，推荐）**：在 [Releases](https://github.com/17308265071-pixel/hana-max-thinking/releases) 下载最新 `hana-max-thinking-vX.Y.Z.zip`，Hana 设置 → 插件 → 从 zip 安装（支持覆盖安装，无需重启）。

**方式 C — 源码目录**：把本仓库克隆/复制到 `<用户目录>\.hanako\plugins\hana-max-thinking\`（macOS/Linux 为 `~/.hanako/plugins/`）。

安装后：设置 → 插件 → Max Thinking → 打开**全权（full-access）**开关。

## 配置项

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | 总开关 |
| `targetLevel` | `xhigh` \| `high` | `xhigh` | 目标等级；`xhigh`=最高（界面"最高/Max"） |
| `enforceEveryTurn` | boolean | `true` | 每轮重新强制；关闭则只在新会话启动时应用一次 |
| `syncSessionMeta` | boolean | `true` | 前端适配：等级写回会话元数据（选择器立即落实） |
| `respectManualChoice` | boolean | `false` | 用户手动下调时 30 分钟内不强制该会话 |
| `excludeModels` | string[] | `[]` | 排除模型（模型 id 子串；结尾 `*` 前缀通配） |
| `injectGuide` | boolean | `true` | 在系统提示注入插件必读说明（推荐） |

## Agent 工具与兜底约定

`thinking_status`（只读，无参数）是插件的状态查询入口：

1. **HanaAgent ≥ 0.449.0**：作为原生工具直接调用（capability 本地命名空间，免审批）。
2. **桥接/旧宿主**：经 `mcp_call { server: "hana-max-thinking", tool: "hana-max-thinking_thinking_status" }` 调用。
3. **兜底**：直接 read `${HANA_HOME}/plugin-data/hana-max-thinking/enforce.log`（JSONL），运行时真实等级以它为准。

`SKILL.md` 已向 agent 注入这套"直调 → mcp_call → 日志兜底"的三段式约定；系统提示中的 `[max-thinking-guide]` 会按本轮实际工具通道自动选择正确口径。

## 目录结构

```
hana-max-thinking/
├── manifest.json
├── state.js                    # 配置镜像 + 日志 + 应用记录（共享单例）
├── index.js                    # 生命周期：config 同步 + 元数据扫描下发（零 SDK 依赖）
├── extensions/
│   └── max-thinking.js         # Pi SDK 扩展：每轮强制最高思考等级 + 必读说明注入
├── skills/
│   └── max-thinking/SKILL.md   # Agent 知识注入
├── tools/
│   └── thinking-status.js      # 只读状态查询工具
└── README.md
```

## 兼容性

- HanaAgent ≥ 0.158.0（建议 ≥ 0.449.0 以获得原生工具直调）
- Windows / macOS / Linux
- 零 npm 依赖，跨平台无路径假设

## 更新记录

历史版本的完整更新说明与可下载 zip 见 **GitHub Releases**：

**https://github.com/17308265071-pixel/hana-max-thinking/releases**

## 作者

- **2990927961**
- 反馈/问题：在本仓库提 Issue
