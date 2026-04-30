/**
 * Phase 6.15 loop iter 394 — templates-panel.tsx の 2 CardTitle に role="heading"
 * + aria-level を付与 (codebase 全 CardTitle の heading semantic 統一)。
 *
 * 課題: shadcn の `<CardTitle>` は `<div data-slot="card-title">` 実装で
 *   role=heading を持たず、CardHeader 内に書いただけでは SR の heading
 *   navigation で識別されない。今 codebase の他 CardTitle (dashboard /
 *   today / sprints / goals / pdca 等) は `role="heading" aria-level={2}`
 *   を明示しているが、templates-panel.tsx の 2 箇所だけ抜けていた。
 *   - line 80 「新規 Template」 form heading: aria-level=2
 *   - line 237 t.name (各 template card title): aria-level=3 (Card 内の sub heading)
 *
 * fix: src/components/template/templates-panel.tsx 1 file × 2 箇所 (約 6 line
 *   差替、機能追加なし、shadcn 編集なし)。CardTitle に role="heading" +
 *   aria-level={2|3} を追加。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/template/templates-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. 「新規 Template」 CardTitle が role="heading" aria-level={2}
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{2\}>[\s\S]*?新規 Template/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: 「新規 Template」 CardTitle に role="heading" aria-level={2} が無い`,
    })
  } else {
    findings.push({ level: 'info', message: '新規 Template heading OK' })
  }

  // 2. template card t.name CardTitle に role="heading" aria-level={3}
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{3\}>[\s\S]*?\{t\.name\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: template card t.name CardTitle に role="heading" aria-level={3} が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'template card t.name heading OK' })
  }

  // 3. iter389-393 invariant 維持 (skip-link 全 14 page)
  const layoutSrc = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (!/<a\s+href="#main-content"[\s\S]*?メインコンテンツへスキップ/.test(layoutSrc)) {
    findings.push({ level: 'warning', message: 'src/app/layout.tsx: iter389 skip-link 消えた' })
  }

  console.log(`\n=== Findings (templates-heading-iter394) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
