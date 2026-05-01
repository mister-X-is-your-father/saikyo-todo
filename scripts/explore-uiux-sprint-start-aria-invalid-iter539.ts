/**
 * Phase 6.15 loop iter 539 (mode-D Desktop a11y) —
 * SprintsPanel sprint-create form の sprint-start Input に aria-invalid を補完。
 *
 * 課題: sprints-panel.tsx 行 219-230 の sprint-start Input は required + max のみで
 *   aria-invalid 不在。sprint-end (line 232+) は aria-invalid={isInvalidDateRange(...)}
 *   持っており不整合。sprint-end 不正時は sprint-start 側も「終了より遅い開始」で
 *   同様に invalid な状態だが、SR には sprint-start が valid として伝わる。
 *
 * fix (1 ファイル ~1 行差分):
 *   - sprint-start に aria-invalid={isInvalidDateRange(startDate, endDate) || undefined}
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、Label htmlFor / id / required /
 * aria-required / max invariant 維持。これで startDate / endDate 両方が同じ
 * isInvalid 判定で aria-invalid 反映される対称形に。
 *
 * 検証: source-side regex assert + iter515-538 invariant cross-check。
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

  // 1. sprint-start aria-invalid
  if (
    /id="sprint-start"[\s\S]*?aria-invalid=\{isInvalidDateRange\(startDate, endDate\) \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-start aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-start aria-invalid 不在`,
    })
  }

  // 2. sprint-end aria-invalid 既存維持
  if (
    /id="sprint-end"[\s\S]*?aria-invalid=\{isInvalidDateRange\(startDate, endDate\) \|\| undefined\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-end aria-invalid 既存維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-end aria-invalid 破壊`,
    })
  }

  // 3. iter538 invariant: wf-editor-save aria-busy 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/aria-busy=\{saving \|\| undefined\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter538 invariant: wf-editor-save aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter538 invariant: 破壊`,
    })
  }

  // 4. iter525 invariant: 4 sprint status button aria-busy 維持
  const okSprintBtn = (sp.match(/aria-busy=\{changing \|\| undefined\}/g) ?? []).length === 4
  if (okSprintBtn) {
    findings.push({
      level: 'info',
      message: `iter525 invariant: 4 sprint status button aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter525 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (sprint-start-aria-invalid-iter539) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
