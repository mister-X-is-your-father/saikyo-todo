/**
 * Phase 6.15 loop iter 969 (mode-M Mobile) — templates-panel 新規 Template 作成 form の
 * 2 input (tmpl-name / tmpl-cron) に enterKeyHint="next" / "send" を追加。
 * iter949-968 enterKeyHint sweep 14 form 目、templates-panel template 作成 form 補完。
 *
 * 課題: templates-panel 新規 Template form は name (IMEInput) + kind (select) + description
 *   (Textarea, Cmd/Ctrl+Enter handler) + cron (IMEInput, recurring 時) で構成されるが
 *   name / cron に enterKeyHint 未指定で Mobile keyboard 上で「次の field か submit か」
 *   user 判別不能。
 *
 * fix: templates-panel.tsx で
 *   1. tmpl-name (IMEInput) に enterKeyHint="next" (名前 → kind select へ)
 *   2. tmpl-cron (IMEInput, kind=recurring 時のみ) に enterKeyHint="send" (cron → submit)
 *   description Textarea は Cmd/Ctrl+Enter handler のため非適用、kind select も非適用。
 *   +2/-0 行 (1 file)。視覚 / 動作不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/template/templates-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  function checkInputContext(id: string, suffix: string): void {
    const idx = src.indexOf(`id="${id}"`)
    if (idx < 0) {
      findings.push({ level: 'error', message: `${target}: id="${id}" 不在` })
      return
    }
    const ctx = src.slice(Math.max(0, idx - 50), idx + 1200)
    if (!new RegExp(`enterKeyHint="${suffix}"`).test(ctx)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${id} 周辺に enterKeyHint="${suffix}" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `${id} enterKeyHint="${suffix}" OK` })
    }
  }

  checkInputContext('tmpl-name', 'next')
  checkInputContext('tmpl-cron', 'send')

  // iter968 invariant: goals-panel KR form
  const goalsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (!/data-testid={`kr-title-input-/.test(goalsSrc)) {
    findings.push({ level: 'warning', message: `iter968 invariant 破壊 (data-testid)` })
  } else {
    const krCtx = goalsSrc.slice(
      goalsSrc.indexOf('data-testid={`kr-title-input-'),
      goalsSrc.indexOf('data-testid={`kr-title-input-') + 800,
    )
    if (!/enterKeyHint="next"/.test(krCtx)) {
      findings.push({ level: 'warning', message: `iter968 invariant 破壊 (enterKeyHint)` })
    } else {
      findings.push({ level: 'info', message: `iter968 invariant OK` })
    }
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (templates-panel-enter-key-hint-iter969) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
