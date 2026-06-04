/**
 * Phase 6.15 loop iter2231: item-research-button の aria-label と sync する title を付与。
 * state-dependent 3-path (done / pending / idle、item.title + AI 調査用途含む) を sighted
 * hover で disclose、AI action 系 button 3 element 完成 (decompose / engineer / research)。
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

  const rb = readFileSync(
    resolve(here, '../src/components/workspace/item-research-button.tsx'),
    'utf8',
  )
  if (
    !rb.includes('iter2231') ||
    !rb.includes('「${item.title}」は完了済のため AI 調査不可') ||
    !rb.includes('「${item.title}」を AI 調査中…') ||
    !rb.includes('「${item.title}」を AI 調査して Doc を作成')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-research-button title が aria-label 3-path と sync されていない',
    })
  }
  // title 出現回数: aria-label 1 + title 1 = 2 セットの 3-path text
  // → 'AI 調査して Doc を作成' は aria-label と title 両方で出現 (= 2 回)
  const docCreate = (rb.match(/AI 調査して Doc を作成/g) || []).length
  if (docCreate < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `'AI 調査して Doc を作成' 出現が ${docCreate} 回、aria-label + title 計 2 回必要`,
    })
  }

  const db = readFileSync(
    resolve(here, '../src/components/workspace/item-decompose-button.tsx'),
    'utf8',
  )
  if (!db.includes('iter2213')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2213 item-decompose-btn title が消えている',
    })
  }

  const eb = readFileSync(
    resolve(here, '../src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (!eb.includes('iter2211')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2211 engineer-trigger-btn title が消えている',
    })
  }

  const wh = readFileSync(resolve(here, '../src/components/workspace/workspace-header.tsx'), 'utf8')
  if (!wh.includes('iter2229')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2229 workspace-header ops-group title が消えている',
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
      '(なし) — item-research-button title 3-path sync 完了、AI action 系 button 3 element 完成',
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
