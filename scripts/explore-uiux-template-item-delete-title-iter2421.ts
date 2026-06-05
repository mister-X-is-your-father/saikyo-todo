/**
 * Phase 6.15 loop iter2421: template item delete (icon-only Trash2) button に title
 * 付与し aria-label state-dependent 2-path と sync (proposals-accept/reject iter2253 /
 * wf-delete iter1815 / template-card delete iter2317 と同 state-dependent icon-only delete
 * button title pattern、Template editor 内 item 削除 button hover disclose 完備)。
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

  const tie = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!tie.includes('iter2421')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items-editor iter2421 marker が無い',
    })
  }
  const pendingText = (tie.match(/`削除中… — Template item「\$\{it\.title\}」を削除中`/g) || [])
    .length
  if (pendingText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-item-delete pending 出現 ${pendingText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleText = (tie.match(/`削除 — Template item「\$\{it\.title\}」を削除`/g) || []).length
  if (idleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-item-delete idle 出現 ${idleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2419 add form regression 検査
  if (!tie.includes('iter2419')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2419 template-items add form title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — template item delete button title 2-path sync 完了、Template editor 内 item 削除 button hover disclose 完備',
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
