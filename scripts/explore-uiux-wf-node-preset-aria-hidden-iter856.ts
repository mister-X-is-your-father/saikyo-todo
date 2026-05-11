/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y) —
 * workflows-panel node preset (+ {type}) button:
 * WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の `wf-node-preset-{type}` button
 *   は visible "+ {preset.type}" (例: "+ noop") を持つが aria-label は
 *   "graph に {preset.title} の skeleton node を追加" 形 — preset.title は
 *   "noop (passthrough — debug 用)" のような長文 description で、 visible
 *   "+ noop" の prefix "+" は aria-label に含まれない (=「+」 char + space で
 *   strict substring 不一致)。voice control 「+ noop」 発話時に name 一致
 *   しない (= WCAG 2.5.3 失敗、6 NODE_PRESETS 全件)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "+ {preset.type}" を <span aria-hidden="true"> で wrap、
 *     aria-label 単独経路に統一 (iter844-855 同 pattern)。
 *   - aria-label の preset.title 完全説明は維持 (= node の用途 / 例 が SR で
 *     読まれ、認知負荷低減)。
 *
 * 検証: source-side regex assert + iter735-855 invariant cross-check。
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

  // 1. node preset visible "+ {preset.type}" は aria-hidden span で wrap
  if (/<span aria-hidden="true">\+ \{preset\.type\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-node-preset visible "+ {preset.type}" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-node-preset visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label に preset.title 完全説明維持
  if (/aria-label=\{`graph に \$\{preset\.title\} の skeleton node を追加`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-node-preset aria-label に preset.title 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-node-preset aria-label 文脈破壊`,
    })
  }

  // 3. data-testid 維持
  if (/data-testid=\{`wf-node-preset-\$\{preset\.type\}-\$\{wf\.id\}`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-node-preset data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-node-preset data-testid 破壊` })
  }

  // 4. trigger preset 4 button (manual / cron / item-event / webhook) は既に
  //    visible が aria-label の strict substring (例 "manual" は "trigger を
  //    manual ... に切替" の substring) なので 触らない (iter856 は scope
  //    限定で node preset のみ)。
  for (const v of ['manual', 'cron', 'item-event', 'webhook']) {
    const re = new RegExp(`aria-label="trigger を ${v} `)
    if (re.test(wp)) {
      findings.push({
        level: 'info',
        message: `trigger-preset ${v} aria-label 既存維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `trigger-preset ${v} aria-label 破壊`,
      })
    }
  }

  // iter855 invariant: item-edit unarchive visible aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: unarchive visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant 破壊` })
  }

  // iter853 invariant: sprint-retro visible aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{retroPending \? '振り返り生成中…' : '振り返り生成'\}\s*<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: sprint-retro visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (wf-node-preset-aria-hidden-iter856) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
