/**
 * Phase 6.15 loop iter 852 (mode-D Desktop a11y) —
 * bulk-action-bar 「解除」 button: visible "解除" を span aria-hidden で wrap、
 * aria-label 単独経路に統一。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の bulk-clear button は
 *   aria-label="選択を解除" / visible "解除" で WCAG 2.5.3 (Label in Name) は
 *   「解除」が aria-label に含まれているため OK だが、iter844-851 campaign
 *   (visible text を span aria-hidden で wrap、aria-label 単独経路) の規約から
 *   外れていた最後の bulk-action-bar 内 button。
 *
 * fix (1 ファイル / +1-1 行差分):
 *   - <Button>解除</Button> → <Button><span aria-hidden="true">解除</span></Button>
 *
 * 検証: source-side regex assert + iter849-851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )

  // 1. visible "解除" は span aria-hidden で wrap
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear visible "解除" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear visible "解除" aria-hidden 未統合`,
    })
  }

  // 2. aria-label="選択を解除" 維持 (visible "解除" は依然として substring)
  if (/aria-label="選択を解除"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear aria-label "選択を解除" 維持 (visible 解除 substring) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear aria-label 破壊`,
    })
  }

  // 3. data-testid="bulk-clear" 維持
  if (/data-testid="bulk-clear"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-clear data-testid 破壊` })
  }

  // iter851 invariant: bulk-status normal aria-label に visible "{s.label} に" prefix
  if (/`\$\{s\.label\} に変更 \(選択 \$\{count\} 件のステータス一括更新\)`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status normal aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: bulk-status normal 破壊` })
  }

  // iter851 invariant: visible "{s.label} に" span aria-hidden
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status visible "{s.label} に" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: bulk-status visible 破壊` })
  }

  // iter850 invariant: bulk-delete aria-label に visible 削除 prefix
  if (/`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete aria-label visible 削除 prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: bulk-delete 破壊` })
  }

  // iter850 invariant: bulk-delete visible "削除" span aria-hidden
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete visible "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: bulk-delete visible 破壊` })
  }

  // iter849 invariant: calendar-view 今日 button aria-hidden
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view 今日 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: calendar 破壊` })
  }

  console.log(`\n=== Findings (bulk-clear-aria-hidden-iter852) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
