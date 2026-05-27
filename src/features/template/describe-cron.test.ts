import { describe, expect, it } from 'vitest'

import { describeCronJa } from './describe-cron'

describe('describeCronJa', () => {
  it('毎日', () => {
    expect(describeCronJa('0 9 * * *')).toBe('毎日 9:00')
    expect(describeCronJa('30 18 * * *')).toBe('毎日 18:30')
  })

  it('平日 (1-5)', () => {
    expect(describeCronJa('0 9 * * 1-5')).toBe('平日 9:00')
  })

  it('平日 (comma list 1,2,3,4,5 も同一視)', () => {
    expect(describeCronJa('0 9 * * 1,2,3,4,5')).toBe('平日 9:00')
  })

  it('週末 (0,6)', () => {
    expect(describeCronJa('0 10 * * 0,6')).toBe('週末 10:00')
    expect(describeCronJa('0 10 * * 6,0')).toBe('週末 10:00')
    expect(describeCronJa('0 10 * * 6,7')).toBe('週末 10:00') // 7=日曜
  })

  it('毎週 単一曜日', () => {
    expect(describeCronJa('30 9 * * 1')).toBe('毎週月曜 9:30')
    expect(describeCronJa('0 9 * * 0')).toBe('毎週日曜 9:00')
    expect(describeCronJa('0 9 * * 7')).toBe('毎週日曜 9:00') // 7 normalize → 日
  })

  it('毎週 複数曜日 (・区切り、曜日順ソート)', () => {
    expect(describeCronJa('0 9 * * 1,3,5')).toBe('毎週月・水・金 9:00')
    expect(describeCronJa('0 9 * * 5,1,3')).toBe('毎週月・水・金 9:00') // ソート
  })

  it('毎月 D 日', () => {
    expect(describeCronJa('0 9 1 * *')).toBe('毎月1日 9:00')
    expect(describeCronJa('0 9 15 * *')).toBe('毎月15日 9:00')
  })

  it('前後の空白を吸収', () => {
    expect(describeCronJa('  0 9 * * *  ')).toBe('毎日 9:00')
  })

  it('5 field でない → カスタム fallback', () => {
    expect(describeCronJa('0 9 * *')).toBe('カスタム (0 9 * *)')
    expect(describeCronJa('*/15 * * * *')).toBe('カスタム (*/15 * * * *)')
  })

  it('分/時が範囲・ステップ → fallback (誤訳しない)', () => {
    expect(describeCronJa('0 */2 * * *')).toBe('カスタム (0 */2 * * *)')
    expect(describeCronJa('0-30 9 * * *')).toBe('カスタム (0-30 9 * * *)')
  })

  it('月指定あり → fallback', () => {
    expect(describeCronJa('0 9 1 1 *')).toBe('カスタム (0 9 1 1 *)')
  })

  it('dom と dow 両方指定 → fallback', () => {
    expect(describeCronJa('0 9 1 * 1')).toBe('カスタム (0 9 1 * 1)')
  })

  it('範囲外の値 → fallback', () => {
    expect(describeCronJa('0 25 * * *')).toBe('カスタム (0 25 * * *)') // hour 25
    expect(describeCronJa('0 9 32 * *')).toBe('カスタム (0 9 32 * *)') // dom 32
    expect(describeCronJa('0 9 * * 8')).toBe('カスタム (0 9 * * 8)') // dow 8
  })
})
