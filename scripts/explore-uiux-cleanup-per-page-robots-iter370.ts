/**
 * Phase 6.15 loop iter 370 — iter369 の layout robots default 成立に伴い、
 * iter368 で追加した per-page robots (login/signup/offline 3 file) を
 * 削除して DRY 化。layout から inherit されるため rendered HTML の
 * `<meta name="robots" content="noindex, nofollow">` 出力は維持。
 *
 * 課題: iter368 (per-page robots) + iter369 (layout robots default) で
 *   3 page に同値の robots metadata が duplicate。Next.js App Router の
 *   inheritance を活用すると per-page は不要 (layout default で全 page
 *   noindex,nofollow)、source of truth が 2 箇所に分散していた。
 *
 * fix: 3 page (login/signup/offline) の metadata から
 *   `robots: { index: false, follow: false }` 行を削除 (3 file × 1 行)。
 *   layout.tsx の global robots が継承されるため rendered HTML 出力は
 *   不変。source of truth を layout 一箇所に集約 (DRY)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 3 ファイル。
 *
 * 検証: source-side 不在 assert + curl で <meta name="robots"> がまだ
 * 出ていることを確認 (layout 経由 inheritance)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 3 page から robots property が削除されていること
  const perPages = [
    { file: 'src/app/(auth)/login/page.tsx', label: 'login' },
    { file: 'src/app/(auth)/signup/page.tsx', label: 'signup' },
    { file: 'src/app/~offline/page.tsx', label: 'offline' },
  ]
  for (const p of perPages) {
    const src = readFileSync(resolve(process.cwd(), p.file), 'utf8')
    // metadata block 内に robots property が無いこと
    const metadataBlock = src.match(/export const metadata: Metadata = \{[\s\S]+?\}\n/)
    if (!metadataBlock) {
      findings.push({ level: 'error', message: `${p.file}: metadata block 不在` })
      continue
    }
    if (/robots:/.test(metadataBlock[0])) {
      findings.push({
        level: 'warning',
        message: `${p.file}: robots property がまだ残っている (cleanup 不完全)`,
      })
    } else {
      findings.push({ level: 'info', message: `${p.label}: robots cleanup OK` })
    }
    // iter258 / 366,367 invariant 維持
    if (!/title:/.test(metadataBlock[0])) {
      findings.push({
        level: 'warning',
        message: `${p.file}: title が消えた (iter258 regression)`,
      })
    }
    if (!/description:/.test(metadataBlock[0])) {
      findings.push({
        level: 'warning',
        message: `${p.file}: description が消えた (iter366/367 regression)`,
      })
    }
  }

  // iter369 の layout global robots は維持されていること
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (!/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/.test(layout)) {
    findings.push({
      level: 'warning',
      message: 'src/app/layout.tsx: global robots が消えた (iter369 regression)',
    })
  } else {
    findings.push({ level: 'info', message: 'layout global robots invariant OK' })
  }

  console.log(`\n=== Findings (cleanup-per-page-robots-iter370) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
