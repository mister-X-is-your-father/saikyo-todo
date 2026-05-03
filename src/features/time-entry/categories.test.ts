/**
 * iter672 chore: time-entry categories の単体テスト。test 不在解消。
 *
 * 稼働カテゴリ enum (5 種) と `categoryLabel(key)` の lookup-with-fallback を検証。
 * unknown key は input そのまま返す (= 表示用 fallback)。
 */
import { describe, expect, it } from 'vitest'

import { categoryLabel, TIME_ENTRY_CATEGORIES, TimeEntryCategorySchema } from './categories'

describe('TIME_ENTRY_CATEGORIES', () => {
  it('5 件の固定カテゴリを持つ', () => {
    expect(TIME_ENTRY_CATEGORIES).toHaveLength(5)
    expect(TIME_ENTRY_CATEGORIES.map((c) => c.key)).toEqual([
      'dev',
      'meeting',
      'research',
      'ops',
      'other',
    ])
  })

  it('各 entry は key + label を持つ', () => {
    for (const c of TIME_ENTRY_CATEGORIES) {
      expect(typeof c.key).toBe('string')
      expect(typeof c.label).toBe('string')
      expect(c.key.length).toBeGreaterThan(0)
      expect(c.label.length).toBeGreaterThan(0)
    }
  })
})

describe('TimeEntryCategorySchema', () => {
  it('既知 key を accept', () => {
    expect(TimeEntryCategorySchema.parse('dev')).toBe('dev')
    expect(TimeEntryCategorySchema.parse('meeting')).toBe('meeting')
    expect(TimeEntryCategorySchema.parse('other')).toBe('other')
  })

  it('未知 key を reject', () => {
    expect(() => TimeEntryCategorySchema.parse('unknown')).toThrow()
    expect(() => TimeEntryCategorySchema.parse('')).toThrow()
  })
})

describe('categoryLabel', () => {
  it('既知 key → 日本語ラベル', () => {
    expect(categoryLabel('dev')).toBe('開発')
    expect(categoryLabel('meeting')).toBe('MTG')
    expect(categoryLabel('research')).toBe('調査')
    expect(categoryLabel('ops')).toBe('運用')
    expect(categoryLabel('other')).toBe('その他')
  })

  it('未知 key → input そのまま (= 表示 fallback)', () => {
    expect(categoryLabel('unknown')).toBe('unknown')
    expect(categoryLabel('legacy-cat')).toBe('legacy-cat')
  })

  it('空文字 → 空文字 (= fallback)', () => {
    expect(categoryLabel('')).toBe('')
  })
})
