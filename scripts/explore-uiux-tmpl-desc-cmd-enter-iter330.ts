/**
 * Phase 6.15 loop iter 330 — templates-panel の Template description Textarea
 * (id="tmpl-desc") にも Cmd/Ctrl+Enter で作成 を展開、iter313-318/iter329 続編
 * (Cmd+Enter sweep 10 件目)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/template/templates-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  const block = src.match(/<Textarea[\s\S]*?id="tmpl-desc"[\s\S]*?\/>/)
  if (!block) {
    findings.push({ level: 'error', message: `${target}: tmpl-desc Textarea not found` })
  } else {
    if (!/onKeyDown=/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: tmpl-desc onKeyDown 不在` })
    }
    if (!/createMut\.isPending/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: createMut.isPending ガード不在` })
    }
    if (!/Cmd\/Ctrl\+Enter で作成/.test(src)) {
      findings.push({ level: 'warning', message: `${target}: hint 文言不在` })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: tmpl-desc Cmd/Ctrl+Enter OK` })
  }

  console.log(`\n=== Findings (tmpl-desc-cmd-enter-iter330) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
