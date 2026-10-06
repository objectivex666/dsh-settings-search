/**
 * Host-half log store regression tests (`npm test`).
 *
 * The store owns the daily files behind the panel's 「查看日志 / 打开日志文件夹」
 * actions, so the invariants under test are the ones a reader depends on: one
 * file per local day with the date in its name, one line per entry, no forged
 * entries, a per-file cap that continues in a numbered part, a folder budget
 * that never deletes the active file, and a tail that never starts mid-line.
 */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { apply, createLogRoute, createLogStore, folderLaunchCommand, inject } from '../lib/index.js'

const withStore = (options = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'sss-log-'))
  return {
    dir,
    store: createLogStore({ dir, ...options }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}

/** A day whose local stamp the store will write into the filename. */
const day = (iso, hour = '09:00:00') => new Date(`${iso}T${hour}`)

test('one file per local day, named with that date', () => {
  const { dir, store, cleanup } = withStore({ now: () => day('2026-10-06', '23:30:00') })
  try {
    store.append(['entry'])
    assert.equal(basename(store.file), 'settings-search-2026-10-06.log')
    assert.equal(store.dir, dir)
  } finally {
    cleanup()
  }
})

test('a new day starts a new file while the previous day is kept', () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-05') })
  try {
    store.append(['yesterday'])
    const yesterday = store.file
    assert.equal(basename(yesterday), 'settings-search-2026-10-05.log')
    // Roll the clock over by rebuilding the store against the same folder.
    const next = createLogStore({ dir: store.dir, now: () => day('2026-10-06') })
    next.append(['today'])
    assert.equal(basename(next.file), 'settings-search-2026-10-06.log')
    assert.equal(readFileSync(yesterday, 'utf8'), 'yesterday\n')
    assert.equal(next.count(), 1, 'the count follows the new day')
  } finally {
    cleanup()
  }
})

test('the log store appends one line per entry and reads them back', () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-06') })
  try {
    assert.equal(store.append(['first', 'second']), 2)
    assert.equal(store.append([]), 0)
    assert.equal(store.append('not-an-array'), 0)
    const read = store.read()
    assert.equal(read.text, 'first\nsecond\n')
    assert.equal(read.truncated, false)
    assert.equal(read.size, 13)
  } finally {
    cleanup()
  }
})

test('embedded newlines cannot forge entries and one line stays capped', () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-06') })
  try {
    assert.equal(store.append(['one\ntwo']), 1)
    assert.equal(store.append([`x${'y'.repeat(4000)}`]), 1)
    const lines = store.read().text.split('\n').filter((line) => line !== '')
    assert.equal(lines.length, 2)
    assert.equal(lines[0], 'one two')
    assert.equal(lines[1].length, 1000)
  } finally {
    cleanup()
  }
})

test('a day that passes its per-file cap continues in a numbered part', () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-06'), maxBytes: 40 })
  try {
    store.append(['x'.repeat(20)])
    const base = store.file
    assert.match(basename(base), /^settings-search-2026-10-06\.log$/)
    store.append(['y'.repeat(20)])
    const part = store.file
    assert.match(basename(part), /^settings-search-2026-10-06\.1\.log$/)
    store.append(['z'])
    assert.equal(readFileSync(base, 'utf8'), `${'x'.repeat(20)}\n${'y'.repeat(20)}\n`)
    assert.equal(readFileSync(part, 'utf8'), 'z\n')
  } finally {
    cleanup()
  }
})

test('the folder is pruned to its budget, never deleting the active file', () => {
  const { dir, store, cleanup } = withStore({ now: () => day('2026-10-04'), maxTotalBytes: 40 })
  try {
    store.append(['a'.repeat(20)])
    const first = store.file
    const second = createLogStore({ dir, now: () => day('2026-10-05'), maxTotalBytes: 40 })
    second.append(['b'.repeat(20)])
    assert.equal(existsSync(first), false, 'the oldest file goes once the folder passes its budget')
    assert.equal(existsSync(second.file), true)

    const third = createLogStore({ dir, now: () => day('2026-10-06'), maxTotalBytes: 40 })
    third.append(['c'])
    assert.equal(existsSync(second.file), true, 'a file inside the budget survives')
    assert.equal(existsSync(third.file), true, 'the active file is never pruned')
  } finally {
    cleanup()
  }
})

test('the pre-daily file is folded into today the first time the store runs', () => {
  const { dir, store, cleanup } = withStore({ now: () => day('2026-10-06') })
  try {
    writeFileSync(join(dir, 'settings-search.log'), 'old\nline\n', 'utf8')
    assert.equal(store.read().text, 'old\nline\n')
    assert.equal(existsSync(join(dir, 'settings-search.log')), false)
    assert.equal(basename(store.file), 'settings-search-2026-10-06.log')
    assert.equal(store.count(), 2)
  } finally {
    cleanup()
  }
})

test('a pre-daily leftover file counts as an old file and is pruned first', () => {
  const { dir, store, cleanup } = withStore({ now: () => day('2026-10-06'), maxTotalBytes: 30 })
  try {
    const leftover = join(dir, 'settings-search.log.1')
    writeFileSync(leftover, `${'legacy'.repeat(6)}\n`, 'utf8')
    store.append(['fresh'])
    assert.equal(existsSync(leftover), false)
    assert.equal(existsSync(store.file), true)
  } finally {
    cleanup()
  }
})

test('the tail read drops the partial first line and reports truncation', () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-06'), tailBytes: 12 })
  try {
    store.append(['aaaa', 'bbbb', 'cccc', 'dddd'])
    const read = store.read()
    assert.equal(read.truncated, true)
    assert.equal(read.text, 'cccc\ndddd\n')
  } finally {
    cleanup()
  }
})

test('a short tail read never returns stale buffer contents', () => {
  const sentinel = 'LEAKED-HEAP-BYTES'
  const io = {
    openSync: () => 1,
    closeSync: () => {},
    readSync: (_fd, buffer, offset, length) => {
      // Simulate an uninitialized buffer whose read reports fewer bytes than requested.
      for (let at = 0; at < length; at += sentinel.length) {
        buffer.write(sentinel, at, Math.min(sentinel.length, length - at), 'utf8')
      }
      buffer.write('fresh\n', offset, 'utf8')
      return 'fresh\n'.length
    },
  }
  const { store, cleanup } = withStore({ now: () => day('2026-10-06'), tailBytes: 64, io })
  try {
    writeFileSync(store.file, `${'a'.repeat(200)}\n`, 'utf8')
    const read = store.read()
    assert.equal(read.truncated, true)
    assert.equal(read.text, '', 'a short read must not decode the untouched buffer')
  } finally {
    cleanup()
  }
})

test('clear truncates the active file and removes the older daily files', () => {
  const { dir, store, cleanup } = withStore({ now: () => day('2026-10-05') })
  try {
    store.append(['yesterday'])
    const yesterday = store.file
    const today = createLogStore({ dir, now: () => day('2026-10-06') })
    today.append(['today'])
    assert.equal(today.clear(), true)
    assert.equal(statSync(today.file).size, 0)
    assert.equal(existsSync(yesterday), false)
    assert.equal(today.count(), 0)
    assert.deepEqual(readdirSync(dir).filter((name) => name.startsWith('settings-search-')), ['settings-search-2026-10-06.log'])
  } finally {
    cleanup()
  }
})

test('count reports the entries of the active day', () => {
  const { dir, store, cleanup } = withStore({ now: () => day('2026-10-05') })
  try {
    assert.equal(store.count(), 0, 'a missing file counts zero')
    store.append(['a', 'b'])
    assert.equal(store.count(), 2)
    const next = createLogStore({ dir, now: () => day('2026-10-06') })
    assert.equal(next.count(), 0, 'a new day counts from zero')
    next.append(['c'])
    assert.equal(next.count(), 1)
    next.clear()
    assert.equal(next.count(), 0)
  } finally {
    cleanup()
  }
})

test('a fresh store reads the count of a file written by an earlier run', () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-06') })
  try {
    store.append(['one', 'two', 'three'])
    const reopened = createLogStore({ dir: store.dir, now: () => day('2026-10-06') })
    assert.equal(reopened.count(), 3)
    assert.equal(reopened.count(), 3, 'the count is cached after the first read')
  } finally {
    cleanup()
  }
})

const send = async (route, method, body, query = '') => {
  const request = new Request(`http://dsh.internal${route.path}${query}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const response = await route.fetch(request)
  return { status: response.status, body: await response.json() }
}

test('the log route answers the entry count with and without the file tail', async () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-06') })
  const route = createLogRoute(store)
  try {
    await send(route, 'POST', { action: 'append', lines: ['a', 'b'] })
    const appended = await send(route, 'POST', { action: 'append', lines: ['c'] })
    assert.equal(appended.body.count, 3)

    const full = await send(route, 'GET')
    assert.equal(full.body.count, 3)
    assert.equal(full.body.text, 'a\nb\nc\n')

    const countOnly = await send(route, 'GET', undefined, '?count=1')
    assert.equal(countOnly.body.count, 3)
    assert.equal(countOnly.body.text, undefined, 'the count-only read must not transfer the tail')

    const cleared = await send(route, 'POST', { action: 'clear' })
    assert.equal(cleared.body.count, 0)
  } finally {
    cleanup()
  }
})

test('the log route serves the tail and accepts append/clear only', async () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-06') })
  const route = createLogRoute(store)
  try {
    assert.equal(route.path, '/api/settings-search-log')
    assert.deepEqual(route.methods, ['GET', 'POST'])
    assert.equal(route.requestBody, 'buffered')

    const appended = await send(route, 'POST', { action: 'append', lines: ['hello'] })
    assert.equal(appended.status, 200)
    assert.equal(appended.body.ok, true)
    assert.equal(appended.body.written, 1)

    const read = await send(route, 'GET')
    assert.equal(read.body.ok, true)
    assert.equal(read.body.text, 'hello\n')
    assert.equal(read.body.file.endsWith('settings-search-2026-10-06.log'), true)
    assert.equal(read.body.dir, store.dir)

    assert.equal((await send(route, 'POST', { action: 'nope' })).status, 400)
    assert.equal((await send(route, 'POST')).status, 400)
    assert.equal((await send(route, 'POST', { action: 'clear' })).body.ok, true)
    assert.equal((await send(route, 'GET')).body.text, '')
  } finally {
    cleanup()
  }
})

test('the folder launcher uses the OS shell open verb, never a hidden file manager', () => {
  const win = folderLaunchCommand('win32', 'C:\\logs\\dsh-settings-search')
  assert.equal(win.command, 'cmd.exe')
  assert.deepEqual(win.args, ['/c', 'start', '', 'C:\\logs\\dsh-settings-search'])
  // Only cmd's own console may hide: starting explorer.exe with CREATE_NO_WINDOW
  // produces a window that never becomes visible.
  assert.equal(win.hideWindow, true)
  assert.deepEqual(folderLaunchCommand('darwin', '/tmp/dsh'), { command: 'open', args: ['/tmp/dsh'], hideWindow: false })
  assert.deepEqual(folderLaunchCommand('linux', '/tmp/dsh'), { command: 'xdg-open', args: ['/tmp/dsh'], hideWindow: false })
})

test('the open action reports the launcher outcome and records the attempt', async () => {
  const { store, cleanup } = withStore({ now: () => day('2026-10-06') })
  try {
    const failing = createLogRoute({ ...store, open: async () => ({ failure: 'boom', command: 'cmd.exe' }) })
    const failed = await send(failing, 'POST', { action: 'open' })
    assert.equal(failed.status, 500)
    assert.equal(failed.body.reason, 'open-failed')
    assert.equal(failed.body.detail, 'boom')
    assert.match(store.read().text, /\[host\] 打开日志文件夹 failed \(cmd\.exe\): boom/)

    const succeeding = createLogRoute({ ...store, open: async () => ({ failure: undefined, command: 'cmd.exe' }) })
    const opened = await send(succeeding, 'POST', { action: 'open' })
    assert.equal(opened.body.ok, true)
    assert.equal(opened.body.opened, true)
    assert.equal(opened.body.command, 'cmd.exe')
    assert.match(store.read().text, /\[host\] 打开日志文件夹 ok \(cmd\.exe\)/)
  } finally {
    cleanup()
  }
})

test('the host half registers the route on the connection fetch registry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sss-log-apply-'))
  const previous = process.env.DSH_SETTINGS_SEARCH_LOG_DIR
  process.env.DSH_SETTINGS_SEARCH_LOG_DIR = dir
  let registered = null
  let disposed = false
  try {
    apply({
      connection: { fetch: { register: (route) => { registered = route; return () => { disposed = true } } } },
      effect: (callback) => { const dispose = callback(); return () => { dispose?.(); disposed = true } },
    })
    assert.deepEqual(inject, ['connection'])
    assert.equal(registered.path, '/api/settings-search-log')
    assert.equal(typeof registered.fetch, 'function')
    assert.equal(disposed, false)
  } finally {
    if (previous === undefined) delete process.env.DSH_SETTINGS_SEARCH_LOG_DIR
    else process.env.DSH_SETTINGS_SEARCH_LOG_DIR = previous
    rmSync(dir, { recursive: true, force: true })
  }
})
