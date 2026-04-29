/**
 * Phase 6.15 loop iter 367 — `~/offline` page にも page-specific
 * `description` metadata を追加 (iter366 の login/signup 続編)。layout
 * 由来の generic description "チーム共有 AI 駆動 TODO" が SW fallback
 * 画面 share preview / SEO snippet に inherit されていた問題を解消。
 *
 * 課題: iter258 で title metadata は "オフライン | 最強TODO" に固有化
 *   済みだが、description は layout.tsx 由来の generic 文言を inherit、
 *   `<meta name="description">` 経由で share preview / SEO で「チーム
 *   共有 AI 駆動 TODO」が表示され offline 文脈が伝わらなかった。
 *
 * fix: metadata object に description property を追加 (1 file 数行)。
 *   "最強TODO のオフライン fallback 画面 (PWA SW)。ネットワーク復帰後に
 *   再読み込みしてください。" を設定し、share preview / SEO snippet で
 *   page 固有の文脈を伝える。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/~offline/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/description:[\s\n]+'最強TODO のオフライン fallback 画面/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: description metadata 不在`,
    })
  } else {
    findings.push({ level: 'info', message: 'description metadata OK' })
  }

  // iter258 invariant 維持: title metadata
  if (!/title: 'オフライン \| 最強TODO'/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: title metadata が消えた (iter258 regression)`,
    })
  }

  // iter256 / 361 / 362 / 364 / 365 invariant
  if (!/aria-labelledby="offline-heading"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <main> aria-labelledby が消えた (iter256 regression)`,
    })
  }
  if (!/aria-describedby="offline-description offline-secondary"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <main> aria-describedby IDREFS が消えた (iter362 regression)`,
    })
  }

  console.log(`\n=== Findings (offline-meta-description-iter367) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
