/**
 * Phase 6.15 loop iter2347: proposal 編集 form に title 付与し aria-label
 * "提案「${title}」の編集フォーム" と sync。create-workspace-form iter2217 /
 * AI 分解提案 ul iter2331 と同 form/list aria-label title sync pattern を
 * proposal edit form にも展開、編集 form の対象 hover disclose。
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

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2347')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel iter2347 marker が無い',
    })
  }
  // form aria + title 計 2 出現
  const expr = (dp.match(/`提案「\$\{proposal\.title\}」の編集フォーム`/g) || []).length
  if (expr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `proposal edit form aria-label/title 出現 ${expr} 回、計 2 回必要`,
    })
  }

  // iter2335 / iter2331 regression
  if (!dp.includes('iter2335') || !dp.includes('iter2331')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2335 / iter2331 (proposal MUST / 分解提案 ul) title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — proposal edit form title sync 完了、form 対象 proposal hover disclose 化')
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
