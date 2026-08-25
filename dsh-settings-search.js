/**
 * settings-search 插件源文件（set-1 / pkg-4，正在运行）
 *
 * 说明：
 * - 这是 DSH 动态 Cordis 插件（Client half）的源码，通过 cordis_define 注册到运行中的
 *   DSH 进程，不落盘；此文件是手动导出的副本，供查看 / 复用。
 * - 功能：在设置面板左侧导航栏顶部（settings.header 槽，priority:-1 shadow）添加搜索框，
 *   输入关键词实时搜索所有已注册设置页（settings.section）与通用设置项
 *   （settings.general.item），浮层展示结果，点击后显示左侧导航定位引导。
 * - 图标：SVG 放大镜（fill=currentColor），随主题文字颜色。
 * - 源码是 cordis_define 的 code.client 字段值：一个返回 Cordis Plugin 的纯 JS 函数体，
 *   无 TypeScript / JSX / import。
 *
 * 重新注册方式（会话内）：
 *   cordis_define({ kind: 'new', idPrefix: 'set' }, ...) 传入本文件的 code.client 内容。
 */

return {
  inject: ['slots', 'locale'],
  apply(ctx) {
    const NS = 'settings-search-v4'
    ctx.effect(() => ctx.locale.register(NS, {
      zh: {
        title: '设置',
        placeholder: '搜索设置…',
        empty: '没有匹配的设置',
        pages: '设置页',
        rows: '通用设置项',
        guide: '该设置位于左侧导航「{label}」，点击左侧导航项即可打开',
        page: '设置页',
        row: '设置项',
      },
      en: {
        title: 'Settings',
        placeholder: 'Search settings…',
        empty: 'No matching settings',
        pages: 'Settings pages',
        rows: 'General items',
        guide: 'This setting lives in "{label}" — open it from the left navigation',
        page: 'Page',
        row: 'Item',
      },
    }), 'settings-search: dictionaries')
    const t = ctx.locale.bind(NS)

    styles.insert(`
      .sss-wrap { position: relative; display: flex; flex-direction: column; gap: 8px; }
      .sss-title { font-size: 16px; font-weight: 500; line-height: 24px; }
      .sss-box { position: relative; display: flex; align-items: center; }
      .sss-icon { position: absolute; left: 9px; display: block; opacity: .6; pointer-events: none; }
      .sss-input { width: 100%; box-sizing: border-box; padding: 6px 26px 6px 28px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; outline: none; }
      .sss-input:focus { border-color: var(--dsw-alias-brand-primary); }
      .sss-input::placeholder { color: var(--dsw-alias-label-secondary); opacity: .8; }
      .sss-clear { position: absolute; right: 6px; border: none; background: none; color: var(--dsw-alias-label-secondary); cursor: pointer; font-size: 11px; padding: 2px 4px; }
      .sss-clear:hover { color: var(--dsw-alias-label-primary); }
      .sss-pop { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 20; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; box-shadow: var(--dsw-shadow-lv3); padding: 6px; max-height: 300px; overflow: auto; }
      .sss-groups { display: flex; flex-direction: column; gap: 8px; }
      .sss-group-title { font-size: 11px; color: var(--dsw-alias-label-secondary); letter-spacing: .05em; padding: 2px 6px; }
      .sss-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
      .sss-item { display: flex; align-items: center; gap: 6px; padding: 7px 8px; border-radius: 7px; cursor: pointer; }
      .sss-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .sss-item-label { flex: 1; min-width: 0; color: var(--dsw-alias-label-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sss-item-id { font-size: 10px; color: var(--dsw-alias-label-secondary); flex-shrink: 0; }
      .sss-empty { margin: 0; padding: 10px 8px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
      .sss-guide { padding: 7px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; }
    `)

    const resolveLabel = (entry) => {
      const raw = entry.options.label
      if (typeof raw === 'function') return String(raw())
      return raw == null ? '' : String(raw)
    }
    const readSections = () => ctx.slots.entries('settings.section')
      .filter((e) => e.options.id !== 'settings-search')
      .map((e) => ({ id: e.options.id, order: e.options.order ?? 0, label: resolveLabel(e) }))
      .sort((a, b) => a.order - b.order)
    const readRows = () => ctx.slots.entries('settings.general.item')
      .map((e) => ({ id: e.options.id, order: e.options.order ?? 0, label: resolveLabel(e) }))
      .sort((a, b) => a.order - b.order)

    const SearchIcon = React.createElement('svg', {
      className: 'sss-icon',
      viewBox: '0 0 16.5 16.5',
      width: 13,
      height: 13,
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
      const [sections, setSections] = React.useState(readSections)
      const [rows, setRows] = React.useState(readRows)
      const [selected, setSelected] = React.useState(null)
      React.useEffect(() => {
        const refresh = () => {
          setSections(readSections())
          setRows(readRows())
        }
        const offs = [
          ctx.slots.subscribe('settings.section', refresh),
          ctx.slots.subscribe('settings.general.item', refresh),
          ctx.locale.subscribe(refresh),
        ]
        return () => { for (const off of offs) off() }
      }, [])

      const q = query.trim().toLowerCase()
      const tokens = q.split(/\s+/).filter(Boolean)
      const match = (label, id) => tokens.every((tok) => (label + ' ' + id).toLowerCase().includes(tok))
      const shownSections = tokens.length ? sections.filter((s) => match(s.label, s.id)) : []
      const shownRows = tokens.length ? rows.filter((r) => match(r.label, r.id)) : []
      const none = tokens.length > 0 && shownSections.length === 0 && shownRows.length === 0

      const renderItem = (item, kind) => React.createElement('li', {
        key: item.id,
        className: 'sss-item',
        onMouseDown: () => { setSelected(item); setOpen(false) },
      }, [
        React.createElement('span', { className: 'sss-item-label' }, item.label || item.id),
        React.createElement('span', { className: 'sss-item-id' }, kind),
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
            onChange: (e) => { setQuery(e.target.value); setOpen(true) },
            onFocus: () => setOpen(true),
            onBlur: () => setOpen(false),
          }),
          query !== '' ? React.createElement('button', {
            className: 'sss-clear',
            type: 'button',
            onClick: () => { setQuery(''); setSelected(null); setOpen(false) },
          }, '✕') : null,
        ]),
        open && tokens.length > 0 ? React.createElement('div', { className: 'sss-pop' }, [
          none
            ? React.createElement('p', { className: 'sss-empty' }, t('empty'))
            : React.createElement('div', { className: 'sss-groups' }, [
                shownSections.length > 0 ? React.createElement('div', { className: 'sss-group' }, [
                  React.createElement('div', { className: 'sss-group-title' }, t('pages')),
                  React.createElement('ul', { className: 'sss-list' }, shownSections.map((s) => renderItem(s, t('page')))),
                ]) : null,
                shownRows.length > 0 ? React.createElement('div', { className: 'sss-group' }, [
                  React.createElement('div', { className: 'sss-group-title' }, t('rows')),
                  React.createElement('ul', { className: 'sss-list' }, shownRows.map((r) => renderItem(r, t('row')))),
                ]) : null,
              ]),
        ]) : null,
        selected !== null
          ? React.createElement('div', { className: 'sss-guide' }, t('guide').replace('{label}', selected.label || selected.id))
          : null,
      ])
    }

    ctx.slots.inject('settings.header', () => ctx.slots.register({
      name: 'settings.header',
      priority: -1,
      locale: NS,
    }, SettingsHeaderSearch))
  },
}
