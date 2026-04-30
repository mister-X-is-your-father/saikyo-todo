/**
 * Phase 6.15 loop iter 484 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * ItemPlanGenerateButton (Plan を生成) に `min-h-11` 追加、codify。
 *
 * 課題: src/components/workspace/item-plan-generate-button.tsx 行 47 の Button が
 *   `size="sm"` (h-8 = 32px) で `className="min-h-11"` 漏れ。WCAG 2.5.5 AAA (44x44 click target)
 *   違反、mobile tap で隣接 button と誤タップしやすい。
 *
 * 兄弟 component との不整合:
 *   - item-decompose-button.tsx 行 49: `className="min-h-11"` ✓
 *   - item-research-button.tsx 行 40: `className="min-h-11"` ✓
 *   - item-plan-generate-button.tsx 行 47-66: 漏れ ✗
 *
 * これら 3 button は ItemEditDialog 上部の AI action group で隣接配置され、
 * Plan 生成 button だけ高さが 32px / 他は 44px となり tap-target サイズ不揃い。
 *
 * fix (1 ファイル 1 行追加):
 *   - `<Button type="button" size="sm" variant="outline" ...>` →
 *     `<Button type="button" size="sm" className="min-h-11" variant="outline" ...>`
 *
 * iter462-479 mobile sweep 系列の続編 (累計 105 button 達成、iter479 で「最大 mobile WCAG 2.5.5 AAA
 * sweep 完了」 と宣言したが、iter513 (P0 AI 自動実行モード scope A) で追加された本 button が
 * 漏れていたのを iter484 で補完)。
 *
 * 機能追加なし、shadcn 編集なし、視覚 layout は h-8 → min-h-11 のみで他 button と整合。
 *
 * 検証: source-side regex assert + 兄弟 button 整合性 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/item-plan-generate-button.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. Button に className="min-h-11" + size="sm" 配線
  if (/<Button\s+type="button"\s+size="sm"\s+className="min-h-11"\s+variant="outline"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: Button min-h-11 + size=sm OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Button min-h-11 + size=sm 不在` })
  }

  // 2. data-testid + aria-label / aria-busy 維持 (regression)
  if (
    /data-testid=\{`generate-plan-btn-\$\{item\.id\}`\}/.test(src) &&
    /aria-busy=\{generate\.isPending \|\| undefined\}/.test(src) &&
    /aria-label=\{[\s\S]{0,300}?Plan を生成中/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: data-testid + aria-busy + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: data-testid / aria-busy / aria-label 破壊`,
    })
  }

  // 3. canGeneratePlan gate 維持 (regression — function 全体不変)
  if (
    /const enabled = canGeneratePlan\(\{ status: item\.status, assignees \}\)/.test(src) &&
    /if \(!enabled\) return null/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: canGeneratePlan gate 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: canGeneratePlan gate 破壊` })
  }

  // 4. 兄弟 button 整合性 cross-check (item-decompose-button / item-research-button)
  const sibPaths = [
    'src/components/workspace/item-decompose-button.tsx',
    'src/components/workspace/item-research-button.tsx',
  ]
  for (const sp of sibPaths) {
    const sibSrc = readFileSync(resolve(process.cwd(), sp), 'utf8')
    if (
      /<Button[\s\S]{0,200}?size="sm"[\s\S]{0,200}?className="min-h-11"/.test(sibSrc) ||
      /<Button[\s\S]{0,200}?className="min-h-11"[\s\S]{0,200}?size="sm"/.test(sibSrc)
    ) {
      findings.push({ level: 'info', message: `${sp}: sibling min-h-11 維持 OK` })
    } else {
      findings.push({ level: 'warning', message: `${sp}: sibling min-h-11 破壊` })
    }
  }

  // 5. BotIcon + visible label 維持
  if (/<BotIcon className="size-4" aria-hidden="true" \/>/.test(src) && /Plan を生成/.test(src)) {
    findings.push({ level: 'info', message: `${path}: visible label + icon 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: visible label / icon 破壊` })
  }

  console.log(`\n=== Findings (plan-generate-min-h-iter484) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
