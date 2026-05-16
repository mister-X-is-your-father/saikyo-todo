/**
 * Phase 6.15 loop iter 898 (mode-D Desktop a11y) —
 * backlog-view 内 2 <time> 要素 (期限 cell + 最終更新 cell) の visible に aria-hidden
 * span 追加、aria-label 単独経路に統一。
 *
 * 経緯: iter897 personal-period-view <time> aria-hidden 化の続編。backlog-view も
 *   2 <time> 要素 (期限 / 最終更新) いずれも aria-label 完全 content を持つが内側
 *   visible aria-hidden 無し → 二重読み上げ。
 *
 * 修正: 2 <time> 内 visible を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-897 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. 期限 <time> 内 visible aria-hidden span
  if (
    /<time dateTime=\{v\} aria-label=\{`期限 \$\{v\}`\}>\s*<span aria-hidden="true">\{formatFriendlyDate\(v, today\)\}<\/span>/.test(
      bv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `backlog-view 期限 <time> 内 visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view 期限 <time> 内 visible aria-hidden 未統合`,
    })
  }

  // 2. 最終更新 <time> 内 visible aria-hidden span
  if (
    /<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>\s*<span aria-hidden="true">\{display\}<\/span>/.test(
      bv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `backlog-view 最終更新 <time> 内 visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view 最終更新 <time> 内 visible aria-hidden 未統合`,
    })
  }

  // iter897 invariant
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /<time[\s\S]+?aria-label=\{`期限 \$\{it\.dueDate\}`\}[\s\S]+?>\s*<span aria-hidden="true">\{it\.dueDate\}<\/span>/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter897 invariant: personal-period due time aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter897 invariant: 破壊` })
  }

  // iter826 invariant: backlog updatedAt cell <time> + aria-label の存在維持
  if (/aria-label=\{`最終更新 \$\{display\}`\}/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter826 invariant: backlog updatedAt aria-label "最終更新" 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter826 invariant: 破壊` })
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

  console.log(`\n=== Findings (backlog-time-aria-hidden-iter898) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
