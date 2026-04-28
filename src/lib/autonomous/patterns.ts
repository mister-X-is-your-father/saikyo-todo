/**
 * autonomous loop の「リファクタ割り込み条件」検出に使う pure parser 群。
 *
 * scripts/autonomous/detect-patterns.sh が git / eslint / wc の生出力を渡し、
 * 本 module は副作用なしで集計するだけ。bash で実装すると awk が暴れて
 * 検証が辛いため、集計 / 閾値判定の中核は TS + vitest に寄せる。
 */

export interface HotspotEntry {
  file: string
  count: number
}

/**
 * `git log --name-only --oneline -N` の生出力から、ファイル別の変更回数を
 * 集計して降順で返す。空白行 / commit subject 行 (subject = ハッシュ + 空白 +
 * 任意の文字列、空白を含むため src/ で始まる行と区別できる) は捨てる。
 *
 * @param nameOnlyLog `git log --name-only --pretty=format:"%h %s"` の出力
 * @param minCount 何回以上を hotspot とみなすか (default 5)
 */
export function parseHotspots(nameOnlyLog: string, minCount = 5): HotspotEntry[] {
  const counts = new Map<string, number>()
  for (const rawLine of nameOnlyLog.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    // commit subject 行はハッシュ (英数 7+ 文字) + 空白 + 任意 のため、空白を
    // 含む行は捨てる (file path に空白を含むケースは本リポでは存在しない)。
    if (/\s/.test(line)) continue
    counts.set(line, (counts.get(line) ?? 0) + 1)
  }
  const entries: HotspotEntry[] = []
  for (const [file, count] of counts) {
    if (count >= minCount) entries.push({ file, count })
  }
  entries.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))
  return entries
}

export interface FileSize {
  path: string
  lines: number
}

export interface LargeFileViolation {
  path: string
  lines: number
  kind: 'component' | 'service' | 'other'
  threshold: number
}

/**
 * ファイル行数一覧から「巨大ファイル」を抽出。閾値:
 *   - Service (`service.ts` を含む): 300 行
 *   - Component (`.tsx` 拡張子): 250 行
 *   - その他は除外 (誤報を増やさない方針)
 */
export function findLargeFiles(files: FileSize[]): LargeFileViolation[] {
  const out: LargeFileViolation[] = []
  for (const f of files) {
    if (f.path.endsWith('service.ts') && f.lines > 300) {
      out.push({ path: f.path, lines: f.lines, kind: 'service', threshold: 300 })
    } else if (f.path.endsWith('.tsx') && f.lines > 250) {
      out.push({ path: f.path, lines: f.lines, kind: 'component', threshold: 250 })
    }
  }
  out.sort((a, b) => b.lines - a.lines)
  return out
}

/**
 * eslint の標準出力から「✖ N problems (X errors, Y warnings)」 行を見つけて
 * Y を返す。eslint v9 / flat config の行フォーマットに合わせている。
 *
 * - 該当行が無ければ 0 (= warning なし)
 * - 「✖ 1 problem (0 errors, 1 warning)」のように単数形 ("warning") もマッチ
 * - 「N error(s)」のみで warning が無いケースは Y=0
 */
export function parseLintWarnings(eslintOutput: string): number {
  const m = eslintOutput.match(/(\d+)\s+warnings?/)
  return m ? Number(m[1]) : 0
}

/**
 * `git grep -nE '(TODO|FIXME|HACK|あとで)' -- <pathspec>` の生出力から、
 * 「コード上で実際にアクション要求している TODO」だけを数える。
 *
 * 旧実装は `(TODO|FIXME|あとで|hack)` を素朴に grep していたため、本リポでは
 * 製品名 `最強TODO` / 説明文 `TODO サービス` / status enum `'todo'` が大量に
 * ヒットして noise が約 95% を占めていた (iter254 計測で 18 件中 17 件が
 * false positive)。判定 noise が大きいと「割り込み発動条件」が機能しない。
 *
 * 数える条件 (両方満たす):
 *   1. **コメント文脈** に出現すること
 *      - `//` 単行コメント
 *      - `/\* ... *\/` ブロックコメント (開始記号がキーワードより前にある場合)
 *      - JSDoc 継続行 (`^\s*\*\s` で始まる)
 *      - HTML/MDX `<!--`
 *      - shell/Python `#`
 *   2. **アクション接尾** が直後に来ること: `:` または `(`
 *      - 業界慣習: `// TODO: ...` / `// FIXME(name): ...`
 *      - JSDoc 内の `* 1 行 TODO クイック追加。` のような説明文 (接尾なし) は除外
 *
 * 入力フォーマットは `git grep -n` 標準: `path:lineno:content`。malformed 行は
 * 静かに無視。
 */
export function parseCodeTodos(grepOutput: string): number {
  let count = 0
  for (const rawLine of grepOutput.split('\n')) {
    if (rawLine === '') continue
    // path:lineno:content から content を切り出す (3 列目以降)
    const colonIdx1 = rawLine.indexOf(':')
    if (colonIdx1 < 0) continue
    const colonIdx2 = rawLine.indexOf(':', colonIdx1 + 1)
    if (colonIdx2 < 0) continue
    const content = rawLine.slice(colonIdx2 + 1)
    if (isActionableCodeTodo(content)) count++
  }
  return count
}

/**
 * 1 行の content がコメント文脈の actionable TODO を含むかどうか。
 * 内部 helper (export しないが test から呼べると testability が上がるので export)。
 */
export function isActionableCodeTodo(line: string): boolean {
  // アクション接尾を要求: `TODO:` / `TODO(` / `FIXME:` / `FIXME(` / `HACK:` / `HACK(` / `あとで:`
  const KEYWORD_WITH_SUFFIX = /(\b(?:TODO|FIXME|HACK)\b|あとで)\s*[:(]/
  const km = line.match(KEYWORD_WITH_SUFFIX)
  if (!km) return false
  const idx = line.indexOf(km[0])
  const before = line.slice(0, idx)
  // (a) 単行コメント / ブロックコメント開始 / HTML / shell の prefix が
  //     キーワードより前に存在する
  if (/(\/\/|\/\*|<!--|#)/.test(before)) return true
  // (b) JSDoc 継続行: 行頭が空白 + `*` + 空白 — `before` がそのパターンで始まる
  if (/^\s*\*\s/.test(before)) return true
  return false
}

/**
 * unified diff (`git log -N -p` / `git diff`) から「TS の型 escape-hatch」
 * 新規追加行 (`+` で始まる) を数える。
 *
 * 旧実装は `\b(any|as unknown as|@ts-expect-error)\b` を素朴 grep していたため、
 * `recent-any-leak` のような identifier に含まれる "any" 部分文字列にも誤反応
 * していた (iter254 計測で 3 件中 2 件が false positive — patterns.ts/test
 * 自身が触発)。
 *
 * 数えるパターン (TS 構文として意味のある形だけ):
 *   - `: any` / `: any[]` / `: any | T` / `: any & T`     型注釈
 *   - `as any`                                            型 cast
 *   - `as unknown as T`                                   double-cast escape
 *   - `<any>` / `<any,...` / `,any>` / `,any,`            generic 引数
 *   - `@ts-expect-error` / `@ts-ignore`                   escape comment
 *
 * 識別子内の `any` 部分文字列 (`recentAnyLeak` / `recent-any-leak` / `Anyone`)
 * はどれにも該当しないため数えない。`+++ b/...` のような diff filename header
 * 行も除外する。
 */
export function parseAnyLeaks(diff: string): number {
  const PATTERNS = [
    /:\s*any\b/, // : any / : any[] / : any | X
    /\bas\s+any\b/, // as any
    /\bas\s+unknown\s+as\b/, // as unknown as T
    /<\s*any\s*[,>]/, // <any> / <any,
    /,\s*any\s*[,>]/, // ,any> / ,any,
    /@ts-(expect-error|ignore)\b/, // ts-expect-error directive / ts-ignore directive
  ]
  let count = 0
  for (const line of diff.split('\n')) {
    if (!line.startsWith('+')) continue
    if (line.startsWith('+++')) continue // diff filename header
    for (const re of PATTERNS) {
      if (re.test(line)) {
        count++
        break // 1 行 = 1 件 (複数 escape-hatch を含む 1 行を二重計上しない)
      }
    }
  }
  return count
}

export interface RefactorSignals {
  lintWarnings: number
  todoCount: number
  recentAnyLeak: number
  hotspotCount: number
  largeFileCount: number
}

/**
 * 各 signal が割り込み条件を満たすかの判定を 1 箇所に集約。
 * detect-patterns.sh の最後に「Triggered: ...」表示するために使う。
 */
export function evaluateRefactorTriggers(s: RefactorSignals): string[] {
  const triggers: string[] = []
  if (s.lintWarnings >= 10) triggers.push(`lint-warnings≥10(=${s.lintWarnings})`)
  if (s.todoCount >= 5) triggers.push(`todo-fixme≥5(=${s.todoCount})`)
  if (s.recentAnyLeak >= 1) triggers.push(`recent-any-leak(=${s.recentAnyLeak})`)
  if (s.hotspotCount >= 1) triggers.push(`hotspot-files(=${s.hotspotCount})`)
  if (s.largeFileCount >= 1) triggers.push(`large-files(=${s.largeFileCount})`)
  return triggers
}
