/**
 * Phase 6.15 loop iter 894 (mode-D Desktop a11y) —
 * sprints-panel sprint-defaults-edit-btn + sprint-period-edit-btn 両 button visible
 * aria-hidden + WCAG 2.5.3 適合化 (一括 2 button)。
 *
 * 課題:
 *   - sprint-defaults-edit-btn (visible "編集") 旧 aria-label "Sprint デフォルト (...) の編集モードを開く" は
 *     visible "編集" prefix としては適合だが (substring "編集" ✓)、campaign 規約 (visible aria-hidden) から外れていた
 *   - sprint-period-edit-btn (visible "期間") 旧 aria-label "Sprint「{name}」の期間を編集" は substring "期間" ✓
 *     だが campaign 規約から外れていた
 *
 *   両 button とも aria-label を visible prefix 形に変更し、明示的 a11y 第一順位化。
 *
 * fix (1 ファイル / +4-3 行差分、2 button 一括):
 *   - sprint-defaults-edit-btn: aria-label を `編集 (Sprint デフォルト 現在: ${DOW}曜開始 / ${days} 日 を編集モードで開く)` 形 + visible wrap
 *   - sprint-period-edit-btn: aria-label を `期間 (Sprint「${name}」の期間を編集)` 形 + visible wrap
 *
 * 検証: source-side regex assert + iter892/893 invariant cross-check。
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

  // 1. sprint-defaults-edit-btn aria-label に "編集" prefix
  if (
    /aria-label=\{`編集 \(Sprint デフォルト 現在: \$\{DOW_JA\[cur\.startDow\]\}曜開始 \/ \$\{cur\.lengthDays\} 日 を編集モードで開く\)`\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-defaults-edit-btn aria-label に "編集" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-defaults-edit-btn aria-label が "編集" prefix 不含`,
    })
  }

  // 2. sprint-defaults-edit-btn visible aria-hidden
  if (
    /data-testid="sprint-defaults-edit-btn"[\s\S]+?<span aria-hidden="true">編集<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-defaults-edit-btn visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-defaults-edit-btn visible aria-hidden 未統合`,
    })
  }

  // 3. sprint-period-edit-btn aria-label に "期間" prefix
  if (/aria-label=\{`期間 \(Sprint「\$\{sprint\.name\}」の期間を編集\)`\}/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-period-edit-btn aria-label に "期間" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-period-edit-btn aria-label が "期間" prefix 不含`,
    })
  }

  // 4. sprint-period-edit-btn visible "期間" aria-hidden
  if (
    /data-testid=\{`sprint-period-edit-btn-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">期間<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-period-edit-btn visible "期間" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-period-edit-btn visible aria-hidden 未統合`,
    })
  }

  // iter893 invariant: kr-add-btn aria-label
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/'KR 追加 \(Key Result をこの Goal に追加\)'/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter893 invariant: kr-add-btn aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter893 invariant: kr-add-btn 破壊` })
  }

  console.log(`\n=== Findings (sprint-edit-buttons-aria-hidden-iter894) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
