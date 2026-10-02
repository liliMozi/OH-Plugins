# Hanako2DSH

把本机那台 **DeepSeek Harness** 接进 Hana：**一个页签里看它干活，一句话把活派给它。**

---

## 先说清楚：这里的 DSH 是哪一个

本插件对接的是 **DeepSeek 官方开源的 DeepSeek Harness**（仓库 [`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness)），即官方桌面版 / CLI 那一套。

**不是**这些：第三方 AIO 或"整合包"式发行版、魔改桌面壳、手机移植版。那些会改动 profile 布局、默认端口与凭据路径，本插件**不做适配**，也别指望能直接用。

另外，它**不碰任何 API key**：凭据直接用你自己那份 DSH 已经登录好的（`~/.dsh/.credentials.yaml`），插件只是借它去登本地实例。

---

## 它能做什么

三件事，互不依赖，可以只用其中一件：

1. **镜像页签** —— 在 Hana 顶部开一个 `DSH` 页签。内层 iframe 连的是**本机真实运行的 DSH 界面**（插件在本地架一个反向代理，保持 Host、去掉 Origin、注入会话 cookie），HTTP 和 WebSocket 全透传。也就是说这是**活的**界面，不是截图；你在里面点、在里面聊，都作数。
2. **派活** —— `hanako2dsh_run` 把任务交给 DSH 的 headless 模式执行。默认**异步**：工具立刻返回「已派单」，任务在后台跑，**完成后结果自动回到对话**（走宿主的 deferred 通道，不用你在旁边守着）。想要同步等待就传 `wait: true`。
3. **侧栏时间线** —— 窗格里按「**一次 DSH 会话 = 一个窗口**」分栏，实时列出每一次工具调用与每段输出（截前 200 字），带状态灯、实时进度、右下角**急停**。窗口历史会落盘，重启 Hana 不丢。

---

## 前置条件

| 条件 | 说明 |
| --- | --- |
| 系统 | **Windows**。代码里没有平台硬编码，但目前只在 Windows 实测过，macOS / Linux 未验证 |
| DSH | 本机已安装**官方 DSH 桌面版**（能跑起 `DeepSeek Harness.exe`），并且至少成功登录过一次 |
| Hana | ≥ `0.421.0` |

---

## 安装

1. 设置 → 插件 → 把 zip 拖进安装区（或从插件市场安装）
2. 打开「**允许全权插件**」。本插件需要 `full-access`：它要起本地反向代理、注册路由与生命周期钩子，这些在 restricted 下拿不到
3. 如果它找不到 DSH，去插件设置里把「**DSH 安装目录**」填成含 `DeepSeek Harness.exe` 的那个文件夹（留空时会自动探测几个常见位置）

---

## 权限与安全（建议先读这一段）

- **trust = `full-access`**。它会在本机 **spawn 一个 DSH 进程**、监听 `127.0.0.1` 上的临时端口、读取 DSH 的账号凭据用于本地登录。反向代理**只绑 `127.0.0.1`**，不对外网开放；会话 cookie 只活在插件进程内存里。
- **默认 `permissionMode = danger-full-access`**：DSH 侧**不再弹审批**，可以越界写文件。想收紧就改成：

  | 取值 | 含义 |
  | --- | --- |
  | `danger-full-access`（默认） | 全程免审批、可越界 |
  | `workspace-write` | 只能改工作目录，越界**直接被拒** |
  | `read-only` | 只读 |

  单次派活也可以用 `hanako2dsh_run` 的 `permission` 参数单独覆盖。
- 急着停手时，窗格右下角有**急停**按钮：中止当前派活，不动其他东西。

---

## 配置

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `dshAppDir` | 空 | DSH 安装目录（含 `DeepSeek Harness.exe`）。留空自动探测 |
| `autoStart` | `true` | Hana 启动时自动拉起实例并建代理；关掉则打开页签时才懒启动 |
| `defaultCwd` | 空 | 派活的默认工作目录，留空用 Hana 工作区 |
| `permissionMode` | `danger-full-access` | 权限等级，见上 |

---

## 工具

| 工具 | 权限 | 说明 |
| --- | --- | --- |
| `hanako2dsh_run` | external | 派活。默认异步，返回 `{ok, deferred, opId}`；`wait:true` 同步等结果 |
| `hanako2dsh_status` | readOnly | 实例端口 / 代理端口 / 是否就绪 / cookie / PID / 权限等级 / 时间线 |
| `hanako2dsh_control` | external | `start` / `stop` / `restart` |
| `hanako2dsh_diagnose` | readOnly | 体检：安装路径、asar 内 `cli.js`、账号凭据、当前状态 |

---

## 已知限制（照实说）

- **它是"派活账本"，不是"DSH 全貌"**。侧栏时间线只记**插件派出去的活**；你在 DSH 界面里手动跑的会话，不进这条线。你不派活，它就是空的。
- **别和桌面端 DSH 同时抢**。两者共用同一份账号目录（`~\.dsh`，凭据 / 会话 / 锁都在这），我们的实例可能起不来。插件对此有**指数退避 + 连续失败 5 次即停手**的保护，不会再无限重试拖垮机器。
- **headless 没有审批通道**。所以派活时的越界行为，要么被放行（`danger-full-access`），要么被拒（`workspace-write`），中间没有"问一下"这一步。
- **窗口 = 会话**。同一目录下开两个会话，就是两个窗口，这是设计如此。
- 反代依赖本地回环端口，若被安全软件拦截会表现为页签一直转圈（`hanako2dsh_diagnose` 能定位）。

---

## Hanako 皮肤（可选）

插件里带一张自制的 DSH 主题卡 **`HanaAgent`**：暖米色浅色 + 石板蓝深色，支持深浅自动跟随，让镜像里的 DSH 看上去跟 Hana 是一家人。

| 浅色 | 深色 |
| --- | --- |
| ![浅色](https://raw.githubusercontent.com/ji-or-ji/hanako2dsh/main/docs/theme-light.png) | ![深色](https://raw.githubusercontent.com/ji-or-ji/hanako2dsh/main/docs/theme-dark.png) |

**前置**：镜像所在的 DSH 需要装了 [`dsh-themes`](https://www.npmjs.com/package/dsh-themes)。没装的话插件会安静跳过（并告诉你）。

**行为（只装，不抢）**：

- 检测到 `dsh-themes` → **只有这张卡还不存在时**，才把它追加进 `~/.dsh/dsh-themes.json` 的 `custom[]`（写前留一份 `.bak`）
- **已经有了就完全不碰** —— 你自己改过的颜色、变体都会保留；插件永不覆盖它
- **不修改** `current` / `mixed` —— 要切主题由你在 DSH 的「外观」里自己点
- 只要卡在、但还没切到它，侧栏会提示一句「Hanako 皮肤已就绪」，点「**不再提示**」就不再打扰；一旦你切到了这张卡，提示自动消失

---

## 从源码安装（开发者）

把本目录放进 `${HANA_HOME}/plugin-dev-sources/`，用 EventBus 的 `plugin.dev.install`（或 `POST /api/plugins/dev/install`）装进 dev 槽；改完 `plugin.dev.reload`。注意：**入口之外的子模块有 ESM 缓存**，改了 `lib/`、`routes/`、`tools/` 需要重启 Hana 才生效。

---

## 许可与致谢

Apache-2.0。

异步派活用到的宿主 `deferred` 通道调用方式，借鉴自 [KhalilYamber/dsh-envoy](https://github.com/KhalilYamber/dsh-envoy) 与 [Nyasers/dsh-hanako](https://github.com/Nyasers/dsh-hanako)（均为 MIT 许可），在此致谢。
