/**
 * ai-assignee pure helpers の単体 test。
 *
 * 観点:
 *   - isAiAssignee: actor_type='agent' のみ true (大文字小文字や空文字は false)
 *   - extractAiAssignees / extractUserAssignees: 順序保持 + 該当のみ抽出
 *   - hasAiAssignee / isFullyAiAssigned / isMixedAssignment: boolean 集約
 *   - countAssigneesByKind: 3 値 (ai / user / total) の数値集計
 */
import { describe, expect, it } from 'vitest'

import {
  agentsToAssigneeRefs,
  assigneeRefEquals,
  canGeneratePlan,
  classifyCollaborationMode,
  collaborationModeCountsToSeverityCounts,
  collaborationModeLabelJa,
  collaborationModeSeverity,
  countAssigneesByKind,
  countItemsByCollaborationMode,
  extractAiAssignees,
  extractUserAssignees,
  formatAgentRoleLabelJa,
  formatAssigneeKindSummaryJa,
  hasAiAssignee,
  isAiAssignee,
  isFullyAiAssigned,
  isMixedAssignment,
  toggleAssigneeRef,
} from './ai-assignee'
import type { AssigneeRef } from './repository'

const aiRef: AssigneeRef = { actorType: 'agent', actorId: 'agent-1' }
const aiRef2: AssigneeRef = { actorType: 'agent', actorId: 'agent-2' }
const userRef: AssigneeRef = { actorType: 'user', actorId: 'user-1' }
const userRef2: AssigneeRef = { actorType: 'user', actorId: 'user-2' }

describe('ai-assignee', () => {
  describe('isAiAssignee', () => {
    it('actor_type=agent は true', () => {
      expect(isAiAssignee(aiRef)).toBe(true)
    })
    it('actor_type=user は false', () => {
      expect(isAiAssignee(userRef)).toBe(false)
    })
  })

  describe('extractAiAssignees', () => {
    it('agent のみ抽出 + 順序保持', () => {
      const out = extractAiAssignees([userRef, aiRef, userRef2, aiRef2])
      expect(out).toEqual([aiRef, aiRef2])
    })
    it('空配列なら空配列', () => {
      expect(extractAiAssignees([])).toEqual([])
    })
    it('全 user なら空配列', () => {
      expect(extractAiAssignees([userRef, userRef2])).toEqual([])
    })
  })

  describe('extractUserAssignees', () => {
    it('user のみ抽出 + 順序保持', () => {
      const out = extractUserAssignees([aiRef, userRef, aiRef2, userRef2])
      expect(out).toEqual([userRef, userRef2])
    })
    it('全 agent なら空配列', () => {
      expect(extractUserAssignees([aiRef, aiRef2])).toEqual([])
    })
  })

  describe('hasAiAssignee', () => {
    it('1 件でも agent があれば true', () => {
      expect(hasAiAssignee([userRef, aiRef])).toBe(true)
    })
    it('全 user なら false', () => {
      expect(hasAiAssignee([userRef, userRef2])).toBe(false)
    })
    it('空配列は false', () => {
      expect(hasAiAssignee([])).toBe(false)
    })
  })

  describe('isFullyAiAssigned', () => {
    it('全員 agent + 1 件以上なら true', () => {
      expect(isFullyAiAssigned([aiRef, aiRef2])).toBe(true)
    })
    it('mixed は false', () => {
      expect(isFullyAiAssigned([aiRef, userRef])).toBe(false)
    })
    it('全 user は false', () => {
      expect(isFullyAiAssigned([userRef])).toBe(false)
    })
    it('空配列は false (= 未割当)', () => {
      expect(isFullyAiAssigned([])).toBe(false)
    })
  })

  describe('isMixedAssignment', () => {
    it('AI と user 両方ある → true', () => {
      expect(isMixedAssignment([aiRef, userRef])).toBe(true)
    })
    it('AI のみ → false', () => {
      expect(isMixedAssignment([aiRef])).toBe(false)
    })
    it('user のみ → false', () => {
      expect(isMixedAssignment([userRef])).toBe(false)
    })
    it('空配列 → false', () => {
      expect(isMixedAssignment([])).toBe(false)
    })
  })

  describe('agentsToAssigneeRefs', () => {
    it('agent rows → AssigneeRef[] (actor_type=agent / actor_id=agent.id)', () => {
      const agents = [
        { id: 'agent-r', role: 'researcher' },
        { id: 'agent-p', role: 'pm' },
      ]
      expect(agentsToAssigneeRefs(agents)).toEqual([
        { actorType: 'agent', actorId: 'agent-r' },
        { actorType: 'agent', actorId: 'agent-p' },
      ])
    })

    it('空配列なら空配列', () => {
      expect(agentsToAssigneeRefs([])).toEqual([])
    })

    it('order を保持する (sort しない)', () => {
      const agents = [
        { id: 'z', role: 'reviewer' },
        { id: 'a', role: 'engineer' },
        { id: 'm', role: 'pm' },
      ]
      const refs = agentsToAssigneeRefs(agents)
      expect(refs.map((r) => r.actorId)).toEqual(['z', 'a', 'm'])
    })
  })

  describe('formatAgentRoleLabelJa', () => {
    it('既知 4 role を日本語ラベルに変換', () => {
      expect(formatAgentRoleLabelJa('pm')).toBe('AI PM')
      expect(formatAgentRoleLabelJa('researcher')).toBe('AI リサーチャー')
      expect(formatAgentRoleLabelJa('engineer')).toBe('AI エンジニア')
      expect(formatAgentRoleLabelJa('reviewer')).toBe('AI レビューワー')
    })

    it('未知 role は AI + 原文 で fallback', () => {
      expect(formatAgentRoleLabelJa('custom-role-x')).toBe('AI custom-role-x')
    })
  })

  describe('assigneeRefEquals', () => {
    it('actor_type + actor_id 両方一致なら true', () => {
      expect(assigneeRefEquals(aiRef, { actorType: 'agent', actorId: 'agent-1' })).toBe(true)
    })
    it('actor_id 違いなら false', () => {
      expect(assigneeRefEquals(aiRef, aiRef2)).toBe(false)
    })
    it('actor_type 違いなら false (同じ id でも)', () => {
      expect(
        assigneeRefEquals(
          { actorType: 'agent', actorId: 'shared-id' },
          { actorType: 'user', actorId: 'shared-id' },
        ),
      ).toBe(false)
    })
  })

  describe('toggleAssigneeRef', () => {
    it('未含有なら末尾に追加', () => {
      expect(toggleAssigneeRef([userRef], aiRef)).toEqual([userRef, aiRef])
    })
    it('既含有なら除去 (他要素は順序保持)', () => {
      expect(toggleAssigneeRef([userRef, aiRef, userRef2], aiRef)).toEqual([userRef, userRef2])
    })
    it('空配列に追加', () => {
      expect(toggleAssigneeRef([], aiRef)).toEqual([aiRef])
    })
    it('input を破壊しない (immutable)', () => {
      const input: AssigneeRef[] = [userRef]
      const out = toggleAssigneeRef(input, aiRef)
      expect(input).toEqual([userRef])
      expect(out).not.toBe(input)
    })
  })

  describe('formatAssigneeKindSummaryJa', () => {
    it('total=0 なら "未割当"', () => {
      expect(formatAssigneeKindSummaryJa({ ai: 0, user: 0, total: 0 })).toBe('未割当')
    })
    it('AI のみ → "AI N 件"', () => {
      expect(formatAssigneeKindSummaryJa({ ai: 2, user: 0, total: 2 })).toBe('AI 2 件')
    })
    it('user のみ → "メンバー N 件"', () => {
      expect(formatAssigneeKindSummaryJa({ ai: 0, user: 3, total: 3 })).toBe('メンバー 3 件')
    })
    it('mixed → "AI A / メンバー U (合計 T 件)"', () => {
      expect(formatAssigneeKindSummaryJa({ ai: 1, user: 2, total: 3 })).toBe(
        'AI 1 / メンバー 2 (合計 3 件)',
      )
    })
    it('AI 1 のみ (単数) も "AI 1 件" (i18n は将来課題、MVP は単複同形)', () => {
      expect(formatAssigneeKindSummaryJa({ ai: 1, user: 0, total: 1 })).toBe('AI 1 件')
    })
  })

  describe('canGeneratePlan', () => {
    it('AI 担当 + 未完了 (todo) なら true', () => {
      expect(canGeneratePlan({ status: 'todo', assignees: [aiRef] })).toBe(true)
    })
    it('AI 担当 + in_progress でも true', () => {
      expect(canGeneratePlan({ status: 'in_progress', assignees: [aiRef] })).toBe(true)
    })
    it('AI 担当でも status=done なら false', () => {
      expect(canGeneratePlan({ status: 'done', assignees: [aiRef] })).toBe(false)
    })
    it('AI 担当でない (user のみ) なら未完了でも false', () => {
      expect(canGeneratePlan({ status: 'todo', assignees: [userRef] })).toBe(false)
    })
    it('未割当 (空配列) なら false', () => {
      expect(canGeneratePlan({ status: 'todo', assignees: [] })).toBe(false)
    })
    it('mixed (AI + user) なら true (AI が居れば OK)', () => {
      expect(canGeneratePlan({ status: 'todo', assignees: [aiRef, userRef] })).toBe(true)
    })
  })

  describe('countAssigneesByKind', () => {
    it('AI 2 / user 1 / 合計 3', () => {
      expect(countAssigneesByKind([aiRef, userRef, aiRef2])).toEqual({
        ai: 2,
        user: 1,
        total: 3,
      })
    })
    it('空配列なら全 0', () => {
      expect(countAssigneesByKind([])).toEqual({ ai: 0, user: 0, total: 0 })
    })
    it('AI のみ', () => {
      expect(countAssigneesByKind([aiRef, aiRef2])).toEqual({ ai: 2, user: 0, total: 2 })
    })
    it('user のみ', () => {
      expect(countAssigneesByKind([userRef, userRef2])).toEqual({ ai: 0, user: 2, total: 2 })
    })
  })

  describe('classifyCollaborationMode', () => {
    it('total=0 → unassigned', () => {
      expect(classifyCollaborationMode({ ai: 0, user: 0, total: 0 })).toBe('unassigned')
    })

    it('AI のみ → ai-only', () => {
      expect(classifyCollaborationMode({ ai: 2, user: 0, total: 2 })).toBe('ai-only')
    })

    it('user のみ → user-only', () => {
      expect(classifyCollaborationMode({ ai: 0, user: 2, total: 2 })).toBe('user-only')
    })

    it('AI + user → mixed', () => {
      expect(classifyCollaborationMode({ ai: 1, user: 1, total: 2 })).toBe('mixed')
    })
  })

  describe('collaborationModeLabelJa', () => {
    it('全 4 mode の JA label を返す', () => {
      expect(collaborationModeLabelJa('unassigned')).toBe('未割当')
      expect(collaborationModeLabelJa('ai-only')).toBe('AI 専属')
      expect(collaborationModeLabelJa('user-only')).toBe('人間専属')
      expect(collaborationModeLabelJa('mixed')).toBe('協業')
    })
  })

  describe('collaborationModeSeverity', () => {
    it('unassigned → warn (漏れリスク)', () => {
      expect(collaborationModeSeverity('unassigned')).toBe('warn')
    })

    it('ai-only → info (進行中)', () => {
      expect(collaborationModeSeverity('ai-only')).toBe('info')
    })

    it('user-only → ok (人間運用)', () => {
      expect(collaborationModeSeverity('user-only')).toBe('ok')
    })

    it('mixed → ok (協業)', () => {
      expect(collaborationModeSeverity('mixed')).toBe('ok')
    })
  })

  describe('countItemsByCollaborationMode', () => {
    it('items 配列を CollaborationMode 別に集計', () => {
      const items = [
        { assignees: [] },
        { assignees: [aiRef] },
        { assignees: [aiRef, aiRef2] },
        { assignees: [userRef] },
        { assignees: [userRef, userRef2] },
        { assignees: [aiRef, userRef] },
        { assignees: [] },
      ]
      expect(countItemsByCollaborationMode(items)).toEqual({
        unassigned: 2,
        'ai-only': 2,
        'user-only': 2,
        mixed: 1,
      })
    })

    it('空配列 → 全 mode 0', () => {
      expect(countItemsByCollaborationMode([])).toEqual({
        unassigned: 0,
        'ai-only': 0,
        'user-only': 0,
        mixed: 0,
      })
    })
  })

  describe('collaborationModeCountsToSeverityCounts', () => {
    it('mode counts を 5 段 severity counts に集約 (user-only + mixed が ok 合算)', () => {
      expect(
        collaborationModeCountsToSeverityCounts({
          unassigned: 2,
          'ai-only': 3,
          'user-only': 5,
          mixed: 1,
        }),
      ).toEqual({
        ok: 6, // user-only + mixed
        info: 3, // ai-only
        warn: 2, // unassigned
        danger: 0,
        muted: 0,
      })
    })

    it('全 0 → 全 severity 0', () => {
      expect(
        collaborationModeCountsToSeverityCounts({
          unassigned: 0,
          'ai-only': 0,
          'user-only': 0,
          mixed: 0,
        }),
      ).toEqual({ ok: 0, info: 0, warn: 0, danger: 0, muted: 0 })
    })

    it('合計が mode 件数の合計と一致', () => {
      const counts = { unassigned: 2, 'ai-only': 3, 'user-only': 5, mixed: 1 } as const
      const sevCounts = collaborationModeCountsToSeverityCounts(counts)
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      const sevTotal =
        sevCounts.ok + sevCounts.info + sevCounts.warn + sevCounts.danger + sevCounts.muted
      expect(sevTotal).toBe(total)
    })

    // iter1691 refactor regression guard: aggregateCountsBySeverity 委譲後も COLLAB_MODE_SEVERITY
    // の mapping (user-only + mixed → 同 ok lossy 縮約) が経由されることを assert。
    it('入力 key 順を変えても結果同一 (集約は加算的、順序不変)', () => {
      const a = collaborationModeCountsToSeverityCounts({
        unassigned: 2,
        'ai-only': 3,
        'user-only': 5,
        mixed: 1,
      })
      const b = collaborationModeCountsToSeverityCounts({
        mixed: 1,
        'user-only': 5,
        'ai-only': 3,
        unassigned: 2,
      })
      expect(a).toEqual(b)
      expect(a.ok).toBe(5 + 1) // user-only + mixed が ok に lossy 縮約
    })
  })
})
