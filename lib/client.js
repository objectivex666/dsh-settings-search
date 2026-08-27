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
    const PKG_VERSION = '1.4.0'
    const NPM_NAME = '@objectivex666/dsh-settings-search'
    const zh = {
      title: '设置',
      placeholder: '搜索设置…',
      empty: '没有匹配的设置',
      pages: '设置页',
      options: '页内选项',
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
    }
    const en = {
      title: 'Settings',
      placeholder: 'Search settings…',
      empty: 'No matching settings',
      pages: 'Settings pages',
      options: 'In-page options',
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
    }

    /** Inner-row slots that represent specific options inside one page. */
    const DEEP_SLOTS = [
      { slot: 'settings.plugins.tab', parent: 'plugins' },
      { slot: 'web-ui.plugin.item', parent: 'web-ui-plugins' },
      { slot: 'settings.general.item', parent: 'general' },
    ]

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
      .sss-item-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .sss-item-label { color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sss-item-path { font-size: 10px; line-height: 14px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sss-item-kind { flex-shrink: 0; font-size: 10px; color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 1px 5px; }
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
        ?? buttons.find((b) => textOf(b).startsWith(want))
        ?? buttons.find((b) => want.length >= 2 && textOf(b) !== '' && (textOf(b).includes(want) || want.includes(textOf(b))))
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
        await delay(160)
        const label = item.label
        const buttons = panelButtons()
        const tab = buttons.find((b) => (b.textContent ?? '').trim() === label)
          ?? buttons.find((b) => (b.getAttribute('role') ?? '') === 'tab' && (b.textContent ?? '').includes(label))
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
        const matches = (haystack) => tokens.every((tok) => haystack.includes(tok))

        const sections = model.readSections()
        const deeps = q !== '' ? model.readDeep() : []
        const shownPages = q !== ''
          ? sections.filter((s) => matches(`${s.label} ${s.id}`.toLowerCase()))
          : []
        const shownOptions = q !== ''
          ? deeps.filter((o) => matches(`${o.hay} ${o.parentLabel} ${o.id} ${o.slot}`.toLowerCase()))
          : []
        const none = q !== '' && shownPages.length === 0 && shownOptions.length === 0

        const [hint, setHint] = React.useState(null)
        const pick = (item) => {
          setOpen(false)
          const jumped = item.kind === 'page'
            ? navigator.jumpToPage(item)
            : navigator.jumpToOption(item)
          Promise.resolve(jumped).then((ok) => {
            if (ok === false) setHint(item.kind === 'page' ? item.label : `${item.parentLabel} › ${item.label}`)
          })
        }

        const renderPage = (item) => React.createElement('li', {
          key: 'page:' + item.id,
          className: 'sss-item',
          onMouseDown: () => pick(item),
        }, [
          React.createElement('span', { className: 'sss-item-label' }, item.label),
          React.createElement('span', { className: 'sss-item-kind' }, t('page')),
        ])
        const renderOption = (item) => React.createElement('li', {
          key: item.key,
          className: 'sss-item',
          onMouseDown: () => pick(item),
        }, [
          React.createElement('span', { className: 'sss-item-col' }, [
            React.createElement('span', { className: 'sss-item-label' }, item.label),
            React.createElement('span', { className: 'sss-item-path' }, item.parentLabel),
          ]),
          React.createElement('span', { className: 'sss-item-kind' }, t('option')),
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
          open && q !== '' ? React.createElement('div', { className: 'sss-pop' }, [
            none
              ? React.createElement('p', { className: 'sss-empty' }, t('empty'))
              : React.createElement('div', { className: 'sss-groups' }, [
                  shownPages.length > 0 ? React.createElement('div', { className: 'sss-group' }, [
                    React.createElement('div', { className: 'sss-group-title' }, t('pages')),
                    React.createElement('ul', { className: 'sss-list' }, shownPages.map(renderPage)),
                  ]) : null,
                  shownOptions.length > 0 ? React.createElement('div', { className: 'sss-group' }, [
                    React.createElement('div', { className: 'sss-group-title' }, t('options')),
                    React.createElement('ul', { className: 'sss-list' }, shownOptions.map(renderOption)),
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

        React.useEffect(() => {
          if (!copied) return
          const off = setTimeout(() => setCopied(false), 1600)
          return () => clearTimeout(off)
        }, [copied])

        const check = async () => {
          setState('loading')
          setCopied(false)
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
          const cmd = `dsh plugin update ${NPM_NAME}`
          try { await navigator.clipboard.writeText(cmd); setCopied(true) } catch { /* user can copy manually */ }
        }

        const statusNode = {
          idle: React.createElement('span', { className: 'sss-upd-val' }, '—'),
          loading: React.createElement('span', { className: 'sss-upd-val' }, t('updChecking')),
          newest: React.createElement('span', { className: 'sss-upd-val' }, t('updNewest')),
          error: React.createElement('span', { className: 'sss-upd-val' }, t('updErr')),
          outdated: latest === '' ? null : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, [
            React.createElement('p', { className: 'sss-upd-note' }, t('updFound').replace('{ver}', `v${latest}`)),
            React.createElement('code', { className: 'sss-cmd' }, `dsh plugin update ${NPM_NAME}`),
            React.createElement('div', null,
              React.createElement('button', { className: 'sss-btn', type: 'button', onClick: () => { void copyCmd() } },
                copied ? t('updCopied') : t('updCopy'))),
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
