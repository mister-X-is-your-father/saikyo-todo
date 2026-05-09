/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y) —
 * sprints-panel empty CTA + period 編集 form の cancel / save 3 button visible text を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の 3 button:
 *   - empty-state CTA "作成フォームへ" (sprint-empty-create button)
 *   - 期間編集 form cancel button "キャンセル"
 *   - 期間編集 form save button "{update.isPending ? '保存中…' : '保存'}"
 *
 *   いずれも aria-label が完全 content (Sprint 名 + 操作) を含むのに visible が
 *   aria-hidden 無し → SR 2 経路読み上げ重複。iter844-863 と同 vocabulary、
 *   sprint domain も部分 fix (status 遷移 / retro / pre-mortem button は次 iter で)。
 *
 * fix (1 ファイル +3/-3 行):
 *   - 3 visible text を <span aria-hidden="true">...</span> で wrap
 *
 * 検証: source-side regex assert + iter863 / iter862 / iter860 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // empty CTA
  if (
    /data-testid="sprints-empty-create"[\s\S]*?<span aria-hidden="true">作成フォームへ<\/span>/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter864-a: sprints empty CTA aria-hidden OK` })
  } else {
    findings.push({ level: 'warning', message: `iter864-a: sprints empty CTA aria-hidden 不完全` })
  }

  // cancel button
  if (
    /data-testid=\{`sprint-period-cancel-\$\{sprint\.id\}`\}[\s\S]*?<span aria-hidden="true">キャンセル<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter864-b: sprint period cancel button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter864-b: sprint period cancel button aria-hidden 不完全`,
    })
  }

  // save button
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter864-c: sprint period save button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter864-c: sprint period save button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid 維持
  if (
    /aria-label="Sprint 作成フォームの『名前』入力欄にフォーカス"/.test(sp) &&
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集をキャンセル`\}/.test(sp) &&
    /aria-label=\{[\s\S]*?`Sprint「\$\{sprint\.name\}」の期間を保存`/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: 3 button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  // iter863 invariant: time-entry panel + table aria-hidden
  const tep = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tep)) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: time-entries-panel 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprints-panel-empty-period-aria-hidden-iter864) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
