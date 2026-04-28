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
