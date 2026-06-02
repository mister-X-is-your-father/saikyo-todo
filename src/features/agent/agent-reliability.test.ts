/**
 * iter487 agent-reliability の unit test。pure helper のみ、DB / DOM 非依存。
 */
import { describe, expect, it } from 'vitest'

import {
  agentReliabilityChipClasses,
  agentReliabilityTone,
  agentRoleLabelJa,
  composeAgentBriefSignals,
  computeAgentReliability,
  concerningRoleTone,
  dominantRole,
  formatAgentReliabilityCompactJa,
  formatAgentReliabilityJa,
  formatDominantRoleJa,
  formatMostConcerningRoleJa,
  mostConcerningRole,
  reliabilityLevelLabelJa,
} from './agent-reliability'

describe('computeAgentReliability', () => {
  it('空 rows → 全 role idle、totalInvocations=0', () => {
    const r = computeAgentReliability([])
    expect(r.totalInvocations).toBe(0)
    expect(r.reliabilityLevel).toBe('idle')
    expect(r.byRole.pm.reliabilityLevel).toBe('idle')
    expect(r.byRole.researcher.reliabilityLevel).toBe('idle')
  })

  it('PM 14/15 → warn (93% は healthy 95% 未満)', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 15, completed: 14, failed: 1 }])
    expect(r.byRole.pm.successRate).toBeCloseTo(14 / 15, 3)
    expect(r.byRole.pm.reliabilityLevel).toBe('warn')
    expect(r.byRole.researcher.reliabilityLevel).toBe('idle')
  })

  it('PM 19/20 (95%) → healthy', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 20, completed: 19, failed: 1 }])
    expect(r.byRole.pm.successRate).toBe(0.95)
    expect(r.byRole.pm.reliabilityLevel).toBe('healthy')
  })

  it('PM 6/10 (60%) → critical', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 10, completed: 6, failed: 4 }])
    expect(r.byRole.pm.reliabilityLevel).toBe('critical')
  })

  it('複数月 row を sum (PM 8/10 + 5/5 = 13/15 → warn)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 8, failed: 2 },
      { role: 'pm', invocations: 5, completed: 5, failed: 0 },
    ])
    expect(r.byRole.pm.invocations).toBe(15)
    expect(r.byRole.pm.completed).toBe(13)
    expect(r.byRole.pm.successRate).toBeCloseTo(13 / 15, 3)
    expect(r.byRole.pm.reliabilityLevel).toBe('warn')
  })

  it('未知 role は除外 (forward compatible)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 5, completed: 5, failed: 0 },
      { role: 'engineer', invocations: 100, completed: 0, failed: 100 }, // 除外
    ])
    expect(r.totalInvocations).toBe(5)
    expect(r.byRole.pm.reliabilityLevel).toBe('healthy')
  })

  it('不正値 (負 / NaN) は 0 にクランプ', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: -5, completed: NaN, failed: -1 },
      { role: 'pm', invocations: 10, completed: 9, failed: 1 },
    ])
    expect(r.byRole.pm.invocations).toBe(10)
    expect(r.byRole.pm.completed).toBe(9)
    expect(r.byRole.pm.failed).toBe(1)
  })

  it('total reliability は role 別 sum で判定 (PM healthy + Researcher critical → 全体 warn)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 20, completed: 20, failed: 0 }, // 100% healthy
      { role: 'researcher', invocations: 10, completed: 5, failed: 5 }, // 50% critical
    ])
    // total: 25/30 = 83.3% → warn (>= 80%)
    expect(r.successRate).toBeCloseTo(25 / 30, 3)
    expect(r.reliabilityLevel).toBe('warn')
  })
})

describe('formatAgentReliabilityJa', () => {
  it('idle → 「AI 信頼性: 記録なし」', () => {
    expect(formatAgentReliabilityJa(computeAgentReliability([]))).toBe('AI 信頼性: 記録なし')
  })

  it('PM healthy + Researcher healthy → 健全 chip', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    expect(formatAgentReliabilityJa(r)).toBe(
      'AI 信頼性: PM 15/15 (100%) 健全・Researcher 8/8 (100%) 健全',
    )
  })

  it('PM warn + Researcher idle → 注意 + 記録なし', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 13, failed: 2 }, // 86.6% → warn
    ])
    const out = formatAgentReliabilityJa(r)
    expect(out).toContain('PM 13/15 (87%) 注意')
    expect(out).toContain('Researcher 記録なし')
  })

  it('PM critical → 要調査文言', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 10, completed: 5, failed: 5 }])
    expect(formatAgentReliabilityJa(r)).toContain('PM 5/10 (50%) 要調査')
  })
})

describe('formatAgentReliabilityCompactJa (compact dashboard chip / Slack 通知 用)', () => {
  it('idle → 記録なし sentinel', () => {
    expect(formatAgentReliabilityCompactJa(computeAgentReliability([]))).toBe('AI 信頼性: 記録なし')
  })

  it('healthy 23/23 → 「健全 (23/23 完了、100%)」', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    expect(formatAgentReliabilityCompactJa(r)).toBe('AI 信頼性: 健全 (23/23 完了、100%)')
  })

  it('warn 20/22 → 「注意 (20/22 完了、91%)」 (role 別詳細は省略)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 12, completed: 11, failed: 1 },
      { role: 'researcher', invocations: 10, completed: 9, failed: 1 },
    ])
    // total: 20/22 = 90.9% → warn (>= 80%)
    expect(formatAgentReliabilityCompactJa(r)).toBe('AI 信頼性: 注意 (20/22 完了、91%)')
  })

  it('critical 6/10 → 「要調査 (6/10 完了、60%)」', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 10, completed: 6, failed: 4 }])
    expect(formatAgentReliabilityCompactJa(r)).toBe('AI 信頼性: 要調査 (6/10 完了、60%)')
  })
})

describe('dominantRole (主軸 role 特定、AI brief 用)', () => {
  it('全 idle → null sentinel', () => {
    expect(dominantRole(computeAgentReliability([]))).toBeNull()
  })

  it('PM 15 / Researcher 8 → PM 主軸', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 14, failed: 1 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    const d = dominantRole(r)
    expect(d).not.toBeNull()
    expect(d!.role).toBe('pm')
    expect(d!.invocations).toBe(15)
    expect(d!.share).toBeCloseTo(15 / 23, 3)
  })

  it('Researcher 多 → Researcher 主軸', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 3, completed: 3, failed: 0 },
      { role: 'researcher', invocations: 12, completed: 12, failed: 0 },
    ])
    const d = dominantRole(r)
    expect(d!.role).toBe('researcher')
    expect(d!.invocations).toBe(12)
  })

  it('唯一稼働 → share=1', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 10, completed: 10, failed: 0 }])
    const d = dominantRole(r)
    expect(d!.role).toBe('pm')
    expect(d!.share).toBe(1)
  })

  it('tie (同数) → role alphabetical で pm 勝ち', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 5, completed: 5, failed: 0 },
      { role: 'researcher', invocations: 5, completed: 5, failed: 0 },
    ])
    expect(dominantRole(r)!.role).toBe('pm')
  })
})

describe('formatDominantRoleJa', () => {
  it('null → 主軸: 記録なし', () => {
    expect(formatDominantRoleJa(null)).toBe('主軸: 記録なし')
  })

  it('唯一稼働 → 「主軸: PM (10 呼出、唯一稼働)」', () => {
    const r = computeAgentReliability([{ role: 'pm', invocations: 10, completed: 10, failed: 0 }])
    expect(formatDominantRoleJa(dominantRole(r))).toBe('主軸: PM (10 呼出、唯一稼働)')
  })

  it('混合 → 「主軸: PM (15 呼出、65%)」', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 14, failed: 1 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    expect(formatDominantRoleJa(dominantRole(r))).toBe('主軸: PM (15 呼出、65%)')
  })
})

describe('mostConcerningRole (信頼性最低 role 検出、pm-recovery/Slack alert 用)', () => {
  it('全 healthy → null (= alarm 不要)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 10, failed: 0 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    expect(mostConcerningRole(r)).toBeNull()
  })

  it('全 idle → null', () => {
    expect(mostConcerningRole(computeAgentReliability([]))).toBeNull()
  })

  it('PM critical → PM 検出', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 }, // critical
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    const c = mostConcerningRole(r)
    expect(c).not.toBeNull()
    expect(c!.role).toBe('pm')
    expect(c!.level).toBe('critical')
  })

  it('PM healthy + Researcher warn → Researcher (warn) 検出', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 10, failed: 0 },
      { role: 'researcher', invocations: 15, completed: 13, failed: 2 }, // 86.6% warn
    ])
    const c = mostConcerningRole(r)
    expect(c!.role).toBe('researcher')
    expect(c!.level).toBe('warn')
  })

  it('両方 critical → role alphabetical で pm 勝ち', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 },
      { role: 'researcher', invocations: 10, completed: 4, failed: 6 },
    ])
    expect(mostConcerningRole(r)!.role).toBe('pm')
  })

  it('critical を warn より優先 (= 緊急優先)', () => {
    const r = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 9, failed: 1 }, // 90% warn
      { role: 'researcher', invocations: 10, completed: 5, failed: 5 }, // 50% critical
    ])
    const c = mostConcerningRole(r)
    expect(c!.role).toBe('researcher')
    expect(c!.level).toBe('critical')
  })
})

describe('composeAgentBriefSignals (AI 朝 brief / Slack daily digest 用 1 関数集約)', () => {
  it('idle → reliability=記録なし / dominant=null / concerning=null', () => {
    const stats = computeAgentReliability([])
    const sig = composeAgentBriefSignals(stats)
    expect(sig.reliability.text).toBe('AI 信頼性: 記録なし')
    expect(sig.reliability.tone).toBe('idle')
    expect(sig.dominantRole).toBeNull()
    expect(sig.concerningRole).toBeNull()
  })

  it('healthy + dominant → 2 signal、concerning は null (= 弱点 chip 非表示)', () => {
    const stats = computeAgentReliability([
      { role: 'pm', invocations: 15, completed: 15, failed: 0 },
      { role: 'researcher', invocations: 8, completed: 8, failed: 0 },
    ])
    const sig = composeAgentBriefSignals(stats)
    expect(sig.reliability.text).toBe('AI 信頼性: 健全 (23/23 完了、100%)')
    expect(sig.reliability.tone).toBe('success')
    expect(sig.dominantRole).not.toBeNull()
    expect(sig.dominantRole!.text).toBe('主軸: PM (15 呼出、65%)')
    expect(sig.dominantRole!.tone).toBe('info')
    expect(sig.concerningRole).toBeNull()
  })

  it('critical 単独稼働 → reliability=danger / dominant 唯一稼働 / concerning=danger 弱点', () => {
    const stats = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 5, failed: 5 },
    ])
    const sig = composeAgentBriefSignals(stats)
    expect(sig.reliability.tone).toBe('danger')
    expect(sig.reliability.text).toContain('要調査')
    expect(sig.dominantRole!.text).toBe('主軸: PM (10 呼出、唯一稼働)')
    expect(sig.dominantRole!.tone).toBe('info')
    expect(sig.concerningRole).not.toBeNull()
    expect(sig.concerningRole!.text).toBe('弱点: PM 要調査 (50%)')
    expect(sig.concerningRole!.tone).toBe('danger')
  })

  it('healthy + warn 混在 → concerning は warn role を amber tone で', () => {
    const stats = computeAgentReliability([
      { role: 'pm', invocations: 20, completed: 20, failed: 0 },
      { role: 'researcher', invocations: 15, completed: 13, failed: 2 },
    ])
    const sig = composeAgentBriefSignals(stats)
    expect(sig.concerningRole).not.toBeNull()
    expect(sig.concerningRole!.text).toBe('弱点: Researcher 注意 (87%)')
    expect(sig.concerningRole!.tone).toBe('warn')
  })
})

describe('formatMostConcerningRoleJa / concerningRoleTone (iter789)', () => {
  it('null → 弱点: 該当なし', () => {
    expect(formatMostConcerningRoleJa(null)).toBe('弱点: 該当なし')
  })

  it('critical PM → 弱点: PM 要調査 (success rate %)', () => {
    expect(formatMostConcerningRoleJa({ role: 'pm', level: 'critical', successRate: 0.5 })).toBe(
      '弱点: PM 要調査 (50%)',
    )
  })

  it('warn Researcher → 弱点: Researcher 注意 (87%)', () => {
    expect(
      formatMostConcerningRoleJa({ role: 'researcher', level: 'warn', successRate: 0.87 }),
    ).toBe('弱点: Researcher 注意 (87%)')
  })

  it('mostConcerningRole の戻り値を直接渡せる (composition pattern)', () => {
    const stats = computeAgentReliability([
      { role: 'pm', invocations: 10, completed: 6, failed: 4 },
    ])
    const concerning = mostConcerningRole(stats)
    expect(formatMostConcerningRoleJa(concerning)).toBe('弱点: PM 要調査 (60%)')
  })

  it('concerningRoleTone: critical → danger / warn → warn', () => {
    expect(concerningRoleTone('critical')).toBe('danger')
    expect(concerningRoleTone('warn')).toBe('warn')
  })
})

describe('agentRoleLabelJa / reliabilityLevelLabelJa (public ja-JP labels)', () => {
  it('role: pm → PM、researcher → Researcher', () => {
    expect(agentRoleLabelJa('pm')).toBe('PM')
    expect(agentRoleLabelJa('researcher')).toBe('Researcher')
  })

  it('level: healthy=健全 / warn=注意 / critical=要調査 / idle=記録なし', () => {
    expect(reliabilityLevelLabelJa('healthy')).toBe('健全')
    expect(reliabilityLevelLabelJa('warn')).toBe('注意')
    expect(reliabilityLevelLabelJa('critical')).toBe('要調査')
    expect(reliabilityLevelLabelJa('idle')).toBe('記録なし')
  })

  it('caller pattern: role + level の組み合わせ (例: 「PM 健全」)', () => {
    expect(`${agentRoleLabelJa('pm')} ${reliabilityLevelLabelJa('healthy')}`).toBe('PM 健全')
  })
})

describe('agentReliabilityTone (graphical 波及 — level → ChipTone)', () => {
  it('critical→danger / warn→warn / healthy→success / idle→idle', () => {
    expect(agentReliabilityTone('critical')).toBe('danger')
    expect(agentReliabilityTone('warn')).toBe('warn')
    expect(agentReliabilityTone('healthy')).toBe('success')
    expect(agentReliabilityTone('idle')).toBe('idle')
  })
})

// iter1702 fix: iter1531 chip-tone `light dark:dark` 拡張への追従 (iter1701 due-proximity と同 sweep)。
describe('agentReliabilityChipClasses (Tailwind 3 軸)', () => {
  it('critical → rose、healthy → emerald (iter486 success tone 2 件目活用)', () => {
    const crit = agentReliabilityChipClasses('critical')
    expect(crit.bgClass).toBe('bg-rose-100 dark:bg-rose-950/40')
    const healthy = agentReliabilityChipClasses('healthy')
    expect(healthy.bgClass).toBe('bg-emerald-50 dark:bg-emerald-950/30')
    expect(healthy.textClass).toBe('text-emerald-700 dark:text-emerald-300')
  })

  it('warn → amber 薄、idle → slate 薄', () => {
    expect(agentReliabilityChipClasses('warn').bgClass).toBe('bg-amber-50 dark:bg-amber-950/30')
    expect(agentReliabilityChipClasses('idle').bgClass).toBe('bg-slate-50 dark:bg-slate-900/30')
  })
})
