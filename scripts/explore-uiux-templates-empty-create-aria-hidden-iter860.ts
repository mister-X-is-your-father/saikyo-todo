/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y) —
 * templates-panel empty-state "作成フォームへ" button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/template/templates-panel.tsx 行 242-254 の empty-state CTA
 *   button は aria-label "Template 作成フォームの『名前』入力欄にフォーカス" が
 *   完全 content を含むのに visible "作成フォームへ" は aria-hidden 無し →
 *   SR 2 経路読み上げ重複。iter844-859 と同 vocabulary、iter856 (inbox-view
 *   empty quick-add) と同 family な empty-state CTA fix。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">作成フォームへ</span>
 *
 * 検証: source-side regex assert + iter856 / iter858 / iter859 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter860: templates-empty-create button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter860: templates-empty-create button visible aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid 維持
  if (
    /aria-label="Template 作成フォームの『名前』入力欄にフォーカス"/.test(tp) &&
    /data-testid="templates-empty-create"/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: templates-empty-create 属性維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 属性破壊` })
  }

  // iter856 invariant: inbox-view empty quick-add aria-hidden (sibling empty-state CTA)
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: inbox-view empty-state CTA 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter859 invariant: activity-detail-toggle aria-hidden
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: activity-detail-toggle 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  console.log(`\n=== Findings (templates-empty-create-aria-hidden-iter860) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
