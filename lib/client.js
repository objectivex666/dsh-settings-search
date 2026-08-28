/**
 * dsh-settings-search — browser half.
 *
 * Registered as a DSH client module: the package's `dsh.client` declaration
 * makes the web app load this bundle (`/plugins/@objectivex666/dsh-settings-search/client.js`),
 * where `window.__ModuleLoader__.load({ id, factory })` registers the code
 * and the client kernel adopts the exported `{ apply, inject }` as the
 * plugin's browser half.
 *
 * Behavior:
 * - embeds a live search box at the top of the settings panel's left
 *   navigation (`settings.header`, priority -1);
 * - indexes every settings PAGE (`settings.section`);
 * - deep-indexes specific OPTIONS inside pages from machine-readable inner
 *   slots (`settings.plugins.tab`, `web-ui.plugin.item`,
 *   `settings.general.item`) — occupants that draw their own labels are read
 *   back from the rendered DOM via their `[data-slot]` anchors;
 * - results show a breadcrumb path (页面 › 选项);
 * - selecting a result really navigates: clicks the matching left-nav button
 *   (then the matching tab button), flashes the target row, and falls back to
 *   a breadcrumb hint when no DOM target exists.
 */
window.__ModuleLoader__.load({
  id: '@objectivex666/dsh-settings-search',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const NS = 'settings-search-v5'
    /** Single source of truth is package.json — scripts/check.mjs asserts this matches. */
    const PKG_VERSION = '1.7.1'
    const NPM_NAME = '@objectivex666/dsh-settings-search'
    const zh = {
      title: '设置',
      placeholder: '搜索设置…',
      empty: '没有匹配的设置',
      pages: '设置页',
      options: '页内选项',
      guess: '猜你想找',
      page: '页面',
      option: '选项',
      jumpFail: '未能自动跳转，请手动打开：{path}',
      updn: '设置搜索',
      updDesc: '设置面板顶部搜索框由本插件提供。在此检查插件的版本与更新。',
      updCurrent: '当前版本',
      updLatestKnown: 'npm 最新版',
      updCheck: '检查更新',
      updChecking: '正在检查…',
      updNewest: '已是最新版本 ✓',
      updFound: '发现新版本 {ver}，可执行以下命令更新后重启 DSH：',
      updErr: '检查失败（网络或注册表不可达），请稍后重试。',
      updCopy: '复制命令',
      updCopied: '已复制 ✓',
      updCopyFail: '复制失败，请长按上方命令手动复制。',
      updCLI: 'DSH CLI',
      updNpx: 'npx',
      updRelease: '查看 release notes',
      updReleaseNotes: '查看更新说明',
      updFetchingNotes: '正在获取…',
      updRestart: '更新完成后重启 DSH，新版本才会生效。',
      aiSearch: 'AI 联想搜索',
      aiDesc: '没有直接匹配时，用你配置的模型（OpenAI 兼容或 Anthropic）理解目标并推荐设置项。',
      aiPrivacy: 'AI 请求会发送到你配置的模型服务；API Key 仅保存在本机浏览器。',
      aiOn: '已开启',
      aiOff: '已关闭',
      aiThinking: '正在用 AI 理解搜索意图…',
      aiUnavailable: 'AI 联想暂不可用',
      aiNeedConfig: '请先在「设置搜索」页配置 Base URL、模型名与 API Key。',
      aiProvider: '接口类型',
      aiOpenAI: 'OpenAI 兼容',
      aiAnthropic: 'Anthropic',
      aiBaseUrl: 'Base URL',
      aiModel: '模型名',
      aiApiKey: 'API Key',
      aiConfigSave: '保存配置',
      aiConfigSaved: '已保存 ✓',
      logTitle: '日志',
      logDesc: '记录插件运行、搜索与 AI 请求的关键动作，便于排查问题。',
      logEmpty: '暂无日志',
      logExport: '导出日志',
      logCopy: '复制日志',
      logCopied: '已复制 ✓',
      logCopyFail: '复制失败，请稍后重试。',
      logClear: '清空日志',
      logCleared: '已清空',
      logExportFail: '导出失败，请重试。',
    }
    const en = {
      title: 'Settings',
      placeholder: 'Search settings…',
      empty: 'No matching settings',
      pages: 'Settings pages',
      options: 'In-page options',
      guess: 'You may want',
      page: 'Page',
      option: 'Option',
      jumpFail: 'Could not navigate automatically — open it here: {path}',
      updn: 'Settings Search',
      updDesc: "The search box atop the settings panel comes from this plugin. Check its version and updates here.",
      updCurrent: 'Current version',
      updLatestKnown: 'npm latest',
      updCheck: 'Check for updates',
      updChecking: 'Checking…',
      updNewest: 'You are on the latest version ✓',
      updFound: 'Version {ver} available. Run the command below, then restart DSH:',
      updErr: 'Check failed (network or registry unreachable). Try again later.',
      updCopy: 'Copy command',
      updCopied: 'Copied ✓',
      updCopyFail: 'Copy failed — please long-press the command above.',
      updCLI: 'DSH CLI',
      updNpx: 'npx',
      updRelease: 'View release notes',
      updReleaseNotes: 'View changelog',
      updFetchingNotes: 'Fetching…',
      updRestart: 'Restart DSH after updating for the new version to take effect.',
      aiSearch: 'AI-assisted search',
      aiDesc: 'When no direct match exists, your own model (OpenAI-compatible or Anthropic) understands your goal and suggests settings.',
      aiPrivacy: 'AI requests are sent to the model service you configure; the API key stays only in your browser.',
      aiOn: 'On',
      aiOff: 'Off',
      aiThinking: 'Understanding your intent with AI…',
      aiUnavailable: 'AI suggestions are unavailable',
      aiNeedConfig: 'Configure Base URL, model, and API key in the Settings Search panel first.',
      aiProvider: 'API type',
      aiOpenAI: 'OpenAI-compatible',
      aiAnthropic: 'Anthropic',
      aiBaseUrl: 'Base URL',
      aiModel: 'Model',
      aiApiKey: 'API Key',
      aiConfigSave: 'Save config',
      aiConfigSaved: 'Saved ✓',
      logTitle: 'Logs',
      logDesc: 'Logs key plugin actions, searches, and AI requests to help troubleshoot.',
      logEmpty: 'No logs yet',
      logExport: 'Export logs',
      logCopy: 'Copy logs',
      logCopied: 'Copied ✓',
      logCopyFail: 'Copy failed. Please try again.',
      logClear: 'Clear logs',
      logCleared: 'Cleared',
      logExportFail: 'Export failed. Please try again.',
    }

    /** Inner-row slots that represent specific options inside one page. */
    const DEEP_SLOTS = [
      { slot: 'settings.plugins.tab', parent: 'plugins' },
      { slot: 'web-ui.plugin.item', parent: 'web-ui-plugins' },
      { slot: 'settings.general.item', parent: 'general' },
    ]

    /**
     * Compact zh→pinyin table (tone-less) for association search. Covers
     * characters common in settings UI labels; anything outside the table
     * simply falls back to plain substring matching. Entries: 字pinyin.
     */
    const PINYIN_TABLE = `
      设she 置zhi 通tong 用yong 插cha 件jian 搜sou 索suo 外wai 观guan 语yu 言yan
      声sheng 音yin 知zhi 账zhang 户hu 安an 全quan 网wang 络luo 存cun 储chu 关guan
      于yu 主zhu 题ti 字zi 体ti 显xian 示shi 隐yin 私si 帮bang 助zhu 反fan 馈kui
      更geng 新xin 版ban 本ben 深shen 度du 思si 考kao 模mo 式shi 对dui 话hua 上shang
      下xia 文wen 记ji 忆yi 提ti 词ci 快kuai 捷jie 键jian 界jie 面mian 颜yan 色se
      背bei 景jing 号hao 密mi 数shu 据ju 同tong 步bu 备bei 份fen 导dao 出chu 入ru
      重chong 清qing 除chu 登deng 录lu 销xiao 码ma 邮you 箱xiang 手shou 机ji 绑bang
      定ding 验yan 证zheng 会hui 员yuan 订ding 阅yue 支zhi 付fu 单dan 发fa 票piao
      应ying 权quan 限xian 推tui 荐jian 个ge 性xing 化hua 高gao 级ji 基ji 选xuan
      项xiang 开kai 启qi 禁jin 自zi 动dong 默mo 认ren 义yi 夹jia 径jing 载zai 传chuan
      享xiang 制zhi 粘nian 贴tie 剪jian 切qie 撤che 复fu 保bao 打da 加jia 编bian 辑ji
      查cha 看kan 排pai 序xu 筛shai 刷shua 速su 质zhi 量liang 大da 小xiao 位wei 时shi
      间jian 日ri 期qi 区qu 格ge 符fu 换huan 行hang 缩suo 进jin 空kong 电dian 池chi
      亮liang 滚gun 桌zhuo 免mian 扰rao 屏ping 幕mu 源yuan 节jie 眠mian 器qi 目mu
      标biao 签qian 窗chuang 口kou 工gong 具ju 栏lan 菜cai 群qun 频pin 道dao 乐yue
      图tu 片pian 相xiang 册ce 拍pai 照zhao 头tou 麦mai 克ke 风feng 蓝lan 牙ya 连lian
      接jie 印yin 扫sao 描miao 感gan 智zhi 能neng 家jia 居ju 灯deng 光guang 温wen
      湿shi 门men 锁suo 帘lian 场chang 情qing 人ren 朋peng 友you 客ke 厅ting 房fang
      厨chu 卫wei 生sheng 书shu 阳yang 台tai 车che 库ku 园yuan 院yuan 坪ping 树shu
      木mu 草cao 增zeng 删shan 改gai 移yi 停ting 运yun 行xing 测ce 境jing 渠qu 官guan
      方fang 正zheng 内nei 公gong 有you 效xiao 失shi 败bai 成cheng 功gong 完wan 毕bi
      中zhong 英ying 韩han 法fa 德de 西xi 俄e 翻fan 译yi 简jian 繁fan 历li 史shi 聊liao
      天tian 消xiao 息xi 醒xing 静jing 震zhen 红hong 点dian 角jiao 未wei 读du 部bu
      为wei 已yi 好 hao 坏huai 多duo 少shao
      太tai 刺ci 眼yan 夜ye 暗an 护hu 不bu 调tiao 吵chao 没mei 勿wu 想xiang 被bei 忘wang
      资zi 料liao 解jie 垃la 圾ji 占zhan 缓huan 卡ka 顿dun 慢man 断duan 代dai 理li 别bie
      闭bi 省sheng 耗hao 耐nai 注zhu 退tui 款kuan 到dao 取qu 回hui 送song 按an 短duan
      长chang 收shou 我wo 了le 足zu 烦fan 像xiang 住zhu
    `
    const PINYIN = new Map(
      PINYIN_TABLE.split(/\s+/).filter(Boolean).map((pair) => [pair[0], pair.slice(1)])
    )
    const CJK_RE = /[\u4e00-\u9fff]/

    /**
     * Transliterate a label into full-pinyin and initial-letter keys for
     * association search. Returns null when any CJK character is outside
     * the built-in table (then only substring matching applies).
     */
    const pinyinKeys = (text) => {
      let full = ''
      let initials = ''
      for (const ch of text) {
        if (CJK_RE.test(ch)) {
          const py = PINYIN.get(ch)
          if (py === undefined) return null
          full += py
          initials += py[0]
        } else if (/[a-zA-Z0-9]/.test(ch)) {
          const lower = ch.toLowerCase()
          full += lower
          initials += lower
        }
      }
      return full === '' ? null : { full, initials }
    }

    /** Match one query token: raw substring, full pinyin, or initial letters. */
    const tokenMatch = (haystackLower, keys, token) => {
      if (haystackLower.includes(token)) return 'text'
      if (keys !== null) {
        if (keys.full.includes(token)) return 'pinyin'
        if (keys.initials.startsWith(token)) return 'initials'
      }
      return null
    }

    /** Character count of the label consumed by a full-pinyin prefix. */
    const pinyinPrefixChars = (label, pinyinLength) => {
      let consumed = 0
      let acc = 0
      for (const ch of label) {
        const py = CJK_RE.test(ch) ? PINYIN.get(ch) : (/[a-zA-Z0-9]/.test(ch) ? ch.toLowerCase() : '')
        if (py === undefined || py === '') continue
        acc += py.length
        consumed += 1
        if (acc >= pinyinLength) break
      }
      return consumed
    }

    /**
     * Intent table for "describe the goal" search: users who know what they
     * want to change but not which option does it. Format: 描述>联想词,逗号分隔.
     * A query token matching a phrase (text or pinyin) additionally matches
     * every listed keyword; expanded-only hits surface in the guess group.
     */
    const INTENT_TABLE = `
      太亮>深色,主题,亮度,护眼 太暗>亮度,主题,显示 刺眼>深色,主题,亮度 夜间>深色,主题,护眼
      护眼>深色,主题,亮度 看不清>字体,大小,缩放 字太小>字体,大小,缩放 字太大>字体,大小
      调字体>字体,大小 太吵>声音,提示音,静音,音量 没声音>声音,音量,提示音 静音>声音,提示音,音量
      声音太>声音,音量,提示音 提示音>声音,通知 免打扰>通知,免打扰,提醒 勿扰>通知,免打扰
      不想被打扰>通知,免打扰,提醒 提醒>通知,消息 忘记密码>密码,安全,验证,账户 改密码>密码,安全,账户
      密码忘了>密码,安全,验证 换头像>头像,账户,资料 换手机号>手机,绑定,账户 换邮箱>邮箱,绑定,账户
      解绑>绑定,账户 清垃圾>缓存,清除,存储 占空间>缓存,存储,清除 空间不足>存储,缓存,清除
      太卡>缓存,速度,网络 卡顿>缓存,速度 加载慢>网络,速度 太慢>速度,网络
      断网>网络,连接 连不上>网络,连接,代理 换语言>语言 英文界面>语言,英文
      中文界面>语言,中文 切换语言>语言 换设备>同步,备份,账户 新手机>同步,备份,账户
      备份数据>备份,导出,数据 导出聊天>聊天,导出,备份,历史 聊天记录>聊天,历史,备份 不想被推荐>推荐,个性化,隐私
      推荐太烦>推荐,个性化 隐私保护>隐私,安全 别人看到>隐私,安全 自动更新>更新,自动
      关闭更新>更新,自动 省电>电池,节能,省电 耗电>电池,节能 电池不耐用>电池,节能
      注销账号>注销,账户,删除 删除账号>注销,删除,账户 退出登录>登录,注销,账户 退款>支付,退款
      会员到期>会员,订阅,支付 取消订阅>订阅,会员,支付 回车发送>发送,回车,enter,输入,快捷键 按回车>回车,enter,发送,输入
      打字>输入,回车,发送 换行>换行,输入 没有记忆>记忆,上下文,对话 记不住>记忆,上下文
      上下文太短>上下文,记忆,长度 消息不提醒>通知,消息,提醒,声音 收不到通知>通知,提醒,消息 看不到消息>消息,通知,提醒
      主题>外观,皮肤,颜色,深色 换肤>皮肤,外观 颜色>皮肤,外观,主题
      看不懂>语言,中文,英文 翻译>语言,中文,英文 乱改文件>权限,确认 权限太松>权限,确认
      发图片>视觉,识图,自动,图片 看图>视觉,识图,图片 聊天记录>归档,会话,历史,聊天 删会话>会话,删除,归档
    `
    const INTENTS = INTENT_TABLE.split(/\s+/).filter(Boolean).map((entry) => {
      const at = entry.indexOf('>')
      const phrase = entry.slice(0, at)
      return { phrase, keywords: entry.slice(at + 1).split(','), keys: pinyinKeys(phrase) }
    })

    /** Keywords a query token should additionally search after an intent hit. */
    const intentKeywords = (tok) => {
      const hits = []
      for (const intent of INTENTS) {
        const phraseHit = intent.phrase.includes(tok) || tok.includes(intent.phrase) ||
          (intent.keys !== null &&
            (intent.keys.full.startsWith(tok) || intent.keys.initials === tok))
        if (phraseHit) {
          for (const kw of intent.keywords) {
            if (!hits.includes(kw)) hits.push(kw)
          }
        }
      }
      return hits
    }

    const AI_TOGGLE_EVENT = 'dsh-settings-search:ai-toggle'
    const AI_CONFIG_EVENT = 'dsh-settings-search:ai-config'
    /** Simple in-memory log ring used by the settings panel's export/log UI. */
    const LOG_EVENT = 'dsh-settings-search:log'
    const LOG_MAX = 500
    const LOGS = []
    const log = (level, msg, meta) => {
      if (typeof window === 'undefined') return
      LOGS.push({ time: new Date().toISOString(), level, msg, meta })
      if (LOGS.length > LOG_MAX) LOGS.splice(0, LOGS.length - LOG_MAX)
      try { window.dispatchEvent(new CustomEvent(LOG_EVENT, { detail: LOGS.length })) } catch {}
    }
    const formatLogs = (logs) => {
      const lines = [
        'dsh-settings-search log',
        `version: ${PKG_VERSION}`,
        `exported: ${new Date().toISOString()}`,
        `count: ${logs.length}`,
        '',
      ]
      for (const entry of logs) {
        lines.push(`[${entry.time}] [${entry.level}] ${entry.msg}${entry.meta ? ' ' + JSON.stringify(entry.meta) : ''}`)
      }
      return lines.join('\n')
    }
    const AI_CACHE = new Map()
    const AI_STORAGE_KEY = 'dsh-settings-search:ai-enabled'
    const AI_PROVIDER_KEY = 'dsh-settings-search:ai-provider'
    const AI_BASE_URL_KEY = 'dsh-settings-search:ai-base-url'
    const AI_MODEL_KEY = 'dsh-settings-search:ai-model'
    const AI_API_KEY_KEY = 'dsh-settings-search:ai-api-key'
    const aiSearchEnabled = () => {
      if (typeof localStorage === 'undefined') return false
      return localStorage.getItem(AI_STORAGE_KEY) === '1'
    }
    const setAiSearchEnabled = (enabled) => {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(AI_STORAGE_KEY, enabled ? '1' : '0')
      window.dispatchEvent(new CustomEvent(AI_TOGGLE_EVENT, { detail: enabled }))
    }
    const aiConfig = () => {
      if (typeof localStorage === 'undefined') return { provider: 'openai', baseUrl: '', model: '', apiKey: '' }
      const providerRaw = (localStorage.getItem(AI_PROVIDER_KEY) ?? 'openai').trim()
      return {
        provider: providerRaw === 'anthropic' ? 'anthropic' : 'openai',
        baseUrl: (localStorage.getItem(AI_BASE_URL_KEY) ?? '').trim(),
        model: (localStorage.getItem(AI_MODEL_KEY) ?? '').trim(),
        apiKey: (localStorage.getItem(AI_API_KEY_KEY) ?? '').trim(),
      }
    }
    const setAiConfig = (cfg) => {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(AI_PROVIDER_KEY, cfg.provider === 'anthropic' ? 'anthropic' : 'openai')
      localStorage.setItem(AI_BASE_URL_KEY, cfg.baseUrl ?? '')
      localStorage.setItem(AI_MODEL_KEY, cfg.model ?? '')
      localStorage.setItem(AI_API_KEY_KEY, cfg.apiKey ?? '')
      window.dispatchEvent(new CustomEvent(AI_CONFIG_EVENT))
    }
    const extractAiKeywords = (raw) => {
      const text = String(raw ?? '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start === -1 || end <= start) return []
      const parsed = JSON.parse(text.slice(start, end + 1))
      const values = Array.isArray(parsed) ? parsed : parsed?.keywords
      if (!Array.isArray(values)) return []
      return [...new Set(values
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim().slice(0, 24))
        .filter(Boolean))]
        .slice(0, 6)
    }
    const AI_PROMPT = '你是设置搜索助手。只输出 JSON 对象，格式为 {"keywords":["..."]}。keywords 最多 6 个，每个最多 12 个字符，只能从用户提供的设置索引中选择或提取核心词，不要解释。'
    const chatCompletionsUrl = (baseUrl) => {
      const trimmed = String(baseUrl).trim().replace(/\/+$/, '')
      return /\/chat\/completions$/i.test(trimmed) ? trimmed : `${trimmed}/chat/completions`
    }
    const anthropicMessagesUrl = (baseUrl) => {
      const trimmed = String(baseUrl).trim().replace(/\/+$/, '')
      if (/\/v1\/messages$/i.test(trimmed)) return trimmed
      return /\/v1$/i.test(trimmed) ? `${trimmed}/messages` : `${trimmed}/v1/messages`
    }
    const requestUserAi = async (query, labels, signal) => {
      const { provider, baseUrl, model, apiKey } = aiConfig()
      if (!baseUrl || !model || !apiKey) return []
      const isAnthropic = provider === 'anthropic'
      const startedAt = Date.now()
      log('info', 'AI 请求', { provider, model, query: String(query).slice(0, 50) })
      let timer
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error('AI request timed out')
          error.name = 'AI_TIMEOUT'
          reject(error)
        }, 12000)
      })
      const work = (async () => {
        const userContent = `用户目标：${query}\n设置索引：\n${labels}`
        const headers = {
          'content-type': 'application/json',
          ...(isAnthropic
            ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
            : { authorization: `Bearer ${apiKey}` }),
        }
        const body = isAnthropic
          ? {
              model,
              max_tokens: 1024,
              system: AI_PROMPT,
              messages: [{ role: 'user', content: userContent }],
              temperature: 0,
            }
          : {
              model,
              messages: [
                { role: 'system', content: AI_PROMPT },
                { role: 'user', content: userContent },
              ],
              temperature: 0,
            }
        const response = await fetch(isAnthropic ? anthropicMessagesUrl(baseUrl) : chatCompletionsUrl(baseUrl), {
          method: 'POST',
          headers,
          signal,
          body: JSON.stringify(body),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        const content = isAnthropic
          ? (data?.content ?? []).filter((block) => block?.type === 'text').map((block) => block.text).join('')
          : data?.choices?.[0]?.message?.content ?? ''
        return extractAiKeywords(content)
      })()
      try {
        const keywords = await Promise.race([work, deadline])
        log('info', 'AI 结果', { count: keywords.length, duration: Date.now() - startedAt })
        return keywords
      } catch (error) {
        if (error.name === 'AbortError') {
          log('warn', 'AI 请求取消', { duration: Date.now() - startedAt })
          throw error
        }
        log('error', 'AI 请求失败', { message: String(error?.message ?? error).slice(0, 160), duration: Date.now() - startedAt })
        throw error
      } finally {
        clearTimeout(timer)
      }
    }
    const requestAiKeywords = async (query, labels, signal) => {
      const cacheKey = query.toLowerCase()
      if (AI_CACHE.has(cacheKey)) return AI_CACHE.get(cacheKey)
      const keywords = await requestUserAi(query, labels, signal)
      if (keywords.length > 0) AI_CACHE.set(cacheKey, keywords)
      return keywords
    }

    const CSS = `
      .sss-wrap { position: relative; display: flex; flex-direction: column; gap: 8px; }
      .sss-title { font-size: 16px; font-weight: 600; line-height: 24px; color: var(--dsw-alias-label-primary); }
      .sss-box { display: flex; align-items: center; gap: 6px; width: 100%; box-sizing: border-box; height: 32px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }
      .sss-icon { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; color: var(--dsw-alias-label-tertiary); }
      .sss-input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); }
      .sss-input::placeholder { color: var(--dsw-alias-label-dimmed); }
      .sss-clear { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0; border: none; border-radius: 4px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1; cursor: pointer; }
      .sss-clear:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
      .sss-pop { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 20; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; box-shadow: var(--dsw-shadow-lv3); padding: 6px; max-height: 320px; overflow: auto; }
      .sss-groups { display: flex; flex-direction: column; gap: 8px; }
      .sss-group-title { font-size: 11px; color: var(--dsw-alias-label-secondary); letter-spacing: .05em; padding: 2px 6px; }
      .sss-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
      .sss-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 7px; cursor: pointer; }
      .sss-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .sss-item.is-active { background: var(--dsw-alias-interactive-bg-hover); }
      .sss-item-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .sss-item-label { color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sss-item-label mark { background: transparent; color: inherit; font-weight: 600; }
      .sss-item-path { font-size: 10px; line-height: 14px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sss-item-kind { flex-shrink: 0; font-size: 10px; color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 1px 5px; }
      .sss-item-kind.sss-via { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
      .sss-ai-note { margin: 0; padding: 6px 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
      .sss-empty { margin: 0; padding: 10px 8px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
      .sss-guide { padding: 7px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; }
      @keyframes sssFlashBg { 0% { background-color: var(--dsw-alias-interactive-bg-hover); } 100% { background-color: transparent; } }
      .sss-flash { animation: sssFlashBg 1.8s ease-out; border-radius: 8px; }
      .sss-vr { list-style: none; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-3); border-radius: 12px; max-width: 780px; width: 100%; box-sizing: border-box; transition: border-color .16s, background .16s; }
      .sss-vr:hover { border-color: var(--dsw-alias-label-dimmed); }
      .sss-vr-open { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-label-dimmed); }
      .sss-vr-header { appearance: none; width: 100%; font: inherit; color: inherit; text-align: left; cursor: pointer; background: 0 0; border: 0; border-radius: 12px; align-items: center; gap: 12px; padding: 14px 16px; display: flex; }
      .sss-vr-header:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
      .sss-vr-headText { flex-direction: column; flex: 1; gap: 4px; min-width: 0; display: flex; }
      .sss-vr-name { color: var(--dsw-alias-label-primary); font-size: 15px; font-weight: 600; line-height: 1.4; }
      .sss-vr-desc { color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 1.5; }
      .sss-vr-chevron { color: var(--dsw-alias-label-tertiary); flex: none; transition: transform .16s; font-size: 12px; line-height: 1; }
      .sss-vr-chevron-open { transform: rotate(180deg); }
      .sss-vr-body { border-top: 1px solid var(--dsw-alias-border-l2); margin: 0 16px; padding-bottom: 8px; }
      .sss-vr-field { content-visibility: auto; contain-intrinsic-size: auto 96px; flex-direction: column; gap: 6px; padding: 12px 0; display: flex; }
      .sss-vr-field + .sss-vr-field { border-top: 1px solid var(--dsw-alias-border-l2); }
      .sss-vr-form { gap: 6px; }
      .sss-vr-field-head { align-items: center; gap: 8px; display: flex; }
      .sss-vr-label { min-width: 0; color: var(--dsw-alias-label-primary); flex: 1; font-size: 13px; font-weight: 500; line-height: 1.5; }
      .sss-vr-hint { color: var(--dsw-alias-label-tertiary); margin: 0; font-size: 12px; line-height: 1.5; }
      .sss-vr-value { color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; line-height: 1.5; }
      .sss-vr-input { border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-3); min-height: 34px; font: inherit; color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 6px 12px; font-size: 13px; line-height: 1.5; width: 100%; box-sizing: border-box; }
      .sss-vr-input:focus-visible { border-color: var(--dsw-alias-brand-primary); outline: none; }
      .sss-vr-input::placeholder { color: var(--dsw-alias-label-dimmed); }
      .sss-vr-select { cursor: pointer; }
      .sss-vr-check { width: 16px; height: 16px; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; margin: 0; }
      .sss-vr-btn { appearance: none; font: inherit; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 5px 14px; font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-secondary); background: 0 0; }
      .sss-vr-btn:hover:not(:disabled) { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-dimmed); }
      .sss-vr-btn:disabled { opacity: .4; cursor: default; }
      .sss-vr-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .sss-vr-primary { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); border-color: transparent; }
      .sss-vr-primary:hover:not(:disabled) { color: var(--dsw-alias-bg-layer-3); border-color: transparent; }
      .sss-vr-badge { white-space: nowrap; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-secondary); border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 500; line-height: 17px; }
      .sss-vr-code { user-select: all; display: block; width: 100%; box-sizing: border-box; overflow-x: auto; white-space: pre; padding: 9px 11px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; line-height: 1.55; }
      .sss-vr-note { color: var(--dsw-alias-label-tertiary); margin: 0; font-size: 12px; line-height: 1.5; }
      .sss-vr-row { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 20px; flex-wrap: wrap; }
      .sss-vr-rowname { color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 1.5; }
      .sss-vr-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 1px; }
      .sss-vr-update { width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; background: var(--dsw-alias-bg-module-platform); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
      .sss-vr-update-title { font-size: 13px; font-weight: 650; color: var(--dsw-alias-label-primary); line-height: 1.5; }
      .sss-vr-update-command { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
      .sss-vr-update-command-label { font-size: 11px; font-weight: 500; color: var(--dsw-alias-label-tertiary); line-height: 1.4; }
      .sss-vr-update-note { margin: 0; padding: 7px 9px; border-left: 2px solid var(--dsw-alias-label-dimmed); background: var(--dsw-alias-bg-layer-3); border-radius: 0 7px 7px 0; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.55; }
      .sss-vr-update-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 1px; }
      .sss-vr-link { appearance: none; font: inherit; cursor: pointer; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; padding: 5px 14px; font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-secondary); background: 0 0; text-decoration: none; display: inline-flex; align-items: center; }
      .sss-vr-link:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-dimmed); }
      .sss-vr-notes { box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-primary); padding: 10px 12px; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 240px; overflow-y: auto; margin-top: 8px; }
    `
    let stylesInstalled = false
    function installStyles() {
      if (stylesInstalled || typeof document === 'undefined') return undefined
      stylesInstalled = true
      const tag = document.createElement('style')
      tag.dataset.plugin = '@objectivex666/dsh-settings-search'
      tag.dataset.pluginCss = '@objectivex666/dsh-settings-search/panel'
      tag.textContent = CSS
      document.head.appendChild(tag)
      return () => {
        tag.remove()
        stylesInstalled = false
      }
    }

    const callSafe = (fn) => {
      try { return fn() } catch { return undefined }
    }

    /** Resolve a registrant-provided label option (string or thunk). */
    const optionLabel = (raw) => {
      const value = typeof raw === 'function' ? callSafe(raw) : raw
      return typeof value === 'string' ? value : ''
    }

    function createModel(ctx) {
      /** id → harvested visible title, per slot. */
      const harvest = new Map()
      let harvestSeq = 0

      const entriesOf = (slot) => {
        try { return ctx.slots.entries(slot) ?? [] } catch { return [] }
      }
      const sortEntries = (list) => list.slice().sort((a, b) => ((a.options?.order ?? 0) - (b.options?.order ?? 0)))

      /** Best-effort static label from occupant options/locale namespace. */
      const staticLabel = (entry, slotConfig) => {
        const o = entry.options ?? {}
        const explicit = optionLabel(o.label)
        if (explicit !== '') return explicit
        if (typeof o.locale === 'string') {
          const t = callSafe(() => ctx.locale.bind(o.locale))
          if (typeof t === 'function') {
            for (const key of ['tab', 'title', 'card.title', 'name']) {
              const value = callSafe(() => t(key))
              if (typeof value === 'string' && value !== '' && value !== key) return value
            }
          }
        }
        void slotConfig
        return ''
      }

      /**
       * Read visible titles for self-drawing occupants out of the live DOM.
       * Two shell shapes exist for `[data-slot="<name>"]`:
       * - per-occupant anchors: one element each, count === regs → pair ids;
       * - a single WRAPPER around all rows (e.g. settings.general.item's
       *   stacked section): harvest each direct child as one row, keyed by
       *   render order ("#i") since id pairing is impossible.
       */
      const runHarvest = () => {
        let grew = false
        if (typeof document === 'undefined') return false
        let map
        for (const cfg of DEEP_SLOTS) {
          let containers = []
          try { containers = [...document.querySelectorAll(`[data-slot="${cfg.slot}"]`)] } catch { continue }
          const regs = sortEntries(entriesOf(cfg.slot))
          if (regs.length === 0) continue
          let nodes = []
          if (containers.length === 1 && containers[0].childElementCount > 0) {
            nodes = [...containers[0].children]
          } else {
            nodes = containers.filter((n) => n.childElementCount >= 0)
          }
          if (nodes.length === 0) continue
          map = harvest.get(cfg.slot)
          if (map === undefined) { map = new Map(); harvest.set(cfg.slot, map) }
          if (nodes.length !== regs.length) {
            // wrapper shape: index-keyed loose harvest of every rendered row
            nodes.forEach((node, i) => {
              const key = '#' + i
              if (map.has(key)) return
              const title = titleFromNode(node)
              if (title === '') return
              const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
              map.set(key, { title, idx: i, text }); grew = true
            })
            continue
          }
          regs.forEach((entry, i) => {
            const id = String(entry.options?.id ?? i)
            if (map.has(id)) return
            const title = titleFromNode(nodes[i])
            if (title === '') return
            const text = (nodes[i].textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
            map.set(id, { title, idx: i, text }); grew = true
          })
        }
        if (grew) harvestSeq += 1
        return grew
      }

      const titleFromNode = (node) => {
        const pick = (el) => {
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
          return text !== '' && text.length <= 60 ? text : ''
        }
        for (const sel of ['h1,h2,h3,h4,h5', '[class*="title"]', '[class*="heading"]', 'label', 'p']) {
          const hit = node.querySelector(sel)
          if (hit) { const text = pick(hit); if (text !== '') return text }
        }
        const first = node.firstElementChild
        if (first) {
          for (const child of first.children) { const text = pick(child); if (text !== '') return text }
        }
        return pick(node).split('·')[0].trim()
      }

      const readSections = () => sortEntries(entriesOf('settings.section'))
        .filter((e) => e.options?.id !== 'settings-search')
        .map((e) => ({
          kind: 'page',
          id: String(e.options?.id ?? ''),
          order: e.options?.order ?? 0,
          label: optionLabel(e.options?.label),
        }))
        .filter((e) => e.id !== '' && e.label !== '')

      const readDeep = () => {
        const sections = readSections()
        const parentLabel = (parentId) =>
          sections.find((s) => s.id === parentId)?.label ?? parentId
        const out = []
        for (const cfg of DEEP_SLOTS) {
          const mapped = harvest.get(cfg.slot)
          sortEntries(entriesOf(cfg.slot)).forEach((entry, i) => {
            const id = String(entry.options?.id ?? '')
            if (id === '') return
            // static label first, then id-paired harvest, then loose index-keyed harvest
            const hitId = mapped?.get(id)
            const hitIdx = mapped?.get('#' + i)
            const hitObj = typeof hitId === 'object' ? hitId : (typeof hitIdx === 'object' ? hitIdx : undefined)
            const label = staticLabel(entry, cfg) || hitObj?.title || ''
            if (label === '') return // unmapped, unharvested — invisible until it renders once
            const key = cfg.slot + '#' + id
            if (out.some((e) => e.key === key)) return
            out.push({
              kind: 'option',
              key,
              slot: cfg.slot,
              id,
              order: entry.options?.order ?? 0,
              label,
              hay: label + ' ' + (hitObj?.text ?? ''),
              rowIndex: hitObj?.idx ?? i,
              parentId: cfg.parent,
              parentLabel: parentLabel(cfg.parent),
            })
          })
        }
        return out.sort((a, b) => a.parentLabel !== b.parentLabel
          ? a.parentLabel.localeCompare(b.parentLabel)
          : a.order - b.order)
      }

      return { readSections, readDeep, runHarvest, bump: () => harvestSeq }
    }

    /* ---------- DOM-level navigation into the settings shell ---------- */

    const panelButtons = () => {
      if (typeof document === 'undefined') return []
      const root = document.querySelector('[role="dialog"]') ?? document.body
      return [...root.querySelectorAll('button')]
    }
    const clickNavButton = (wantText) => {
      const want = String(wantText ?? '').trim()
      if (want === '') return false
      const buttons = panelButtons()
      const textOf = (b) => (b.textContent ?? '').trim()
      const hit = buttons.find((b) => textOf(b) === want)
      if (!hit) return false
      hit.click()
      return true
    }
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    function createNavigator(ctx) {
      /** Jump to a page result; falls back to showing a manual hint. */
      const jumpToPage = async (item) => {
        const ok = await Promise.resolve(clickNavButton(item.label))
        return ok
      }
      /** Jump to an in-page option: open its page, select its tab, flash its row. */
      const jumpToOption = async (item) => {
        const opened = await Promise.resolve(clickNavButton(item.parentLabel))
        if (opened !== true) { flashOptionRow(item); return false }
        await delay(160)
        const label = item.label
        const buttons = panelButtons()
        const tab = buttons.find((b) =>
          b.getAttribute('role') === 'tab' && (b.textContent ?? '').trim() === label)
        if (tab) { tab.click(); await delay(120) }
        flashOptionRow(item)
        return opened
      }
      /** Highlight the rendered row card for one indexed option. */
      const flashOptionRow = (item) => {
        try {
          let target = null
          if (typeof item.rowIndex === 'number') {
            // wrapper shape: pick the exact rendered row by index
            const container = document.querySelector(`[data-slot="${item.slot}"]`)
            target = container?.children?.[item.rowIndex] ?? null
            if (target && !(target.textContent ?? '').includes(item.label)) {
              // index drift — fall through to textual match below
              target = null
            }
          }
          if (!target) {
            const nodes = [...document.querySelectorAll(`[data-slot="${item.slot}"]`)]
            const rows = nodes.length === 1 && nodes[0].childElementCount > 0
              ? [...nodes[0].children]
              : nodes
            target = rows.find((n) => (n.textContent ?? '').includes(item.label)) ?? null
          }
          if (!target) return
          target.scrollIntoView({ block: 'nearest' })
          target.classList.remove('sss-flash')
          void target.offsetWidth // restart animation if re-flashed
          target.classList.add('sss-flash')
          setTimeout(() => target.classList.remove('sss-flash'), 1900)
        } catch { /* visual nicety only */ }
      }
      void ctx
      return { jumpToPage, jumpToOption }
    }

    function apply(ctx) {
      log('info', '应用装载', { version: PKG_VERSION })
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'settings-search: dictionaries')
      const t = ctx.locale.bind(NS)
      ctx.effect(() => {
        const remove = installStyles()
        return () => { if (typeof remove === 'function') remove() }
      }, 'settings-search: styles')

      const model = createModel(ctx)
      const navigator = createNavigator(ctx)

      const SearchIcon = React.createElement('svg', {
        className: 'sss-icon',
        viewBox: '0 0 16.5 16.5',
        width: 16,
        height: 16,
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': 'true',
      }, [
        React.createElement('path', {
          d: 'M11.894845 6.647401C11.894845 3.725463 9.534486 1.356779 6.623219 1.35657C3.711786 1.35657 1.351635 3.725338 1.351635 6.647401C1.351843 9.569296 3.711911 11.938273 6.623219 11.938273C9.534361 11.938064 11.894637 9.569171 11.894845 6.647401ZM13.245462 6.647401C13.245254 10.317935 10.280401 13.293613 6.623219 13.293821C2.965871 13.293821 0.000204 10.31806 0 6.647401C0 2.976574 2.965746 0 6.623219 0C10.280526 0.000205 13.245462 2.9767 13.245462 6.647401Z',
          fill: 'currentColor',
        }),
        React.createElement('path', {
          d: 'M16.000417 15.041079L15.044449 16.000433L11.530434 12.473588L12.486298 11.514234L16.000417 15.041079Z',
          fill: 'currentColor',
        }),
      ])

      function SettingsHeaderSearch() {
        const [query, setQuery] = React.useState('')
        const [open, setOpen] = React.useState(false)
        const [tick, setTick] = React.useState(0)
        const [, forceTick] = React.useReducer((x) => x + 1, 0)
        void tick
        const [aiEnabled, setAiEnabled] = React.useState(aiSearchEnabled)
        const [aiKeywords, setAiKeywords] = React.useState([])
        const [aiStatus, setAiStatus] = React.useState('idle')
        const aiAbortRef = React.useRef(null)

        React.useEffect(() => {
          const watched = ['settings.section', ...DEEP_SLOTS.map((c) => c.slot)]
          const offs = [
            ...watched.map((slot) => ctx.slots.subscribe(slot, forceTick)),
            ctx.locale.subscribe(forceTick),
          ]
          // Grow the index whenever the panel body re-renders (visits new pages).
          const observer = typeof MutationObserver === 'function'
            ? new MutationObserver(() => {
                if (model.runHarvest()) setTick((x) => x + 1)
              })
            : null
          observer?.observe(document.body, { childList: true, subtree: true })
          const warm = setTimeout(() => { model.runHarvest(); setTick((x) => x + 1) }, 800)
          return () => {
            for (const off of offs) off()
            observer?.disconnect()
            clearTimeout(warm)
          }
        }, [])

        React.useEffect(() => {
          const sync = () => setAiEnabled(aiSearchEnabled())
          const onConfig = () => forceTick()
          window.addEventListener(AI_TOGGLE_EVENT, sync)
          window.addEventListener(AI_CONFIG_EVENT, onConfig)
          return () => {
            window.removeEventListener(AI_TOGGLE_EVENT, sync)
            window.removeEventListener(AI_CONFIG_EVENT, onConfig)
            aiAbortRef.current?.abort()
          }
        }, [])

        const q = query.trim().toLowerCase()
        const tokens = q.split(/\s+/).filter(Boolean)

        const sections = model.readSections()
        const deeps = q !== '' ? model.readDeep() : []
        const expandedKeywords = new Map(tokens.map((tok) => [tok, intentKeywords(tok)]))
        const directMatch = (item, haystackLower) =>
          tokens.every((tok) => tokenMatch(haystackLower, item.keys, tok) !== null)
        const kwMatch = (item, haystackLower, kw) => {
          if (/^[\x00-\x7f]+$/.test(kw)) {
            if (new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystackLower)) return true
          } else if (haystackLower.includes(kw)) return true
          if (item.keys === null) return false
          const kwKeys = pinyinKeys(kw)
          if (kwKeys === null) return false
          return item.keys.full.includes(kwKeys.full) || item.keys.initials.startsWith(kwKeys.initials)
        }
        const relatedKeyword = (item, haystackLower) => {
          if (directMatch(item, haystackLower)) return null
          for (const tok of tokens) {
            for (const kw of expandedKeywords.get(tok) ?? []) {
              if (kwMatch(item, haystackLower, kw)) return kw
            }
          }
          for (const kw of aiKeywords) {
            if (kwMatch(item, haystackLower, kw)) return `AI · ${kw}`
          }
          return null
        }
        const mappedSections = q === '' ? [] : sections.map((s) => ({
          ...s,
          keys: pinyinKeys(s.label),
          hay: `${s.label} ${s.id}`.toLowerCase(),
        }))
        const mappedOptions = q === '' ? [] : deeps.map((o) => ({
          ...o,
          keys: pinyinKeys(`${o.label} ${o.parentLabel}`),
          hay: `${o.hay} ${o.parentLabel} ${o.id} ${o.slot}`.toLowerCase(),
        }))
        const shownPages = mappedSections.filter((s) => directMatch(s, s.hay))
        const shownOptions = mappedOptions.filter((o) => directMatch(o, o.hay))
        const noLocalMatch = shownPages.length === 0 && shownOptions.length === 0 &&
          tokens.every((tok) => (expandedKeywords.get(tok) ?? []).length === 0)
        const related = [
          ...mappedSections
            .map((s) => ({ item: s, kind: 'page', via: relatedKeyword(s, s.hay) }))
            .filter((r) => r.via !== null),
          ...mappedOptions
            .map((o) => ({ item: o, kind: 'option', via: relatedKeyword(o, o.hay) }))
            .filter((r) => r.via !== null),
        ].slice(0, 8)
        const none = q !== '' && shownPages.length === 0 && shownOptions.length === 0 && related.length === 0
        const results = [...shownPages, ...shownOptions, ...related.map((r) => r.item)]

        const cfg = aiConfig()
        const aiConfigured = Boolean(cfg.baseUrl && cfg.model && cfg.apiKey)
        const aiReady = aiEnabled && aiConfigured && q.length >= 2 && noLocalMatch
        React.useEffect(() => {
          if (!aiReady) return
          setAiKeywords([])
          setAiStatus('idle')
          let alive = true
          const controller = new AbortController()
          const timer = setTimeout(() => {
            aiAbortRef.current?.abort()
            aiAbortRef.current = controller
            setAiStatus('loading')
            const labels = [...new Set([
              ...sections.map((item) => item.label),
              ...deeps.map((item) => `${item.parentLabel} ${item.label}`),
            ].map((label) => label.trim()).filter(Boolean))].slice(0, 48).join('\n')
            requestAiKeywords(q, labels, controller.signal).then((keywords) => {
              if (!alive) return
              setAiKeywords(keywords)
              setAiStatus(keywords.length > 0 ? 'ready' : 'idle')
            }).catch((error) => {
              if (!alive || error.name === 'AbortError') return
              setAiKeywords([])
              setAiStatus('error')
            }).finally(() => {
              if (aiAbortRef.current === controller) aiAbortRef.current = null
            })
          }, 700)
          return () => {
            alive = false
            clearTimeout(timer)
            controller.abort()
          }
        }, [aiReady, aiEnabled, q])

        const loggedQueryRef = React.useRef('')
        React.useEffect(() => {
          if (q === '') return
          if (loggedQueryRef.current === q) return
          loggedQueryRef.current = q
          log('info', '搜索', { query: query.slice(0, 50), pages: shownPages.length, options: shownOptions.length, related: related.length })
        }, [q, shownPages.length, shownOptions.length, related.length])

        const [hint, setHint] = React.useState(null)
        const [active, setActive] = React.useState(0)
        const popRef = React.useRef(null)
        const activeIndex = Math.min(active, Math.max(results.length - 1, 0))

        React.useEffect(() => { setActive(0) }, [query])
        React.useEffect(() => {
          const el = popRef.current?.querySelector('.sss-item.is-active')
          el?.scrollIntoView?.({ block: 'nearest' })
        }, [activeIndex, q])
        const pick = (item) => {
          setOpen(false)
          log('info', '打开设置', { kind: item.kind, id: item.id || item.key || '', label: String(item.label).slice(0, 60) })
          const jumped = item.kind === 'page'
            ? navigator.jumpToPage(item)
            : navigator.jumpToOption(item)
          Promise.resolve(jumped).then((ok) => {
            if (ok === false) setHint(item.kind === 'page' ? item.label : `${item.parentLabel} › ${item.label}`)
          })
        }

        const mark = (text) => React.createElement('mark', { className: 'sss-hit' }, text)

        /** Highlight the matched substring, or the pinyin-covered prefix. */
        const highlightLabel = (item) => {
          const label = item.label
          const lower = label.toLowerCase()
          let bestStart = -1
          let bestLen = 0
          for (const tok of tokens) {
            const at = lower.indexOf(tok)
            if (at !== -1 && (bestStart === -1 || at < bestStart)) {
              bestStart = at
              bestLen = tok.length
            }
          }
          if (bestStart !== -1) {
            return [
              label.slice(0, bestStart),
              mark(label.slice(bestStart, bestStart + bestLen)),
              label.slice(bestStart + bestLen),
            ]
          }
          const keys = item.keys
          if (keys !== null && tokens.length > 0) {
            const tok = tokens[0]
            const consumed = keys.initials.startsWith(tok)
              ? tok.length
              : keys.full.startsWith(tok) ? pinyinPrefixChars(label, tok.length) : 0
            if (consumed > 0) {
              const cut = Math.min(consumed, label.length)
              return [mark(label.slice(0, cut)), label.slice(cut)]
            }
          }
          return [label]
        }

        const kindBadge = (via, fallback) => React.createElement('span', {
          className: 'sss-item-kind' + (via ? ' sss-via' : ''),
        }, via ?? fallback)

        const renderPage = (item, flatIndex, via) => React.createElement('li', {
          key: 'page:' + item.id,
          className: 'sss-item' + (flatIndex === activeIndex ? ' is-active' : ''),
          onMouseDown: () => pick(item),
          onMouseEnter: () => setActive(flatIndex),
        }, [
          React.createElement('span', { className: 'sss-item-label' }, highlightLabel(item)),
          kindBadge(via, t('page')),
        ])
        const renderOption = (item, flatIndex, via) => React.createElement('li', {
          key: item.key,
          className: 'sss-item' + (flatIndex === activeIndex ? ' is-active' : ''),
          onMouseDown: () => pick(item),
          onMouseEnter: () => setActive(flatIndex),
        }, [
          React.createElement('span', { className: 'sss-item-col' }, [
            React.createElement('span', { className: 'sss-item-label' }, highlightLabel(item)),
            React.createElement('span', { className: 'sss-item-path' }, item.parentLabel),
          ]),
          kindBadge(via, t('option')),
        ])

        return React.createElement('div', { className: 'sss-wrap' }, [
          React.createElement('div', { className: 'sss-title' }, t('title')),
          React.createElement('div', { className: 'sss-box' }, [
            SearchIcon,
            React.createElement('input', {
              className: 'sss-input',
              value: query,
              placeholder: t('placeholder'),
              spellCheck: false,
              onKeyDown: (e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  if (results.length > 0) setActive(Math.min(activeIndex + 1, results.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive(Math.max(activeIndex - 1, 0))
                } else if (e.key === 'Enter') {
                  const item = results[activeIndex]
                  if (item) { e.preventDefault(); pick(item) }
                } else if (e.key === 'Escape') {
                  setOpen(false)
                }
              },
              onChange: (e) => { setQuery(e.target.value); setHint(null); setOpen(true) },
              onFocus: () => setOpen(true),
              onBlur: () => setOpen(false),
            }),
            query !== '' ? React.createElement('button', {
              className: 'sss-clear',
              type: 'button',
              onClick: () => { setQuery(''); setHint(null); setOpen(false) },
            }, '✕') : null,
          ]),
          open && q !== '' ? React.createElement('div', { className: 'sss-pop', ref: popRef }, [
            none
              ? (aiStatus === 'loading'
                  ? React.createElement('p', { className: 'sss-ai-note' }, t('aiThinking'))
                  : aiStatus === 'error'
                    ? React.createElement('p', { className: 'sss-ai-note' }, t('aiUnavailable'))
                    : (aiEnabled && !aiConfigured)
                      ? React.createElement('p', { className: 'sss-ai-note' }, t('aiNeedConfig'))
                      : React.createElement('p', { className: 'sss-empty' }, t('empty')))
              : React.createElement('div', { className: 'sss-groups' }, [
                  shownPages.length > 0 ? React.createElement('div', { className: 'sss-group' }, [
                    React.createElement('div', { className: 'sss-group-title' }, t('pages')),
                    React.createElement('ul', { className: 'sss-list' },
                      shownPages.map((item, i) => renderPage(item, i))),
                  ]) : null,
                  shownOptions.length > 0 ? React.createElement('div', { className: 'sss-group' }, [
                    React.createElement('div', { className: 'sss-group-title' }, t('options')),
                    React.createElement('ul', { className: 'sss-list' },
                      shownOptions.map((item, i) => renderOption(item, shownPages.length + i))),
                  ]) : null,
                  related.length > 0 ? React.createElement('div', { className: 'sss-group' }, [
                    React.createElement('div', { className: 'sss-group-title' }, t('guess')),
                    React.createElement('ul', { className: 'sss-list' },
                      related.map((r, i) => r.kind === 'page'
                        ? renderPage(r.item, shownPages.length + shownOptions.length + i, r.via)
                        : renderOption(r.item, shownPages.length + shownOptions.length + i, r.via))),
                  ]) : null,
                ]),
          ]) : null,
          hint !== null
            ? React.createElement('div', { className: 'sss-guide' }, t('jumpFail').replace('{path}', hint))
            : null,
        ])
      }

      const compareSemver = (a, b) => {
        const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0)
        const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0)
        for (let i = 0; i < 3; i += 1) {
          if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
        }
        return 0
      }

      function UpdatePanel() {
        const [open, setOpen] = React.useState(true)
        const [state, setState] = React.useState('idle') // idle | loading | newest | outdated | error
        const [latest, setLatest] = React.useState('')
        const [copied, setCopied] = React.useState(false)
        const [copyFailed, setCopyFailed] = React.useState(false)
        const [notesState, setNotesState] = React.useState('idle') // idle | loading | loaded
        const [notesBody, setNotesBody] = React.useState('')
        const [aiOn, setAiOn] = React.useState(aiSearchEnabled)
        const cfg = aiConfig()
        const [provider, setProvider] = React.useState(cfg.provider)
        const [baseUrl, setBaseUrl] = React.useState(cfg.baseUrl)
        const [model, setModel] = React.useState(cfg.model)
        const [apiKey, setApiKey] = React.useState(cfg.apiKey)
        const [aiSaved, setAiSaved] = React.useState(false)
        const [, setLogVersion] = React.useState(0)
        const [logCopied, setLogCopied] = React.useState(false)
        const [logCopyFail, setLogCopyFail] = React.useState(false)
        const [logExportFail, setLogExportFail] = React.useState(false)
        const [logCleared, setLogCleared] = React.useState(false)

        React.useEffect(() => {
          const sync = () => setAiOn(aiSearchEnabled())
          window.addEventListener(AI_TOGGLE_EVENT, sync)
          return () => window.removeEventListener(AI_TOGGLE_EVENT, sync)
        }, [])

        React.useEffect(() => {
          if (!copied) return
          const off = setTimeout(() => { setCopied(false); setCopyFailed(false) }, 1600)
          return () => clearTimeout(off)
        }, [copied])

        React.useEffect(() => {
          if (!aiSaved) return
          const off = setTimeout(() => setAiSaved(false), 1600)
          return () => clearTimeout(off)
        }, [aiSaved])

        React.useEffect(() => {
          const sync = () => setLogVersion((v) => v + 1)
          window.addEventListener(LOG_EVENT, sync)
          return () => window.removeEventListener(LOG_EVENT, sync)
        }, [])

        React.useEffect(() => {
          if (!logCopied) return
          const off = setTimeout(() => setLogCopied(false), 1600)
          return () => clearTimeout(off)
        }, [logCopied])

        React.useEffect(() => {
          if (!logCleared) return
          const off = setTimeout(() => setLogCleared(false), 1600)
          return () => clearTimeout(off)
        }, [logCleared])

        React.useEffect(() => {
          if (!logExportFail) return
          const off = setTimeout(() => setLogExportFail(false), 1600)
          return () => clearTimeout(off)
        }, [logExportFail])

        const saveAi = () => {
          setAiConfig({
            provider,
            baseUrl: baseUrl.trim(),
            model: model.trim(),
            apiKey: apiKey.trim(),
          })
          setAiSaved(true)
          log('info', '保存 AI 配置', { provider, model: model.trim() })
        }

        const exportLogs = () => {
          setLogExportFail(false)
          try {
            const blob = new Blob([formatLogs(LOGS)], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `dsh-settings-search-${Date.now()}.log`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
          } catch {
            setLogExportFail(true)
          }
        }

        const copyLogs = async () => {
          try {
            await navigator.clipboard.writeText(formatLogs(LOGS))
            setLogCopied(true)
            setLogCopyFail(false)
          } catch {
            setLogCopyFail(true)
          }
        }

        const clearLogs = () => {
          LOGS.length = 0
          setLogVersion((v) => v + 1)
          setLogCleared(true)
        }

        const check = async () => {
          setState('loading')
          setCopied(false)
          setCopyFailed(false)
          try {
            const res = await fetch(`https://registry.npmjs.org/${NPM_NAME}/latest?t=${Date.now()}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const ver = typeof data?.version === 'string' ? data.version : ''
            if (ver === '') throw new Error('no version in registry response')
            setLatest(ver)
            const newer = compareSemver(ver, PKG_VERSION) > 0
            setState(newer ? 'outdated' : 'newest')
            log('info', '检查更新', { result: newer ? 'outdated' : 'newest', latest: ver })
          } catch {
            setState('error')
            log('error', '检查更新失败', {})
          }
        }

        const updateCommand = latest ? `dsh plugin --profile web add ${NPM_NAME}@${latest}` : ''
        const npxUpdateCommand = latest ? `npx @deepseek-ai/dsh plugin --profile web add ${NPM_NAME}@${latest}` : ''
        const releasesUrl = latest
          ? `https://github.com/objectivex666/dsh-settings-search/releases/tag/v${latest}`
          : 'https://github.com/objectivex666/dsh-settings-search/releases/latest'
        const fetchNotes = async () => {
          setNotesState('loading')
          setNotesBody('')
          try {
            const res = await fetch('https://api.github.com/repos/objectivex666/dsh-settings-search/releases/latest', {
              headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-settings-search' },
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const body = typeof data?.body === 'string' ? data.body.trim() : ''
            if (body === '') throw new Error('empty release body')
            setNotesBody(body)
            setNotesState('loaded')
            log('info', '查看更新说明', { ok: true, tag: typeof data?.tag_name === 'string' ? data.tag_name : '' })
          } catch {
            setNotesState('idle')
            setNotesBody('')
            log('error', '查看更新说明失败（跳转 release）', {})
            const opened = window.open(releasesUrl, '_blank', 'noopener,noreferrer')
            if (!opened) window.location.href = releasesUrl
          }
        }
        const commandBlock = (label, command) => React.createElement('div', { className: 'sss-vr-update-command', key: command }, [
          React.createElement('div', { className: 'sss-vr-update-command-label' }, label),
          React.createElement('code', { className: 'sss-vr-code' }, command),
        ])
        const copyCmd = async () => {
          try { await navigator.clipboard.writeText(updateCommand); setCopied(true); setCopyFailed(false) } catch { setCopyFailed(true) }
        }

        // Mirror Vision Router: check for updates automatically when the panel opens.
        React.useEffect(() => {
          if (state === 'idle') void check()
        }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

        return React.createElement('div', { className: 'sss-vr' + (open ? ' sss-vr-open' : '') }, [
          React.createElement('button', {
            type: 'button',
            className: 'sss-vr-header',
            'aria-expanded': open,
            onClick: () => setOpen(!open),
          }, [
            React.createElement('span', { className: 'sss-vr-headText' }, [
              React.createElement('span', { className: 'sss-vr-name' }, t('updn')),
              React.createElement('span', { className: 'sss-vr-desc' }, t('updDesc')),
            ]),
            React.createElement('span', { className: 'sss-vr-chevron' + (open ? ' sss-vr-chevron-open' : '') }, '▾'),
          ]),
          open ? React.createElement('div', { className: 'sss-vr-body' }, [
            React.createElement('div', { className: 'sss-vr-field' }, [
              React.createElement('div', { className: 'sss-vr-field-head' }, [
                React.createElement('span', { className: 'sss-vr-label' }, t('aiSearch')),
                React.createElement('input', {
                  className: 'sss-vr-check',
                  type: 'checkbox',
                  checked: aiOn,
                  onChange: (event) => {
                    const next = event.target.checked
                    setAiSearchEnabled(next)
                    setAiOn(next)
                  },
                }),
              ]),
              React.createElement('p', { className: 'sss-vr-hint' }, t('aiDesc')),
              React.createElement('p', { className: 'sss-vr-hint' }, t('aiPrivacy')),
            ]),
            React.createElement('div', { className: 'sss-vr-field sss-vr-form' }, [
              React.createElement('div', { className: 'sss-vr-field-head' }, [
                React.createElement('label', { className: 'sss-vr-label' }, t('aiProvider')),
              ]),
              React.createElement('select', {
                className: 'sss-vr-input sss-vr-select',
                value: provider,
                onChange: (event) => setProvider(event.target.value),
              }, [
                React.createElement('option', { value: 'openai' }, t('aiOpenAI')),
                React.createElement('option', { value: 'anthropic' }, t('aiAnthropic')),
              ]),
              React.createElement('div', { className: 'sss-vr-field-head' }, [
                React.createElement('label', { className: 'sss-vr-label' }, t('aiBaseUrl')),
              ]),
              React.createElement('input', {
                className: 'sss-vr-input',
                type: 'url',
                value: baseUrl,
                placeholder: provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1',
                spellCheck: false,
                onChange: (event) => setBaseUrl(event.target.value),
              }),
              React.createElement('div', { className: 'sss-vr-field-head' }, [
                React.createElement('label', { className: 'sss-vr-label' }, t('aiModel')),
              ]),
              React.createElement('input', {
                className: 'sss-vr-input',
                type: 'text',
                value: model,
                placeholder: provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o-mini',
                spellCheck: false,
                onChange: (event) => setModel(event.target.value),
              }),
              React.createElement('div', { className: 'sss-vr-field-head' }, [
                React.createElement('label', { className: 'sss-vr-label' }, t('aiApiKey')),
              ]),
              React.createElement('input', {
                className: 'sss-vr-input',
                type: 'password',
                value: apiKey,
                placeholder: 'sk-…',
                spellCheck: false,
                autoComplete: 'off',
                onChange: (event) => setApiKey(event.target.value),
              }),
              React.createElement('div', { className: 'sss-vr-actions' },
                React.createElement('button', { className: 'sss-vr-btn sss-vr-primary', type: 'button', onClick: () => { void saveAi() } },
                  aiSaved ? t('aiConfigSaved') : t('aiConfigSave'))),
            ]),
            React.createElement('div', { className: 'sss-vr-field' }, [
              React.createElement('div', { className: 'sss-vr-row' }, [
                React.createElement('span', { className: 'sss-vr-rowname' }, t('updCurrent')),
                React.createElement('span', { className: 'sss-vr-value' }, PKG_VERSION),
                state === 'newest' ? React.createElement('span', { className: 'sss-vr-badge' }, 'npm ✓') : null,
              ]),
              state === 'loading'
                ? React.createElement('p', { className: 'sss-vr-note' }, t('updChecking'))
                : null,
              state === 'error'
                ? React.createElement('p', { className: 'sss-vr-note' }, t('updErr'))
                : null,
              state === 'outdated'
                ? React.createElement('div', { className: 'sss-vr-update' }, [
                    React.createElement('div', { className: 'sss-vr-update-title' }, t('updFound').replace('{ver}', `v${latest}`)),
                    commandBlock(t('updCLI'), updateCommand),
                    commandBlock(t('updNpx'), npxUpdateCommand),
                    React.createElement('p', { className: 'sss-vr-update-note' }, t('updRestart')),
                    React.createElement('div', { className: 'sss-vr-update-actions' }, [
                      React.createElement('button', { className: 'sss-vr-btn', type: 'button', onClick: () => { void copyCmd() } },
                        copied ? t('updCopied') : t('updCopy')),
                      React.createElement('a', { className: 'sss-vr-link', href: releasesUrl, target: '_blank', rel: 'noopener noreferrer' }, t('updRelease')),
                    ]),
                    copyFailed ? React.createElement('p', { className: 'sss-vr-note', style: { color: 'var(--dsw-alias-label-danger)' } }, t('updCopyFail')) : null,
                  ])
                : null,
              React.createElement('div', { className: 'sss-vr-actions' }, [
                React.createElement('button', { className: 'sss-vr-btn sss-vr-primary', type: 'button', disabled: state === 'loading', onClick: () => { void check() } },
                  state === 'loading' ? t('updChecking') : t('updCheck')),
                React.createElement('button', { className: 'sss-vr-btn', type: 'button', disabled: notesState === 'loading', onClick: () => { void fetchNotes() } },
                  notesState === 'loading' ? t('updFetchingNotes') : t('updReleaseNotes')),
              ]),
              notesState === 'loaded'
                ? React.createElement('div', { className: 'sss-vr-notes' }, notesBody)
                : null,
            ]),
            React.createElement('div', { className: 'sss-vr-field' }, [
              React.createElement('div', { className: 'sss-vr-field-head' }, [
                React.createElement('span', { className: 'sss-vr-label' }, t('logTitle')),
                LOGS.length > 0 ? React.createElement('span', { className: 'sss-vr-badge' }, String(LOGS.length)) : null,
              ]),
              React.createElement('p', { className: 'sss-vr-hint' }, t('logDesc')),
              LOGS.length === 0
                ? React.createElement('p', { className: 'sss-vr-note' }, t('logEmpty'))
                : null,
              React.createElement('div', { className: 'sss-vr-actions' }, [
                React.createElement('button', { className: 'sss-vr-btn', type: 'button', onClick: () => { void exportLogs() } }, t('logExport')),
                React.createElement('button', { className: 'sss-vr-btn', type: 'button', onClick: () => { void copyLogs() } },
                  logCopied ? t('logCopied') : t('logCopy')),
                React.createElement('button', { className: 'sss-vr-btn', type: 'button', onClick: () => { void clearLogs() } },
                  logCleared ? t('logCleared') : t('logClear')),
              ]),
              logCopyFail ? React.createElement('p', { className: 'sss-vr-note', style: { color: 'var(--dsw-alias-label-danger)' } }, t('logCopyFail')) : null,
              logExportFail ? React.createElement('p', { className: 'sss-vr-note', style: { color: 'var(--dsw-alias-label-danger)' } }, t('logExportFail')) : null,
            ]),
          ]) : null,
        ])
      }

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'settings-search',
        order: 1600,
        locale: NS,
        label: () => t('updn'),
      }, UpdatePanel))

      ctx.slots.inject('settings.header', () => ctx.slots.register({
        name: 'settings.header',
        priority: -1,
        locale: NS,
      }, SettingsHeaderSearch))
    }

    exports.apply = apply
    exports.inject = ['slots', 'locale']
    return module.exports
  },
})
