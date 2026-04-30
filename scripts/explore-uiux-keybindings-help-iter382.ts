/**
 * Phase 6.15 loop iter 382 — `KeybindingsHelpModal` の section semantic +
 * dt aria-label polish。
 *
 * 課題: src/components/shared/keybindings-help-modal.tsx は Dialog 自体は
 *   Radix の DialogTitle / DialogDescription で aria-labelledby /
 *   aria-describedby が貼られているが
 *   - 各 group `<section>` は `<h3>` を含むだけで `aria-labelledby` なし、
 *     SR の section navigation で「何の section か」が implicit のみ
 *   - h3 は group 名のみで件数が SR 不可視 (visual の dl rows でしか分からない)
 *   - `<dt>` は `<kbd>` 子だけで実際の combo 文字列を直接 SR に伝える
 *     means 無し (kbd 内 char を逐次読みになる)、特に `g t` のような chain は
 *     "ジー ティー" と読まれて意味不明になる場合あり
 *
 * fix: src/components/shared/keybindings-help-modal.tsx に 3 点を追加
 *   (1 file 約 18 line 差替、機能追加なし、shadcn 編集なし)。
 *   1. group section に `aria-labelledby={headingId}` + h3 に `id={headingId}`
 *      を付与 (group 名から slugify、空白を `-` に置換)、explicit な
 *      labelling で SR section navigation を強化
 *   2. h3 に `<span className="sr-only"> ({list.length} 件)</span>` を append、
 *      visual には影響せず SR は「ナビゲーション (6 件)」と読み上げ
 *   3. `<dt>` に `aria-label={`ショートカット ${kb.combo}`}` を付与 +
 *      `<kbd>` を `aria-hidden="true"` で個別読み上げを抑止、SR は dt の
 *      aria-label を 1 度だけ読み「ショートカット g t」と意味のある単位に
 *
 * 検証: source-side regex assert で codify。modal 自体の挙動は dev server +
 *   browser 統合で確認できるが cloud env では curl で source 確認まで。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/shared/keybindings-help-modal.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. section aria-labelledby + h3 id
  if (!/aria-labelledby=\{headingId\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: section に aria-labelledby={headingId} が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'section aria-labelledby OK' })
  }
  if (!/id=\{headingId\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: h3 に id={headingId} が無い`,
    })
  }
  if (!/const headingId = `keybindings-group-heading-\$\{group\.replace\(/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: headingId 変数が group slugify で導出されていない`,
    })
  }

  // 2. h3 内の sr-only 件数 span
  if (!/<span className="sr-only"> \(\{list\.length\} 件\)<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: h3 に sr-only 件数 span が無い`,
    })
  }

  // 3. dt aria-label + kbd aria-hidden
  if (!/aria-label=\{`ショートカット \$\{kb\.combo\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: dt に aria-label="ショートカット <combo>" が無い`,
    })
  }
  // <kbd> aria-hidden="true" が parts.map 内に入っている
  if (!/<kbd[\s\S]*?aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: kbd に aria-hidden="true" が無い (dt の aria-label と二重読み上げ)`,
    })
  }

  // 4. iter378 / iter379 / iter380 / iter381 invariant 維持 (regression guard)
  for (const f of [
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
    'src/components/mock-timesheet/mock-top-nav.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (
      f.endsWith('mock-top-nav.tsx') &&
      !/<nav\s+aria-label="mock-timesheet ナビゲーション"/.test(s)
    ) {
      findings.push({
        level: 'warning',
        message: `${f}: iter381 nav landmark が消えた`,
      })
    }
    if (
      !f.endsWith('mock-top-nav.tsx') &&
      (!/function onInvalid\(errors:/.test(s) || !/handleSubmit\(onSubmit, onInvalid\)/.test(s))
    ) {
      findings.push({
        level: 'warning',
        message: `${f}: iter378/iter379 onInvalid pattern が消えた`,
      })
    }
  }

  console.log(`\n=== Findings (keybindings-help-iter382) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
