/**
 * Phase 6.15 loop iter861 — create-time-entry-form.tsx submit button visible
 * "{create.isPending ? '...' : '記録'}" を aria-hidden span で wrap した regression guard。
 *
 * 背景: iter844-860 sweep の続編。Item ごと作業稼働記録 form の submit button は aria-label
 * "稼働記録を作成中…" / "稼働記録を作成" が完全 content を含むのに visible 子 text のみ
 * aria-hidden 無し。
 *
 *   pnpm tsx scripts/explore-uiux-create-time-entry-aria-hidden-iter861.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/time-entry/create-time-entry-form.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // 1. submit button の visible aria-hidden span wrap
  if (!/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: 'submit button visible wrap が無い' })
  }

  // 2. aria-label invariant
  for (const a of ['稼働記録を作成中…', '稼働記録を作成']) {
    if (!src.includes(`'${a}'`)) {
      findings.push({ level: 'error', message: `aria-label "${a}" が無い` })
    }
  }

  // 3. data-testid="create-time-entry-submit" 健在
  if (!src.includes('data-testid="create-time-entry-submit"')) {
    findings.push({ level: 'error', message: 'data-testid="create-time-entry-submit" 健在性 NG' })
  }

  // 4. raw visible 単独行残置なし
  if (src.split('\n').some((l) => /^\s*記録\s*$/.test(l))) {
    findings.push({ level: 'error', message: 'raw "記録" 単独行が残存' })
  }

  console.log(`\n=== Findings (create-time-entry-aria-hidden iter861) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
