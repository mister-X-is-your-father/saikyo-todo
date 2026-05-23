import { describe, expect, it } from 'vitest'

import {
  classifyStructuredPlanHint,
  computePlanCriticalPathMin,
  computePlanSpeedupRatio,
  extractFirstJsonObject,
  formatCriticalPathJa,
  formatLongestStepJa,
  formatPlanSpeedupRatioJa,
  formatStructuredPlanHintJa,
  formatStructuredPlanJa,
  hasParallelOpportunity,
  parseStructuredPlan,
  pickLongestStep,
  StructuredPlanSchema,
  topoSortPlanSteps,
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

  // iter1144: 各 min/max に付与した ja message が parser error.issues に出る回帰防止
  it('est_min 上限超過時 ja message (480) が出る', () => {
    const r = StructuredPlanSchema.safeParse({
      steps: [{ title: 's', est_min: 481 }],
      dod_summary: 'x',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('480'))).toBe(true)
    }
  })
  it('steps 31 件 reject 時 ja message が出る', () => {
    const steps = Array.from({ length: 31 }, (_, i) => ({ title: `s${i}`, est_min: 1 }))
    const r = StructuredPlanSchema.safeParse({ steps, dod_summary: 'x' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('30 件以内'))).toBe(true)
    }
  })
  it('dod_summary 空 reject 時 ja message が出る', () => {
    const r = StructuredPlanSchema.safeParse({
      steps: [{ title: 's', est_min: 5 }],
      dod_summary: '',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('DoD サマリ'))).toBe(true)
    }
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

describe('topoSortPlanSteps', () => {
  it('空 plan → 空 array', () => {
    expect(topoSortPlanSteps({ steps: [] })).toEqual([])
  })

  it('依存無し: title alphabetical 順', () => {
    const order = topoSortPlanSteps({
      steps: [
        { title: 'b', est_min: 1, dod: '', dependencies: [] },
        { title: 'a', est_min: 1, dod: '', dependencies: [] },
        { title: 'c', est_min: 1, dod: '', dependencies: [] },
      ],
    })
    expect(order).toEqual([1, 0, 2]) // a(idx 1), b(0), c(2)
  })

  it('線形依存 a→b→c は a,b,c 順', () => {
    const order = topoSortPlanSteps({
      steps: [
        { title: 'a', est_min: 1, dod: '', dependencies: [] },
        { title: 'b', est_min: 1, dod: '', dependencies: ['a'] },
        { title: 'c', est_min: 1, dod: '', dependencies: ['b'] },
      ],
    })
    expect(order).toEqual([0, 1, 2])
  })

  it('cycle 検出 → null', () => {
    // a→b→a (= cycle)。parser は通常弾くが防御テスト
    const order = topoSortPlanSteps({
      steps: [
        { title: 'a', est_min: 1, dod: '', dependencies: ['b'] },
        { title: 'b', est_min: 1, dod: '', dependencies: ['a'] },
      ],
    })
    expect(order).toBeNull()
  })

  it('複雑な diamond: 同 layer は alphabetical', () => {
    // a → b, a → c, b/c → d。order: a, b, c, d
    const order = topoSortPlanSteps({
      steps: [
        { title: 'd', est_min: 1, dod: '', dependencies: ['b', 'c'] },
        { title: 'a', est_min: 1, dod: '', dependencies: [] },
        { title: 'b', est_min: 1, dod: '', dependencies: ['a'] },
        { title: 'c', est_min: 1, dod: '', dependencies: ['a'] },
      ],
    })
    expect(order).toEqual([1, 2, 3, 0])
  })
})

describe('pickLongestStep', () => {
  it('空 plan → null', () => {
    expect(pickLongestStep({ steps: [] })).toBeNull()
  })

  it('単独 max', () => {
    const longest = pickLongestStep({
      steps: [
        { title: 'a', est_min: 30, dod: '', dependencies: [] },
        { title: 'b', est_min: 120, dod: '', dependencies: [] },
        { title: 'c', est_min: 60, dod: '', dependencies: [] },
      ],
    })
    expect(longest?.title).toBe('b')
    expect(longest?.est_min).toBe(120)
  })

  it('同点は title alphabetical 先頭', () => {
    const longest = pickLongestStep({
      steps: [
        { title: 'b', est_min: 60, dod: '', dependencies: [] },
        { title: 'a', est_min: 60, dod: '', dependencies: [] },
      ],
    })
    expect(longest?.title).toBe('a')
  })
})

describe('formatLongestStepJa', () => {
  it('null → 「最長 step: なし」', () => {
    expect(formatLongestStepJa(null)).toBe('最長 step: なし')
  })

  it('60 未満 → 分のみ', () => {
    expect(formatLongestStepJa({ title: 's', est_min: 45, dod: '', dependencies: [] })).toBe(
      '最長 step: s (45m)',
    )
  })

  it('60 ぴったり → h のみ', () => {
    expect(formatLongestStepJa({ title: 's', est_min: 60, dod: '', dependencies: [] })).toBe(
      '最長 step: s (1h)',
    )
  })

  it('複合 → h + m', () => {
    expect(formatLongestStepJa({ title: 's', est_min: 150, dod: '', dependencies: [] })).toBe(
      '最長 step: s (2h30m)',
    )
  })
})

describe('computePlanCriticalPathMin', () => {
  it('空 plan → 0', () => {
    expect(computePlanCriticalPathMin({ steps: [] })).toBe(0)
  })

  it('依存無し → 最大 est_min と一致 (= 並列実行で 1 step 分)', () => {
    const r = computePlanCriticalPathMin({
      steps: [
        { title: 'a', est_min: 30, dod: '', dependencies: [] },
        { title: 'b', est_min: 90, dod: '', dependencies: [] },
        { title: 'c', est_min: 60, dod: '', dependencies: [] },
      ],
    })
    expect(r).toBe(90)
  })

  it('線形依存 a→b→c は est_min 合計', () => {
    const r = computePlanCriticalPathMin({
      steps: [
        { title: 'a', est_min: 30, dod: '', dependencies: [] },
        { title: 'b', est_min: 60, dod: '', dependencies: ['a'] },
        { title: 'c', est_min: 30, dod: '', dependencies: ['b'] },
      ],
    })
    expect(r).toBe(120)
  })

  it('diamond: a→b/c→d、b/c は並列実行可なので max(b,c)+a+d', () => {
    // a(10) → b(50)/c(80) → d(20)、critical = a + max(b,c) + d = 10 + 80 + 20 = 110
    const r = computePlanCriticalPathMin({
      steps: [
        { title: 'a', est_min: 10, dod: '', dependencies: [] },
        { title: 'b', est_min: 50, dod: '', dependencies: ['a'] },
        { title: 'c', est_min: 80, dod: '', dependencies: ['a'] },
        { title: 'd', est_min: 20, dod: '', dependencies: ['b', 'c'] },
      ],
    })
    expect(r).toBe(110)
  })

  it('cycle → null', () => {
    const r = computePlanCriticalPathMin({
      steps: [
        { title: 'a', est_min: 10, dod: '', dependencies: ['b'] },
        { title: 'b', est_min: 10, dod: '', dependencies: ['a'] },
      ],
    })
    expect(r).toBeNull()
  })
})

describe('formatCriticalPathJa', () => {
  it('null → 「不定 (依存 cycle)」', () => {
    expect(formatCriticalPathJa(null, 100)).toBe('最早 finish: 不定 (依存 cycle)')
  })

  it('critical = total → 「線形」', () => {
    expect(formatCriticalPathJa(120, 120)).toBe('最早 finish: 2h (線形)')
  })

  it('critical < total → 「並列化機会あり」', () => {
    expect(formatCriticalPathJa(150, 300)).toBe(
      '最早 finish: 2h30m (合計 5h との差 2h30m = 並列化機会あり)',
    )
  })
})

describe('classifyStructuredPlanHint', () => {
  it('健全範囲 → mild', () => {
    expect(
      classifyStructuredPlanHint({
        steps: [
          { title: 'a', est_min: 30, dod: '', dependencies: [] },
          { title: 'b', est_min: 60, dod: '', dependencies: [] },
        ],
        totalEstMin: 90,
        dodSummary: 'ユーザ受入完了',
      }),
    ).toBe('mild')
  })

  it('totalEstMin 600+ → severe', () => {
    expect(
      classifyStructuredPlanHint({
        steps: [{ title: 'a', est_min: 700, dod: '', dependencies: [] }],
        totalEstMin: 700,
        dodSummary: 'long',
      }),
    ).toBe('severe')
  })

  it('1 step + 短い dod → severe (粗すぎ)', () => {
    expect(
      classifyStructuredPlanHint({
        steps: [{ title: 'a', est_min: 30, dod: '', dependencies: [] }],
        totalEstMin: 30,
        dodSummary: '完成',
      }),
    ).toBe('severe')
  })

  it('totalEstMin 4h+ → moderate', () => {
    expect(
      classifyStructuredPlanHint({
        steps: [
          { title: 'a', est_min: 150, dod: '', dependencies: [] },
          { title: 'b', est_min: 150, dod: '', dependencies: [] },
        ],
        totalEstMin: 300,
        dodSummary: 'detailed dod that is more than 20 chars',
      }),
    ).toBe('moderate')
  })

  it('steps 16+ → moderate (過剰分割)', () => {
    const steps = Array.from({ length: 16 }, (_, i) => ({
      title: `s${i}`,
      est_min: 5,
      dod: '',
      dependencies: [],
    }))
    expect(
      classifyStructuredPlanHint({
        steps,
        totalEstMin: 80,
        dodSummary: 'detailed dod with enough chars',
      }),
    ).toBe('moderate')
  })
})

describe('formatStructuredPlanHintJa', () => {
  it('idle / mild / moderate / severe を 1 単語で返す', () => {
    expect(
      formatStructuredPlanHintJa({
        steps: [],
        totalEstMin: 0,
        dodSummary: '',
      }),
    ).toBe('plan なし')
    expect(
      formatStructuredPlanHintJa({
        steps: [{ title: 'a', est_min: 30, dod: '', dependencies: [] }],
        totalEstMin: 700,
        dodSummary: 'long',
      }),
    ).toBe('要分割')
  })
})

describe('hasParallelOpportunity', () => {
  it('1 step 以下 → false', () => {
    expect(
      hasParallelOpportunity({
        steps: [{ title: 'a', est_min: 30, dod: '', dependencies: [] }],
        totalEstMin: 30,
        dodSummary: 'x',
      }),
    ).toBe(false)
  })

  it('依存無し (= 全並列可能) → true', () => {
    expect(
      hasParallelOpportunity({
        steps: [
          { title: 'a', est_min: 30, dod: '', dependencies: [] },
          { title: 'b', est_min: 60, dod: '', dependencies: [] },
        ],
        totalEstMin: 90,
        dodSummary: 'x',
      }),
    ).toBe(true)
  })

  it('線形依存 → false (= 並列化不可)', () => {
    expect(
      hasParallelOpportunity({
        steps: [
          { title: 'a', est_min: 30, dod: '', dependencies: [] },
          { title: 'b', est_min: 60, dod: '', dependencies: ['a'] },
        ],
        totalEstMin: 90,
        dodSummary: 'x',
      }),
    ).toBe(false)
  })

  it('cycle 検出 → false (computePlanCriticalPathMin null 時の防御)', () => {
    expect(
      hasParallelOpportunity({
        steps: [
          { title: 'a', est_min: 10, dod: '', dependencies: ['b'] },
          { title: 'b', est_min: 10, dod: '', dependencies: ['a'] },
        ],
        totalEstMin: 20,
        dodSummary: 'x',
      }),
    ).toBe(false)
  })

  it('diamond (a→b/c→d) → true (並列化機会あり)', () => {
    expect(
      hasParallelOpportunity({
        steps: [
          { title: 'a', est_min: 10, dod: '', dependencies: [] },
          { title: 'b', est_min: 50, dod: '', dependencies: ['a'] },
          { title: 'c', est_min: 80, dod: '', dependencies: ['a'] },
          { title: 'd', est_min: 20, dod: '', dependencies: ['b', 'c'] },
        ],
        totalEstMin: 160,
        dodSummary: 'x',
      }),
    ).toBe(true)
  })
})

describe('computePlanSpeedupRatio', () => {
  it('空 plan → null (steps 0)', () => {
    expect(computePlanSpeedupRatio({ steps: [], totalEstMin: 0, dodSummary: 'x' })).toBe(null)
  })

  it('線形依存 (a→b→c) → 1.0 (= 並列化機会なし)', () => {
    expect(
      computePlanSpeedupRatio({
        steps: [
          { title: 'a', est_min: 30, dod: '', dependencies: [] },
          { title: 'b', est_min: 60, dod: '', dependencies: ['a'] },
          { title: 'c', est_min: 30, dod: '', dependencies: ['b'] },
        ],
        totalEstMin: 120,
        dodSummary: 'x',
      }),
    ).toBe(1)
  })

  it('全並列 (依存無し 3 step、各 30 min) → 3.0', () => {
    expect(
      computePlanSpeedupRatio({
        steps: [
          { title: 'a', est_min: 30, dod: '', dependencies: [] },
          { title: 'b', est_min: 30, dod: '', dependencies: [] },
          { title: 'c', est_min: 30, dod: '', dependencies: [] },
        ],
        totalEstMin: 90,
        dodSummary: 'x',
      }),
    ).toBe(3)
  })

  it('diamond (a=10, b=50, c=80, d=20、critical=a+c+d=110、total=160) → 1.5', () => {
    // total/critical = 160/110 = 1.4545... → round(14.545)/10 = 14.5/10 = 1.5? 実際 14.545→15 round
    // 160/110 = 1.45454... × 10 = 14.5454... round → 15 → 1.5
    expect(
      computePlanSpeedupRatio({
        steps: [
          { title: 'a', est_min: 10, dod: '', dependencies: [] },
          { title: 'b', est_min: 50, dod: '', dependencies: ['a'] },
          { title: 'c', est_min: 80, dod: '', dependencies: ['a'] },
          { title: 'd', est_min: 20, dod: '', dependencies: ['b', 'c'] },
        ],
        totalEstMin: 160,
        dodSummary: 'x',
      }),
    ).toBe(1.5)
  })

  it('cycle → null', () => {
    expect(
      computePlanSpeedupRatio({
        steps: [
          { title: 'a', est_min: 10, dod: '', dependencies: ['b'] },
          { title: 'b', est_min: 10, dod: '', dependencies: ['a'] },
        ],
        totalEstMin: 20,
        dodSummary: 'x',
      }),
    ).toBe(null)
  })

  it('1 step のみ → 1.0 (totalEstMin === criticalMin)', () => {
    expect(
      computePlanSpeedupRatio({
        steps: [{ title: 'a', est_min: 60, dod: '', dependencies: [] }],
        totalEstMin: 60,
        dodSummary: 'x',
      }),
    ).toBe(1)
  })
})

describe('formatPlanSpeedupRatioJa', () => {
  it('null → 「不定 (cycle)」', () => {
    expect(formatPlanSpeedupRatioJa(null)).toBe('不定 (cycle)')
  })

  it('1.0 → 「線形 (並列化機会なし)」', () => {
    expect(formatPlanSpeedupRatioJa(1)).toBe('線形 (並列化機会なし)')
  })

  it('1.5 → 「並列化で 1.5x 短縮可」', () => {
    expect(formatPlanSpeedupRatioJa(1.5)).toBe('並列化で 1.5x 短縮可')
  })

  it('3.0 → 「並列化で 3x 短縮可」 (1 桁丸めなので 3.0 ではなく 3)', () => {
    expect(formatPlanSpeedupRatioJa(3)).toBe('並列化で 3x 短縮可')
  })

  it('境界 0.5 (= 理論上不可だが防御): 1.0 以下扱い → 線形', () => {
    expect(formatPlanSpeedupRatioJa(0.5)).toBe('線形 (並列化機会なし)')
  })
})
