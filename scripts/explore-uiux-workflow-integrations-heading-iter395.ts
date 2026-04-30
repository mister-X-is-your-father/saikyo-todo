/**
 * Phase 6.15 loop iter 395 — workflows-panel + integrations-panel の CardTitle に
 * role="heading" + aria-level を付与 (iter394 templates-panel pattern を water-fall)。
 *
 * 課題: real browser 探索 (chromium 経由 /workflows /integrations /time-entries
 *   /templates /archive を navigate) の結果、shadcn `<CardTitle>` が role=heading
 *   不在のまま render されている箇所を発見:
 *   - workflows-panel.tsx 「新規 Workflow」 form CardTitle (level 2 想定)
 *   - workflows-panel.tsx wf.name card title (level 3 想定)
 *   - integrations-panel.tsx 「新規 Source」 form CardTitle (level 2 想定)
 *   - integrations-panel.tsx src.name card title (level 3 想定)
 *   (time-entries にも 3 件あったが scope を 2 file に維持するため次 iter)
 *
 * fix: 2 file × 2 箇所 (合計 4 CardTitle、約 16 line 差替、機能追加なし、
 *   shadcn 編集なし)。CardTitle に `role="heading" aria-level={2|3}` を追加。
 *   form heading は level 2、各 card name は level 3 (Card 内 sub heading)。
 *
 * 経路: real browser script 経由で SR の heading navigation 不可を検出 →
 *   source 修正 → 本 codify script で source-side regress guard。
 *
 * 検証: source-side regex assert で codify (browser script は probe 段階で 5 issue
 *   発見、本 iter で 4/5 を fix、time-entries の 3 issue は scope 外で次 iter)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. workflows-panel: 新規 Workflow + wf.name
  const wfTarget = 'src/components/workflow/workflows-panel.tsx'
  const wfSrc = readFileSync(resolve(process.cwd(), wfTarget), 'utf8')
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{2\}>[\s\S]*?新規 Workflow/.test(
      wfSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${wfTarget}: 「新規 Workflow」 CardTitle に role/aria-level が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'workflows-panel 新規 Workflow heading OK' })
  }
  if (
    !/<CardTitle\s+className="truncate text-base"\s+role="heading"\s+aria-level=\{3\}>[\s\S]*?\{wf\.name\}/.test(
      wfSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${wfTarget}: wf.name CardTitle に role/aria-level が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'workflows-panel wf.name heading OK' })
  }

  // 2. integrations-panel: 新規 Source + src.name
  const intTarget = 'src/components/integrations/integrations-panel.tsx'
  const intSrc = readFileSync(resolve(process.cwd(), intTarget), 'utf8')
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{2\}>[\s\S]*?新規 Source/.test(
      intSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${intTarget}: 「新規 Source」 CardTitle に role/aria-level が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'integrations-panel 新規 Source heading OK' })
  }
  if (
    !/<CardTitle\s+className="truncate text-base"\s+role="heading"\s+aria-level=\{3\}>[\s\S]*?\{src\.name\}/.test(
      intSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${intTarget}: src.name CardTitle に role/aria-level が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'integrations-panel src.name heading OK' })
  }

  // 3. iter394 templates-panel invariant
  const tplSrc = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    !/<CardTitle\s+className="text-base"\s+role="heading"\s+aria-level=\{2\}>[\s\S]*?新規 Template/.test(
      tplSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: 'templates-panel.tsx: iter394 「新規 Template」 heading が消えた',
    })
  }

  console.log(`\n=== Findings (sprints-browser-iter395) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
