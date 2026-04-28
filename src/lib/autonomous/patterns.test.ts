import { describe, expect, it } from 'vitest'

import {
  evaluateRefactorTriggers,
  findLargeFiles,
  isActionableCodeTodo,
  parseAnyLeaks,
  parseCodeTodos,
  parseHotspots,
  parseLintWarnings,
} from './patterns'

describe('parseHotspots', () => {
  it('counts files across multiple commits and filters by threshold', () => {
    // 5 commit でうち 3 commit に foo.ts が出てくる、bar.ts は 1 commit、
    // baz.ts は 5 commit
    const log = [
      'aaa1111 feat: a',
      'src/foo.ts',
      'src/baz.ts',
      '',
      'aaa2222 feat: b',
      'src/foo.ts',
      'src/baz.ts',
      '',
      'aaa3333 feat: c',
      'src/foo.ts',
      'src/baz.ts',
      '',
      'aaa4444 feat: d',
      'src/baz.ts',
      '',
      'aaa5555 feat: e',
      'src/bar.ts',
      'src/baz.ts',
    ].join('\n')

    const result = parseHotspots(log, 3)
    expect(result).toEqual([
      { file: 'src/baz.ts', count: 5 },
      { file: 'src/foo.ts', count: 3 },
    ])
  })

  it('returns empty when nothing meets threshold', () => {
    const log = ['aaa1 feat: a', 'src/x.ts', 'src/y.ts'].join('\n')
    expect(parseHotspots(log, 5)).toEqual([])
  })

  it('ignores blank lines and commit subject lines (which contain spaces)', () => {
    const log = ['hhhh feat: subject with spaces', '', '   ', 'src/only.ts'].join('\n')
    const r = parseHotspots(log, 1)
    expect(r).toEqual([{ file: 'src/only.ts', count: 1 }])
  })

  it('default threshold is 5', () => {
    const lines = Array(5)
      .fill(0)
      .flatMap((_, i) => [`hhhh${i} feat: c${i}`, 'src/hot.ts'])
    expect(parseHotspots(lines.join('\n'))).toEqual([{ file: 'src/hot.ts', count: 5 }])
  })
})

describe('findLargeFiles', () => {
  it('flags Service > 300 and Component > 250 with correct thresholds', () => {
    const files = [
      { path: 'src/features/foo/service.ts', lines: 350 },
      { path: 'src/features/foo/service.ts', lines: 200 }, // 別 entry — 同 path はテスト用
      { path: 'src/components/foo/big.tsx', lines: 260 },
      { path: 'src/components/foo/small.tsx', lines: 100 },
      { path: 'src/lib/random.ts', lines: 1000 }, // .ts だが service.ts でなければ無視
    ]
    const r = findLargeFiles(files)
    // 大きい順
    expect(r.map((x) => x.path)).toEqual([
      'src/features/foo/service.ts',
      'src/components/foo/big.tsx',
    ])
    expect(r[0]).toMatchObject({ kind: 'service', threshold: 300 })
    expect(r[1]).toMatchObject({ kind: 'component', threshold: 250 })
  })

  it('returns empty when nothing is over the line', () => {
    expect(
      findLargeFiles([
        { path: 'src/features/x/service.ts', lines: 300 },
        { path: 'src/components/x.tsx', lines: 250 },
      ]),
    ).toEqual([])
  })
})

describe('parseLintWarnings', () => {
  it('extracts warning count from eslint summary line', () => {
    expect(parseLintWarnings('✖ 1 problem (0 errors, 1 warning)')).toBe(1)
    expect(parseLintWarnings('✖ 12 problems (0 errors, 12 warnings)')).toBe(12)
  })

  it('returns 0 when summary missing or no warnings', () => {
    expect(parseLintWarnings('')).toBe(0)
    expect(parseLintWarnings('all good ✓')).toBe(0)
  })
})

describe('evaluateRefactorTriggers', () => {
  it('returns empty when nothing is over the line', () => {
    expect(
      evaluateRefactorTriggers({
        lintWarnings: 0,
        todoCount: 0,
        recentAnyLeak: 0,
        hotspotCount: 0,
        largeFileCount: 0,
      }),
    ).toEqual([])
  })

  it('flags every condition individually at the boundary', () => {
    const triggers = evaluateRefactorTriggers({
      lintWarnings: 10,
      todoCount: 5,
      recentAnyLeak: 1,
      hotspotCount: 1,
      largeFileCount: 1,
    })
    expect(triggers).toHaveLength(5)
    expect(triggers.join(' ')).toContain('lint-warnings≥10(=10)')
    expect(triggers.join(' ')).toContain('todo-fixme≥5(=5)')
    expect(triggers.join(' ')).toContain('recent-any-leak(=1)')
    expect(triggers.join(' ')).toContain('hotspot-files(=1)')
    expect(triggers.join(' ')).toContain('large-files(=1)')
  })

  it('ignores values just below the threshold', () => {
    expect(
      evaluateRefactorTriggers({
        lintWarnings: 9,
        todoCount: 4,
        recentAnyLeak: 0,
        hotspotCount: 0,
        largeFileCount: 0,
      }),
    ).toEqual([])
  })
})

describe('isActionableCodeTodo', () => {
  it('matches single-line // comments with actionable suffix', () => {
    expect(isActionableCodeTodo('// TODO: refactor this')).toBe(true)
    expect(isActionableCodeTodo('  // FIXME(alice): edge case')).toBe(true)
    expect(isActionableCodeTodo('foo() // HACK: workaround')).toBe(true)
  })

  it('matches JSDoc continuation lines', () => {
    expect(isActionableCodeTodo(' * TODO: extract')).toBe(true)
    expect(isActionableCodeTodo('   * FIXME(2026): retire')).toBe(true)
  })

  it('matches block-comment opener and HTML comment', () => {
    expect(isActionableCodeTodo('/* TODO: thing */')).toBe(true)
    expect(isActionableCodeTodo('<!-- FIXME: copy --></div>')).toBe(true)
  })

  it('matches あとで with suffix in comment', () => {
    expect(isActionableCodeTodo('// あとで: 直す')).toBe(true)
  })

  it('rejects keywords inside string literals (product name / prose)', () => {
    expect(isActionableCodeTodo("title: '最強TODO'")).toBe(false)
    expect(isActionableCodeTodo("'TODO サービスの Engineer Agent'")).toBe(false)
    expect(isActionableCodeTodo("    label: 'TODO',")).toBe(false)
    expect(isActionableCodeTodo('<option value="todo">TODO</option>')).toBe(false)
  })

  it('rejects JSDoc prose without suffix', () => {
    // `* 1 行 TODO クイック追加。` のような説明文は actionable ではない
    expect(isActionableCodeTodo(' * 1 行 TODO クイック追加。')).toBe(false)
  })

  it('rejects keywords in code without comment marker', () => {
    expect(isActionableCodeTodo('const TODO = 42')).toBe(false)
    expect(isActionableCodeTodo('foo.TODO()')).toBe(false)
  })

  it('rejects when comment marker comes AFTER keyword', () => {
    // String literal containing TODO, then trailing comment — not actionable
    expect(isActionableCodeTodo("const x = 'TODO foo' // some note")).toBe(false)
  })
})

describe('parseCodeTodos', () => {
  it('counts only comment-context actionable TODOs from git grep output', () => {
    const grep = [
      'src/foo.ts:10:// TODO: do thing',
      "src/foo.ts:11:    label: 'TODO',",
      'src/foo.ts:12: * FIXME(name): later',
      'src/bar.tsx:30:        <h1>最強TODO</h1>',
      'src/baz.ts:5: * @returns the TODO',
      'src/quux.ts:7:// HACK(workaround): ignore',
    ].join('\n')
    expect(parseCodeTodos(grep)).toBe(3)
  })

  it('returns 0 when output is empty or only false positives', () => {
    expect(parseCodeTodos('')).toBe(0)
    expect(
      parseCodeTodos(
        ["src/a.ts:1:title: '最強TODO'", 'src/b.tsx:2:<option value="todo">TODO</option>'].join(
          '\n',
        ),
      ),
    ).toBe(0)
  })

  it('skips malformed grep lines (missing colons)', () => {
    expect(parseCodeTodos('not a grep line\nfoo.ts no colon\n')).toBe(0)
  })
})

describe('parseAnyLeaks', () => {
  it('counts TS escape-hatch additions', () => {
    const diff = [
      '+++ b/src/foo.ts',
      '+function f(x: any): void {}',
      '+const y = obj as any',
      '+const z = obj as unknown as Foo',
      '+const m = new Map<string, any>()',
      '+// @ts-expect-error legacy',
      '+// @ts-ignore TODO drop',
      '-removed line',
    ].join('\n')
    expect(parseAnyLeaks(diff)).toBe(6)
  })

  it('does NOT count substring "any" inside identifiers', () => {
    const diff = [
      '+++ b/src/lib/autonomous/patterns.ts',
      '+  recentAnyLeak: number',
      "+  expect(triggers).toContain('recent-any-leak(=1)')",
      '+function isAnyone() {}',
      '+const company = "Anyone Corp"',
    ].join('\n')
    expect(parseAnyLeaks(diff)).toBe(0)
  })

  it('skips diff filename headers (+++ lines)', () => {
    const diff = ['+++ b/src/types/any.d.ts', '+const x: number = 1'].join('\n')
    expect(parseAnyLeaks(diff)).toBe(0)
  })

  it('counts each line at most once', () => {
    const diff = ['+const x: any = obj as any // double escape'].join('\n')
    expect(parseAnyLeaks(diff)).toBe(1)
  })

  it('returns 0 for empty / no additions', () => {
    expect(parseAnyLeaks('')).toBe(0)
    expect(parseAnyLeaks(['-removed: any', ' context: any'].join('\n'))).toBe(0)
  })
})
