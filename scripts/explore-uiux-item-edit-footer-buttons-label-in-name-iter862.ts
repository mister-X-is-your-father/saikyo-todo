/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y) —
 * item-edit-dialog footer 3 button (保存 / キャンセル / Template として保存):
 * WCAG 2.5.3 (Label in Name) 一括 prefix 適合。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の 3 footer button:
 *   - item-edit-save: visible "保存" / "保存中..." (aria-hidden 維持済み) vs 旧
 *     aria-label "「N」を保存…" → "保存" が name suffix substring で prefix では無く
 *     voice user 発話「保存」 と name 先頭不一致 (Cmd+S shortcut も accessibility 経由)
 *   - item-edit-cancel: visible "キャンセル" (aria-hidden 維持済み) vs 旧 aria-label
 *     "「N」の編集をキャンセル" → "キャンセル" が name suffix substring (prefix 不一致)
 *   - item-edit-save-as-template: visible "Template として保存" / "保存中…" (aria-hidden
 *     維持済み) vs 旧 aria-label "「N」と全ての子孫 (subtask) を Template として保存…"
 *     → "Template として保存" が name 内部 substring (prefix 不一致)
 *   iter844-861 で同 pattern を順次適合化済、item-edit-dialog footer button が残る。
 *
 * fix (1 ファイル、3 button 一括 ~6 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - 保存 → 「保存 (「N」を保存、Cmd/Ctrl+S でも可、楽観ロックで version が進む)」 /
 *       「保存中... (「N」)」 / disabled「保存 (現状は無効: タイトルを入力してください)」
 *     - キャンセル → 「キャンセル (「N」の編集をキャンセル)」
 *     - Template として保存 → 「Template として保存 (「N」と全ての子孫…)」 / pending
 *       「保存中… (「N」を Template に保存)」
 *   - 3 button の visible text は元々 aria-hidden 維持。aria-label の prefix 化のみで適合化。
 *
 * 検証: source-side regex assert + iter850/856/858/860/861 invariant cross-check。
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

  // 1. item-edit-save aria-label visible "保存" / "保存中..." / disabled prefix
  if (
    /aria-label=\{[\s\S]+?`保存 \(「\$\{item\.title\}」を保存、Cmd\/Ctrl\+S でも可、楽観ロックで version が進む\)`/.test(
      ied,
    ) &&
    /aria-label=\{[\s\S]+?`保存中\.\.\. \(「\$\{item\.title\}」\)`/.test(ied) &&
    /aria-label=\{[\s\S]+?'保存 \(現状は無効: タイトルを入力してください\)'/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-save aria-label visible "保存(中...)" prefix (disabled 含む) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-save aria-label NG` })
  }

  // 2. item-edit-cancel aria-label visible "キャンセル" prefix
  if (/aria-label=\{`キャンセル \(「\$\{item\.title\}」の編集をキャンセル\)`\}/.test(ied)) {
    findings.push({
      level: 'info',
      message: `item-edit-cancel aria-label visible "キャンセル" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-cancel aria-label NG` })
  }

  // 3. item-edit-save-as-template aria-label visible "Template として保存" / "保存中…" prefix
  if (
    /aria-label=\{[\s\S]+?`Template として保存 \(「\$\{item\.title\}」と全ての子孫 \(subtask\) を Template として保存、再利用可\)`/.test(
      ied,
    ) &&
    /aria-label=\{[\s\S]+?`保存中… \(「\$\{item\.title\}」を Template に保存\)`/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-save-as-template aria-label visible "Template として保存" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-save-as-template aria-label NG` })
  }

  // 4. visible 3 button aria-hidden 維持
  if (
    /<span aria-hidden="true">\{update\.isPending \? '保存中\.\.\.' : '保存'\}<\/span>/.test(ied) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(ied) &&
    /<span aria-hidden="true">[\s\S]+?createTemplateFromItem\.isPending \? '保存中…' : 'Template として保存'[\s\S]+?<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `footer 3 button visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `footer 3 button aria-hidden NG` })
  }

  // 5. data-testid 維持
  if (
    /data-testid="item-edit-save"/.test(ied) &&
    /data-testid="item-edit-cancel"/.test(ied) &&
    /data-testid="item-edit-save-as-template"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `footer 3 button data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `footer 3 button data-testid 破壊` })
  }

  // iter861 invariant: item-edit-reload aria-label prefix 維持
  if (
    /aria-label="最新を読み込み \(自分の編集内容を破棄してサーバの最新値を読み込み直す\)"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: item-edit-reload aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  // iter860 invariant: proposal accept
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">✓ 採用<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: proposal accept aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  // iter856 invariant: sprint status
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">期間<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: sprint status button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  console.log(`\n=== Findings (item-edit-footer-buttons-label-in-name-iter862) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
