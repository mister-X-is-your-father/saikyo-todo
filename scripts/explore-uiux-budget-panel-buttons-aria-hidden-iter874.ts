/**
 * Phase 6.15 loop iter 874 (mode-D Desktop a11y) —
 * budget-panel.tsx 3 button (上限を変更 / キャンセル / 保存) 内 visible を
 * aria-hidden span で wrap (iter800-873 sweep の続編)。
 *
 * 課題: budget-panel.tsx の AI 月次コスト上限編集 form 3 button (Open edit /
 *   Cancel / Save) は各 aria-label が完全 content (動作 + 保存中状態) を含むのに、
 *   内側 visible text (上限を変更 / キャンセル / 保存中…/保存) は aria-hidden 無し
 *   → SR で二重読み可能性。AI コスト管理 panel の唯一 CTA 群。
 *
 * fix (1 ファイル ~3 行差分): 各 button の visible を aria-hidden span で wrap。
 *
 * 検証: source-side regex assert + iter735/871/872/873 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  const editHidden = /<span aria-hidden="true">上限を変更<\/span>/.test(bp)
  const cancelHidden = /<span aria-hidden="true">キャンセル<\/span>/.test(bp)
  const saveHidden =
    /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(bp)
  if (editHidden && cancelHidden && saveHidden) {
    findings.push({
      level: 'info',
      message: `iter874: budget-panel 3 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter874: 不完全 (edit=${editHidden} cancel=${cancelHidden} save=${saveHidden})`,
    })
  }

  // iter873 invariant: decompose-proposals 再分解 aria-hidden 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: decompose-proposals aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
  }

  // iter872 invariant: item-edit-dialog 4 footer button aria-hidden 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: item-edit-dialog footer aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter874) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
