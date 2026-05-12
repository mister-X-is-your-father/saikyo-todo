/**
 * Phase 6.15 loop iter 882 (mode-D Desktop a11y) —
 * comment-thread.tsx 4 button (編集 form 内 cancel/save + display 行 編集/削除)
 * 内 visible を aria-hidden span で wrap (iter800-881 sweep の続編、comment-thread
 * 完結 sweep)。
 *
 * 課題: comment-thread.tsx の 4 button (edit-cancel / save / edit / delete) は
 *   各 aria-label が完全 content (コメント本文 prefix + 動作 + pending) を含むのに、
 *   内側 visible "キャンセル / 保存 / 編集 / 削除" は aria-hidden 無し → SR で
 *   二重読み可能性。Item edit dialog Comments tab で各 comment ごとに表示。
 *
 * fix (1 ファイル ~4 行差分): 各 button の visible を aria-hidden span で wrap。
 *
 * 検証: source-side regex assert + iter735/879/880/881 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  const cancelHidden = /<span aria-hidden="true">キャンセル<\/span>/.test(ct)
  const saveHidden = /<span aria-hidden="true">保存<\/span>/.test(ct)
  const editHidden = /<span aria-hidden="true">編集<\/span>/.test(ct)
  const deleteHidden = /<span aria-hidden="true">削除<\/span>/.test(ct)
  if (cancelHidden && saveHidden && editHidden && deleteHidden) {
    findings.push({
      level: 'info',
      message: `iter882: comment-thread 4 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter882: 不完全 (cancel=${cancelHidden} save=${saveHidden} edit=${editHidden} delete=${deleteHidden})`,
    })
  }

  // iter881 invariant: workflow run-rerun aria-hidden 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">再<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter881 invariant: workflow run-rerun aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter881 invariant: 破壊` })
  }

  // iter880 invariant: workflow editor + empty aria-hidden 維持
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(wp) &&
    /<span aria-hidden="true">\{saving \? '保存中…' : '保存'\}<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter880 invariant: workflow editor + empty aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter880 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter882) ===`)
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
