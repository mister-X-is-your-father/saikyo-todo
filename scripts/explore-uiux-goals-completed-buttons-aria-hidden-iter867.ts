/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y) —
 * goals-panel completed-state 2 button (active に戻す / アーカイブ) visible を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/goals-panel.tsx 行 514-551 の completed-state
 *   block 2 button は aria-label 完全 content を含むのに visible が aria-hidden
 *   無し → SR 2 経路読み上げ重複。iter866 (active アーカイブ + archived 戻す)
 *   の続き、goals 3 status 全 button aria-hidden 規約一致達成。
 *
 * fix (1 ファイル +2/-2 行):
 *   - 'active に戻す' button: <span aria-hidden="true">active に戻す</span>
 *   - 'アーカイブ' button: <span aria-hidden="true">アーカイブ</span>
 *
 * 検証: source-side regex assert + iter865 / iter866 invariant cross-check +
 *   3 status 全部の aria-hidden span 数 count check (active 1 + completed 2 +
 *   archived 1 = 4 件 + empty CTA 1 + 完了 1 = 計 6 個以上)。
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

  // completed state: 2 sibling button が aria-hidden で wrap されている
  if (
    /\{status === 'completed' && \([\s\S]*?<span aria-hidden="true">active に戻す<\/span>[\s\S]*?<span aria-hidden="true">アーカイブ<\/span>[\s\S]*?\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter867: goals completed-state 2 button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter867: goals completed-state 2 button aria-hidden 不完全`,
    })
  }

  // 3 status 全 aria-hidden 規約一致 (count check)
  const ahCount = (gp.match(/<span aria-hidden="true">/g) ?? []).length
  if (ahCount >= 6) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: goals-panel aria-hidden span count=${ahCount} (>=6: empty + 完了 + active アーカイブ + archived 戻す + completed 戻す + completed アーカイブ) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter867 invariant: goals-panel aria-hidden span count=${ahCount} (<6) 破壊`,
    })
  }

  // iter865 invariant
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(gp) &&
    /<span aria-hidden="true">完了<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: goals empty + 完了 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter866 invariant
  if (
    /\{status === 'archived' && \([\s\S]*?<span aria-hidden="true">active に戻す<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: goals archived 'active に戻す' 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goals-completed-buttons-aria-hidden-iter867) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
