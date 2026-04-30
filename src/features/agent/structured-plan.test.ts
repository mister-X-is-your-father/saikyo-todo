import { describe, expect, it } from 'vitest'

import {
  extractFirstJsonObject,
  formatStructuredPlanJa,
  parseStructuredPlan,
  StructuredPlanSchema,
  validateDependencies,
} from './structured-plan'

describe('extractFirstJsonObject', () => {
  it('plain JSON 全体', () => {
    expect(extractFirstJsonObject('{"a":1}')).toBe('{"a":1}')
  })
  it('pre/post text を無視', () => {
    expect(extractFirstJsonObject('text { "a": 1 } more')).toBe('{ "a": 1 }')
  })
  it('nested object も対応', () => {
    expect(extractFirstJsonObject('{"a":{"b":2}}')).toBe('{"a":{"b":2}}')
  })
  it('文字列内の {} は無視', () => {
    expect(extractFirstJsonObject('{"s":"{not}"}')).toBe('{"s":"{not}"}')
  })
  it('escape 文字も対応', () => {
    expect(extractFirstJsonObject('{"s":"\\"not\\"\\\\"}')).toBe('{"s":"\\"not\\"\\\\"}')
  })
  it('対応 } 無し → null', () => {
    expect(extractFirstJsonObject('{"a":1')).toBeNull()
  })
  it('{ 無し → null', () => {
    expect(extractFirstJsonObject('plain text')).toBeNull()
  })
})

describe('StructuredPlanSchema', () => {
  it('完全形を受理', () => {
    const r = StructuredPlanSchema.safeParse({
      steps: [
        { title: 's1', est_min: 30, dod: 'done', dependencies: [] },
        { title: 's2', est_min: 60, dod: '', dependencies: ['s1'] },
      ],
      total_est_min: 90,
      dod_summary: 'do all',
    })
    expect(r.success).toBe(true)
  })
  it('dod / dependencies 省略は default で穴埋め', () => {
    const r = StructuredPlanSchema.safeParse({
      steps: [{ title: 's1', est_min: 30 }],
      dod_summary: 's',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.steps[0]?.dod).toBe('')
      expect(r.data.steps[0]?.dependencies).toEqual([])
    }
  })
  it('steps 空配列は reject', () => {
    const r = StructuredPlanSchema.safeParse({ steps: [], dod_summary: 'x' })
    expect(r.success).toBe(false)
  })
  it('dod_summary 空は reject', () => {
    const r = StructuredPlanSchema.safeParse({
      steps: [{ title: 's', est_min: 5 }],
      dod_summary: '',
    })
    expect(r.success).toBe(false)
  })
  it('est_min 0 は reject、500 も reject', () => {
    expect(
      StructuredPlanSchema.safeParse({
        steps: [{ title: 's', est_min: 0 }],
        dod_summary: 'x',
      }).success,
    ).toBe(false)
    expect(
      StructuredPlanSchema.safeParse({
        steps: [{ title: 's', est_min: 500 }],
        dod_summary: 'x',
      }).success,
    ).toBe(false)
  })
})

describe('validateDependencies', () => {
  it('OK case', () => {
    const r = validateDependencies({
      steps: [
        { title: 's1', est_min: 30, dod: '', dependencies: [] },
        { title: 's2', est_min: 30, dod: '', dependencies: ['s1'] },
      ],
      dod_summary: 'x',
    })
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })
  it('self dependency → error', () => {
    const r = validateDependencies({
      steps: [{ title: 's1', est_min: 30, dod: '', dependencies: ['s1'] }],
      dod_summary: 'x',
    })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.reason).toBe('self')
  })
  it('unknown dependency → error', () => {
    const r = validateDependencies({
      steps: [{ title: 's1', est_min: 30, dod: '', dependencies: ['phantom'] }],
      dod_summary: 'x',
    })
    expect(r.ok).toBe(false)
    expect(r.errors[0]?.reason).toBe('unknown')
  })
})

describe('parseStructuredPlan', () => {
  it('valid JSON string を受理 + total_est_min 再計算', () => {
    const r = parseStructuredPlan(
      JSON.stringify({
        steps: [
          { title: 's1', est_min: 30 },
          { title: 's2', est_min: 60 },
        ],
        dod_summary: 'all done',
      }),
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.plan.totalEstMin).toBe(90)
      expect(r.plan.dodSummary).toBe('all done')
      expect(r.plan.steps).toHaveLength(2)
    }
  })

  it('code block / pre-text 含む string でも JSON 抽出', () => {
    const text = `Sure, here's the plan:
\`\`\`json
{
  "steps": [{ "title": "s1", "est_min": 30 }],
  "dod_summary": "x"
}
\`\`\`
Hope this helps.`
    const r = parseStructuredPlan(text)
    expect(r.ok).toBe(true)
  })

  it('object を直接渡しても OK', () => {
    const r = parseStructuredPlan({
      steps: [{ title: 's', est_min: 10 }],
      dod_summary: 'x',
    })
    expect(r.ok).toBe(true)
  })

  it('JSON parse 失敗 → ok=false', () => {
    const r = parseStructuredPlan('{ broken json')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/JSON parse|object 形式/)
    }
  })

  it('JSON object が無い → ok=false', () => {
    const r = parseStructuredPlan('plain text only')
    expect(r.ok).toBe(false)
  })

  it('schema 不一致 (steps 空) → ok=false + details', () => {
    const r = parseStructuredPlan({ steps: [], dod_summary: 'x' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBe('schema 不一致')
      expect(r.details).toBeDefined()
    }
  })

  it('dependency 自参照 → ok=false', () => {
    const r = parseStructuredPlan({
      steps: [{ title: 's1', est_min: 5, dependencies: ['s1'] }],
      dod_summary: 'x',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/dependencies/)
    }
  })

  it('total_est_min を入力値に関わらず再計算 (入力 0 でも合計)', () => {
    const r = parseStructuredPlan({
      steps: [
        { title: 's1', est_min: 30 },
        { title: 's2', est_min: 30 },
      ],
      total_est_min: 0, // 嘘
      dod_summary: 'x',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.plan.totalEstMin).toBe(60)
    }
  })
})

describe('formatStructuredPlanJa', () => {
  it('5 step / 合計 2h30m / DoD あり', () => {
    const r = parseStructuredPlan({
      steps: [
        { title: 's1', est_min: 30, dod: '', dependencies: [] },
        { title: 's2', est_min: 30, dod: '', dependencies: [] },
        { title: 's3', est_min: 30, dod: '', dependencies: [] },
        { title: 's4', est_min: 30, dod: '', dependencies: [] },
        { title: 's5', est_min: 30, dod: '', dependencies: [] },
      ],
      dod_summary: 'ユーザ受入完了',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(formatStructuredPlanJa(r.plan)).toBe('5 step / 合計 2h30m — 「DoD: ユーザ受入完了」')
    }
  })

  it('60 未満は分のみ / 60 ぴったりは h のみ', () => {
    const r1 = parseStructuredPlan({
      steps: [{ title: 's', est_min: 45, dod: '', dependencies: [] }],
      dod_summary: 'X',
    })
    expect(r1.ok).toBe(true)
    if (r1.ok) {
      expect(formatStructuredPlanJa(r1.plan)).toContain('合計 45m')
    }

    const r2 = parseStructuredPlan({
      steps: [{ title: 's', est_min: 60, dod: '', dependencies: [] }],
      dod_summary: 'Y',
    })
    expect(r2.ok).toBe(true)
    if (r2.ok) {
      expect(formatStructuredPlanJa(r2.plan)).toContain('合計 1h')
      expect(formatStructuredPlanJa(r2.plan)).not.toContain('1h0m')
    }
  })
})
