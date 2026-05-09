/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y) —
 * workflows-panel 4 button visible text を aria-hidden span で wrap。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の 4 button:
 *   - 行 210-222: empty-state CTA "作成フォームへ"
 *   - 行 348-350: 編集 button (Pencil + visible "編集")
 *   - 行 365: toggle button (visible "{wf.enabled ? '無効化' : '有効化'}")
 *   - 行 386: 履歴 disclosure button (Chevron + visible "履歴")
 *
 *   いずれも aria-label が完全 content を含むのに visible が aria-hidden 無し →
 *   SR 2 経路読み上げ重複。iter844-861 と同 vocabulary、workflows 画面 a11y
 *   規約一致達成 (iter861 integrations と完全 parallel な panel fix)。
 *
 * fix (1 ファイル +4/-4 行):
 *   - 4 visible text を <span aria-hidden="true">...</span> で wrap
 *
 * 検証: source-side regex assert + iter861 (integrations) / iter860 (templates)
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

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  const checks: Array<[string, RegExp]> = [
    ['empty CTA', /<span aria-hidden="true">作成フォームへ<\/span>/],
    ['編集 button', /<span aria-hidden="true">編集<\/span>/],
    ['toggle button', /<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/],
    ['履歴 button', /<span aria-hidden="true">履歴<\/span>/],
  ]
  for (const [name, re] of checks) {
    if (re.test(wp)) {
      findings.push({ level: 'info', message: `iter862: ${name} aria-hidden OK` })
    } else {
      findings.push({ level: 'warning', message: `iter862: ${name} aria-hidden 不完全` })
    }
  }

  // invariant: 4 button aria-label 維持
  if (
    /aria-label="Workflow 作成フォームの『名前』入力欄にフォーカス"/.test(wp) &&
    /aria-label=\{`Workflow「\$\{wf\.name\}」の graph \/ trigger を編集`\}/.test(wp) &&
    /aria-label=\{[\s\S]*?`Workflow「\$\{wf\.name\}」を\$\{wf\.enabled \? '無効化' : '有効化'\}`/.test(
      wp,
    ) &&
    /aria-label=\{[\s\S]*?`Workflow「\$\{wf\.name\}」の実行履歴 \(直近 5 件\) を表示`/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: 4 button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter861 invariant: integrations-panel 4 button (parallel pattern)
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">作成フォームへ<\/span>/.test(ip) &&
    /<span aria-hidden="true">履歴<\/span>/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workflows-panel-buttons-aria-hidden-iter862) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
