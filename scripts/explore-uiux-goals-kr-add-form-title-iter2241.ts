/**
 * Phase 6.15 loop iter2241: goals-panel KR 追加 form に title 付与し aria-label と sync
 * (Goal 作成フォーム title iter2045 と同 create-form family title pattern を KR add form
 * にも展開、multi-goal 一覧画面で Goal 名で discriminate 可能化)。
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

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (
    !gp.includes('iter2241') ||
    !gp.includes('title={`Goal「${goalTitle}」の Key Result 追加フォーム`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel KR add form title が aria-label と sync されていない',
    })
  }
  // KR add form aria-label + title 計 2 出現
  const krFormText = (gp.match(/Goal「\$\{goalTitle\}」の Key Result 追加フォーム/g) || []).length
  if (krFormText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `'Goal「\${goalTitle}」の Key Result 追加フォーム' 出現 ${krFormText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (!tp.includes('iter2239')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2239 template-card title disclosure button title が消えている',
    })
  }

  const isp = readFileSync(
    resolve(here, '../src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  if (!isp.includes('iter2237')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2237 item-summary 3 chip title が消えている',
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
    console.log('(なし) — goals-panel KR add form title sync 完了、create-form family 展開')
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
