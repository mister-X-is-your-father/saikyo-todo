/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y) —
 * activity-log.tsx actor badge ("AI" / "user") 内 visible text を aria-hidden
 * span で wrap (iter800-861 sweep の続編)。
 *
 * 課題: activity-log.tsx 行 167-176 の actor badge は parent <span> に
 *   aria-label="実行者: AI Agent" or "実行者: ユーザ" が完全 content を含むのに、
 *   内側 visible "AI" / "user" text は aria-hidden 無し → SR で二重読み可能性。
 *   Item edit dialog → アクティビティ tab の history 行ごとに表示される頻出 chip。
 *   iter853 で comment-thread AI badge を fix したのと同 pattern を activity-log
 *   側に展開。
 *
 * fix (1 ファイル ~1 行差分):
 *   - actor badge 内 visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/859/860/861 invariant cross-check。
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
  const hasAriaLabel =
    /aria-label=\{entry\.actorType === 'agent' \? '実行者: AI Agent' : '実行者: ユーザ'\}/.test(al)
  const hasInnerHidden =
    /<span aria-hidden="true">\{entry\.actorType === 'agent' \? 'AI' : 'user'\}<\/span>/.test(al)
  if (hasAriaLabel && hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter862: activity-log actor badge "AI"/"user" aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter862: 不完全 (aria-label=${hasAriaLabel} inner-hidden=${hasInnerHidden})`,
    })
  }

  // parallel reference: comment-thread AI badge も同 pattern (iter853)
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /aria-label="AI Agent による投稿"/.test(ct) &&
    /<span aria-hidden="true">AI<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 reference: comment-thread AI badge も同 pattern (iter853 で fix 済)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter862 reference: comment-thread AI badge pattern drift`,
    })
  }

  // iter861 invariant: sprint-swimlane load summary aria-hidden 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{row\.loadSummaryJa\}<\/span>/.test(ssd)) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: sprint-swimlane load summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  // iter860 invariant: top-items-by-time-chip aria-hidden 維持
  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{label\}<\/span>/.test(ti) &&
    /<span aria-hidden="true">\{row\.entryCount\} 件<\/span>/.test(ti)
  ) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: top-items-by-time-chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter862) ===`)
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
