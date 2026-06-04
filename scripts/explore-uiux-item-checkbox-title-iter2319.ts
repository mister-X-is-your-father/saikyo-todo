/**
 * Phase 6.15 loop iter2319: item-checkbox の title を aria-label state-dependent 3-path
 * と full sync (旧 title は 2-path 短文で divergent、start-timer iter2271 と同 title-aria
 * full sync pattern)。
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

  const ic = readFileSync(resolve(here, '../src/components/workspace/item-checkbox.tsx'), 'utf8')
  if (!ic.includes('iter2319')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-checkbox iter2319 marker が無い',
    })
  }
  // 3-path 各 text aria-label + title 計 2 出現
  const pendingText = (ic.match(/切替中… — 「\$\{item\.title\}」の完了状態を切替中/g) || []).length
  if (pendingText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-checkbox pending 出現 ${pendingText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const doneText = (ic.match(/未完了に戻す — 「\$\{item\.title\}」を未完了に戻す/g) || []).length
  if (doneText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-checkbox done 出現 ${doneText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const todoText = (ic.match(/完了にする — 「\$\{item\.title\}」を完了にする/g) || []).length
  if (todoText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-checkbox todo 出現 ${todoText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // 旧 partial title が消えていること
  if (ic.includes("title={isDone ? '未完了に戻す' : '完了にする'}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 item-checkbox partial title pattern が残っている',
    })
  }

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (!tp.includes('iter2317')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2317 template-card delete title が消えている',
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
      '(なし) — item-checkbox title 3-path full sync 完了、pending state も hover disclose',
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
