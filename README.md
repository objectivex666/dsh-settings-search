# dsh-settings-search

> 为 DSH（Cordis）设置面板提供即时搜索能力，快速定位设置页与通用设置项。

[![npm version](https://img.shields.io/npm/v/@objectivex666/dsh-settings-search)](https://www.npmjs.com/package/@objectivex666/dsh-settings-search)
[![license](https://img.shields.io/npm/l/@objectivex666/dsh-settings-search)](./LICENSE)
[![node](https://img.shields.io/node/v/@objectivex666/dsh-settings-search)](https://nodejs.org)

**中文** · [English](./README.en.md)

---

## 功能特性

- 🔍 **实时搜索**：在设置面板左侧导航顶部嵌入搜索框，输入关键词立即过滤所有已注册的设置页（`settings.section`）与通用设置项（`settings.general.item`）。
- 📂 **页内选项搜索（v1.2.0）**：不只搜页面，还能直达每个设置页内部的具体选项——插件页的标签页（`settings.plugins.tab`）、Web UI 插件的卡片（`web-ui.plugin.item`）、通用设置行等，结果以「页面 › 选项」面包屑展示。
- 🧭 **点击即达**：选中结果后自动点击对应的左侧导航项打开所在分区；若是页内标签页会继续点开对应标签，并高亮闪烁目标选项行。无法自动跳转时显示手动路径提示。
- 🌱 **渐进索引**：自绘界面的设置行会在其所在页面首次被访问时从渲染 DOM 中收割标题并加入索引（此后始终可搜）。
- 🛠 **自带设置页（v1.4.0）**：左侧导航新增「设置搜索」页——展示当前版本，一键检查 npm 注册表上的最新版本；有更新时直接给出复制就用的 `dsh plugin update` 命令。
- 🌐 **多语言支持**：内置中英文国际化，可跟随 DSH 本地化系统扩展。
- 🎨 **主题适配**：完全使用 CSS 变量，自动跟随 DSH 主题（亮/暗）。
- ⚡ **动态响应**：实时订阅设置项的新增/删除/变更，搜索结果自动刷新。

---

## 安装（命令行）

本插件是一个标准的 **DSH profile bundle**：安装后自动写入设置面板，
无需手动修改任何 DSH 配置文件。

### 前置要求

- **DeepSeek Harness (DSH)**：任意包含 Web 界面（`dsh web`）的版本。
- **Node.js** >= 18（推荐 LTS）。

### 通过 npm 安装（推荐）

```bash
dsh plugin --profile web add @objectivex666/dsh-settings-search
```

### 通过 GitHub 安装

```bash
dsh plugin --profile web add github:objectivex666/dsh-settings-search
```

### 本地源码安装（开发调试）

```bash
dsh plugin --profile web add /path/to/dsh-settings-search
```

安装完成后**重启 DSH**（`dsh web`），打开设置面板即可看到顶部的搜索框。
卸载：`dsh plugin --profile web remove @objectivex666/dsh-settings-search`。

> 非 `web` profile 请把命令中的 `--profile web` 换成你的 profile 名。

---

## 手动接线（不通过命令行安装时）

把本包加入 profile 依赖并声明为 bundle 层即可（`dsh plugin add` 会自动完成）：

```yaml
# 你的 profile 的 cordis.patch.yml（或通过 --patch 传入）
- insert:
    - id: settings-search
      name: '@objectivex666/dsh-settings-search'
```

包内自带 `cordis.patch.yml`（本文件内容），`dsh plugin add` 会自动应用。

---

## 包结构

```
lib/index.js        Host half（空实现，保证作为合法 Cordis 插件行加载）
lib/client.js       Browser half（搜索框 UI，__ModuleLoader__ 格式）
cordis.patch.yml    组合补丁：插入 settings-search 插件行
scripts/check.mjs   结构自检（npm test）
```

## 开发

```bash
npm test   # 校验 host 半、dsh.client 清单、client bundle handoff
```

> 历史说明：v1.1 及之前仓库曾附带 `dsh-settings-search.js`（会话内
> `cordis_define` 动态插件源）。因与正式包代码长期双份维护漂移，已于 v1.4.1
> 移除；如需动态用法可从 git 历史（tag `v1.4.0`）取回参考。
