/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y) —
 * decompose-proposals-panel proposals-redecompose button:
 * WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx の
 *   `proposals-redecompose` button は visible 動的 "追加分解" / "再分解" を
 *   持つが aria-label "既存の保留中 N 件を残して追加で AI 分解" /
 *   "AI 分解を再実行" は visible vocab を strict substring に **含まない**:
 *   - visible "追加分解" は aria-label の "追加で AI 分解" の "で AI " 4 char
 *     を挟んで連続せず substring 不一致。
 *   - visible "再分解" は aria-label の "AI 分解を再実行" に "再分解" 連続
 *     せず substring 不一致 (= 実行 vs 分解 順序逆)。
 *   両 path で WCAG 2.5.3 失敗 (voice control「追加分解」「再分解」発話で
 *   name 一致せず)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible 全 path (追加分解 / 再分解) を <span aria-hidden> で wrap、
 *     aria-label 単独経路に統一 (iter844-865 同 pattern)。
 *   - aria-label の「既存保留中件数 + 追加 / 再実行 区別」 文脈は維持。
 *
 * 検証: source-side regex assert + iter735-865 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. proposals-redecompose visible aria-hidden
  if (
    /<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `proposals-redecompose visible aria-hidden 統合 OK (2 path)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposals-redecompose visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 文脈維持 (追加 path)
  if (/`既存の保留中 \$\{list\.length\} 件を残して追加で AI 分解`/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `proposals-redecompose 追加 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposals-redecompose 追加 aria-label 文脈破壊`,
    })
  }

  // 3. aria-label 文脈維持 (再実行 path)
  if (/'AI 分解を再実行'/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `proposals-redecompose 再実行 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `proposals-redecompose 再実行 aria-label 文脈破壊`,
    })
  }

  // 4. data-testid 維持
  if (/data-testid="proposals-redecompose"/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `proposals-redecompose testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposals-redecompose testid 破壊` })
  }

  // 5. accept-all / reject-all visible aria-hidden は既存維持 (iter 過去対応)
  if (/<span aria-hidden="true">全て採用<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `proposals-accept-all visible aria-hidden 既存維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposals-accept-all visible aria-hidden 破壊` })
  }
  if (/<span aria-hidden="true">全て却下<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `proposals-reject-all visible aria-hidden 既存維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposals-reject-all visible aria-hidden 破壊` })
  }

  // iter865 invariant: mock-submit visible aria-hidden
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '送信中\.\.\.' : '送信'\}<\/span>/.test(msf)) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: mock-submit visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant 破壊` })
  }

  // iter864 invariant: comment-post 動詞統一
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{create\.isPending \? '投稿中…' : '投稿'\}\s*<\/span>/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: comment-post 動詞統一 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant 破壊` })
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

  console.log(`\n=== Findings (proposals-redecompose-aria-hidden-iter866) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
