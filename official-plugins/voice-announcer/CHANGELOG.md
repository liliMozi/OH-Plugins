# 变更历史

## v0.2.8 — 2026-08-10 · 规则注入并入声律

- 新增 extensions/rules-inject.js：before_agent_start 时把 RULES.md 中启用的行为规则注入 system prompt（此前依赖 chinese-thinking 插件注入，该插件未随声律分发，导致规则从未生效）
- 注入尊重侧边栏规则开关与自定义：仅注入启用中的规则，自定义内容优先；rules-state.json 缺失时默认全部启用
- 幂等注入：内容包裹在 voice-announcer-rules 标记内，重复触发替换旧区块不累加
- RULES.md「中文思考规则」小节说明同步更新：注入职责由 chinese-thinking 移交声律自身
- 修复 PowerShell 常驻进程空指针竞态：ensurePs/execPs 改用局部 proc 引用 + ps===proc 守卫，消除 exit 后 cleanup 访问 null.stdout 的 uncaughtException（会话创建时 stopSpeaking→shutdownPs→cancelSpeech 链路触发）
- 版本 0.2.8

## v0.2.7 — 2026-08-09 · 两选项触发强化

- option_card 工具描述与 RULES.md「选项卡片规则」强化：即使只有 2 个选项（是/否、A/B 二选一）也必须用选项卡片，不降级为纯文字提问
- 版本 0.2.7

## v0.2.6 — 2026-08-09 · 卡片尺寸自适应

- 选项卡片页面新增尺寸报告（ResizeObserver → postMessage resize），高度随内容自适应，不再固定占位
- 配合宿主更新（PluginCardBlock iframe 宽度 100% + 上限 1000px、CARD_MAX_WIDTH 1000），卡片宽度贴合对话流容器
- 版本 0.2.6

## v0.2.5 — 2026-08-09 · 规则开关 + 自定义

- 规则资产每条规则新增启用开关（toggle）：关闭后该规则不再出现在 active 视图，状态持久化 plugin-data/rules-state.json
- 每条规则支持自定义修改：展开后点「自定义」编辑规则内容（textarea，可多行），保存后覆盖默认要点展示；已自定义的规则显示「编辑」「恢复默认」
- 新增 API：/sidebar/rules/toggle（开关）、/sidebar/rules/custom（自定义/恢复默认）、/sidebar/rules/active（仅返回启用规则的生效内容，供注入层消费）
- 开关与自定义状态相互独立：关闭的规则保留自定义内容，重新启用即恢复
- 版本 0.2.5

## v0.2.4 — 2026-08-09 · 选项卡片

- 新增对话内选项卡片：需要用户选择/确认时自动渲染可点击卡片（`option_card` 工具），点击自动回传会话并触发 agent 继续处理，不再依赖用户打字回复
- 布局自适应：≤3 个选项横排并排（等宽卡片块），>3 个竖列目录（序号 + 箭头）；跟随 Hana 主题（引入宿主 hana-css）
- 回传消息结构化：「（选项卡片）<问题>\n我选择：<选项>」，agent 识别后接续对应分支，不重复提问
- 逃逸通道：卡片底部提供「自定义输入」（展开输入框自由填写，回传「我选择（自定义）：<内容>」）与「跳过」（回传「跳过，不做选择」，agent 不追问按默认处理）
- 边界处理：会话流式输出时点击返回 session_busy，卡片前端友好提示
- 实现：tools/option-card.js（工具）+ routes/card.js（渲染与回传），manifest 声明 capabilities session.write，卡片数据落盘 plugin-data/choices（24h TTL）
- RULES.md 新增「选项卡片规则」小节（第六规则）：决策场景自动触发、回传格式消费、busy 提示
- 版本 0.2.4

## v0.2.3 — 2026-08-09 · Agent 白名单增删 + 播报历史 + 自定义 prompt

- 播报 Agent 白名单可视化：侧边栏标签式列表，输入 agent id 回车添加、点 × 删除（此前只能改 JSON 配置文件；va.save 补上 agents 键）
- 播报历史：每次朗读留痕（全文/卡片/一句话/实时四类，含时间戳），最多 20 条，落盘 plugin-data/history.json 重启不丢；侧边栏可回看、一键清空
- 自定义总结 prompt：一句话总结的生成指令可在侧边栏编辑（保存/恢复默认），留空使用内置双形态（问答→结论，工作→复盘）
- manifest 新增 summaryCustomPrompt 配置项（默认空）；版本 0.2.3
- 卡片收尾规则完善：补全适用场景（数据/状态汇报、决策建议）、按内容形态选型不套模板、正文讲过程卡片给结论、低信息量豁免、遵守 hana_card_guide 规范（侧边栏规则资产随 RULES.md 动态同步）

## v0.2.2 — 2026-08-09 · 一句话总结 + 音量

- 新增「一句话总结」开关（summaryOneLiner）：回复完成后用工具模型（model:sample-text bus，零依赖）把回复压缩成一句中文朗读，正文与卡片不再直接念；生成失败自动降级（有卡片念卡片，否则念截断正文）
- 新增「音量」控制：SAPI Volume 0-100（默认 100），侧边栏语速下方新增滑块；speak / speakChunk 同步生效
- 侧边栏状态徽标新增「一句话总结中」态（优先级：一句话 > 只读总结 > 实时）
- manifest 新增 summaryOneLiner / volume 配置项（默认关闭 / 100）
- 总结形态修正：一句话总结从「内容摘要」改为「过程复盘」——总结做了什么 / 为什么这么做 / 遇到什么坑 / 思路变化（60~120 字、maxTokens 300），由标题摘要升级为复盘导语

## v0.2.1 — 2026-08-09 · 只读总结

- 新增「只读总结」开关：回复完成后只朗读 show_card 总结卡片，跳过正文；实时模式下正文流式同样不再朗读（开关开启时正文一律不念）
- 侧边栏「回复完成后朗读」文案改为「回复完成后读总结」，开关组新增「只读总结（不念正文）」
- 侧边栏状态徽标新增「只读总结中」态
- manifest 新增 readSummaryOnly 配置项（默认关闭，兼容旧行为）

## Unreleased — 2026-08-09 · 规则资产

- RULES.md 新增「命令执行优先级」规则：结构化工具 > Python 3.13 > cmd > pwsh 7（Kr 确认）
- 特例声明：插件内部 TTS 桥接常驻 PowerShell 进程为既定实现，不受该规则约束
- RULES.md 新增「中文思考规则」小节：与 chinese-thinking 插件注入指令同源同措辞，互为表里
- 插件更名：语音播报 → 声律（显示名与侧边栏入口；id 保持 voice-announcer 不变）
- RULES.md 新增「临时文件规范」小节：临时文件统一进工作区 _tmp/ 按类别存放（scripts / data / downloads / tests / misc），任务结束清理
- manifest 配置项补全 description：每个设置项带说明文字（作用与取值范围），设置页显示更完整
- 侧边栏新增「规则资产」区块：从 RULES.md 动态解析五条规则（新增 /sidebar/rules API），可折叠展开，单一来源随规则文件自动更新

## v0.1.9 — 2026-08-08 · 主题同步

- 侧边栏跟随 Hana 主题：加载宿主主题样式表（hana-css），深/浅色自动适配
- 下拉展开列表深色适配（option/optgroup 主题色），深色主题下不再白底浅字

## v0.1.8 — 2026-08-08 · 朗读质量

- 裸链接（https://...）、www 域名、邮箱朗读时直接跳过，不再逐字符念
- 实时朗读改为句子合并（400ms 攒段朗读），在线语音网络调用次数大减，卡顿缓解

## v0.1.6 — 2026-08-08 · 自包含分发版

- 内置 NaturalVoiceSAPIAdapter v0.2.9（22.8MB）到插件 assets
- 首次运行自动检测并安装桥接依赖（UAC 确认一次），开箱即用
- 补充完整文档（README / INSTALL / USAGE / FAQ）

## v0.1.5 — 2026-08-08 · 实时朗读修复

- 停止信号只认用户消息：工具链内部 turn 不再打断实时朗读
- 中间工具消息不再清空流式缓冲
- 实时朗读（边生成边读）实测生效

## v0.1.4 — 2026-08-08 · 实时朗读

- 新增实时朗读模式：监听流式增量（text_delta），句子级边生成边读
- SpeakAsync 队列连续播放，合成器对象复用，实时模式保持晓晓音色
- 思考内容（thinking_delta）不朗读，mood 块等待闭合后剥离
- 侧边栏新增「实时朗读」开关

## v0.1.3 — 2026-08-08 · 侧边栏修复

- 默认语速改回 0
- 修复拖动语速滑杆后音色下拉被清空的 bug（保存接口补齐音色列表 + 前端保护）
- 侧边栏界面重做：纸张质感、分组延伸线、印章蓝主按钮

## v0.1.2 — 2026-08-08 · 侧边栏上线

- 新增侧边栏 widget：开关、音色（11 种）、语速、长文截断、立即停止、测试朗读
- 插话/新建会话强制停播（修复 kill 进程）

## v0.1.1 — 2026-08-08 · 播报质量

- 常驻 PowerShell 进程 + 预热，消除启动延迟
- 中文 base64 传输避免乱码；中英混读（晓晓统一音色）
- markdown 清洗：星号、标题、列表等不念
- 卡片内容（show_card）提取加入朗读

## v0.1.0 — 2026-08-08 · 首版

- 监听 message_end，Hana 回复完成后自动朗读
- Edge 在线语音（晓晓）经 NaturalVoiceSAPIAdapter 桥接为系统 SAPI 语音
- RULES.md 固化「收尾必须 show_card 卡片」规则资产
