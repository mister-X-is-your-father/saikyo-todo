/**
 * Phase 6.15 loop iter 683 (mode-D Desktop a11y) —
 * assignee-picker / tag-picker PopoverContent に aria-label 追加
 * (iter682 follow-up、Radix UI dialog accessible name 統一)。
 *
 * 課題: assignee-picker.tsx / tag-picker.tsx の PopoverContent は内部 h2 が無いため
 *   iter682 の aria-labelledby pattern が使えない。代わりに aria-label 直書きで
 *   accessible name を付与。SR が popover を開いた時「メンバー / AI Agent を選択」
 *   「タグを選択 / 新規作成」が dialog name として聞ける。
 *
 * fix (2 ファイル ~6 行差分):
 *   - assignee-picker PopoverContent: `aria-label="アサイン (メンバー / AI Agent) を選択"`
 *   - tag-picker PopoverContent: `aria-label="タグを選択 / 新規作成"`
 *   prettier 整形で props 多行化。
 *
 * 検証: source-side regex assert + iter515-682 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')

  // 1. assignee-picker PopoverContent aria-label
  if (
    /<PopoverContent\s*\n\s*className="w-64 p-0"\s*\n\s*align="start"\s*\n\s*aria-label="アサイン \(メンバー \/ AI Agent\) を選択"\s*\n\s*>/.test(
      ap,
    )
  ) {
    findings.push({ level: 'info', message: `assignee-picker PopoverContent label OK` })
  } else {
    findings.push({ level: 'warning', message: `assignee-picker PopoverContent label なし` })
  }

  // 2. tag-picker PopoverContent aria-label
  if (
    /<PopoverContent\s*\n\s*className="w-72 p-0"\s*\n\s*align="start"\s*\n\s*aria-label="タグを選択 \/ 新規作成"\s*\n\s*>/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tag-picker PopoverContent label OK` })
  } else {
    findings.push({ level: 'warning', message: `tag-picker PopoverContent label なし` })
  }

  // 3. iter682 invariant: notification-bell PopoverContent labelledby 維持
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/aria-labelledby="notification-bell-heading"/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter682 invariant: notification-bell labelledby 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter682 invariant: 破壊` })
  }

  // 4. iter682 invariant: notification-preferences PopoverContent labelledby 維持
  const np = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-preferences.tsx'),
    'utf8',
  )
  if (/aria-labelledby="notification-preferences-heading"/.test(np)) {
    findings.push({
      level: 'info',
      message: `iter682 invariant: notification-preferences labelledby 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter682 invariant: 破壊` })
  }

  // 5. iter650 invariant: tag-picker tag-options 維持 (= tag-picker 同 file)
  if (/checked\s*\n?\s*\?\s*`タグ「\$\{t\.name\}」を付与中 \(クリックで解除\)`/.test(tp)) {
    findings.push({ level: 'info', message: `iter650 invariant: tag checked hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter650 invariant: 破壊` })
  }

  // 6. iter649 invariant: assignee-picker option 維持 (= assignee-picker 同 file)
  if (/checked\s*\n?\s*\?\s*`「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(ap)) {
    findings.push({ level: 'info', message: `iter649 invariant: assignee option 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter649 invariant: 破壊` })
  }

  console.log(`\n=== Findings (picker-popover-aria-iter683) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
