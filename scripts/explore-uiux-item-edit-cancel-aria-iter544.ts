/**
 * Phase 6.15 loop iter 544 (mode-D Desktop a11y) —
 * ItemEditDialog cancel Button に aria-label + data-testid を補完。
 *
 * 課題: item-edit-dialog.tsx 行 868-875 の cancel Button は visible text "キャンセル"
 *   のみで aria-label / data-testid 不在。SR は「キャンセル ボタン」だけで item の
 *   context が伝わらない。Dialog 内で複数 item を順次編集するシナリオでは混乱する。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label={`「${item.title}」の編集をキャンセル`}
 *   - data-testid="item-edit-cancel"
 *
 * iter543 wf-editor-cancel pattern を ItemEditDialog footer に展開。
 * +2 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、type=button / variant /
 * className / onClick invariant 維持、save Button (item-edit-save) と pair で footer 統一。
 *
 * 検証: source-side regex assert + iter515-543 invariant cross-check。
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

  // 1. item-edit-cancel aria-label + data-testid
  if (
    /data-testid="item-edit-cancel"\s+aria-label=\{`「\$\{item\.title\}」の編集をキャンセル`\}/.test(
      ied,
    ) ||
    /aria-label=\{`「\$\{item\.title\}」の編集をキャンセル`\}\s+data-testid="item-edit-cancel"/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: item-edit-cancel aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: item-edit-cancel aria-label / data-testid 不在`,
    })
  }

  // 2. item-edit-save 既存 invariant (aria-busy + aria-label)
  if (
    /data-testid="item-edit-save"[\s\S]{0,300}aria-busy=\{update\.isPending \|\| undefined\}|aria-busy=\{update\.isPending \|\| undefined\}[\s\S]{0,300}data-testid="item-edit-save"/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: item-edit-save aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: item-edit-save aria-busy 破壊`,
    })
  }

  // 3. iter543 invariant: wf-editor-cancel aria-label 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Workflow「\$\{wf\.name\}」の編集をキャンセル`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter543 invariant: wf-editor-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter543 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
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

  console.log(`\n=== Findings (item-edit-cancel-aria-iter544) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
