/**
 * agent-plan-prompt pure helpers の単体 test。
 */
import { describe, expect, it } from 'vitest'

import {
  buildPlanGenerationUserMessage,
  isPlanComment,
  PLAN_COMMENT_MARKER,
} from './agent-plan-prompt'

describe('agent-plan-prompt', () => {
  describe('buildPlanGenerationUserMessage', () => {
    const baseParams = {
      itemId: 'item-1',
      title: 'Auth リファクタ',
      description: 'OAuth の token refresh を分離する',
      dod: 'token expiry handler が unit test で 100% カバー',
    }

    it('itemId / title / description / dod を inject', () => {
      const out = buildPlanGenerationUserMessage(baseParams)
      expect(out).toContain('item-1')
      expect(out).toContain('Auth リファクタ')
      expect(out).toContain('OAuth の token refresh を分離する')
      expect(out).toContain('token expiry handler が unit test で 100% カバー')
    })

    it('AI 担当 / 実行計画 keyword を含む', () => {
      const out = buildPlanGenerationUserMessage(baseParams)
      expect(out).toContain('AI 担当')
      expect(out).toContain('実行計画 (Plan)')
    })

    it('write_comment 指示を含む', () => {
      const out = buildPlanGenerationUserMessage(baseParams)
      expect(out).toContain('write_comment')
    })

    it('5 sub-section heading を全て含む', () => {
      const out = buildPlanGenerationUserMessage(baseParams)
      expect(out).toContain('## 目的 / 終わり方')
      expect(out).toContain('## アプローチ')
      expect(out).toContain('## リスク / 依存')
      expect(out).toContain('## 完了見込み')
      expect(out).toContain('## 確認事項')
    })

    it('PLAN_COMMENT_MARKER を含む (UI 連携 marker 一致)', () => {
      const out = buildPlanGenerationUserMessage(baseParams)
      expect(out).toContain(PLAN_COMMENT_MARKER)
    })

    it('description 空なら "- 説明:" 行を inject しない', () => {
      const out = buildPlanGenerationUserMessage({ ...baseParams, description: '   ' })
      expect(out).not.toContain('- 説明:')
    })

    it('dod が null なら "- DoD" 行を inject しない', () => {
      const out = buildPlanGenerationUserMessage({ ...baseParams, dod: null })
      expect(out).not.toContain('DoD (Definition of Done):')
    })

    it('extraHint があれば "追加指示:" sec を inject、空なら inject しない', () => {
      const withHint = buildPlanGenerationUserMessage({
        ...baseParams,
        extraHint: '段階的に進めて、Stage 1 のみ今日中',
      })
      expect(withHint).toContain('追加指示:')
      expect(withHint).toContain('段階的に進めて、Stage 1 のみ今日中')

      const noHint = buildPlanGenerationUserMessage(baseParams)
      expect(noHint).not.toContain('追加指示:')
    })

    it('extraHint が空白だけなら inject しない', () => {
      const out = buildPlanGenerationUserMessage({ ...baseParams, extraHint: '   \n  ' })
      expect(out).not.toContain('追加指示:')
    })
  })

  describe('isPlanComment', () => {
    it('先頭が PLAN_COMMENT_MARKER なら true', () => {
      expect(isPlanComment('🤖 実行計画 (案)\n\n## 目的 / 終わり方\n...')).toBe(true)
    })

    it('先頭の whitespace は trim される', () => {
      expect(isPlanComment('  \n🤖 実行計画 (案) ...')).toBe(true)
    })

    it('marker が中間にあるだけは false (誤検知防止)', () => {
      expect(isPlanComment('普通のコメント。引用「🤖 実行計画 (案)」')).toBe(false)
    })

    it('空文字は false', () => {
      expect(isPlanComment('')).toBe(false)
    })

    it('PLAN_COMMENT_MARKER は固定値 (UI 側との 一致 sentinel)', () => {
      expect(PLAN_COMMENT_MARKER).toBe('🤖 実行計画 (案)')
    })
  })
})
