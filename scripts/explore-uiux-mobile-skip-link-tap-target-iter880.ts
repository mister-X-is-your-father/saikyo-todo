/**
 * Phase 6.15 loop iter 880 (mode-M Mobile a11y) —
 * skip-to-main link の focused 時 tap target を 44x44 (WCAG 2.5.5 AAA) に拡張。
 *
 * 経緯: iter844-879 mode-D sweep の続編、初の mode-M (mobile audit) 実施。
 *   iPhone 13 (390x844) emulation で `/login` を audit、4 個の小 click target 検出:
 *     - skip link "メインコンテンツへスキップ" 24x16 (sr-only 状態だが focus で展開)
 *     - 2 input 326x32 (height 32 < 44)
 *     - 1 button 32x32 (theme toggle icon-only)
 *
 * 修正: 対象は skip-to-main link のみ (この iter 単発で完結する scope)。
 *   `focus:inline-flex focus:min-h-11 focus:min-w-11 focus:items-center focus:justify-center`
 *   を追加し、focus 時に 44x44 以上の tap target になるようにする。
 *   keyboard ユーザは Tab で focus → 44x44 tap target → Enter で skip。
 *
 * 検証: source-side regex assert (focus class 4 個) + iter735/843/849-879 invariant
 *       cross-check。runtime test は dev server / browser で手動確認 (Tab で focus 時に展開、
 *       width/height >= 44px)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')

  // 1. focus 時の min-h-11 + min-w-11 + inline-flex (44x44 tap target)
  if (
    /focus:inline-flex/.test(layout) &&
    /focus:min-h-11/.test(layout) &&
    /focus:min-w-11/.test(layout) &&
    /focus:items-center/.test(layout) &&
    /focus:justify-center/.test(layout)
  ) {
    findings.push({
      level: 'info',
      message: `skip link focus 時 44x44 tap target class 5 個 全付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `skip link focus 時 tap target class 不足`,
    })
  }

  // 2. sr-only / focus:not-sr-only / focus:fixed 維持 (既存 a11y pattern)
  if (
    /sr-only/.test(layout) &&
    /focus:not-sr-only/.test(layout) &&
    /focus:fixed/.test(layout) &&
    /focus:top-2/.test(layout) &&
    /focus:left-2/.test(layout)
  ) {
    findings.push({
      level: 'info',
      message: `skip link sr-only / focus 表示 / position class 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `skip link sr-only / position 破壊`,
    })
  }

  // 3. visible label 維持 + href 維持
  if (/href="#main-content"/.test(layout) && /メインコンテンツへスキップ/.test(layout)) {
    findings.push({
      level: 'info',
      message: `skip link href + label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `skip link href / label 破壊`,
    })
  }

  // iter879 invariant: activity-log row content
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (
    /<span className="font-medium" aria-hidden="true">\s*\{label\}\s*<\/span>/.test(al) &&
    /<span aria-hidden="true">\{entry\.actorType === 'agent' \? 'AI' : 'user'\}<\/span>/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: activity-log row content aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mobile-skip-link-tap-target-iter880) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
