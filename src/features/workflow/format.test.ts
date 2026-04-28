import { describe, expect, it } from 'vitest'

import { formatRunDuration, formatRunTime, type RunTimeFields } from './format'

// RunTimeFields は DateLike (Date | string | null | undefined) を受けるので
// fixture は cast 不要で string も Date も直接渡せる。
const run = (overrides: Partial<RunTimeFields>): RunTimeFields => ({
  startedAt: null,
  createdAt: null,
  finishedAt: null,
  ...overrides,
})

describe('formatRunTime', () => {
  // toLocaleString('ja-JP') は実行環境 TZ に依存するので、TZ 非依存な
  // "ja-JP らしい形式 (YYYY/M/D HH:MM:SS)" の構造のみを検証する。
  const JA_DATETIME = /^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}$/

  it('startedAt があればそれを優先 (ja-JP)', () => {
    const r = run({
      startedAt: new Date('2026-04-25T08:30:00Z'),
      createdAt: new Date('2026-04-25T08:00:00Z'),
    })
    const out = formatRunTime(r)
    expect(out).toMatch(JA_DATETIME)
    // startedAt(8:30) を使う = createdAt(8:00) と異なる出力
    expect(out).not.toBe(formatRunTime(run({ createdAt: r.createdAt })))
  })

  it('startedAt が無い場合 createdAt を使う', () => {
    const r = run({ createdAt: new Date('2026-04-25T07:00:00Z') })
    expect(formatRunTime(r)).toMatch(JA_DATETIME)
  })

  it('Date でなく ISO 文字列でも正しく整形 (Drizzle JSON 由来)', () => {
    const r = run({ startedAt: '2026-04-25T08:30:00Z' })
    expect(formatRunTime(r)).toMatch(JA_DATETIME)
  })

  it('どちらも無ければ "—"', () => {
    expect(formatRunTime(run({}))).toBe('—')
  })

  it('不正な日付文字列は "—" (fail-safe)', () => {
    const r = run({ startedAt: 'not-a-date' })
    expect(formatRunTime(r)).toBe('—')
  })

  it('不正な日付文字列でも createdAt fallback は効く', () => {
    const r = run({
      startedAt: 'broken',
      createdAt: new Date('2026-04-25T07:00:00Z'),
    })
    expect(formatRunTime(r)).toMatch(JA_DATETIME)
  })
})

describe('formatRunDuration', () => {
  const start = new Date('2026-04-25T08:00:00.000Z')

  it('1 秒未満は ms 表示', () => {
    const r = run({ startedAt: start, finishedAt: new Date(start.getTime() + 250) })
    expect(formatRunDuration(r)).toBe('250ms')
  })

  it('1 秒〜60 秒は 1 桁小数の s 表示', () => {
    const r = run({ startedAt: start, finishedAt: new Date(start.getTime() + 1500) })
    expect(formatRunDuration(r)).toBe('1.5s')
    const r2 = run({ startedAt: start, finishedAt: new Date(start.getTime() + 12_345) })
    expect(formatRunDuration(r2)).toBe('12.3s')
  })

  it('60 秒以上は 1 桁小数の m 表示', () => {
    const r = run({ startedAt: start, finishedAt: new Date(start.getTime() + 90_000) })
    expect(formatRunDuration(r)).toBe('1.5m')
  })

  it('startedAt or finishedAt が欠損なら "—"', () => {
    expect(formatRunDuration(run({ startedAt: start }))).toBe('—')
    expect(formatRunDuration(run({ finishedAt: start }))).toBe('—')
    expect(formatRunDuration(run({}))).toBe('—')
  })

  it('ISO 文字列 (Drizzle JSON 由来) も受理', () => {
    const r = run({
      startedAt: '2026-04-25T08:00:00.000Z',
      finishedAt: '2026-04-25T08:00:01.500Z',
    })
    expect(formatRunDuration(r)).toBe('1.5s')
  })

  it('不正な日付は "—" (fail-safe)', () => {
    const r = run({
      startedAt: 'invalid',
      finishedAt: start,
    })
    expect(formatRunDuration(r)).toBe('—')
  })

  it('finishedAt 側だけ不正でも "—"', () => {
    const r = run({ startedAt: start, finishedAt: 'broken' })
    expect(formatRunDuration(r)).toBe('—')
  })
})
