/**
 * Phase 6.15 loop iter 901 (mode-D Desktop a11y) —
 * gantt-view gantt-zoom-select の aria-label を WCAG 2.5.3 (Label in Name) 適合形に
 * 変更 (visible label "zoom" prefix)。
 *
 * 課題: src/components/workspace/gantt-view.tsx の gantt-zoom-select <select> は
 *   sibling <span> "zoom" が visible label として機能するが、旧 aria-label
 *   "Gantt の 1 日あたりの幅 (現在: ...)" は visible "zoom" を含まず substring 不適合
 *   → 音声「zoom」が select に hit せず WCAG 2.5.3 違反。
 *
 * fix (1 ファイル / +1-1 行差分):
 *   - aria-label を `zoom: Gantt の 1 日あたりの幅 (現在: ...)` 形に変更し visible "zoom" prefix 適合化
 *
 * 検証: source-side regex assert + iter899/900 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  // 1. aria-label に "zoom:" prefix 含む (visible "zoom" との一致)
  if (/aria-label=\{`zoom: Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-zoom-select aria-label に "zoom" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-zoom-select aria-label が "zoom" prefix 不含`,
    })
  }

  // 2. 旧 aria-label "Gantt の 1 日あたりの幅 (現在:" 単独形 削除
  if (!/aria-label=\{`Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-zoom-select 旧 aria-label "Gantt の 1 日あたりの幅" prefix 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-zoom-select 旧 aria-label 残存`,
    })
  }

  // 3. visible "zoom" sibling span 維持
  if (/<span className="text-muted-foreground">zoom<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-zoom-select 隣接 visible "zoom" 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt-zoom-select 隣接 visible "zoom" 破壊` })
  }

  // iter900 invariant: proposal-edit-cancel
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter900 invariant: proposal-edit-cancel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter900 invariant: proposal-edit-cancel 破壊` })
  }

  console.log(`\n=== Findings (gantt-zoom-select-iter901) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
