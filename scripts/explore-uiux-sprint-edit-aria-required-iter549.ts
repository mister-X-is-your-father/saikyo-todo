/**
 * Phase 6.15 loop iter 549 (mode-D Desktop a11y) —
 * SprintsPanel sprint-edit-start / sprint-edit-end Input に aria-required="true" を補完。
 *
 * 課題: sprints-panel.tsx の sprint-edit-start (行 577-587) と sprint-edit-end (行 595-605)
 *   は required HTML 属性のみで aria-required="true" 不在。同じ form 内の sprint-name /
 *   sprint-start / sprint-end (create form) は required + aria-required="true" を併記
 *   しているが edit form のみ asymmetric。
 *
 * fix (1 ファイル ~2 行差分):
 *   - sprint-edit-start に aria-required="true"
 *   - sprint-edit-end に aria-required="true"
 *
 * required HTML 属性 + aria-required="true" を併記することで、HTML 属性を honor しない
 * 古い SR でも required 状態が伝わる (WCAG 推奨 belt-and-suspenders pattern)。
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、Label htmlFor / id / required /
 * aria-label / aria-invalid / data-testid invariant 維持。
 *
 * 検証: source-side regex assert + iter515-548 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-edit-start aria-required
  if (
    /id=\{`sprint-edit-start-\$\{sprint\.id\}`\}[\s\S]*?required\s+aria-required="true"/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-edit-start aria-required 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-edit-start aria-required 不在`,
    })
  }

  // 2. sprint-edit-end aria-required
  if (/id=\{`sprint-edit-end-\$\{sprint\.id\}`\}[\s\S]*?required\s+aria-required="true"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-edit-end aria-required 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-edit-end aria-required 不在`,
    })
  }

  // 3. sprint-name / sprint-start / sprint-end の既存 aria-required 維持
  const ariaReqCount = (sp.match(/aria-required="true"/g) ?? []).length
  if (ariaReqCount >= 5) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: aria-required="true" 出現 ${ariaReqCount} 回 (sprint-name + start + end + edit-start + edit-end + ...) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: aria-required="true" 出現 ${ariaReqCount} 回 (期待 ≥5)`,
    })
  }

  // 4. iter548 invariant: sprint-period-cancel + sprint-defaults-cancel aria-label 維持
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集をキャンセル`\}/.test(sp) &&
    /aria-label="Sprint デフォルトの編集をキャンセル"/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter548 invariant: 2 sprint cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter548 invariant: 破壊`,
    })
  }

  // 5. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (sprint-edit-aria-required-iter549) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
