import { describe, expect, it } from 'vitest'

import {
  countOwnPrivateSchedules,
  filterSchedulesForViewer,
  isScheduleVisibleTo,
  type ScheduleVisibilityCheckable,
} from './visibility-filter'

const me = 'user-me'
const other = 'user-other'

function mk(over: Partial<ScheduleVisibilityCheckable> = {}): ScheduleVisibilityCheckable {
  return { visibility: 'workspace', createdBy: me, ...over }
}

describe('isScheduleVisibleTo', () => {
  it('workspace は全員見える', () => {
    expect(isScheduleVisibleTo(mk({ visibility: 'workspace', createdBy: other }), me)).toBe(true)
  })

  it('private は本人だけ見える', () => {
    expect(isScheduleVisibleTo(mk({ visibility: 'private', createdBy: me }), me)).toBe(true)
    expect(isScheduleVisibleTo(mk({ visibility: 'private', createdBy: other }), me)).toBe(false)
  })
})

describe('filterSchedulesForViewer', () => {
  it('workspace + 自分の private は見える、他人の private は見えない', () => {
    const schedules = [
      mk({ visibility: 'workspace', createdBy: other }),
      mk({ visibility: 'private', createdBy: me }),
      mk({ visibility: 'private', createdBy: other }),
      mk({ visibility: 'workspace', createdBy: me }),
    ]
    const r = filterSchedulesForViewer(schedules, me)
    expect(r).toHaveLength(3)
    // 他人の private (3 番目) が除外されていることを確認
    expect(r.every((s) => !(s.visibility === 'private' && s.createdBy !== me))).toBe(true)
  })

  it('空配列 → 空配列', () => {
    expect(filterSchedulesForViewer([], me)).toEqual([])
  })

  it('viewerId が違っても workspace 公開分は全部見える', () => {
    const ws = [
      mk({ visibility: 'workspace', createdBy: 'u1' }),
      mk({ visibility: 'workspace', createdBy: 'u2' }),
    ]
    expect(filterSchedulesForViewer(ws, 'unrelated-user')).toHaveLength(2)
  })
})

describe('countOwnPrivateSchedules', () => {
  it('自分の private だけ count', () => {
    const schedules = [
      mk({ visibility: 'private', createdBy: me }),
      mk({ visibility: 'private', createdBy: me }),
      mk({ visibility: 'private', createdBy: other }),
      mk({ visibility: 'workspace', createdBy: me }),
    ]
    expect(countOwnPrivateSchedules(schedules, me)).toBe(2)
  })

  it('private 無し → 0', () => {
    expect(countOwnPrivateSchedules([mk({ visibility: 'workspace', createdBy: me })], me)).toBe(0)
  })
})
