/**
 * Phase 6.15 loop iter2335: assignee-picker user CommandItem に title 付与し
 * aria-label state-dependent 2-path と sync (item-decompose-btn iter2213 と同
 * state-dependent option title pattern、CommandItem checked / unchecked 両 path で
 * sighted hover 可能に、CheckIcon opacity 0/100 切替の意味補完)。
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
  if (!ap.includes('iter2335')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker iter2335 marker が無い',
    })
  }
  // 2-path 各 text aria-label + title 計 2 回出現 (user option block 限定で計 4 回)
  const checkedText = (ap.match(/\$\{label\} — アサイン中 \(クリックで解除\)/g) || []).length
  if (checkedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `assignee-picker user checked 出現 ${checkedText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleText = (ap.match(/\$\{label\} — アサインする/g) || []).length
  if (idleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `assignee-picker user idle 出現 ${idleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 family element の regression 検査
  const offline = readFileSync(resolve(here, '../src/app/~offline/page.tsx'), 'utf8')
  if (!offline.includes('iter2323')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2323 offline 復帰アクション group title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — assignee-picker user CommandItem title 2-path sync 完了、checked / unchecked 両 state で sighted hover 可、CheckIcon opacity 切替の意味補完',
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
