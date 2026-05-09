/**
 * Phase 6.15 loop iter 880 (mode-D Desktop a11y) —
 * item-dependencies-panel add + remove button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/item-dependencies-panel.tsx の 2 button:
 *   - dep-add-btn (visible "追加中…/追加")
 *   - dep-remove-{id} (visible "解除")
 *
 *   いずれも aria-label が完全 content (依存名 + 操作) を含むのに visible が
 *   aria-hidden 無し → SR 2 経路読み上げ重複。Item 編集 dialog の依存タブ内 button。
 *   iter844-879 と同 vocabulary。
 *
 * fix (1 ファイル +2/-2 行):
 *   - add: <span aria-hidden="true">{追加中…/追加}</span>
 *   - remove: <span aria-hidden="true">解除</span>
 *
 * 検証: source-side regex assert + iter879 / iter878 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )

  if (/<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(idp)) {
    findings.push({
      level: 'info',
      message: `iter880-a: dep-add-btn aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter880-a: dep-add-btn aria-hidden 不完全`,
    })
  }

  if (
    /data-testid=\{`dep-remove-\$\{ref\.id\}`\}[\s\S]*?<span aria-hidden="true">解除<\/span>/.test(
      idp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter880-b: dep-remove button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter880-b: dep-remove button aria-hidden 不完全`,
    })
  }

  // iter879 invariant: item-edit-dialog footer 4 button aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const ahCount = (ied.match(/<span aria-hidden="true">/g) ?? []).length
  if (ahCount >= 14) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: item-edit-dialog aria-hidden span count=${ahCount} (>=14) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: 破壊` })
  }

  console.log(`\n=== Findings (item-dependencies-buttons-aria-hidden-iter880) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
