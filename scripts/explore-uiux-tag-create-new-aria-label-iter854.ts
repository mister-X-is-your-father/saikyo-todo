/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y) —
 * tag-picker 新規タグ作成 CommandItem に aria-label 追加 + visible 「」を作成 を aria-hidden span 化。
 *
 * 課題: src/components/workspace/tag-picker.tsx の「新規作成」 CommandItem (line 161-169) は
 *   - aria-label 無し (= 既存タグ option には aria-label あるのに、create option だけ pattern が乖離)
 *   - visible 「{query}」を作成 が SR にそのまま読まれる (技術的には機能するが、create action と
 *     既存タグ選択 action が同 list 内に混在する semantic を SR ユーザに伝えにくい)
 *   - 新規タグの **色は #64748b デフォルト** (= 後で編集可) という mental model が SR ユーザに
 *     伝わらず、誤って多数の create を呼びそうになる場合がある
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label="「${query.trim()}」を新規タグとして作成 (色はデフォルト #64748b、後で変更可)" 追加、
 *     SR ユーザに create action + color hint を明示
 *   - visible 「」を作成 を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一
 *     (iter844-853 同 pattern + 既存タグ option との semantic 整合)
 *   - PlusIcon は既存 aria-hidden 維持
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

  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')

  // 1. create CommandItem に aria-label 追加 (color hint 付き)
  if (
    /aria-label=\{`「\$\{query\.trim\(\)\}」を新規タグとして作成 \(色はデフォルト #64748b、後で変更可\)`\}/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `tag-create aria-label に visible 「{query}」 prefix + color hint 含む (WCAG 2.5.3 適合 + SR context) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `tag-create aria-label / color hint 欠落`,
    })
  }

  // 2. visible 「{query}」を作成 は span aria-hidden で wrap
  if (/<span aria-hidden="true">「\{query\.trim\(\)\}」を作成<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `tag-create visible 「{query}」を作成 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `tag-create visible aria-hidden 未統合`,
    })
  }

  // 3. data-testid="tag-create-new" 維持 + PlusIcon aria-hidden 維持
  if (/data-testid="tag-create-new"/.test(tp) && /<PlusIcon[^/]+aria-hidden="true"/.test(tp)) {
    findings.push({
      level: 'info',
      message: `tag-create data-testid + PlusIcon aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `tag-create attrs 破壊` })
  }

  // 4. 既存タグ option の aria-label は維持 (= regression 防止)
  if (
    /aria-label=\{[\s\S]+?`タグ「\$\{t\.name\}」を付与中/.test(tp) &&
    /`タグ「\$\{t\.name\}」を付与する`/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `tag-option (既存) aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `tag-option aria-label regression` })
  }

  // iter853 invariant: bulk-clear aria-label prefix + aria-hidden
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

  // iter851 invariant: bulk-status aria-label prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`\$\{s\.label\} に変更: 選択 \$\{count\} 件のステータスを更新`/.test(
      bab,
    ) &&
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status aria-label + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
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

  console.log(`\n=== Findings (tag-create-new-aria-label-iter854) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
