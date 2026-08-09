# 声律（voice-announcer）

Hana 回复自动朗读插件：正文 + show_card 卡片内容实时读出来，晓晓音色，边生成边读。**自包含、开箱即用、可分发**。

## 特性

- **自动朗读**：Hana 每次回复完成后，用系统实时语音自动朗读，零文件、零点击
- **实时朗读**：边生成边读，生成一句念一句（句子级流式）
- **晓晓音色**：Microsoft Xiaoxiao Online（Edge 在线神经语音），中英文混读统一音色
- **卡片内容**：show_card 卡片里的总结、结论一并朗读
- **智能打断**：插话、新建会话立即停播，不吵你
- **格式清洗**：markdown 星号、标题、列表等符号不念，只念正文
- **侧边栏面板**：开关、实时模式、音色、语速、截断长度随时调

## 快速开始

1. 安装插件（需要授予完整权限 full-access）
2. 首次运行：插件自动检测系统语音。若没有 Edge 在线语音，会弹出 UAC 窗口，点「是」自动完成桥接安装（约 30 秒）
3. 完成。对 Hana 说句话，回复就会自动朗读

## 文档

| 文档 | 内容 |
|------|------|
| [docs/INSTALL.md](docs/INSTALL.md) | 安装、依赖自动安装原理、卸载 |
| [docs/USAGE.md](docs/USAGE.md) | 使用指南：两种播报模式、侧边栏、打断、音色 |
| [docs/FAQ.md](docs/FAQ.md) | 常见问题排查（没声音、音色不对、卡顿等） |
| [CHANGELOG.md](CHANGELOG.md) | 版本历史 |
| [RULES.md](RULES.md) | 行为规则资产（中文思考、卡片收尾、命令执行优先级、临时文件规范） |

## 系统要求

- Windows 10/11（桥接依赖 Windows SAPI 5）
- HanaAgent（0.82.0+）
- 联网（晓晓在线语音走 Edge 语音服务；断网自动降级本地音色）

## 配置一览

| 配置 | 默认 | 说明 |
|------|------|------|
| enabled | true | 自动播报总开关 |
| streaming | false | 实时朗读（边生成边读） |
| voice | Microsoft Xiaoxiao Online | 音色（侧边栏可选 11 种） |
| rate | 0 | 语速 -10 ~ 10 |
| maxLength | 500 | 长文本截断字数 |
| agents | ["hanako"] | 播报的 Agent 白名单，留空播报全部 |

## 分发

插件包自带 Edge 语音桥接适配器（NaturalVoiceSAPIAdapter v0.2.9），其他机器安装插件后自动安装桥接，无需手动配置。详见 [docs/INSTALL.md](docs/INSTALL.md)。

## 技术原理（一句话）

插件监听 Hana 会话事件（message_end / message_update），文本经清洗（去 markdown）后交给 Windows SAPI 5 实时合成；SAPI 语音由 NaturalVoiceSAPIAdapter 桥接 Edge 在线神经语音（晓晓等），常驻 PowerShell 进程消除启动延迟。
