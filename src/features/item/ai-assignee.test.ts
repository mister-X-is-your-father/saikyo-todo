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
  countAssigneesByKind,
  extractAiAssignees,
  extractUserAssignees,
  formatAgentRoleLabelJa,
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
})
