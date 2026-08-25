# dsh-settings-search

> 为 DSH（Cordis）设置面板提供即时搜索能力，快速定位设置页与通用设置项。

[![npm version](https://img.shields.io/npm/v/@objectivex666/dsh-settings-search)](https://www.npmjs.com/package/@objectivex666/dsh-settings-search)
[![license](https://img.shields.io/npm/l/@objectivex666/dsh-settings-search)](./LICENSE)
[![node](https://img.shields.io/node/v/@objectivex666/dsh-settings-search)](https://nodejs.org)

---

## 功能特性

- 🔍 **实时搜索**：在设置面板左侧导航顶部嵌入搜索框，输入关键词立即过滤所有已注册的设置页（`settings.section`）与通用设置项（`settings.general.item`）。
- 🧭 **导航引导**：点击搜索结果后，显示该设置所在导航项的标签，帮助用户快速定位。
- 🌐 **多语言支持**：内置中英文国际化，可跟随 DSH 本地化系统扩展。
- 🎨 **主题适配**：完全使用 CSS 变量，自动跟随 DSH 主题（亮/暗）。
- ⚡ **动态响应**：实时订阅设置项的新增/删除/变更，搜索结果自动刷新。

---

## 安装指南

### 前置要求

- **Node.js**：>= 18（推荐使用 LTS 版本）
- **Cordis**：^3.0.0 或 ^4.0.0（作为对等依赖，你的项目必须已安装 Cordis）
- **DSH 环境**：插件运行在 DSH（Cordis 驱动的桌面应用框架）中，请确保你的应用已正确初始化 DSH 设置面板。

### 通过 npm 安装（推荐）

```bash
npm install @objectivex666/dsh-settings-search
# 或使用 yarn
yarn add @objectivex666/dsh-settings-search
# 或使用 pnpm
pnpm add @objectivex666/dsh-settings-search