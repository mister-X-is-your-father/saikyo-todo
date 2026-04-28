/**
 * autonomous loop の iter 番号 + base track 決定を司る pure module。
 *
 * `scripts/autonomous/judge.sh` の bash 実装と意味的に等価。bash 側がプロセス
 * 起動コストを避けて高速に判定する一方、本 TS は規約 (% 5 マップ・iter 抽出
 * regex) の唯一の正解として unit test される。bash と TS が乖離したらここの
 * test が落ちないので、bash 修正時は本ファイルも追従させる。
 */

export type BaseTrack = 'basics' | 'ai-automation' | 'refactor'

/**
 * `git log --oneline -N` の標準出力から最大 iter 番号を抽出する。
 *
 * - `iter\d+` を全行から拾い、整数として最大値を返す
 * - 見つからなければ 0 (= まだ autonomous loop 未開始扱い)
 *
 * commit message が `[iter253 basics 1/3]` のように装飾されていても、`iter247`
 * のような bare 形式でも、両方マッチする。
 */
export function parseIterFromGitLog(log: string): number {
  const matches = log.matchAll(/iter(\d+)/g)
  let max = 0
  for (const m of matches) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}

/**
 * iter 番号 → base track の写像 (CLAUDE.md / メインプロンプトと同期)。
 *
 *   % 5 == 1, 3 → basics
 *   % 5 == 2, 4 → ai-automation
 *   % 5 == 0    → refactor
 *
 * iter 0 は「未開始」扱いで basics に振る (最初の機能 commit が安全)。
 */
export function decideBaseTrack(iter: number): BaseTrack {
  if (iter <= 0) return 'basics'
  const m = iter % 5
  if (m === 0) return 'refactor'
  if (m === 2 || m === 4) return 'ai-automation'
  return 'basics'
}

export interface JudgeReport {
  latestIter: number
  nextIter: number
  baseTrack: BaseTrack
  /** `git log --oneline -N` の生出力 (1 行 1 commit) */
  recentLog: string
}

/**
 * ヒューマン向けに整形した judge レポートを返す。
 * scripts/autonomous/judge.sh の expected output と同フォーマット。
 */
export function formatJudgeReport(r: JudgeReport): string {
  const trimmed = r.recentLog.trimEnd()
  const lines = [
    '=== iter judge ===',
    `Latest iter: ${r.latestIter}`,
    `Next iter:   ${r.nextIter}`,
    `Base track:  ${r.baseTrack}  (next % 5 = ${r.nextIter % 5})`,
    '',
    'Recent commits:',
    trimmed.length > 0 ? trimmed : '  (no commits)',
  ]
  return lines.join('\n')
}

/**
 * git log raw output を受けて完全な report オブジェクトを組み立てる便利関数。
 * 副作用なし — script からの呼び出し点を 1 箇所に集約するため。
 */
export function buildJudgeReport(recentLog: string): JudgeReport {
  const latestIter = parseIterFromGitLog(recentLog)
  const nextIter = latestIter + 1
  return {
    latestIter,
    nextIter,
    baseTrack: decideBaseTrack(nextIter),
    recentLog,
  }
}
