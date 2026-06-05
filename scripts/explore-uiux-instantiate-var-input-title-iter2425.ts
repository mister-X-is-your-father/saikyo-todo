/**
 * Phase 6.15 loop iter2425: instantiate Var IMEInput に title 付与し aria-label IIFE
 * state-dependent 4-path と sync (override iter2423 と pair で instantiate form の
 * 2 input 全 hover disclose 完備、1 fix で N (= vars 件数) 個の var input 一括効果)。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const ifrm = readFileSync(
    resolve(here, '../src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (!ifrm.includes('iter2425')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'instantiate-form iter2425 marker が無い',
    })
  }
  // 4-path 各 return text aria-label + title 計 2 回出現
  const emptyText = (
    ifrm.match(
      /`変数: \$\{v\} — Mustache 変数「\$\{v\}」 の値 \(必須、最大 500 文字、template の \{\{\$\{v\}\}\} に展開時 substitute される\)`/g,
    ) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `var empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const blankOnlyText = (
    ifrm.match(
      /`変数: \$\{v\} — Mustache 変数「\$\{v\}」 \(現在 \$\{val\.length\} \/ 500 文字、空白のみは不正\)`/g,
    ) || []
  ).length
  if (blankOnlyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `var 空白のみ 出現 ${blankOnlyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const nearLimitText = (
    ifrm.match(
      /`変数: \$\{v\} — Mustache 変数「\$\{v\}」 \(現在 \$\{val\.length\} \/ 500 文字、上限近接\)`/g,
    ) || []
  ).length
  if (nearLimitText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `var 上限近接 出現 ${nearLimitText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const normalText = (
    ifrm.match(
      /`変数: \$\{v\} — Mustache 変数「\$\{v\}」 \(現在 \$\{val\.length\} \/ 500 文字\)`/g,
    ) || []
  ).length
  if (normalText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `var normal 出現 ${normalText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2423 override regression 検査
  if (!ifrm.includes('iter2423')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2423 instantiate override title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — instantiate Var IMEInput title 4-path sync 完了、override iter2423 と pair で instantiate form 2 input (override + var) 全 hover disclose 完備、N (= vars 件数) 個 var 一括効果',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
