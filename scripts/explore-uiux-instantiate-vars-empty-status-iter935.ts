/**
 * Phase 6.15 loop iter 935 (mode-D Desktop a11y) —
 * instantiate-form Template 変数 空状態 p に role="status" + aria-live="polite" +
 * data-testid 追加 (iter934 goals-panel KR empty 同 pattern を template instantiate に展開、
 * 全 empty state role/aria-live 統一 続編)。
 *
 * 経緯: iter934 で goals-panel KR empty に role/aria-live 追加。全 empty state を
 *   sweep する grep で本 file の 「変数なし」 p のみ抜けていた。
 *
 * 修正 (+8/-1 行、1 file):
 *   - p に role="status" + aria-live="polite" + data-testid={`instantiate-vars-empty-${template.id}`} 追加
 *   - 視覚 styling / message text 不変
 *
 * 検証: source-side regex assert + iter735/934 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ifrm = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )

  // 1. 変数なし p に role="status" + aria-live + data-testid 追加 OK
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid=\{`instantiate-vars-empty-\$\{template\.id\}`\}\s*\n\s*>\s*\n\s*変数なし \(そのまま展開\)/.test(
      ifrm,
    )
  ) {
    findings.push({
      level: 'info',
      message: `instantiate-form vars empty p role/aria-live/data-testid 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `instantiate-form vars empty p role/aria-live 欠落`,
    })
  }

  // 2. message text 維持
  if (/変数なし \(そのまま展開\)/.test(ifrm)) {
    findings.push({
      level: 'info',
      message: `instantiate-form vars empty message text 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `instantiate-form vars empty message text 破壊`,
    })
  }

  // iter934 invariant: goals-panel KR empty role status
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid=\{`krs-empty-\$\{goalId\}`\}\s*\n\s*>\s*KR がありません/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter934 invariant: goals-panel KR empty p role/aria-live 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter934 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (instantiate-vars-empty-status-iter935) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
