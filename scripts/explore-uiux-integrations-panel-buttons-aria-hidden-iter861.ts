/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y) —
 * integrations-panel 4 button visible text を aria-hidden span で wrap。
 *
 * 課題: src/components/integrations/integrations-panel.tsx の 4 button:
 *   - 行 60-71: empty-state CTA "作成フォームへ" (aria-label 完全 content)
 *   - 行 169-171: Pull button "Pull / Pull 中…" (aria-label 完全 content)
 *   - 行 186: 有効化/無効化 toggle button (aria-label 完全 content)
 *   - 行 207: "履歴" disclosure button (aria-label 完全 content)
 *
 *   いずれも visible text が aria-hidden 無しで SR 2 経路読み上げ重複。
 *   iter844-860 と同 vocabulary、integrations 画面の 1 行 a11y 規約一致達成。
 *
 * fix (1 ファイル +4/-4 行):
 *   - 4 visible text を <span aria-hidden="true">...</span> で wrap
 *
 * 検証: source-side regex assert + iter860 (templates empty CTA) / iter859 / iter858
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

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  const checks: Array<[string, RegExp]> = [
    ['empty CTA', /<span aria-hidden="true">作成フォームへ<\/span>/],
    [
      'Pull button',
      /<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/,
    ],
    ['toggle button', /<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/],
    ['history button', /<span aria-hidden="true">履歴<\/span>/],
  ]
  for (const [name, re] of checks) {
    if (re.test(ip)) {
      findings.push({ level: 'info', message: `iter861: ${name} aria-hidden OK` })
    } else {
      findings.push({ level: 'warning', message: `iter861: ${name} aria-hidden 不完全` })
    }
  }

  // invariant: 4 button aria-label 維持
  if (
    /aria-label="Source 作成フォームの『名前』入力欄にフォーカス"/.test(ip) &&
    /aria-label=\{[\s\S]*?`Source「\$\{src\.name\}」を手動 Pull \(sync 実行、30s timeout\)`/.test(
      ip,
    ) &&
    /aria-label=\{[\s\S]*?`Source「\$\{src\.name\}」を\$\{src\.enabled \? '無効化' : '有効化'\}`/.test(
      ip,
    ) &&
    /aria-label=\{[\s\S]*?`Source「\$\{src\.name\}」の Pull 履歴 \(直近 5 件\) を表示`/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: 4 button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  // iter860 invariant: templates empty CTA aria-hidden
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: templates empty CTA 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  console.log(`\n=== Findings (integrations-panel-buttons-aria-hidden-iter861) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
