/**
 * Phase 6.15 loop iter2257: src-create-btn (integrations-panel External Source 作成
 * button) に title 付与し aria-label state-dependent 3-path と sync (MCP path A 探索で
 * 発見、create button family の Source 1 element 追加)。
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

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2257')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2257 marker が無い',
    })
  }
  // 3-path 各 text が aria-label + title で 2 出現
  const emptyText = (ip.match(/作成 — Source を作成するには名前を入力してください/g) || []).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-create-btn empty path 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const pendingText = (ip.match(/作成中… — Source を作成中/g) || []).length
  if (pendingText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-create-btn pending path 出現 ${pendingText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleText = (ip.match(/作成 — External Source を新規作成/g) || []).length
  if (idleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-create-btn idle path 出現 ${idleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2255')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2255 budget edit form button family title が消えている',
    })
  }

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2253')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2253 proposals accept/reject title が消えている',
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
      '(なし) — src-create-btn title 3-path sync 完了 (MCP path A 経由発見)、create button family Source 1 element 追加',
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
