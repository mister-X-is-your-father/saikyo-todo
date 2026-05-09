/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y) —
 * inbox-view 空状態の "クイック追加にフォーカス (キー: q)" button visible text を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/inbox-view.tsx 行 77-90 の empty-state
 *   quick-add focus button は aria-label "クイック追加入力欄にフォーカス
 *   (q キーでも可)" が完全 content を含むのに visible "クイック追加にフォーカス
 *   (キー: q)" は aria-hidden 無し → SR 2 経路読み上げ重複。iter844-855 と同
 *   vocabulary。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">クイック追加にフォーカス (キー: q)</span>
 *
 * 検証: source-side regex assert + iter853-855 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')

  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `iter856: inbox-view empty-state quick-add button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter856: inbox-view empty-state quick-add button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid / aria-keyshortcuts 維持
  if (
    /aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(iv) &&
    /data-testid="inbox-empty-quick-add"/.test(iv) &&
    /aria-keyshortcuts="q"/.test(iv)
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: inbox-view empty-state button 属性維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 属性破壊` })
  }

  // iter855 invariant: schedule-item-picker 3 button aria-hidden
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">割込みとして追加<\/span>/.test(sip) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: schedule-item-picker 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // iter853 / iter854 invariant
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    (ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length >= 2 &&
    /<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter853 / iter854 invariant: assignee-picker + tag-picker 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 / iter854 invariant: 破壊` })
  }

  console.log(`\n=== Findings (inbox-empty-quick-add-aria-hidden-iter856) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
