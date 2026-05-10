/**
 * Phase 6.15 loop iter 908 (mode-D Desktop a11y) —
 * integrations-panel src-project-ids + src-items-path + src-due-path 3 input
 * aria-label を WCAG 2.5.3 (Label in Name) 適合形に変更 (一括 3 input)。
 *
 * 課題: src/components/integrations/integrations-panel.tsx の 3 input は visible <Label>
 *   "(1 件以上)" / "(任意)" / "(任意)" を持つが、旧 aria-label は "(必須、N 件以上、…)" /
 *   "(任意、JSON dot-path、…)" / "(任意、各 item から…)" の形で visible parenthetical
 *   "(任意)" / "(1 件以上)" を contiguous substring に持たない (中間に "必須、" や
 *   "JSON dot-path、" など挿入) → WCAG 2.5.3 違反。
 *
 * fix (1 ファイル / +6-6 行差分、3 input × 2 case 一括):
 *   - src-project-ids aria-label: `project IDs (1 件以上): 必須、カンマ区切り — ...` 形
 *   - src-items-path aria-label: `items path (任意): JSON dot-path、…` 形
 *   - src-due-path aria-label: `due path (任意): 各 item から期日を取り出す JSON dot-path、…` 形
 *
 * 検証: source-side regex assert + iter906/907 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. src-project-ids aria-label に "project IDs (1 件以上)" prefix
  if (/'project IDs \(1 件以上\): 必須、カンマ区切り — 例: proj-a, proj-b'/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-project-ids empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-project-ids empty aria-label 不含` })
  }

  // 2. src-items-path aria-label に "items path (任意)" prefix
  if (
    /'items path \(任意\): JSON dot-path、省略で response root を items 配列とみなす — 例: data\.items'/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `src-items-path empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-items-path empty aria-label 不含` })
  }

  // 3. src-due-path aria-label に "due path (任意)" prefix
  if (/'due path \(任意\): 各 item から期日を取り出す JSON dot-path — 例: due_date'/.test(ip)) {
    findings.push({
      level: 'info',
      message: `src-due-path empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `src-due-path empty aria-label 不含` })
  }

  // 4. 旧 aria-label 削除
  if (!/'project IDs \(必須、1 件以上、カンマ区切り — 例: proj-a, proj-b\)'/.test(ip)) {
    findings.push({ level: 'info', message: `src-project-ids 旧 aria-label 削除済 OK` })
  } else {
    findings.push({ level: 'warning', message: `src-project-ids 旧 aria-label 残存` })
  }
  if (
    !/'items path \(任意、JSON dot-path、省略で response root を items 配列とみなす — 例: data\.items\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `src-items-path 旧 aria-label 削除済 OK` })
  } else {
    findings.push({ level: 'warning', message: `src-items-path 旧 aria-label 残存` })
  }

  // iter907 invariant: sprint-defaults-length aria-label
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/`期間 \(日\): Sprint デフォルト期間の日数、1-90、現在 \$\{length\} 日`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter907 invariant: sprint-defaults-length aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter907 invariant: sprint-defaults-length 破壊` })
  }

  console.log(`\n=== Findings (integrations-config-paths-iter908) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
