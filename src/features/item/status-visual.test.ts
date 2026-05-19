/**
 * Phase 6.15 iter — status-visual.ts pure helper の単体テスト。
 *
 * subtask-status.ts から昇格 + shortLabel 追加 + done 配色を slate→emerald に
 * 寄せた (既存 status-badge.tsx の配色と整合)。
 */
import { describe, expect, it } from 'vitest'

import {
  countItemsByStatus,
  formatStatusCounts,
  getStatusVisual,
  groupItemsByStatus,
  isTerminalStatus,
  KNOWN_STATUS_KEYS,
  statusCountsToSeverityCounts,
  type StatusIconKey,
  statusKeySeverity,
} from './status-visual'

describe('getStatusVisual', () => {
  it('todo は slate 系 + circle icon', () => {
    const c = getStatusVisual('todo')
    expect(c.label).toContain('TODO')
    expect(c.shortLabel).toBe('TODO')
    expect(c.iconKey).toBe<StatusIconKey>('circle')
    expect(c.bgClass).toContain('slate')
    expect(c.textClass).toContain('slate')
  })

  it('in_progress は blue 系 + progress icon', () => {
    const c = getStatusVisual('in_progress')
    expect(c.label).toBe('進行中')
    expect(c.shortLabel).toBe('進行中')
    expect(c.iconKey).toBe<StatusIconKey>('progress')
    expect(c.bgClass).toContain('blue')
    expect(c.textClass).toContain('blue')
  })

  it('done は emerald 系 + done icon', () => {
    const c = getStatusVisual('done')
    expect(c.label).toBe('完了')
    expect(c.iconKey).toBe<StatusIconKey>('done')
    expect(c.bgClass).toContain('emerald')
    expect(c.textClass).toContain('emerald')
  })

  it('cancelled は zinc 系 + cancel icon + line-through', () => {
    const c = getStatusVisual('cancelled')
    expect(c.label).toBe('キャンセル')
    expect(c.iconKey).toBe<StatusIconKey>('cancel')
    expect(c.textClass).toContain('line-through')
  })

  it('blocked は amber 系 + block icon + 短縮ラベル "blocked"', () => {
    const c = getStatusVisual('blocked')
    expect(c.iconKey).toBe<StatusIconKey>('block')
    expect(c.bgClass).toContain('amber')
    expect(c.label).toContain('依存待ち')
    expect(c.shortLabel).toBe('blocked')
  })

  it('未知 key は unknown config に fallback', () => {
    const c = getStatusVisual('custom-foo-bar')
    expect(c.label).toBe('不明')
    expect(c.iconKey).toBe<StatusIconKey>('unknown')
    expect(c.bgClass).toContain('zinc')
  })

  it('null / undefined / 空文字も unknown config に fallback (落ちない)', () => {
    expect(getStatusVisual(null).iconKey).toBe<StatusIconKey>('unknown')
    expect(getStatusVisual(undefined).iconKey).toBe<StatusIconKey>('unknown')
    expect(getStatusVisual('').iconKey).toBe<StatusIconKey>('unknown')
  })

  it('KNOWN_STATUS_KEYS は 5 件 (todo/in_progress/done/cancelled/blocked)', () => {
    expect(KNOWN_STATUS_KEYS).toHaveLength(5)
    expect(KNOWN_STATUS_KEYS).toContain('todo')
    expect(KNOWN_STATUS_KEYS).toContain('in_progress')
    expect(KNOWN_STATUS_KEYS).toContain('done')
    expect(KNOWN_STATUS_KEYS).toContain('cancelled')
    expect(KNOWN_STATUS_KEYS).toContain('blocked')
  })

  it('全既知 key で iconKey が unknown 以外 + shortLabel が空でない', () => {
    for (const k of KNOWN_STATUS_KEYS) {
      const c = getStatusVisual(k)
      expect(c.iconKey).not.toBe<StatusIconKey>('unknown')
      expect(c.shortLabel.length).toBeGreaterThan(0)
    }
  })
})

describe('groupItemsByStatus', () => {
  it('status 別に items を振り分け、順序は元配列順を保つ', () => {
    const items = [
      { id: 'a', status: 'todo' },
      { id: 'b', status: 'in_progress' },
      { id: 'c', status: 'todo' },
      { id: 'd', status: 'done' },
      { id: 'e', status: 'blocked' },
      { id: 'f', status: 'cancelled' },
    ]
    const groups = groupItemsByStatus(items)
    expect(groups.todo.map((i) => i.id)).toEqual(['a', 'c'])
    expect(groups.in_progress.map((i) => i.id)).toEqual(['b'])
    expect(groups.done.map((i) => i.id)).toEqual(['d'])
    expect(groups.blocked.map((i) => i.id)).toEqual(['e'])
    expect(groups.cancelled.map((i) => i.id)).toEqual(['f'])
    expect(groups.unknown).toEqual([])
  })

  it('未知 / null / undefined / 空文字 / カスタム status は unknown bucket に集約', () => {
    const items = [
      { id: 'a', status: null },
      { id: 'b', status: undefined },
      { id: 'c', status: '' },
      { id: 'd', status: 'custom-foo' },
      { id: 'e', status: 'todo' },
    ]
    const groups = groupItemsByStatus(items)
    expect(groups.unknown.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(groups.todo.map((i) => i.id)).toEqual(['e'])
  })

  it('空配列でも 6 つの bucket が空配列で初期化される', () => {
    const groups = groupItemsByStatus([])
    expect(groups.todo).toEqual([])
    expect(groups.in_progress).toEqual([])
    expect(groups.done).toEqual([])
    expect(groups.cancelled).toEqual([])
    expect(groups.blocked).toEqual([])
    expect(groups.unknown).toEqual([])
  })
})

describe('countItemsByStatus', () => {
  it('status 別に件数を集計', () => {
    const items = [
      { status: 'todo' },
      { status: 'todo' },
      { status: 'in_progress' },
      { status: 'done' },
      { status: 'done' },
      { status: 'done' },
      { status: 'blocked' },
    ]
    expect(countItemsByStatus(items)).toEqual({
      todo: 2,
      in_progress: 1,
      done: 3,
      cancelled: 0,
      blocked: 1,
      unknown: 0,
    })
  })

  it('null / undefined / カスタムは unknown 件数に加算', () => {
    const items = [
      { status: null },
      { status: undefined },
      { status: 'custom-foo' },
      { status: 'todo' },
    ]
    expect(countItemsByStatus(items)).toEqual({
      todo: 1,
      in_progress: 0,
      done: 0,
      cancelled: 0,
      blocked: 0,
      unknown: 3,
    })
  })

  it('空配列は全 0', () => {
    expect(countItemsByStatus([])).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
      blocked: 0,
      unknown: 0,
    })
  })
})

describe('formatStatusCounts', () => {
  it('AI prompt 用の 1 行 summary を返す (件数 0 の bucket は省略)', () => {
    expect(
      formatStatusCounts({
        todo: 2,
        in_progress: 1,
        done: 3,
        cancelled: 0,
        blocked: 1,
        unknown: 0,
      }),
    ).toBe('TODO 2 / 進行中 1 / blocked 1 / 完了 3')
  })

  it('一部の bucket だけ件数があれば、その分だけ表示', () => {
    expect(
      formatStatusCounts({
        todo: 0,
        in_progress: 5,
        done: 0,
        cancelled: 0,
        blocked: 0,
        unknown: 0,
      }),
    ).toBe('進行中 5')
  })

  it('全 0 件は "0 件"', () => {
    expect(
      formatStatusCounts({
        todo: 0,
        in_progress: 0,
        done: 0,
        cancelled: 0,
        blocked: 0,
        unknown: 0,
      }),
    ).toBe('0 件')
  })

  it('順序は todo → 進行中 → blocked → 完了 → キャンセル → 不明 (実用視認順、key 順非依存)', () => {
    expect(
      formatStatusCounts({
        unknown: 1,
        cancelled: 1,
        done: 1,
        blocked: 1,
        in_progress: 1,
        todo: 1,
      }),
    ).toBe('TODO 1 / 進行中 1 / blocked 1 / 完了 1 / キャンセル 1 / 不明 1')
  })
})

describe('statusKeySeverity', () => {
  it('todo → muted (グレー、未着手)', () => {
    expect(statusKeySeverity('todo')).toBe('muted')
  })

  it('in_progress → info (青、healthy in-progress)', () => {
    expect(statusKeySeverity('in_progress')).toBe('info')
  })

  it('blocked → warn (黄、依存待ち)', () => {
    expect(statusKeySeverity('blocked')).toBe('warn')
  })

  it('done → ok (緑、完了)', () => {
    expect(statusKeySeverity('done')).toBe('ok')
  })

  it('cancelled → muted (グレー、過去)', () => {
    expect(statusKeySeverity('cancelled')).toBe('muted')
  })

  it('未知 / null / undefined / 空文字 は unknown → muted に集約', () => {
    expect(statusKeySeverity(null)).toBe('muted')
    expect(statusKeySeverity(undefined)).toBe('muted')
    expect(statusKeySeverity('')).toBe('muted')
    expect(statusKeySeverity('custom-status')).toBe('muted')
  })

  it('全 既知 status で 5 段階 Severity のいずれかを返す', () => {
    const validSev = ['ok', 'info', 'warn', 'danger', 'muted']
    for (const s of ['todo', 'in_progress', 'blocked', 'done', 'cancelled']) {
      expect(validSev).toContain(statusKeySeverity(s))
    }
  })
})

describe('statusCountsToSeverityCounts', () => {
  it('status counts を 5 段 severity counts に集約', () => {
    expect(
      statusCountsToSeverityCounts({
        todo: 5,
        in_progress: 2,
        blocked: 1,
        done: 3,
        cancelled: 1,
        unknown: 0,
      }),
    ).toEqual({
      ok: 3, // done
      info: 2, // in_progress
      warn: 1, // blocked
      danger: 0,
      muted: 6, // todo (5) + cancelled (1) + unknown (0)
    })
  })

  it('全 0 → 全 severity 0', () => {
    expect(
      statusCountsToSeverityCounts({
        todo: 0,
        in_progress: 0,
        blocked: 0,
        done: 0,
        cancelled: 0,
        unknown: 0,
      }),
    ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
  })

  it('合計が status 件数の合計と一致 (集約だけで増減しない)', () => {
    const counts = { todo: 5, in_progress: 2, blocked: 1, done: 3, cancelled: 1, unknown: 0 }
    const sevCounts = statusCountsToSeverityCounts(counts)
    const statusTotal = Object.values(counts).reduce((a, b) => a + b, 0)
    const sevTotal =
      sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
    expect(sevTotal).toBe(statusTotal)
  })

  it('status は danger bucket には出ない (status 軸では「致命」は無い)', () => {
    const r = statusCountsToSeverityCounts({
      todo: 1,
      in_progress: 1,
      blocked: 1,
      done: 1,
      cancelled: 1,
      unknown: 1,
    })
    expect(r.danger).toBe(0)
  })
})

describe('isTerminalStatus (iter1015)', () => {
  it("'done' / 'cancelled' は true", () => {
    expect(isTerminalStatus('done')).toBe(true)
    expect(isTerminalStatus('cancelled')).toBe(true)
  })

  it("'todo' / 'in_progress' / 'blocked' / 'unknown' は false", () => {
    expect(isTerminalStatus('todo')).toBe(false)
    expect(isTerminalStatus('in_progress')).toBe(false)
    expect(isTerminalStatus('blocked')).toBe(false)
    expect(isTerminalStatus('unknown')).toBe(false)
  })

  it('null / undefined / 空文字 は false (= 終端と見做さない)', () => {
    expect(isTerminalStatus(null)).toBe(false)
    expect(isTerminalStatus(undefined)).toBe(false)
    expect(isTerminalStatus('')).toBe(false)
  })

  it('未知 string も false', () => {
    expect(isTerminalStatus('archived')).toBe(false)
    expect(isTerminalStatus('paused')).toBe(false)
  })
})
