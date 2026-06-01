import { describe, expect, it } from 'vitest'

import {
  buildJudgeReport,
  decideBaseTrack,
  formatJudgeReport,
  parseIterFromGitLog,
} from './iter-info'

describe('parseIterFromGitLog', () => {
  it('returns 0 when no iter token present', () => {
    expect(parseIterFromGitLog('abc123 chore: bump version')).toBe(0)
    expect(parseIterFromGitLog('')).toBe(0)
  })

  it('extracts a single iter from a one-line log', () => {
    expect(parseIterFromGitLog('aaa feat(today): foo [iter253 basics 1/3]')).toBe(253)
  })

  it('returns the maximum iter across multiple lines', () => {
    const log = [
      '23be908 feat(today): kbd cursor [iter253 basics]',
      'b2bbe06 fix(phase6.15): conflict retry [iter252]',
      '88fca00 chore: HANDOFF.md iter250 記録',
      '7c6f435 feat(phase6.15): timer (iter249)',
    ].join('\n')
    expect(parseIterFromGitLog(log)).toBe(253)
  })

  it('handles bare "iterN" form without brackets', () => {
    expect(parseIterFromGitLog('a b c iter42 d e')).toBe(42)
  })

  it('ignores numbers that are not preceded by "iter"', () => {
    // "v253" / "phase6.15" 等の merely-digit token を iter として誤検出しない
    expect(parseIterFromGitLog('aaa v253 phase6.15 release')).toBe(0)
  })

  it('returns max iter when multiple iter tokens appear on the same line', () => {
    // 1 行に複数 iter が出る (rebase / merge commit / 引用 commit body 等) ケース
    expect(parseIterFromGitLog('feat: iter5 続編、iter12 で foo / iter9 で bar')).toBe(12)
  })

  it('ignores "iter" without a digit suffix', () => {
    // "iteration" / "literally" 等は "iter" + 非 digit のため非マッチ
    expect(parseIterFromGitLog('aaa iteration test iter loop')).toBe(0)
  })

  it('iter1658: chore(handoff) で iter\\d+ が subject に含まれる commit (HANDOFF entry 形式) も max に寄与', () => {
    // 実 fire で頻発する HANDOFF chore commit パターン:
    //  `chore(handoff): iter1657 §9 — ...`
    //  `chore(handoff): playwright-iter1652 §9 — ...`
    // どちらも iter\d+ regex でマッチして max 計算に寄与することを確認
    const log = [
      'aaa chore(handoff): iter1657 §9 — ...',
      'bbb chore(handoff): playwright-iter1655 §9 — ...',
      'ccc test(focus): [iter1653 basics 1/1]',
    ].join('\n')
    // max = 1657 (chore(handoff) 形式が一番大きい)
    expect(parseIterFromGitLog(log)).toBe(1657)
  })

  it('iter1654: `[iter1653 basics 1/1]` 形式 + `playwright-iter1652` 形式の混在を正しく max 抽出', () => {
    // 実運用で 2 commit subject 形式が混在 (本 fire iter1620+ で観測):
    // - in-session loop: `[iter<N> <track> <i>/<j>]` 形式
    // - playwright fire: `playwright-iter<N>` 形式 (prefix `playwright-` あり)
    // parseIterFromGitLog は両形式とも `iter\d+` regex で抽出するため max は安定。
    const log = [
      'aaa test(global-shortcuts): G_PREFIX_VIEWS invariant test [iter1653 basics 1/1]',
      'bbb chore(handoff): playwright-iter1652 §9 — picker / template mobile h-11',
      'ccc fix(phase6.15): mobile h-11 picker [playwright-iter1651 1/1 mode-M]',
    ].join('\n')
    expect(parseIterFromGitLog(log)).toBe(1653)
  })

  it('並行 fire iter 番号衝突 — 同 iter が複数 commit に出ても max が安定 (重複した iter は新規 iter ではない)', () => {
    // 実際の運用パターン (iter1625 で並行 fire の 2 agent が同 iter 番号を使った例):
    // - 'feat(focus-form-cta) [iter1625 refactor 1/1]'   ← parallel A
    // - 'fix(pdca-panel) [playwright-iter1625 1/1]'      ← parallel B
    // → parseIterFromGitLog は max = 1625 を返す (=  並行 fire の重複番号でも前進判定が安定)。
    // 次 iter は 1626 になる (NOT 1627、衝突を「+1」 は重複呼び出しのため次 iter で実態追従)。
    const log = [
      'aaaa feat(focus-form-cta): A [iter1625 refactor 1/1]',
      'bbbb fix(pdca-panel): B [playwright-iter1625 1/1]',
      'cccc chore(handoff): iter1624 §9',
    ].join('\n')
    expect(parseIterFromGitLog(log)).toBe(1625)
  })
})

describe('decideBaseTrack', () => {
  it('% 5 == 1 → basics', () => {
    expect(decideBaseTrack(1)).toBe('basics')
    expect(decideBaseTrack(251)).toBe('basics')
  })

  it('% 5 == 2 → ai-automation', () => {
    expect(decideBaseTrack(2)).toBe('ai-automation')
    expect(decideBaseTrack(252)).toBe('ai-automation')
  })

  it('% 5 == 3 → basics', () => {
    expect(decideBaseTrack(3)).toBe('basics')
    expect(decideBaseTrack(253)).toBe('basics')
  })

  it('% 5 == 4 → ai-automation', () => {
    expect(decideBaseTrack(4)).toBe('ai-automation')
    expect(decideBaseTrack(254)).toBe('ai-automation')
  })

  it('% 5 == 0 → refactor', () => {
    expect(decideBaseTrack(5)).toBe('refactor')
    expect(decideBaseTrack(250)).toBe('refactor')
  })

  it('iter 0 / negative falls back to basics (cold start)', () => {
    expect(decideBaseTrack(0)).toBe('basics')
    expect(decideBaseTrack(-1)).toBe('basics')
  })
})

describe('buildJudgeReport / formatJudgeReport', () => {
  it('builds a coherent report and renders human-friendly output', () => {
    const log = ['23be908 feat(today): foo [iter253 basics]', 'b2bbe06 fix: bar [iter252]'].join(
      '\n',
    )
    const report = buildJudgeReport(log)
    expect(report.latestIter).toBe(253)
    expect(report.nextIter).toBe(254)
    expect(report.baseTrack).toBe('ai-automation')

    const out = formatJudgeReport(report)
    expect(out).toContain('Latest iter: 253')
    expect(out).toContain('Next iter:   254')
    expect(out).toContain('ai-automation')
    expect(out).toContain('next % 5 = 4')
    expect(out).toContain('23be908')
  })

  it('handles empty log (cold start) → defaults to basics for iter 1', () => {
    const report = buildJudgeReport('')
    expect(report.latestIter).toBe(0)
    expect(report.nextIter).toBe(1)
    expect(report.baseTrack).toBe('basics')

    const out = formatJudgeReport(report)
    expect(out).toContain('(no commits)')
  })
})
