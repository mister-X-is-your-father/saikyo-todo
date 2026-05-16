/**
 * iter490 format-duration の unit test (lib 集約版)。pure helper、I/O 非依存。
 *
 * 元 test (`time-entry/category-summary.test.ts` の formatMinutes 24 件) は再 import
 * path 経由で継続 PASS。本 file は新 path での確認 + 本 helper 固有 fail-soft の補強。
 */
import { describe, expect, it } from 'vitest'

import { formatMinutes, formatMinutesJa } from './format-duration'

describe('formatMinutes (canonical 定義、iter490 集約)', () => {
  it('60 未満 → "Mmin"', () => {
    expect(formatMinutes(0)).toBe('0min')
    expect(formatMinutes(15)).toBe('15min')
    expect(formatMinutes(59)).toBe('59min')
  })

  it('60 倍数 → "Hh"', () => {
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(480)).toBe('8h')
  })

  it('混合 → "Hh Mmin"', () => {
    expect(formatMinutes(90)).toBe('1h 30min')
    expect(formatMinutes(135)).toBe('2h 15min')
  })

  it('小数は round (89.4 → 1h 29min, 89.6 → 1h 30min)', () => {
    expect(formatMinutes(89.4)).toBe('1h 29min')
    expect(formatMinutes(89.6)).toBe('1h 30min')
  })

  it('不正値 (負 / NaN / Infinity) → 0min fail-soft', () => {
    expect(formatMinutes(-100)).toBe('0min')
    expect(formatMinutes(NaN)).toBe('0min')
    expect(formatMinutes(Infinity)).toBe('0min')
    expect(formatMinutes(-Infinity)).toBe('0min')
  })

  it('境界 boundary: round が 60 倍数を跨ぐと "Hh" に格上げ (59.6 → 1h、59.4 → 59min)', () => {
    expect(formatMinutes(59.6)).toBe('1h')
    expect(formatMinutes(59.4)).toBe('59min')
    expect(formatMinutes(119.6)).toBe('2h')
    expect(formatMinutes(119.4)).toBe('1h 59min')
  })

  it('大入力 (1 日超): 24h+ も正しく "Hh Mmin" を返す', () => {
    expect(formatMinutes(1440)).toBe('24h')
    expect(formatMinutes(1500)).toBe('25h')
    expect(formatMinutes(1530)).toBe('25h 30min')
    expect(formatMinutes(7200)).toBe('120h')
    expect(formatMinutes(10080)).toBe('168h')
  })
})

describe('formatMinutesJa (iter801 — ja-JP 表記版、Slack/AI brief 用)', () => {
  it('60 未満 → "M分"', () => {
    expect(formatMinutesJa(0)).toBe('0分')
    expect(formatMinutesJa(15)).toBe('15分')
    expect(formatMinutesJa(59)).toBe('59分')
  })

  it('60 倍数 → "H時間"', () => {
    expect(formatMinutesJa(60)).toBe('1時間')
    expect(formatMinutesJa(120)).toBe('2時間')
    expect(formatMinutesJa(480)).toBe('8時間')
  })

  it('混合 → "H時間M分"', () => {
    expect(formatMinutesJa(90)).toBe('1時間30分')
    expect(formatMinutesJa(135)).toBe('2時間15分')
  })

  it('小数は round (89.4 → 1時間29分)', () => {
    expect(formatMinutesJa(89.4)).toBe('1時間29分')
    expect(formatMinutesJa(89.6)).toBe('1時間30分')
  })

  it('不正値 (負 / NaN / Infinity) → 0分 fail-soft (formatMinutes と同 extreme)', () => {
    expect(formatMinutesJa(-100)).toBe('0分')
    expect(formatMinutesJa(NaN)).toBe('0分')
    expect(formatMinutesJa(Infinity)).toBe('0分')
    expect(formatMinutesJa(-Infinity)).toBe('0分')
  })

  it('formatMinutes と output 形式は異なる (en vs ja 棲み分け)', () => {
    expect(formatMinutes(90)).toBe('1h 30min')
    expect(formatMinutesJa(90)).toBe('1時間30分')
  })

  it('境界 boundary: round が 60 倍数を跨ぐと "H時間" に格上げ (59.6 → 1時間、59.4 → 59分)', () => {
    expect(formatMinutesJa(59.6)).toBe('1時間')
    expect(formatMinutesJa(59.4)).toBe('59分')
    expect(formatMinutesJa(119.6)).toBe('2時間')
    expect(formatMinutesJa(119.4)).toBe('1時間59分')
  })

  it('大入力 (1 日超): 24時間+ も正しく "H時間M分" を返す', () => {
    expect(formatMinutesJa(1440)).toBe('24時間')
    expect(formatMinutesJa(1500)).toBe('25時間')
    expect(formatMinutesJa(1530)).toBe('25時間30分')
    expect(formatMinutesJa(7200)).toBe('120時間')
    expect(formatMinutesJa(10080)).toBe('168時間')
  })
})
