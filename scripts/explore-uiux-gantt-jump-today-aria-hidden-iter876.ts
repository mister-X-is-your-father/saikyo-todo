/**
 * Phase 6.15 loop iter 876 (mode-D Desktop a11y) —
 * gantt-view 今日へジャンプ button visible を aria-hidden span で wrap.
 *
 * 課題: src/components/workspace/gantt-view.tsx 行 395-406 の 今日へジャンプ button は
 * aria-label が完全 content (動的日付込み "今日 (M月d日 (eee)) の縦線まで横スクロール")
 * を含むのに、visible "今日へジャンプ" は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-875 sweep の続編で 1 callsite 対応、Gantt timeline 操作の SR 経路整合性向上。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "今日へジャンプ" を <span aria-hidden="true"> で wrap
 *   - 動的 aria-label / title / data-testid 維持
 *
 * 検証: source-side regex assert + iter735-875 invariant cross-check。
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

  // 1. 今日へジャンプ visible aria-hidden span
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-jump-today visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt-jump-today visible aria-hidden 未統合` })
  }

  // 2. aria-label 維持
  if (
    /aria-label=\{`Gantt timeline を今日 \(\$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\}\) の縦線まで横スクロール`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt-jump-today 動的 aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt-jump-today aria-label regression` })
  }

  // 3. iter875 invariant: comment-thread 5 aria-hidden + time-entry submit
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{create\.isPending \? '送信中…' : '投稿'\}<\/span>/.test(ct) &&
    /<span aria-hidden="true">編集<\/span>/.test(ct) &&
    /<span aria-hidden="true">削除<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: comment-thread aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
  }

  // 4. iter874 invariant
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{name\}<\/span>/.test(tcp)) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: team-capacity {name} aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
  }

  // 5. iter735 invariant
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

  console.log(`\n=== Findings (gantt-jump-today-aria-hidden-iter876) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
