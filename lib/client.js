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
    const PKG_VERSION = '1.6.0'
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
      .sss-empty { margin: 0; padding: 10px 8px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
      .sss-guide { padding: 7px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; }
      @keyframes sssFlashBg { 0% { background-color: var(--dsw-alias-interactive-bg-hover); } 100% { background-color: transparent; } }
      .sss-flash { animation: sssFlashBg 1.8s ease-out; border-radius: 8px; }
      .sss-upd { display: flex; flex-direction: column; gap: 12px; padding: 16px; max-width: 560px; }
      .sss-upd-title { font-size: 15px; font-weight: 600; line-height: 22px; color: var(--dsw-alias-label-primary); margin: 0; }
      .sss-upd-desc { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
      .sss-upd-card { display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
      .sss-upd-row { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 20px; }
      .sss-upd-key { flex-shrink: 0; width: 88px; color: var(--dsw-alias-label-secondary); }
      .sss-upd-val { color: var(--dsw-alias-label-primary); }
      .sss-upd-badge { flex-shrink: 0; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 18px; }
      .sss-btn { height: 28px; padding: 0 12px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 12px; cursor: pointer; }
      .sss-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
      .sss-btn:disabled { opacity: .55; cursor: default; }
      .sss-cmd { user-select: all; font-family: ui-monospace, Consolas, 'Courier New', monospace; font-size: 11.5px; line-height: 20px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 4px 8px; word-break: break-all; }
      .sss-upd-note { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
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
              ? React.createElement('p', { className: 'sss-empty' }, t('empty'))
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
        const [state, setState] = React.useState('idle') // idle | loading | newest | outdated | error
        const [latest, setLatest] = React.useState('')
        const [copied, setCopied] = React.useState(false)
        const [copyFailed, setCopyFailed] = React.useState(false)

        React.useEffect(() => {
          if (!copied) return
          const off = setTimeout(() => { setCopied(false); setCopyFailed(false) }, 1600)
          return () => clearTimeout(off)
        }, [copied])

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
            setState(compareSemver(ver, PKG_VERSION) > 0 ? 'outdated' : 'newest')
          } catch {
            setState('error')
          }
        }

        const copyCmd = async () => {
          const cmd = `dsh plugin --profile web update ${NPM_NAME}`
          try { await navigator.clipboard.writeText(cmd); setCopied(true); setCopyFailed(false) } catch { setCopyFailed(true) }
        }

        const statusNode = {
          idle: React.createElement('span', { className: 'sss-upd-val' }, '—'),
          loading: React.createElement('span', { className: 'sss-upd-val' }, t('updChecking')),
          newest: React.createElement('span', { className: 'sss-upd-val' }, t('updNewest')),
          error: React.createElement('span', { className: 'sss-upd-val' }, t('updErr')),
          outdated: latest === '' ? null : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, [
            React.createElement('p', { className: 'sss-upd-note' }, t('updFound').replace('{ver}', `v${latest}`)),
            React.createElement('code', { className: 'sss-cmd' }, `dsh plugin --profile web update ${NPM_NAME}`),
            React.createElement('div', null,
              React.createElement('button', { className: 'sss-btn', type: 'button', onClick: () => { void copyCmd() } },
                copied ? t('updCopied') : t('updCopy')),
            copyFailed ? React.createElement('p', { className: 'sss-upd-note', style: { color: 'var(--dsw-alias-label-danger)' } }, t('updCopyFail')) : null),
          ]),
        }

        return React.createElement('div', { className: 'sss-upd' }, [
          React.createElement('h3', { className: 'sss-upd-title' }, `${t('updn')} v${PKG_VERSION}`),
          React.createElement('p', { className: 'sss-upd-desc' }, t('updDesc')),
          React.createElement('div', { className: 'sss-upd-card' }, [
            React.createElement('div', { className: 'sss-upd-row' }, [
              React.createElement('span', { className: 'sss-upd-key' }, t('updCurrent')),
              React.createElement('code', { className: 'sss-cmd' }, PKG_VERSION),
              state === 'newest' ? React.createElement('span', { className: 'sss-upd-badge' }, 'npm ✓') : null,
            ]),
            state === 'outdated' || state === 'loading'
              ? React.createElement('div', { className: 'sss-upd-row' }, [
                  React.createElement('span', { className: 'sss-upd-key' }, t('updLatestKnown')),
                  state === 'loading' ? React.createElement('span', { className: 'sss-upd-val' }, '…') : React.createElement('code', { className: 'sss-cmd' }, latest),
                ])
              : null,
            state === 'outdated' || state === 'loading' || state === 'error' || state === 'idle' || state === 'newest'
              ? (state === 'outdated' ? statusNode.outdated : statusNode[state])
              : null,
            React.createElement('div', { className: 'sss-upd-row' },
              React.createElement('button', { className: 'sss-btn', type: 'button', disabled: state === 'loading', onClick: () => { void check() } },
                state === 'loading' ? t('updChecking') : t('updCheck'))),
          ]),
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
