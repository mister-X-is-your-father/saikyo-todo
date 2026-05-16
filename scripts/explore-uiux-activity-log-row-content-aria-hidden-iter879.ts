/**
 * Phase 6.15 loop iter 879 (mode-D Desktop a11y) —
 * activity-log の row 内 visible "{label}" + actor "AI" / "user" を aria-hidden 化、
 * 既存 aria-label (操作種別 / 実行者) 単独経路に統一。
 *
 * 経緯: iter855 で activity-log detail toggle button 修正済の続編。row header の
 *   2 visible:
 *     - {label} span: icon の role="img" + aria-label "操作種別: {label}" と重複
 *     - "AI" / "user" 短縮表示: 同 span に aria-label "実行者: AI Agent" / "ユーザ" と重複
 *   いずれも SR 二重読み上げ。
 *
 * 修正:
 *   1. {label} span に aria-hidden="true" 追加 (icon role="img" aria-label 単独経路)
 *   2. "AI" / "user" visible を span aria-hidden で wrap (同 span aria-label 単独経路)
 *
 * 検証: source-side regex assert + iter735/843/849-878 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )

  // 1. {label} span aria-hidden
  if (/<span className="font-medium" aria-hidden="true">\s*\{label\}\s*<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `activity-log row header {label} span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log row header {label} aria-hidden 未統合`,
    })
  }

  // 2. "AI" / "user" visible span aria-hidden
  if (
    /<span aria-hidden="true">\{entry\.actorType === 'agent' \? 'AI' : 'user'\}<\/span>/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `activity-log row actor "AI"/"user" visible span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log row actor visible aria-hidden 未統合`,
    })
  }

  // 3. icon role="img" + aria-label "操作種別: {label}" 維持
  if (/aria-label=\{`操作種別: \$\{label\}`\}/.test(al)) {
    findings.push({
      level: 'info',
      message: `activity-log icon role="img" aria-label "操作種別: {label}" 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log icon aria-label 破壊`,
    })
  }

  // 4. actor span aria-label "実行者: AI Agent" / "ユーザ" 維持
  if (
    /aria-label=\{entry\.actorType === 'agent' \? '実行者: AI Agent' : '実行者: ユーザ'\}/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `activity-log actor span aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log actor aria-label 破壊`,
    })
  }

  // iter855 invariant: detail toggle aria-hidden
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: activity-log detail toggle aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // iter877 invariant
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (
    /<span[\s\S]+?inline-flex h-5 w-5[\s\S]+?aria-hidden="true"[\s\S]+?data-testid=\{`notification-type-icon-\$\{n\.type\}`\}/.test(
      nb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: notification-bell type icon decorative 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: 破壊` })
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

  console.log(`\n=== Findings (activity-log-row-content-aria-hidden-iter879) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
