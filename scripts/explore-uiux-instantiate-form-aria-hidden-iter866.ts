/**
 * Phase 6.15 loop iter866 — instantiate-form.tsx の Template 即実行 button visible text
 * (`{mut.isPending ? '展開中...' : '即実行 (Instantiate)'}`) を aria-hidden span で
 * wrap した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-instantiate-form-aria-hidden-iter866.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/template/instantiate-form.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (
    !/<span aria-hidden="true">\{mut\.isPending \? '展開中\.\.\.' : '即実行 \(Instantiate\)'\}<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: '即実行 button visible wrap が無い' })
  }

  // aria-label invariant
  if (!src.includes('を展開中…`') || !src.includes('を即実行 (Instantiate)`')) {
    findings.push({ level: 'error', message: 'aria-label 2 状態 invariant 不一致' })
  }

  // raw 単独行残置なし
  if (src.split('\n').some((l) => /^\s*(展開中\.\.\.|即実行 \(Instantiate\))\s*$/.test(l))) {
    findings.push({ level: 'error', message: 'raw 単独行が残存' })
  }

  console.log(`\n=== Findings (instantiate-form-aria-hidden iter866) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
