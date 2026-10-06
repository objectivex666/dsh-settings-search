/**
 * dsh-settings-search — host half.
 *
 * The browser half owns the search UI, but the panel's log actions need the
 * host: a page can neither append to a file nor reveal a folder.
 *
 * - `GET  /api/settings-search-log` answers the log tail plus the file and
 *   folder paths, so the panel can show the history of earlier runs and name
 *   the folder it offers to open;
 * - `POST /api/settings-search-log` appends browser-reported lines, truncates
 *   the file, or opens its folder in the OS file manager.
 *
 * Both ride the Host connection's authenticated `/api` channel — the carrier
 * the shipped session-log export uses — so the browser reaches them
 * document-relative (`api/settings-search-log`) and never handles a token.
 *
 * Log files live in `$DSH_HOME/logs/dsh-settings-search/`, beside other
 * plugins' logs, one file per local day named `settings-search-YYYY-MM-DD.log`.
 * A day that would pass {@link MAX_FILE_BYTES} continues in a numbered part
 * (`…-YYYY-MM-DD.1.log`), and the folder as a whole is pruned to
 * {@link MAX_TOTAL_BYTES} by deleting the oldest files — never the one being
 * written.
 */
import { spawn } from 'node:child_process'
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Plugin row id used by cordis.patch.yml (also the settings-nav id filter). */
export const name = 'settings-search'

/** The Host connection owns the authenticated `/api` exact-Fetch registry. */
export const inject = ['connection']

/** Absolute registration path; the browser addresses it as `api/settings-search-log`. */
const ROUTE_PATH = '/api/settings-search-log'
const LOG_DIR_NAME = 'dsh-settings-search'
const LOG_FILE_PREFIX = 'settings-search'
/** One file per local day: `settings-search-YYYY-MM-DD.log`. */
const LOG_FILE_PATTERN = /^settings-search(-\d{4}-\d{2}-\d{2}(\.[0-9]+)?)?\.log(\.[0-9]+)?$/
/** A single log file never grows past this; the day continues in a `.N` part. */
const MAX_FILE_BYTES = 100 * 1024 * 1024
/** The whole log folder stays within this, oldest files pruned first. */
const MAX_TOTAL_BYTES = 100 * 1024 * 1024
/** Serve at most this much of the active file to the viewer. */
const TAIL_BYTES = 256 * 1024
const MAX_LINE_LENGTH = 1000
const MAX_LINES_PER_REQUEST = 200
const MAX_REQUEST_BYTES = 256 * 1024
/** How long a folder launcher may run before it counts as launched. */
const LAUNCH_WATCH_MS = 1500

/** Local calendar day of one Date, as the log filename's date stamp. */
const dayStamp = (date) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Default log folder: DSH's own logs root, beside the other plugins'. */
const defaultLogDir = () => join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'logs', LOG_DIR_NAME)

/** Host environment minus anything credential-shaped, for the folder launcher. */
const scrubbedEnv = () => {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (/KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL/i.test(key)) continue
    env[key] = value
  }
  return env
}

/**
 * The platform command that reveals one folder in the OS file manager.
 *
 * Windows goes through `cmd /c start`, i.e. the shell's own open verb. Spawning
 * `explorer.exe` directly with `windowsHide` (CREATE_NO_WINDOW) makes Explorer
 * create a window that never becomes visible — measured on this host: the shell
 * window existed with `IsWindowVisible() === false`, which is the "nothing
 * opens" report this replaced. The shell verb also hands the new window the
 * foreground, so it cannot end up hidden behind dsh.
 *
 * @param platform - `process.platform`.
 * @param dir - absolute folder path.
 * @returns the launcher command, its argv, and whether its own window may hide.
 */
export const folderLaunchCommand = (platform, dir) => {
  if (platform === 'win32') return { command: 'cmd.exe', args: ['/c', 'start', '', dir], hideWindow: true }
  if (platform === 'darwin') return { command: 'open', args: [dir], hideWindow: false }
  return { command: 'xdg-open', args: [dir], hideWindow: false }
}

/**
 * Launch one detached process that outlives dsh.
 * @param command - executable path or PATH name.
 * @param args - argv (never a shell string).
 * @param options - whether the launcher's own window may be hidden.
 * @returns undefined on success, otherwise a readable failure reason.
 */
const launchDetached = (command, args, options) => new Promise((resolve) => {
  let settled = false
  let watch = null
  const done = (error) => {
    if (settled) return
    settled = true
    if (watch !== null) clearTimeout(watch)
    child.unref()
    resolve(error)
  }
  let child
  try {
    child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: options.hideWindow,
      env: scrubbedEnv(),
    })
  } catch (error) {
    resolve(String(error?.message ?? error))
    return
  }
  // A launcher still running when the watch window closes has handed the window
  // over and outlives dsh — some Linux file managers stay in the foreground.
  watch = setTimeout(() => done(undefined), LAUNCH_WATCH_MS)
  child.once('error', (error) => done(String(error?.message ?? error)))
  child.once('exit', (code) => done(code === 0 ? undefined : `${command} exited with code ${code}`))
})

/**
 * Open one folder in the OS file manager.
 * @param dir - absolute folder path, created by the caller.
 * @returns the launcher used, and undefined as the failure or a reason for it.
 */
const openFolder = async (dir) => {
  const primary = folderLaunchCommand(process.platform, dir)
  const failure = await launchDetached(primary.command, primary.args, { hideWindow: primary.hideWindow })
  if (failure === undefined) return { failure: undefined, command: primary.command }
  // A host without the shell launcher still has explorer.exe, which shows its
  // window normally as long as it is not started with CREATE_NO_WINDOW.
  if (process.platform === 'win32' && primary.command !== 'explorer.exe') {
    return { failure: await launchDetached('explorer.exe', [dir], { hideWindow: false }), command: 'explorer.exe' }
  }
  return { failure, command: primary.command }
}

/**
 * Create the daily log files behind the panel's log actions.
 *
 * One file per local day (`settings-search-YYYY-MM-DD.log`), continued in a
 * numbered part when a day passes {@link MAX_FILE_BYTES}, with the folder
 * pruned to {@link MAX_TOTAL_BYTES} by deleting its oldest files. The file
 * being written is never pruned: closing the cap around it would drop exactly
 * the entries an operator is watching.
 *
 * @param options - `dir`, `now`, `maxBytes`, `maxTotalBytes`, `tailBytes`, and
 *                  `io` overrides (the first five are used by tests; `io` lets
 *                  tests simulate filesystem short reads).
 * @returns the folder, the active file path, and append/read/count/clear/open.
 */
export function createLogStore(options = {}) {
  const dir = options.dir ?? process.env.DSH_SETTINGS_SEARCH_LOG_DIR ?? defaultLogDir()
  const now = options.now ?? (() => new Date())
  const maxBytes = options.maxBytes ?? MAX_FILE_BYTES
  const maxTotalBytes = options.maxTotalBytes ?? MAX_TOTAL_BYTES
  const tailBytes = options.tailBytes ?? TAIL_BYTES
  /** File operations used by the synchronous tail read (injectable for tests). */
  const io = options.io ?? { openSync, readSync, closeSync }
  const ensure = () => {
    mkdirSync(dir, { recursive: true })
    return dir
  }
  const fileFor = (stamp, part) => join(dir, part === 0
    ? `${LOG_FILE_PREFIX}-${stamp}.log`
    : `${LOG_FILE_PREFIX}-${stamp}.${part}.log`)
  /**
   * Fold the pre-daily `settings-search.log` into today's dated file the first
   * time this store runs, so an upgrade keeps its history under the new name
   * instead of leaving an undated file behind for good.
   */
  let migrated = false
  const migrateLegacy = () => {
    if (migrated) return
    migrated = true
    try {
      const legacy = join(dir, `${LOG_FILE_PREFIX}.log`)
      const target = fileFor(dayStamp(now()), 0)
      if (existsSync(legacy) && !existsSync(target)) renameSync(legacy, target)
    } catch {
      // The legacy file simply stays where pruning can still reclaim it.
    }
  }
  /**
   * The file this day is currently writing: the newest part that still has
   * room. Resolved per call, so the calendar day rolls over on its own.
   * @returns the active file path.
   */
  const activeFile = () => {
    migrateLegacy()
    const stamp = dayStamp(now())
    for (let part = 0; part <= 999; part += 1) {
      const candidate = fileFor(stamp, part)
      try {
        if (!existsSync(candidate) || statSync(candidate).size < maxBytes) return candidate
      } catch {
        return candidate
      }
    }
    return fileFor(stamp, 0)
  }
  /** Every file this plugin owns in the folder (current scheme and the pre-daily one). */
  const ownedFiles = () => {
    try {
      return readdirSync(dir).filter((name) => LOG_FILE_PATTERN.test(name)).map((name) => join(dir, name))
    } catch {
      return []
    }
  }
  const statOf = (path) => {
    try {
      const info = statSync(path)
      return { size: info.size, mtimeMs: info.mtimeMs }
    } catch {
      return { size: 0, mtimeMs: 0 }
    }
  }
  /**
   * Keep the folder within its budget by deleting the oldest files.
   * @param active - the file currently being written, never deleted.
   */
  const prune = (active) => {
    try {
      let total = statOf(active).size
      const candidates = ownedFiles()
        .filter((path) => path !== active)
        .map((path) => ({ path, ...statOf(path) }))
        .sort((left, right) => left.mtimeMs - right.mtimeMs || left.path.localeCompare(right.path))
      for (const entry of candidates) total += entry.size
      for (const entry of candidates) {
        if (total <= maxTotalBytes) break
        try {
          unlinkSync(entry.path)
          total -= entry.size
        } catch {
          // A file another process holds stays until the next prune.
        }
      }
    } catch {
      // Pruning is best effort: a full disk must not stop the log write.
    }
  }
  const countLines = (path) => {
    try {
      if (!existsSync(path)) return 0
      const text = readFileSync(path, 'utf8')
      let lines = 0
      for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) lines += 1
      return lines
    } catch {
      return 0
    }
  }
  // The host is a file's only writer, so its entry count is tracked in memory
  // and only read from disk when this process meets a file for the first time.
  let counted = { path: '', lines: 0 }
  const countOf = (path) => {
    if (counted.path !== path) counted = { path, lines: countLines(path) }
    return counted.lines
  }
  return {
    dir,
    /** The file the panel reads, views, and clears right now. */
    get file() {
      return activeFile()
    },
    ensure,
    /**
     * Append browser-reported lines, one entry per line, collapsing any embedded
     * break so one report can never forge a second entry.
     * @param lines - candidate lines.
     * @returns the number of accepted lines.
     */
    append(lines) {
      const accepted = []
      for (const line of Array.isArray(lines) ? lines.slice(0, MAX_LINES_PER_REQUEST) : []) {
        const text = String(line ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_LINE_LENGTH)
        if (text !== '') accepted.push(text)
      }
      if (accepted.length === 0) return 0
      ensure()
      const target = activeFile()
      // Resolve the baseline before writing: reading after the append would
      // count this very batch twice.
      const baseline = countOf(target)
      appendFileSync(target, `${accepted.join('\n')}\n`, 'utf8')
      counted = { path: target, lines: baseline + accepted.length }
      prune(target)
      return accepted.length
    },
    /**
     * Number of entries in the file the panel shows — today's log, not just the
     * lines this page has produced.
     * @returns the entry count of the active file.
     */
    count() {
      return countOf(activeFile())
    },
    /**
     * Read the tail of the active file.
     * @returns the text, the full size, and whether older content was left out;
     *          a tail that starts mid-line drops that partial line.
     */
    read() {
      const file = activeFile()
      try {
        if (!existsSync(file)) return { text: '', size: 0, truncated: false }
        const size = statSync(file).size
        if (size <= tailBytes) return { text: readFileSync(file, 'utf8'), size, truncated: false }
        const buffer = Buffer.alloc(tailBytes)
        let readBytes = 0
        const fd = io.openSync(file, 'r')
        try {
          readBytes = io.readSync(fd, buffer, 0, tailBytes, size - tailBytes)
        } finally {
          io.closeSync(fd)
        }
        // Decode only what the read actually filled: a short read must never
        // expose untouched buffer bytes, even though the buffer is zeroed.
        const tail = buffer.subarray(0, Math.max(0, Math.min(readBytes, tailBytes))).toString('utf8')
        const firstBreak = tail.indexOf('\n')
        return { text: firstBreak === -1 ? tail : tail.slice(firstBreak + 1), size, truncated: true }
      } catch {
        return { text: '', size: 0, truncated: false }
      }
    },
    /**
     * Empty the log: the active file is truncated and the older daily files are
     * removed, so 清空日志 leaves nothing of this plugin's history behind.
     */
    clear() {
      try {
        ensure()
        const file = activeFile()
        writeFileSync(file, '', 'utf8')
        for (const path of ownedFiles()) {
          if (path === file) continue
          try {
            unlinkSync(path)
          } catch {
            // A held file is skipped; the next clear retries.
          }
        }
        counted = { path: file, lines: 0 }
        return true
      } catch {
        return false
      }
    },
    /**
     * Open the log folder in the OS file manager.
     * @returns the launcher used, and undefined as the failure or a reason for it.
     */
    open() {
      ensure()
      return openFolder(dir)
    },
  }
}

/** Parse one JSON request body within the route's own size budget. */
const readJsonBody = async (request) => {
  try {
    const text = await request.text()
    if (text === '' || text.length > MAX_REQUEST_BYTES) return null
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Build the exact Fetch route the browser half calls.
 * @param store - log store from {@link createLogStore}.
 * @returns a route for `ctx.connection.fetch.register`.
 */
export function createLogRoute(store) {
  const reply = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
  const target = (extra) => ({ ok: true, dir: store.dir, file: store.file, ...extra })
  return {
    path: ROUTE_PATH,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        if (request.method === 'GET') {
          store.ensure()
          // `?count=1` answers the entry count alone, so the panel can refresh
          // its counter without transferring the file's tail.
          if (new URL(request.url).searchParams.get('count') === '1') {
            return reply(target({ count: store.count() }))
          }
          const { text, size, truncated } = store.read()
          return reply(target({ count: store.count(), size, truncated, text }))
        }
        const payload = await readJsonBody(request)
        if (payload === null) return reply({ ok: false, reason: 'bad-request' }, 400)
        if (payload.action === 'append') {
          return reply(target({ written: store.append(payload.lines), count: store.count() }))
        }
        if (payload.action === 'clear') {
          store.clear()
          return reply(target({ count: store.count() }))
        }
        if (payload.action === 'open') {
          const { failure, command } = await store.open()
          // Record the attempt host-side, so a folder that never appears can be
          // diagnosed from the log file itself.
          store.append([`${new Date().toISOString()} [info] [host] 打开日志文件夹 ${failure === undefined ? `ok (${command})` : `failed (${command}): ${failure}`}`])
          return failure === undefined
            ? reply(target({ opened: true, command, count: store.count() }))
            : reply({ ok: false, reason: 'open-failed', detail: failure }, 500)
        }
        return reply({ ok: false, reason: 'unknown-action' }, 400)
      } catch (error) {
        return reply({ ok: false, reason: 'internal', detail: String(error?.message ?? error) }, 500)
      }
    },
  }
}

/**
 * Host half entry point: own the log file and publish its route.
 * @param ctx - host cordis context carrying the connection service.
 */
export function apply(ctx) {
  const store = createLogStore()
  try {
    store.ensure()
  } catch {
    // A read-only home still serves reads and reports failures per request.
  }
  ctx.effect(() => ctx.connection.fetch.register(createLogRoute(store)), 'settings-search: log fetch route')
}
