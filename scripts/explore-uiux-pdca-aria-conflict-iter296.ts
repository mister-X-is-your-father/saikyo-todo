/**
 * Phase 6.15 loop iter 296 — pdca-panel.tsx の distribution bar が
 * `role="img"` + `aria-labelledby="pdca-dist-label"` + `aria-label="分布 (合計 X):
 * Plan ... / Do ... / Check ... / Act ..."` の **両方** を持っており、ARIA
 * spec で aria-labelledby が優先されて aria-label が完全に無視される問題。
 *
 * ARIA spec (Accessible Name and Description Computation, AccName 1.2):
 * Step 2A: aria-labelledby → Step 2B: aria-label → Step 2C: native semantics.
 * 上位が解決された時点で下位は無視される。
 *
 * 結果として:
 *   - 開発者が意図した accessible name = "分布 (合計 5): Plan 1 (20%) / Do 2
 *     (40%) / Check 1 (20%) / Act 1 (20%)" の詳細情報
 *   - 実際の accessible name = "分布" (#pdca-dist-label のテキストのみ)
 * SR 利用者は「分布」と聞こえるだけで、PDCA 各段階の分布値を知ることができない。
 *
 * 期待 (fix 後):
 *   `aria-labelledby` を削除し、aria-label の詳細文字列を accessible name
 *   として有効化。視覚 label "分布" は別途 div で表示されており冗長性は
 *   担保 (sighted user は header + bar の組合せで context 理解、SR user は
 *   bar の aria-label で詳細値を取得)。
 *
 * Supabase 必須画面 (PDCA panel は workspace 内) のため runtime 検証は
 * 環境依存。source 側 regex assert で fix を verify。
 *
 *   pnpm tsx scripts/explore-uiux-pdca-aria-conflict-iter296.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const src = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )

  // 1. distribution bar の role="img" 周辺で aria-labelledby="pdca-dist-label" が削除されている
  const conflictPattern = /role="img"\s+aria-labelledby="pdca-dist-label"\s+aria-label=/
  if (conflictPattern.test(src)) {
    findings.push({
      level: 'warning',
      message: `pdca-panel.tsx: role="img" + aria-labelledby + aria-label の競合が残存`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `aria-labelledby + aria-label 競合解消 OK`,
    })
  }

  // 2. distribution bar の aria-label に PDCA 4 段階全てが含まれている (詳細 accessible name 維持)
  const labelPattern =
    /aria-label=\{\(\(\) =>[\s\S]*?Plan[\s\S]*?Do[\s\S]*?Check[\s\S]*?Act[\s\S]*?\)\(\)\}/
  if (!labelPattern.test(src)) {
    findings.push({
      level: 'warning',
      message: `pdca-panel.tsx: aria-label の PDCA 詳細文字列が見つからない`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `aria-label に Plan/Do/Check/Act 全て含まれる OK`,
    })
  }

  // 3. visible "分布" label (`id="pdca-dist-label"`) は維持されている (sighted user の cue)
  if (!/id="pdca-dist-label"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `pdca-panel.tsx: id="pdca-dist-label" が消えている (visible 分布 label の維持確認)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `visible "分布" label id 維持 OK (将来 reference 時用に残置)`,
    })
  }

  console.log(`\n=== Findings (pdca-aria-conflict-iter296) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
