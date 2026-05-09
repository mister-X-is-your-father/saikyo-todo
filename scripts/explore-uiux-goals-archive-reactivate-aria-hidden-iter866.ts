/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y) —
 * goals-panel active state アーカイブ button + archived state active 戻す button visible を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/goals-panel.tsx:
 *   - active state アーカイブ button (行 495-511): visible "アーカイブ"
 *   - archived state active 戻す button (行 552-569): visible "active に戻す"
 *
 *   いずれも aria-label が完全 content を含むのに visible が aria-hidden 無し →
 *   SR 2 経路読み上げ重複。iter865 (empty + 完了) の続き、goals domain 規約一致達成。
 *
 * fix (1 ファイル +2/-2 行):
 *   - active state アーカイブ button: <span aria-hidden="true">アーカイブ</span>
 *   - archived state active 戻す: <span aria-hidden="true">active に戻す</span>
 *
 * 検証: source-side regex assert + iter865 / iter864 / iter863 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // active state アーカイブ button (active block ends with status === 'completed')
  if (/<span aria-hidden="true">アーカイブ<\/span>[\s\S]*?\{status === 'completed'/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter866-a: goals active アーカイブ button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter866-a: goals active アーカイブ button aria-hidden 不完全`,
    })
  }

  // archived state active 戻す button
  if (
    /\{status === 'archived' && \([\s\S]*?<span aria-hidden="true">active に戻す<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter866-b: goals archived 'active に戻す' button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter866-b: goals archived 'active に戻す' button aria-hidden 不完全`,
    })
  }

  // iter865 invariant: goals empty + 完了 aria-hidden
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(gp) &&
    /<span aria-hidden="true">完了<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: goals empty + 完了 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter864 invariant
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: sprints period save 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goals-archive-reactivate-aria-hidden-iter866) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
