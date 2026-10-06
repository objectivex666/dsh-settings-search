# 贡献指南

> English: [CONTRIBUTING.en.md](./CONTRIBUTING.en.md)

感谢你愿意改进 `@objectivex666/dsh-settings-search`。本文件说明这个仓库的结构、约定与发布流程；提交 PR 前请先通读 `npm test` 那一节。

## 项目结构

| 路径 | 内容 |
| --- | --- |
| `lib/index.js` | **宿主半边**：日志文件（每天一个、文件名带日期、单文件与目录各 100 MB 上限）与 `GET/POST /api/settings-search-log` 路由 |
| `lib/client.js` | **浏览器半边**：设置面板搜索 UI、设置索引、AI 联想、模型配置导入、日志记录与查看；以 `window.__ModuleLoader__.load({ id, factory })` 形式交付 |
| `cordis.patch.yml` | 组合补丁：把本插件作为一行插入 profile |
| `scripts/check.mjs` | 结构自检（宿主导出、manifest 接线、客户端交付形态、版本号、主题令牌白名单） |
| `scripts/ai.test.mjs` | 浏览器半边回归测试（沙箱内模拟 `window` / `fetch`） |
| `scripts/log.test.mjs` | 宿主半边日志文件与路由回归测试（真实临时目录） |
| `scripts/release.mjs` | 发布助手：校验版本、生成双语 Release 正文、打 tag |
| `README.md` / `README.en.md`、`CHANGELOG.md` / `CHANGELOG.en.md` | 文档一律**中英双语成对维护** |

## 开发环境

- Node.js ≥ 18（CI 使用 22）。项目**零运行时依赖，也没有构建步骤**，因此不需要 `npm install`。
- 本地调试装载：`dsh plugin --profile <profile> add <本仓库路径>`。
  `desktop` profile 由桌面端管理、无法用 CLI 操作，请在该应用的插件管理页里安装本地路径。
- **改完代码要重启 DSH 才能生效**：本插件同时有宿主半边与客户端 bundle，默认组合未开启 HMR，两者都在进程/页面启动时加载。

## 运行测试

```bash
npm test                                  # 结构自检 + 全部回归测试（当前 63 例）
node scripts/check.mjs                    # 只跑结构自检
node --test scripts/ai.test.mjs           # 只跑浏览器半边
node --test scripts/log.test.mjs          # 只跑宿主半边
```

PR 必须让 `npm test` 全绿。修 Bug 请补一个能复现该 Bug 的用例；加功能请覆盖成功与失败两条路径。

## 代码约定

- 纯 ESM，2 空格缩进、单引号、不写分号（与现有代码保持一致）；有意义的导出与内部函数写 JSDoc。
- **同时兼容 DSH 0.2 正式版与更早版本**：客户端优先使用 `remote.*` 命名空间，缺失时再回退旧接口（例如 `connection.api`）；不要假定某一代接口一定存在。
- 客户端 bundle 必须保持 `window.__ModuleLoader__.load({ id: 包名, factory })` 形态，导出 `apply` / `inject`，不要在工厂之外产生副作用。
- `lib/client.js` 里的 `PKG_VERSION` 必须与 `package.json` 的 `version` 完全一致（`scripts/check.mjs` 会拦）。
- 样式只能使用 DSH 主题表里**确实存在**的 `--dsw-*` 令牌；`scripts/check.mjs` 维护着一份已核对的令牌白名单，新增令牌前请先在正式版主题表里确认。
- **绝不读取、记录或导出用户的 API Key、账号令牌等凭据**；日志、错误信息与导出文本都不能包含密钥。插件只使用用户显式填写在面板里的 API Key。
- 目前零运行时依赖。新增依赖请在 PR 中说明理由与体积影响。
- 日志写入必须走宿主半边已有的通道与限额策略（按天、单文件与目录上限、只清理本插件自己的文件）。

## 提交与 PR

1. 从 `main` 切出分支，保持改动聚焦。
2. 跑 `npm test`，并在真实 DSH 里手动验证受影响的面板行为。
3. Commit 风格（参考 `git log`）：`feat:`、`fix:`、`fix(ci):`、`docs:`、`chore:`、`refactor:`，正文说明动机而非仅罗列改动。
4. PR 描述请包含：改了什么、为什么、如何验证（DSH 版本、复现步骤、日志片段），UI 改动请附截图。
   手工验证用的截图请命名为 `tmp-*.png`——该模式已在 `.gitignore` 中忽略，不会误提交。
5. 涉及发布流程（版本号、CHANGELOG、workflow）的改动，请在描述里注明对应的 release 预览结果。

## 发布流程（维护者）

每次发版需同时更新四个地方，缺一 `scripts/release.mjs` 或 CI 就会拦下：

1. `package.json` 的 `version`；
2. `lib/client.js` 的 `PKG_VERSION`（必须与上面一致）；
3. `CHANGELOG.md` 新增 `## vX.Y.Z` 段，含「新功能 / 修复」；
4. `CHANGELOG.en.md` 同版本段落，含 `Features / Fixes`。

```bash
node scripts/release.mjs --version X.Y.Z            # 校验 + 预览双语 Release 正文（推荐先看一遍）
git tag vX.Y.Z && git push origin vX.Y.Z            # 推送标签：CI 发布 npm 并创建 GitHub Release
```

- 版本号必须是相对 **npm 上最新版本**的严格递增（`patch+1` / `minor+1.0` / `major+1.0.0`），CI 有硬校验；已发布过的版本会被跳过而不是重发。
- `node scripts/release.mjs --version X.Y.Z --publish` 是本地兜底：打 tag、推送并创建 Release，需要 `gh` 已登录。注意推送 tag 后 CI 也会尝试创建同名 Release，二者只需其一，重复创建会失败。
- 发布前 CI 会先跑 `npm test`，因此主干任何时候都必须保持全绿。

## 反馈问题

Bug、功能建议与使用疑问都欢迎走 [GitHub Issues](https://github.com/objectivex666/dsh-settings-search/issues)。为便于复现，请尽量附上：期望行为与实际行为、复现步骤、导出的插件日志（不记录 API Key，可放心粘贴）、DSH 与插件版本、Node 版本、操作系统/浏览器，以及必要的截图或录屏。

## 许可

本项目以 GPL-3.0 授权。提交贡献即表示你同意以同一许可发布这些代码。
