/**
 * Phase 6.15 loop iter 953 (mode-D Desktop a11y) — /mock-timesheet/entries の
 * empty state `<p>まだ送信されていません。</p>` に `role="status"` + `aria-live="polite"`
 * + `data-testid="mock-entries-empty"` を追加。iter918-935 sweep で確立した
 * 空状態 p の a11y 規約 (SR landmark / status region nav で検出可、E2E から
 * data-testid で空状態を検出可) を mock-entries にも展開。
 *
 * 課題: /mock-timesheet/entries の empty state は plain <p> で role / aria-live /
 *   data-testid なし。iter934 goals-panel KrCard / iter935 instantiate-form の
 *   sweep pattern (16 component で全 empty state 統一済) と不整合。SR landmark /
 *   status region nav で skip され、E2E test も data-testid で empty 検出不能。
 *
 * fix: page.tsx の <p>まだ送信されていません。</p> に
 *   - role="status"
 *   - aria-live="polite"
 *   - data-testid="mock-entries-empty"
 *   を追加。+6/-1 行 (1 file)。視覚 / 動作不変。SR は status region nav で empty
 *   announce、E2E は data-testid で empty を assertable。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex + architecture test 通過確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/mock-timesheet/entries/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. role="status" + aria-live="polite" + data-testid="mock-entries-empty"
  const emptyMatch = src.match(/<p[\s\S]*?まだ送信されていません[\s\S]*?<\/p>/)
  if (!emptyMatch) {
    findings.push({ level: 'error', message: `${target}: empty state <p> block 不在` })
  } else {
    if (!/role="status"/.test(emptyMatch[0])) {
      findings.push({
        level: 'warning',
        message: `${target}: empty state <p> に role="status" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `empty state role="status" OK` })
    }
    if (!/aria-live="polite"/.test(emptyMatch[0])) {
      findings.push({
        level: 'warning',
        message: `${target}: empty state <p> に aria-live="polite" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `empty state aria-live="polite" OK` })
    }
    if (!/data-testid="mock-entries-empty"/.test(emptyMatch[0])) {
      findings.push({
        level: 'warning',
        message: `${target}: empty state <p> に data-testid="mock-entries-empty" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `empty state data-testid OK` })
    }
  }

  // 2. iter946 invariant: h2 id="mock-entries-heading" + main aria-labelledby
  if (!/<h2\s+id="mock-entries-heading"/.test(src)) {
    findings.push({ level: 'warning', message: `iter946 invariant (h2 id) 破壊` })
  } else if (!/aria-labelledby="mock-entries-heading"/.test(src)) {
    findings.push({ level: 'warning', message: `iter946 invariant (main aria-labelledby) 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter946 invariant OK` })
  }

  // 3. iter952 invariant: architecture test の main tabIndex={-1} chk
  //    (本 file が test 通過すること = 直接 chk)
  if (!/<main[\s\S]{0,400}id="main-content"/.test(src)) {
    findings.push({ level: 'warning', message: `iter952 invariant: main id 破壊` })
  } else if (!/<main[\s\S]{0,400}tabIndex=\{-1\}/.test(src)) {
    findings.push({ level: 'warning', message: `iter952 invariant: main tabIndex 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter952 invariant OK` })
  }

  // 4. iter951 invariant: mock-submit-form enterKeyHint
  const mockSubmitSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(mockSubmitSrc) || !/enterKeyHint="send"/.test(mockSubmitSrc)) {
    findings.push({ level: 'warning', message: `iter951 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter951 invariant OK` })
  }

  // 5. iter735 invariant
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

  console.log(`\n=== Findings (mock-entries-empty-status-iter953) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
