/**
 * Phase 6.15 loop iter 372 — `layout.tsx` の viewport export に
 * `colorScheme: 'light dark'` を追加し、`<meta name="color-scheme"
 * content="light dark">` を rendered HTML に出力。browser に
 * 「両 theme 対応」を programmatic に伝え、user agent が built-in
 * form control (date picker / scrollbar / `<input type=number>` の
 * spinner 等) を current theme に合わせて render する。
 *
 * 課題: 旧 viewport export は themeColor / width / initialScale /
 *   viewportFit のみで colorScheme が未設定。`<meta name="color-scheme">`
 *   不在で browser は OS default (light 想定) で UA-rendered control を
 *   render、user が dark theme を選択していても native scrollbar や
 *   date input の picker が light で出る不整合 (例: Safari の date
 *   input の calendar popup が white background のまま、surrounding
 *   が dark で見にくい)。
 *
 * fix: viewport object に `colorScheme: 'light dark'` を追加 (1 file
 *   1 行)。Next.js viewport API がこれを `<meta name="color-scheme"
 *   content="light dark">` に変換、browser は両 theme に応じて
 *   UA-rendered control の見た目を切り替える (CSS color-scheme
 *   property と等価、document-level で適用)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert + curl で <meta name="color-scheme">
 *   出力を確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/layout.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/colorScheme: 'light dark'/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: viewport.colorScheme = 'light dark' 不在`,
    })
  } else {
    findings.push({ level: 'info', message: 'viewport.colorScheme OK' })
  }

  // 既存 viewport invariant 維持
  const invariants = [
    [/themeColor: \[/, 'viewport.themeColor'],
    [/width: 'device-width'/, 'viewport.width'],
    [/initialScale: 1/, 'viewport.initialScale'],
    [/viewportFit: 'cover' as const/, 'viewport.viewportFit'],
  ] as const
  for (const [re, label] of invariants) {
    if (!re.test(src)) {
      findings.push({ level: 'warning', message: `${label} が消えた (regression)` })
    }
  }

  // iter369 / 371 invariant 維持
  if (!/robots:\s*\{\s*index:\s*false/.test(src)) {
    findings.push({
      level: 'warning',
      message: 'iter369 robots metadata が消えた (regression)',
    })
  }
  if (!/<noscript>[\s\S]+?最強TODO は JavaScript を必要/.test(src)) {
    findings.push({
      level: 'warning',
      message: 'iter371 <noscript> が消えた (regression)',
    })
  }

  console.log(`\n=== Findings (color-scheme-iter372) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
