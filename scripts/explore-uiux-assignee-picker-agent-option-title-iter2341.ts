/**
 * Phase 6.15 loop iter2341: assignee-picker AI agent CommandItem に title 付与し
 * aria-label state-dependent 2-path と sync (assignee-picker user CommandItem iter2335 /
 * tag-picker option iter2339 と同 state-dependent option title pattern、assignee-picker
 * 内 user / AI agent 2 option family 完成)。
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

  const ap = readFileSync(resolve(here, '../src/components/workspace/assignee-picker.tsx'), 'utf8')
  if (!ap.includes('iter2341')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker iter2341 marker が無い',
    })
  }
  // AI agent 2-path 各 text aria-label + title 計 2 回出現
  const checkedText = (ap.match(/\$\{label\} — AI Agent アサイン中 \(クリックで解除\)/g) || [])
    .length
  if (checkedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `assignee-picker AI agent checked 出現 ${checkedText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleText = (ap.match(/\$\{label\} — AI Agent をアサイン/g) || []).length
  if (idleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `assignee-picker AI agent idle 出現 ${idleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 user option (iter2335) の regression 検査
  if (!ap.includes('iter2335')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2335 user CommandItem title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — assignee-picker AI agent CommandItem title 2-path sync 完了、assignee-picker 内 user / AI agent 2 option family 完成',
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
