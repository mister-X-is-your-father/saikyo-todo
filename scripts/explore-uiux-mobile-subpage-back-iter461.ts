/**
 * Phase 6.15 loop iter 461 (mode-M Mobile audit) — workspace sub-page 8 件の
 * "← Workspace" back button が iter460 と同じ size="sm" (h-8=32px) で WCAG
 * 2.5.5 AAA 違反だった件を一括 fix、codify。
 *
 * 課題: src/app/(workspace)/[workspaceId]/{archive,sprints,integrations,pdca,
 *   time-entries,workflows,goals,templates}/page.tsx の各 page action button
 *   が `<Button size="sm">` で h-8 (32px)、iPhone SE で 32px height < 44px
 *   target → ミスタップ起こりやすい。iter460 で workspace home の同 pattern
 *   は fix 済、sub-page 8 件は取り残されていた。
 *
 * fix: 8 ファイル × 各 1 行 = ~8 行差分。
 *   - 各 Button に `className="min-h-11"` 追加 (iter460 と同 pattern)
 *   - size="sm" 維持で text size はそのまま、height のみ 44px に enforce
 *
 * 機能追加なし、視覚 layout は height 32→44px のみ、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify (8 file 全てに min-h-11 確認)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const PAGES = [
    'archive',
    'sprints',
    'integrations',
    'pdca',
    'time-entries',
    'workflows',
    'goals',
    'templates',
  ]
  for (const dir of PAGES) {
    const path = `src/app/(workspace)/[workspaceId]/${dir}/page.tsx`
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (/<Button variant="outline" asChild size="sm" className="min-h-11">/.test(src)) {
      findings.push({ level: 'info', message: `${dir}/page.tsx: min-h-11 配線 OK` })
    } else {
      findings.push({ level: 'warning', message: `${dir}/page.tsx: min-h-11 配線 不在` })
    }
  }

  // iter460 invariant: workspace home page も維持
  const homePath = 'src/app/(workspace)/[workspaceId]/page.tsx'
  const homeSrc = readFileSync(resolve(process.cwd(), homePath), 'utf8')
  const homeCount = (homeSrc.match(/className="min-h-11"/g) ?? []).length
  if (homeCount >= 9) {
    findings.push({
      level: 'info',
      message: `home: iter460 9 button min-h-11 維持 (count=${homeCount}) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `home: iter460 button min-h-11 消えた (count=${homeCount} < 9)`,
    })
  }

  console.log(`\n=== Findings (mobile-subpage-back-iter461) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
