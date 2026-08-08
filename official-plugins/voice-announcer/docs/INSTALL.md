# 安装指南

## 安装插件

1. 在 Hana 插件管理中安装 `voice-announcer`（zip 或市场安装均可）
2. 授予**完整权限（full-access）**：插件需要常驻监听会话事件、调用系统语音、写入配置。没有完整权限插件不会加载

## 依赖自动安装

插件依赖一个系统级桥接组件（NaturalVoiceSAPIAdapter），把 Edge 浏览器的在线神经语音（晓晓、云希等）桥接为 Windows 标准语音接口（SAPI 5）。该组件已**打包在插件内部**，无需单独下载。

### 安装流程（自动）

1. 插件首次加载时，检测系统语音列表
2. 已存在 `Microsoft Xiaoxiao Online` 等在线语音 → 跳过，直接可用
3. 不存在 → 弹出一个 UAC 窗口（Windows 用户账户控制）
4. 点「是」→ 插件自动完成：解压适配器 → 注册 64/32 位组件 → 写入配置（启用 Edge 在线语音、中文语音过滤）
5. 安装完成后立即生效，无需重启

> UAC 弹窗是 Windows 安全机制，注册系统语音组件需要管理员权限，属正常现象。

### 手动验证

打开 PowerShell 执行：

```powershell
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
```

输出中出现 `Microsoft Xiaoxiao Online` / `Microsoft Yunxi Online` 等即安装成功。

## 卸载

- 卸载插件：Hana 插件管理删除即可
- 桥接组件（适配器）：卸载插件**不会**自动移除。如确需移除，以管理员运行插件数据目录下的 `adapter\Installer.exe` 卸载，或删除注册表 `HKCU\SOFTWARE\NaturalVoiceSAPIAdapter` 并注销对应 DLL
- 建议保留：不影响其他软件，且下次重装插件无需再次安装

## 常见安装问题

| 现象 | 处理 |
|------|------|
| 插件不加载 | 检查是否授予完整权限（full-access） |
| 没有弹 UAC | 系统已有在线语音（已装过桥接）；或插件数据目录不可写 |
| UAC 点了「否」 | 插件会跳过本次安装，重新加载插件（或重启 Hana）再次触发 |
| 安装后仍没声音 | 见 [FAQ.md](FAQ.md) |
