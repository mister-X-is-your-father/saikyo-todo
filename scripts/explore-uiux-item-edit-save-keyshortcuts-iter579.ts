/**
 * Phase 6.15 loop iter 579 (mode-D Desktop a11y) —
 * item-edit-dialog 保存 Button に aria-keyshortcuts="Meta+S Control+S" を補完。
 *
 * 課題: item-edit-dialog.tsx 行 226-237 で Cmd/Ctrl+S 押下を window keydown で
 *   購読し handleSave を呼ぶが、保存 Button (行 879-895) には aria-keyshortcuts 不在。
 *   SR / voice control に shortcut が expose されておらず、aria-label にも shortcut の
 *   記載なし。WCAG 2.1.4 (Character Key Shortcuts) ARIA 1.2 attribute、modifier 必須形式。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-keyshortcuts="Meta+S Control+S"
 *   - aria-label に "Cmd/Ctrl+S でも可" を追記 (comment-thread iter356 / quick-add 等と
 *     同 pattern)
 *
 * 検証: source-side regex assert + iter515-578 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. item-edit-save aria-keyshortcuts
  if (/data-testid="item-edit-save"\s*\n\s*aria-keyshortcuts="Meta\+S Control\+S"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: 保存 Button aria-keyshortcuts 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: 保存 Button aria-keyshortcuts 不在`,
    })
  }

  // 2. aria-label に Cmd/Ctrl+S 記載
  if (/`「\$\{item\.title\}」を保存 \(Cmd\/Ctrl\+S でも可/.test(ied)) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: 保存 Button aria-label に shortcut 記載 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: 保存 Button aria-label に shortcut 記載なし`,
    })
  }

  // 3. iter578 invariant: comment-edit-input aria-invalid 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /aria-label="コメント編集[\s\S]*?aria-invalid=\{\(body\.length > 0 && body\.trim\(\) === ''\) \|\| undefined\}/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter578 invariant: comment-edit-input aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter578 invariant: 破壊`,
    })
  }

  // 4. iter574 invariant: editTitle aria-invalid 維持
  if (
    /id="editTitle"[\s\S]*?aria-invalid=\{\(title\.length > 0 && title\.trim\(\) === ''\)/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `iter574 invariant: editTitle aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter574 invariant: 破壊`,
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

  console.log(`\n=== Findings (item-edit-save-keyshortcuts-iter579) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
