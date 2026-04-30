/**
 * Phase 6.15 loop iter 398 — `top-items-by-time-chip.tsx` の最後の CardTitle
 * に role="heading" + aria-level を付与 (iter394-397 の heading semantic
 * carriage を完成、codebase 内 CardTitle 100% role=heading)。
 *
 * 課題: iter394 (templates) / iter395 (workflows + integrations) / iter397
 *   (time-entries 4 件) で codebase の主要 CardTitle に role=heading を
 *   付与してきたが、`grep -rEn "<CardTitle " src/components/ | grep -v "role=\"heading\""`
 *   で最後 1 件残っているのが top-items-by-time-chip.tsx の「直近 N 日
 *   稼働ダッシュボード」 CardTitle (line 103) と判明。本 iter で fix し
 *   100% carriage 達成。
 *
 * fix: src/components/time-entry/top-items-by-time-chip.tsx 1 file × 1 箇所
 *   (約 1 line 差替、機能追加なし、shadcn 編集なし)。CardTitle に
 *   `role="heading" aria-level={2}` を追加 (top-level chip heading なので
 *   level 2、time-entries-panel の他 CardTitle と同 level)。
 *
 * 検証: source-side regex assert + codebase 全 CardTitle に role=heading
 *   carriage 100% を確認。
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/time-entry/top-items-by-time-chip.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. top-items chip CardTitle role=heading
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{2\}>[\s\S]*?稼働ダッシュボード/.test(
      src,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: 「直近 N 日 稼働ダッシュボード」 CardTitle role/aria-level 無し`,
    })
  } else {
    findings.push({ level: 'info', message: 'top-items-by-time-chip heading OK' })
  }

  // 2. codebase 全 CardTitle に role=heading carriage 100% (negative grep)
  let orphans: string[] = []
  try {
    const out = execSync(
      `grep -rEn "<CardTitle " src/components/ | grep -v 'role="heading"' || true`,
      { cwd: process.cwd(), encoding: 'utf8' },
    )
    orphans = out
      .trim()
      .split('\n')
      .filter((l) => l.length > 0)
  } catch {
    // grep no-match exits with code 1 が || true で吸収
  }
  if (orphans.length > 0) {
    findings.push({
      level: 'warning',
      message: `codebase 内に role=heading 未付与 CardTitle が ${orphans.length} 件残: ${orphans.slice(0, 3).join(' | ')}`,
    })
  } else {
    findings.push({
      level: 'info',
      message: 'codebase 内 全 CardTitle に role=heading carriage 100% 達成',
    })
  }

  // 3. iter394-397 invariant 維持
  for (const f of [
    'src/components/template/templates-panel.tsx',
    'src/components/workflow/workflows-panel.tsx',
    'src/components/integrations/integrations-panel.tsx',
    'src/components/time-entry/time-entries-panel.tsx',
    'src/components/time-entry/estimate-bias-insight.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<CardTitle\s+className="[^"]+"\s+role="heading"/.test(s)) {
      findings.push({ level: 'warning', message: `${f}: iter394-397 CardTitle heading 消えた` })
    }
  }

  console.log(`\n=== Findings (top-items-heading-iter398) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
