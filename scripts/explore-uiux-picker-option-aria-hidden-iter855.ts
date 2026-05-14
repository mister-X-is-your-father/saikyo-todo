/**
 * Phase 6.15 loop iter 855 (mode-D Desktop a11y) —
 * tag-picker / assignee-picker の既存 option CommandItem visible {label} を aria-hidden span で wrap (一括).
 *
 * 課題: tag-picker.tsx の既存タグ option (line 132-156) / assignee-picker.tsx の メンバー option
 * (line 132-152) + AI Agent option (line 161-181) は CommandItem に aria-label が完全
 * content を持つのに、内側 visible {t.name} / {label} text は aria-hidden 無し → SR ユーザは
 * aria-label を聞いた後 visible text も再度読み上げされて重複。iter844-854 sweep の続編。
 *
 * fix (3 callsite + 2 file ~3 行差分):
 *   - tag-picker 既存タグ {t.name} → <span aria-hidden="true">{t.name}</span>
 *   - assignee-picker メンバー {label} → <span aria-hidden="true">{label}</span>
 *   - assignee-picker AI agent {label} → <span aria-hidden="true">{label}</span>
 *   - CheckIcon + 色 swatch + BotIcon の既存 aria-hidden 維持
 *
 * 検証: source-side regex assert + iter735-854 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )

  // 1. tag-picker 既存タグ {t.name} は aria-hidden span で wrap
  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `tag-option 既存 visible {t.name} aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `tag-option 既存 {t.name} aria-hidden 未統合`,
    })
  }

  // 2. assignee-picker メンバー option {label} は aria-hidden span で wrap (2 callsite)
  const apLabelHidden = ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []
  if (apLabelHidden.length >= 2) {
    findings.push({
      level: 'info',
      message: `assignee-option (member + agent) visible {label} aria-hidden 統合 OK (${apLabelHidden.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `assignee-option {label} aria-hidden 未統合 (${apLabelHidden.length} 箇所)`,
    })
  }

  // 3. CheckIcon / BotIcon / 色 swatch の aria-hidden 維持
  const apCheckIcon = ap.match(/<CheckIcon[^/]+aria-hidden="true"/g) ?? []
  const apBotIcon = ap.match(/<BotIcon[^/]+aria-hidden="true"/g) ?? []
  if (apCheckIcon.length >= 2 && apBotIcon.length >= 1) {
    findings.push({
      level: 'info',
      message: `assignee-picker CheckIcon / BotIcon aria-hidden 維持 OK (Check ${apCheckIcon.length} / Bot ${apBotIcon.length})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `assignee-picker icon aria-hidden 破壊`,
    })
  }

  // 4. iter854 invariant: tag-create aria-label + aria-hidden 維持
  if (
    /aria-label=\{`「\$\{query\.trim\(\)\}」を新規タグとして作成 \(色はデフォルト #64748b、後で変更可\)`\}/.test(
      tp,
    ) &&
    /<span aria-hidden="true">「\{query\.trim\(\)\}」を作成<\/span>/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: tag-create aria-label + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
  }

  // 5. iter853 invariant: bulk-clear aria-label + aria-hidden
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`解除: 選択 \$\{count\} 件を一括操作の対象から外す`\}/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: bulk-clear aria-label + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // 6. iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (picker-option-aria-hidden-iter855) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
