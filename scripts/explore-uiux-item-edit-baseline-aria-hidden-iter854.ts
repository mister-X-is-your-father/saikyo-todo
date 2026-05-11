/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y) —
 * item-edit-dialog ベースライン記録 / 更新 + baseline クリア button:
 * WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題 (2 button):
 *  1. baseline 記録 button (item-edit-set-baseline 系) の visible
 *     "ベースライン記録" / "ベースライン更新" は aria-label
 *     (例 "...の startDate / dueDate を当初計画 (baseline) として保存"
 *     や "...のベースラインを現在の startDate / dueDate に更新") の
 *     strict substring に **ならない** (= name に visible 含まれず)。
 *  2. baseline クリア button (item-edit-clear-baseline) の visible
 *     "baseline クリア" は半角ラテン "baseline" を含むが aria-label は
 *     全角カタカナ "ベースライン (...) をクリア" — vocabulary 乖離 +
 *     visible が strict substring に **ならない**。
 *  pending 中 visible "記録中…" / "クリア中…" は aria-label substring
 *  だが path 不揃いを避けるため一律 aria-hidden 統合。
 *
 * fix (1 ファイル ~6 行差分):
 *   - 両 button の visible を <span aria-hidden="true"> で wrap、aria-label
 *     単独経路に統一 (iter844-853 同 pattern)。
 *   - aria-label の baseline 説明 / 旧値表示は維持。
 *
 * 検証: source-side regex assert + iter735-853 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. baseline 記録 / 更新 button visible は aria-hidden span で wrap
  if (
    /<span aria-hidden="true">\s*\{setBaseline\.isPending\s*\?\s*'記録中…'\s*:\s*item\.baselineStartDate\s*\?\s*'ベースライン更新'\s*:\s*'ベースライン記録'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-set-baseline visible aria-hidden 統合 OK (3 path)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-set-baseline visible aria-hidden 未統合`,
    })
  }

  // 2. baseline クリア button visible は aria-hidden span で wrap
  if (
    /<span aria-hidden="true">\s*\{clearBaseline\.isPending \? 'クリア中…' : 'baseline クリア'\}\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-clear-baseline visible aria-hidden 統合 OK (2 path)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-clear-baseline visible aria-hidden 未統合`,
    })
  }

  // 3. data-testid 維持
  if (
    /data-testid="item-edit-clear-baseline"/.test(ied) &&
    /data-testid="item-edit-save-as-template"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog 関連 data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-dialog data-testid 破壊` })
  }

  // 4. set-baseline aria-label に baseline 説明文脈を維持
  if (/`「\$\{item\.title\}」の startDate \/ dueDate を当初計画 \(baseline\) として保存`/.test(ied)) {
    findings.push({
      level: 'info',
      message: `set-baseline aria-label 文脈 (当初計画 baseline) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `set-baseline aria-label 文脈破壊` })
  }

  // 5. clear-baseline aria-label に旧値表示を維持
  if (
    /`「\$\{item\.title\}」のベースライン \(\$\{item\.baselineStartDate\} → \$\{item\.baselineEndDate\}\) をクリア`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `clear-baseline aria-label 文脈 (旧値表示) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `clear-baseline aria-label 文脈破壊` })
  }

  // iter853 invariant: sprint-retro / premortem visible aria-hidden
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
    findings.push({ level: 'warning', message: `iter853 invariant (retro) 破壊` })
  }

  // iter852 invariant: bulk-clear aria-label
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/aria-label=\{`選択 \$\{count\} 件を解除`\}/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: bulk-clear aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant 破壊` })
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

  console.log(`\n=== Findings (item-edit-baseline-aria-hidden-iter854) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
