/**
 * Phase 6.15 loop iter2321: item-plan-generate-button に title 付与し aria-label
 * state-dependent 2-path と sync (AI action button family 4 element 完成、
 * decompose / research / engineer / plan-generate)。
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

  const pg = readFileSync(
    resolve(here, '../src/components/workspace/item-plan-generate-button.tsx'),
    'utf8',
  )
  if (!pg.includes('iter2321')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-plan-generate-button iter2321 marker が無い',
    })
  }
  // 2-path 各 text aria-label + title 計 2 出現
  const pendingText = (pg.match(/Plan 生成中… — 「\$\{item\.title\}」の Plan を生成中/g) || [])
    .length
  if (pendingText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-plan-generate pending 出現 ${pendingText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleText = (pg.match(/Plan を生成 — 「\$\{item\.title\}」の AI 担当が実行計画/g) || [])
    .length
  if (idleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-plan-generate idle 出現 ${idleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const ic = readFileSync(resolve(here, '../src/components/workspace/item-checkbox.tsx'), 'utf8')
  if (!ic.includes('iter2319')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2319 item-checkbox title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — item-plan-generate-button title 2-path sync 完了、AI action button family 4 element (decompose / research / engineer / plan-generate) 完成',
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
