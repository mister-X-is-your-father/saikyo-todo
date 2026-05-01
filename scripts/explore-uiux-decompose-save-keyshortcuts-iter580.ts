/**
 * Phase 6.15 loop iter 580 (mode-D Desktop a11y) —
 * decompose-proposals-panel 提案編集 form 保存 Button に aria-keyshortcuts。
 *
 * 課題: decompose-proposals-panel.tsx 行 386-401 で Cmd/Ctrl+Enter 押下を
 *   Textarea onKeyDown で購読し handleSaveEdit を呼ぶが、保存 Button (行 444-458) には
 *   aria-keyshortcuts 不在で SR / voice control に shortcut が expose されない。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-keyshortcuts="Meta+Enter Control+Enter"
 *   - aria-label の active 状態に "Cmd/Ctrl+Enter でも可" 追記
 *
 * iter579 pattern (item-edit-dialog Cmd/Ctrl+S) を Cmd/Ctrl+Enter shortcut に展開。
 *
 * 検証: source-side regex assert + iter515-579 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. 提案編集 save Button aria-keyshortcuts
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-save`\}\s*\n\s*aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: 提案編集 save Button aria-keyshortcuts 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: 提案編集 save Button aria-keyshortcuts 不在`,
    })
  }

  // 2. aria-label active 状態に Cmd/Ctrl+Enter 記載
  if (/`提案「\$\{proposal\.title\}」の編集を保存 \(Cmd\/Ctrl\+Enter でも可\)`/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: aria-label に shortcut 記載 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: aria-label に shortcut 記載なし`,
    })
  }

  // 3. iter579 invariant: item-edit-save aria-keyshortcuts 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/data-testid="item-edit-save"\s*\n\s*aria-keyshortcuts="Meta\+S Control\+S"/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter579 invariant: item-edit-save aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter579 invariant: 破壊`,
    })
  }

  // 4. iter578 invariant: comment-edit-input aria-invalid 維持
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

  console.log(`\n=== Findings (decompose-save-keyshortcuts-iter580) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
