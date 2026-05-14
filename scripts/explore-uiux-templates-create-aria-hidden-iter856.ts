/**
 * Phase 6.15 loop iter856 — /<wsId>/templates の Template 作成 form submit button visible
 * "作成" を aria-hidden span で wrap した regression guard。
 *
 * 背景: iter844-855 sweep の続編。Templates Panel の 新規作成 submit button は aria-label に
 * 3 状態 (empty name / pending / idle) を完全表現するのに visible 子 text "作成" のみ
 * aria-hidden 無し。auth gate 後 page のため filesystem grep verify。
 *
 *   pnpm tsx scripts/explore-uiux-templates-create-aria-hidden-iter856.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/template/templates-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // 1. 3 状態 aria-label invariant
  const arias = [
    'Template を作成するには名前を入力してください',
    'Template を作成中…',
    'Template を新規作成 (Cmd/Ctrl+Enter でも可)',
  ]
  for (const a of arias) {
    if (!src.includes(`'${a}'`)) {
      findings.push({ level: 'error', message: `aria-label "${a}" が見つからない` })
    }
  }

  // 2. submit Button 子 visible "作成" が <span aria-hidden="true"> で wrap 済み
  const wrappedPattern = /<span aria-hidden="true">作成<\/span>/
  if (!wrappedPattern.test(src)) {
    findings.push({
      level: 'error',
      message: 'submit button 子 visible "作成" が aria-hidden span で wrap されていない',
    })
  }

  // 3. Cmd+Enter shortcut invariant (iter390 系) 健在
  if (!src.includes('aria-keyshortcuts="Meta+Enter Control+Enter"')) {
    findings.push({
      level: 'error',
      message: 'aria-keyshortcuts="Meta+Enter Control+Enter" が消えている (iter390 invariant)',
    })
  }

  // 4. form 直前の Label htmlFor="tmpl-name" 健在
  if (!src.includes('htmlFor="tmpl-name"')) {
    findings.push({
      level: 'error',
      message: 'Label htmlFor="tmpl-name" が消えている (iter96 invariant)',
    })
  }

  // 5. iter815 invariant: template-card disclosure button aria-label に kind / scheduleCron
  if (!src.match(/aria-label=.*kind.*scheduleCron|`.*\(.*\$\{.*kind.*\}.*\)`/s)) {
    // 緩めの check: kind / scheduleCron 文字列のどちらかが file 内にある
    if (!(src.includes('${t.kind}') || src.includes('t.scheduleCron'))) {
      findings.push({
        level: 'warning',
        message: 'iter815 aria-label に kind / scheduleCron が含まれているか確認できない',
      })
    }
  }

  console.log(`\n=== Findings (templates-create-aria-hidden iter856) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
