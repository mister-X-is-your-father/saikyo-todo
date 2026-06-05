/**
 * Phase 6.15 loop iter2357: operation-board widget の generic Section ul に title 付与し
 * aria-label と sync (Sprint swim-lane lane ul iter2305 / KR list ul iter2329 /
 * AI 分解提案 ul iter2331 / Activity 履歴 ul iter2291 と同 list family title sync pattern、
 * 4 caller 一括効果、operation-board widget list 件数 hover 確認補完)。
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

  const obw = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!obw.includes('iter2357')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget iter2357 marker が無い',
    })
  }
  // ul aria-label={ariaLabel} title={ariaLabel} 1 行に sync
  if (!/<ul[^>]*aria-label=\{ariaLabel\}[^>]*title=\{ariaLabel\}/m.test(obw)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board Section ul aria-label / title sync が無い',
    })
  }

  // 既存 4 caller (overdue / mustToday / todayScheduled / doneYesterday) ariaLabel prop pass-through
  const callerCount = (obw.match(/ariaLabel=\{/g) || []).length
  if (callerCount < 4) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `operation-board ariaLabel prop pass-through 出現 ${callerCount} 回、4 caller 必要`,
    })
  }

  // 既存 ItemRow title (iter2225) regression 検査
  if (!obw.includes('title={ariaLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'ItemRow title={ariaLabel} sync が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — operation-board Section ul title sync 完了、4 caller 一括効果 (overdue / mustToday / todayScheduled / doneYesterday)、list family title pattern 拡張',
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
