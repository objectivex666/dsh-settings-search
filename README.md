# dsh-settings-search

> 给 DSH（Cordis）设置面板加一个搜索框，输入关键词就跳到对应的设置页和设置项。

[![npm version](https://img.shields.io/npm/v/@objectivex666/dsh-settings-search)](https://www.npmjs.com/package/@objectivex666/dsh-settings-search)
[![license](https://img.shields.io/npm/l/@objectivex666/dsh-settings-search)](./LICENSE)
[![node](https://img.shields.io/node/v/@objectivex666/dsh-settings-search)](https://nodejs.org)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/objectivex666/dsh-settings-search)
[![dshbase 实测可装](https://dshbase.com/badges/dsh-settings-search-plugin.svg)](https://dshbase.com/zh/plugins/dsh-settings-search-plugin/)
[![dshfind](https://dshfind.com/api/card/objectivex666/dsh-settings-search?lang=zh)](https://dshfind.com/zh/plugins/objectivex666/dsh-settings-search?ref=badge)

**中文** · [English](./README.en.md)

---

## 功能特性

DSH 的设置项散落在各个分区和插件页里，找一个开关往往要一页页翻过去。这个插件把面板里的每一页、每一行都采进一份索引，再在面板上放一个搜索框，你直接说想找什么就行。

- 🔍 **实时搜索**。装好以后设置面板里会多出一个搜索框，输入关键词就实时过滤所有已注册的设置页（`settings.section`）与通用设置项（`settings.general.item`）。
- 🧩 **三种搜索样式**。经典侧栏、窗口顶栏、弹出搜索页，挑一个顺眼的。选择记在当前浏览器里，换浏览器或换机器要重新选一次。
- ⌨️ **搜索快捷键**（v1.10.0）。在设置面板里按 `Ctrl+F` 或 `⌘F`，焦点直接落到搜索框上。不需要的话可以在「设置搜索」页关掉，关掉以后按 `Ctrl+F` 恢复成浏览器自己的查找。
- 🤝 **导入 DSH 模型配置**（v1.9.0）。在 AI 配置区点一下，插件会读取 DSH 当前默认模型的 Base URL 与模型名。默认模型走 DSH 内置的 DeepSeek 路由、设置里没有 Base URL 时，导入的是 `https://api.deepseek.com/anthropic`。导入的内容里没有 API Key，这一点是有意的。
- 🎯 **新用户引导**（v1.9.0）。装好以后第一次打开设置面板时弹一次，讲的是实时搜索、拼音与意图联想、AI 联想、点击即达、自带设置页和自动导入索引。关掉就不会再出现，也没有手动重开的入口。
- 📂 **页内选项搜索**（v1.2.0）。索引里有页面，也有页面内部的选项，比如插件页的标签页（`settings.plugins.tab`）、插件页里的**会话插件 / 全局插件**分组标题、旧版的插件卡片座位（`settings.plugin.item` / `web-ui.plugin.item`，0.2 已移除）、通用设置行。结果显示成「页面 › 选项」的面包屑。
- 🔤 **拼音联想搜索**（v1.5.0）。输入拼音首字母（`sz`）或全拼（`shezhi`）就能联想到中文设置项。`↑`/`↓` 选择，`Enter` 跳转，`Esc` 关闭，命中的字自动高亮。
- 🧠 **意图联想搜索**（v1.6.0）。记不清选项叫什么也没关系，直接写「太亮了」「字太小」「忘记密码」，插件会猜你指的是哪几个设置，结果显示在「猜你想找」分组里。
- 🤖 **AI 联想搜索**。本地匹配不到时，把搜索词交给你自己配置的 OpenAI 兼容接口、Anthropic 或本机 Ollama 模型，由模型判断你想改什么。功能默认关闭，需要到「设置搜索」页打开并填好配置，Ollama 不必填 API Key。
- 💾 **持久设置索引**（v1.12.0）。采集过的索引存在本机浏览器里，只在首次安装，或者别的插件安装、更新、启用、停用时重建，也可以在「设置搜索」页手动重建。
- 🧾 **日志与查看**（v1.13.0 / v1.7.0）。插件运行、搜索与 AI 请求的关键动作按天写进 DSH 日志目录（`$DSH_HOME/logs/dsh-settings-search/settings-search-YYYY-MM-DD.log`，文件名带日期，一天一个）。单个文件写到 100 MB 就同日换编号分片续写（`.1`、`.2`…），整个日志目录上限 100 MB，超了删最旧的文件，正在写的那个不删。「设置搜索」页里可以直接查看日志、打开日志文件夹、复制、导出或清空，标题旁的计数是当天文件里的条目数。API Key 不会进日志。
- 🧭 **点击即达**。选中一条结果，插件替你点开左侧对应的导航项，目标在页内标签页里就继续点开那个标签，并把目标行高亮闪一下。跳不过去的时候显示手动路径提示。
- 🌱 **启动自动索引**（v1.8.0）。第一次打开设置面板时，插件自己把各分区走一遍，静默读走分区里的选项（比如「启用创意工坊卡片」）并收进索引，读完回到你原先待着的分区。过程里搜索框下方有提示，读完自动消失。这之后那些选项不用逐页打开也能搜到。
- 🛠 **自带设置页**（v1.4.0）。左侧导航多了「设置搜索」页，显示当前版本，可以一键查 npm 上的最新版本。有更新时给出能直接复制执行的升级命令，命令里带着 profile 名和最新版本号。
- 🧭 **更新说明查看**（v1.7.1）。「设置搜索」页的「检查更新」旁边还有一个「查看更新说明」，拉取 GitHub Release 的内容就地展示，拉不到就直接跳到 Release 页面。
- 🌐 **多语言支持**。内置中英文两套文案，跟着 DSH 的本地化系统走，也可以继续扩别的语言。
- 🎨 **主题适配**。样式全部用 CSS 变量写，亮色暗色跟着 DSH 走。
- ⚡ **动态响应**。插件实时订阅设置项的新增、删除和变更，结果列表跟着刷新。

---

## 安装（命令行）

本插件是一个标准的 DSH profile bundle。装完会自动写进设置面板，不需要手动改任何 DSH 配置文件。

下面的命令都是给命令行 profile 用的。桌面端用的是 `desktop` profile，由桌面应用自己管理，命令行改不动它，在桌面端装插件要走应用的插件管理页。

### 前置要求

- **DeepSeek Harness (DSH)**。DSH 0.2 正式版（桌面版与 `dsh web`）和更早的 0.1 版本都可以，插件会按运行中的版本自动选择对应接口。当前已在 **0.2.1-rc.2** 上逐项核对过（`npm run compat`），0.2.0 及之前的行为保持不变。
- **Node.js**。18 或更高，推荐 LTS。

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

装完记得重启 DSH（`dsh web`），打开设置面板就能看见搜索框。要卸载就跑 `dsh plugin --profile web remove @objectivex666/dsh-settings-search`。

> 如果你的 profile 不叫 `web`，把命令里的 `--profile web` 换成实际的名字。

---

## 它不做什么

- 索引存在本机浏览器里，换个浏览器要重新采集一遍。
- 导入 DSH 模型配置时不带 API Key，写日志时也不记录 API Key。
- 关掉搜索快捷键之后，`Ctrl+F` 还给浏览器，插件不再拦截。

---

## 手动接线（不通过命令行安装时）

不想用命令行的话，把本包加进 profile 依赖，声明成 bundle 层就行（`dsh plugin add` 帮你做的就是这件事）。

```yaml
# 你的 profile 的 cordis.patch.yml（或通过 --patch 传入）
- insert:
    - id: settings-search
      name: '@objectivex666/dsh-settings-search'
```

包内自带 `cordis.patch.yml`，内容和上面一样，`dsh plugin add` 会自动应用。

---

## 本机 Ollama（v1.11.0）

在「设置搜索」页打开「AI 联想搜索」，把「接口类型」选成「Ollama（本机）」，要填的东西不多。

- **Base URL**。默认 `http://127.0.0.1:11434`，端口可以自己改。填根地址、`/api`、`/api/chat` 或 `/v1` 都能识别。
- **模型名**。点「获取模型」从服务返回的列表里挑，也可以手动敲完整模型名（包括标签），用 `ollama list` 能看到手头有哪些。
- **API Key**。不用填，发往 Ollama 的请求不会带上原来那套云端密钥。

保存后可以点「测试接口」看看通不通。本地模型第一次加载可能比较慢，Ollama 请求的超时时间定在 120 秒，搜索中途取消会中止这次请求。

请求由浏览器直接发出，所以「本机」说的是浏览器所在的那台机器，不是 DSH 服务器所在的机器。插件不会安装或启动 Ollama，也不会下载模型，服务和模型都要自己准备好。

连不上先看服务地址对不对。浏览器报跨域错误时，把当前 DSH 页面的确切来源（例如 `http://127.0.0.1:3080`）加进 Ollama 的 `OLLAMA_ORIGINS`，重启 Ollama 再试，别图省事写通配符来源。Ollama 不在本机时，地址仍然要求 HTTPS。

---

## 包结构

```
lib/index.js        Host half（日志文件 + `/api/settings-search-log` 路由）
lib/client.js       Browser half（搜索框 UI，__ModuleLoader__ 格式）
cordis.patch.yml    组合补丁：插入 settings-search 插件行
scripts/check.mjs   结构自检（npm test）
scripts/ai.test.mjs AI 接口与设置索引回归测试（模拟请求，不运行模型）
scripts/log.test.mjs 宿主日志文件与路由回归测试（临时目录，不写用户目录）
```

## 开发

```bash
npm test       # 结构检查及 Ollama / OpenAI / Anthropic 模拟接口回归测试
npm run compat # 针对本机已安装的 Harness 核对兼容性（服务名、Remote 描述符、slot、主题令牌、路由、DeepSeek 常量）
```

`npm run compat` 直接读本机安装包（默认自动查找，也可 `--asar <app.asar>` 或 `DSH_ASAR=<app.asar>`），
Harness 升级后先跑一遍就能知道哪些「非公开契约」变了——它检查的正是这个插件依赖、但不属于任何 npm API 的那些接口。

> 历史说明。v1.1 及更早的版本里，仓库还带一个 `dsh-settings-search.js`（会话内 `cordis_define` 动态插件源）。它和正式包长期分头维护，两边越改越不像，v1.4.1 已经删掉。想参考动态插件的写法可以翻 git 历史，tag `v1.4.0` 里还在。

## 反馈与贡献

用着不对劲、想到什么功能，或者只是没搞明白怎么用，都可以开 [GitHub Issues](https://github.com/objectivex666/dsh-settings-search/issues) 说。也欢迎直接提 [Pull Request](https://github.com/objectivex666/dsh-settings-search/pulls)，动手改代码之前先看一眼 [贡献指南](./CONTRIBUTING.md)，结构、代码约定、测试和发布流程都写在里面。

提 Issue 时把这些写全，定位和复现都会快很多。

- **问题描述**。你期望发生什么，实际发生了什么。
- **复现步骤**。一步步写清楚怎么做，包括输入的关键词和当时所在的设置页。
- **日志**。在「设置搜索」页的「日志」区块里点「导出日志」，把最近的搜索与运行日志贴上来，API Key 不会被记录，可以放心发，控制台里的报错也一并附上更好。
- **环境信息**。DSH 版本、Node.js 版本、插件版本（「设置搜索」页能看到）、操作系统和浏览器。
- **截图或录屏**。跟界面表现有关的问题，截图比文字描述清楚。

## 更新日志与发布

每次版本更新要同时更新 GitHub Release 和 git tag，正文双语，写清「新功能」与「修复」。

- 更新 [CHANGELOG.md](./CHANGELOG.md)（中文）和 [CHANGELOG.en.md](./CHANGELOG.en.md)（英文），两边各要有「新功能」和「修复」两节，英文对应 Features 与 Fixes。
- 把 `package.json` 的 `version` 和 `lib/client.js` 里的 `PKG_VERSION` 一起改掉（`npm test` 会校验两者一致），功能列表旁边新加的版本标注也顺手补上，然后按 `vX.Y.Z` 打 tag 并推送。GitHub Actions 会同时发 npm（`npm-publish.yml`）并创建双语 GitHub Release（`release.yml`）。
- 本地预览 release 正文用 `node scripts/release.mjs --version <ver>`
- 打 tag 并发布用 `node scripts/release.mjs --version <ver> --publish`（需要装好 `gh` CLI 并已登录）

> 不带 `--publish` 时，脚本只校验并打印 release 正文，不会创建 tag、推送或发布。
