/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y) —
 * goals-panel empty CTA + active-state 完了 button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/goals-panel.tsx:
 *   - 行 290-302: empty-state CTA "作成フォームへ"
 *   - 行 478-494: active-state 完了 button "完了"
 *
 *   いずれも aria-label が完全 content (Goal title + 操作) を含むのに visible が
 *   aria-hidden 無しで SR 2 経路読み上げ重複。iter844-864 と同 vocabulary、
 *   goals domain 部分 fix (アーカイブ / active 復帰 button は次 iter)。
 *
 * fix (1 ファイル +2/-2 行):
 *   - empty CTA + 完了 button visible を aria-hidden span で wrap
 *
 * 検証: source-side regex assert + iter864 (sprints) / iter863 (time-entry)
 *   invariant cross-check。
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

  if (
    /data-testid="goals-empty-create"[\s\S]*?<span aria-hidden="true">作成フォームへ<\/span>/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter865-a: goals empty CTA aria-hidden OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter865-a: goals empty CTA aria-hidden 不完全`,
    })
  }

  if (
    /data-testid=\{`goal-complete-\$\{goal\.id\}`\}[\s\S]*?<span aria-hidden="true">完了<\/span>/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter865-b: goals active 完了 button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter865-b: goals active 完了 button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid 維持
  if (
    /aria-label="Goal 作成フォームの『Objective』入力欄にフォーカス"/.test(gp) &&
    /aria-label=\{[\s\S]*?`Goal「\$\{goal\.title\}」を完了`/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: aria-label / data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter864 invariant: sprints-panel 3 button aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(sp) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: sprints-panel 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goals-empty-complete-aria-hidden-iter865) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
