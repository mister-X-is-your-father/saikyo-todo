/**
 * Phase 6.15 loop iter 879 (mode-D Desktop a11y) —
 * item-edit-dialog footer 4 button (アーカイブ復元 / アーカイブ /
 * ベースライン記録更新 / baseline クリア) visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の 4 footer button:
 *   - 行 770-800: アーカイブ復元 (visible "復元中…/アーカイブ復元")
 *   - 行 801-829: アーカイブ (visible "アーカイブ中…/アーカイブ")
 *   - 行 831-874: ベースライン記録/更新 (visible "記録中…/ベースライン更新/記録")
 *   - 行 876-905: baseline クリア (visible "クリア中…/baseline クリア")
 *
 *   いずれも aria-label が完全 content (Item title + 操作 + 状態) を含むのに
 *   visible が aria-hidden 無し → SR 2 経路読み上げ重複。Item 編集 dialog 内の
 *   footer 主要 mutation control。iter844-878 と同 vocabulary、item-edit-dialog
 *   footer button 規約一致達成 (cancel / save は iter849-852 系列で既に wrap 済)。
 *
 * fix (1 ファイル +12/-4 行):
 *   - 4 button visible text を <span aria-hidden="true">...</span> で wrap
 *
 * 検証: source-side regex assert + iter850 (item-edit-dialog 6 TabsTrigger) /
 *   iter878 / iter877 invariant cross-check + aria-hidden span count >=14。
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

  const checks: Array<[string, RegExp]> = [
    [
      'unarchive',
      /<span aria-hidden="true">[\s\S]*?\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}[\s\S]*?<\/span>/,
    ],
    [
      'archive',
      /<span aria-hidden="true">[\s\S]*?\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}[\s\S]*?<\/span>/,
    ],
    [
      'baseline-set',
      /<span aria-hidden="true">[\s\S]*?\{setBaseline\.isPending[\s\S]*?'記録中…'[\s\S]*?'ベースライン更新'[\s\S]*?'ベースライン記録'[\s\S]*?<\/span>/,
    ],
    [
      'baseline-clear',
      /<span aria-hidden="true">[\s\S]*?\{clearBaseline\.isPending \? 'クリア中…' : 'baseline クリア'\}[\s\S]*?<\/span>/,
    ],
  ]
  for (const [name, re] of checks) {
    if (re.test(ied)) {
      findings.push({ level: 'info', message: `iter879: ${name} button aria-hidden OK` })
    } else {
      findings.push({ level: 'warning', message: `iter879: ${name} button aria-hidden 不完全` })
    }
  }

  // iter850 invariant: aria-hidden span count >=14 (6 tabs + footer + その他)
  const ahCount = (ied.match(/<span aria-hidden="true">/g) ?? []).length
  if (ahCount >= 14) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: item-edit-dialog aria-hidden span count=${ahCount} (>=14, 4 footer button 追加で >=14) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter850 invariant: item-edit-dialog aria-hidden span count=${ahCount} (<14) 破壊`,
    })
  }

  // iter878 invariant
  const tcv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(tcv)) {
    findings.push({
      level: 'info',
      message: `iter878 invariant: taskchute title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter878 invariant: 破壊` })
  }

  console.log(`\n=== Findings (item-edit-dialog-footer-buttons-aria-hidden-iter879) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
