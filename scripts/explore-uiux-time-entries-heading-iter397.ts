/**
 * Phase 6.15 loop iter 397 — time-entries 系 4 CardTitle に role="heading" +
 * aria-level を付与 (iter394/395 pattern を完成)。
 *
 * 課題: iter395 real browser 探索で発見した time-entries page の 3 件
 *   (見積精度 / 新規 稼働記録 / 一覧) + estimate-bias-insight の loading 用
 *   CardTitle 1 件、計 4 件で role=heading 不在。
 *
 * fix: 2 file × 各 2 箇所 (合計 4 CardTitle、約 14 line 差替、機能追加なし、
 *   shadcn 編集なし)。CardTitle に `role="heading" aria-level={2}` を追加
 *   (全て top-level form / list heading なので level 2)。
 *
 *   - time-entries-panel.tsx:
 *     - 「新規 稼働記録」 form CardTitle (level 2)
 *     - 「一覧 (N 件)」 list CardTitle (level 2)
 *   - estimate-bias-insight.tsx:
 *     - 「見積精度 (直近)」 loading 用 CardTitle (level 2)
 *     - 「見積精度 (直近)」 main CardTitle (level 2)
 *
 * iter394 (templates) + iter395 (workflows + integrations) + iter397
 * (time-entries) で codebase 内 主要 panel CardTitle が全て heading semantic
 * 統一 (dashboard / today / sprints / goals / pdca / templates / workflows /
 * integrations / time-entries)。
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

  // 1. time-entries-panel: 新規 稼働記録 + 一覧
  const teTarget = 'src/components/time-entry/time-entries-panel.tsx'
  const teSrc = readFileSync(resolve(process.cwd(), teTarget), 'utf8')
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{2\}>[\s\S]*?新規 稼働記録/.test(
      teSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${teTarget}: 「新規 稼働記録」 CardTitle role/aria-level 無し`,
    })
  } else {
    findings.push({ level: 'info', message: 'time-entries 新規 稼働記録 OK' })
  }
  // 一覧 CardTitle (data-driven sr-only span を含む)
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{2\}>[\s\S]*?<span aria-hidden="true">一覧/.test(
      teSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${teTarget}: 「一覧」 CardTitle role/aria-level 無し`,
    })
  } else {
    findings.push({ level: 'info', message: 'time-entries 一覧 OK' })
  }

  // 2. estimate-bias-insight: loading + main
  const ebTarget = 'src/components/time-entry/estimate-bias-insight.tsx'
  const ebSrc = readFileSync(resolve(process.cwd(), ebTarget), 'utf8')
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{2\}>[\s\S]*?見積精度 \(直近\)/.test(
      ebSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${ebTarget}: loading 用 「見積精度 (直近)」 CardTitle role/aria-level 無し`,
    })
  } else {
    findings.push({ level: 'info', message: 'estimate-bias loading 見積精度 OK' })
  }
  if (
    !/<CardTitle\s+className="flex items-center gap-2 text-base"\s+role="heading"\s+aria-level=\{2\}>/.test(
      ebSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${ebTarget}: main 「見積精度 (直近)」 CardTitle role/aria-level 無し`,
    })
  } else {
    findings.push({ level: 'info', message: 'estimate-bias main 見積精度 OK' })
  }

  // iter394-396 invariant 維持
  for (const f of [
    'src/components/template/templates-panel.tsx',
    'src/components/workflow/workflows-panel.tsx',
    'src/components/integrations/integrations-panel.tsx',
    'src/components/shared/async-states.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (
      f.endsWith('async-states.tsx') &&
      !/<div className="text-muted-foreground max-w-md text-sm">\{description\}<\/div>/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter396 EmptyState <div> wrap 消えた` })
    }
    if (
      !f.endsWith('async-states.tsx') &&
      !/<CardTitle\s+className="[^"]+"\s+role="heading"/.test(s)
    ) {
      findings.push({
        level: 'warning',
        message: `${f}: iter394/395 CardTitle role=heading 消えた`,
      })
    }
  }

  console.log(`\n=== Findings (time-entries-heading-iter397) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
