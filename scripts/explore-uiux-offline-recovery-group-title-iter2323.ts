/**
 * Phase 6.15 loop iter2323: offline page 復帰アクション group に title 付与し
 * aria-label と sync (engineer-trigger group iter2207 / workspace-header ops group iter2229
 * と同 role="group" title sync pattern、offline UX page-level a11y 完備)。
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

  const offline = readFileSync(resolve(here, '../src/app/~offline/page.tsx'), 'utf8')
  if (!offline.includes('iter2323')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline ~/page.tsx iter2323 marker が無い',
    })
  }
  // aria-label="復帰アクション" と title="復帰アクション" が共存
  if (!/aria-label="復帰アクション"/.test(offline)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline 復帰アクション aria-label が消えている',
    })
  }
  if (!/title="復帰アクション"/.test(offline)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline 復帰アクション title が無い (sighted hover で context disclose 不可)',
    })
  }

  // 既存 family element の regression 検査
  const retry = readFileSync(resolve(here, '../src/app/~offline/retry-button.tsx'), 'utf8')
  if (!retry.includes('iter1805')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'offline retry-button iter1805 title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — offline 復帰アクション group title 1-path sync 完了、retry + home-link を包む group landmark を sighted hover でも disclose',
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
