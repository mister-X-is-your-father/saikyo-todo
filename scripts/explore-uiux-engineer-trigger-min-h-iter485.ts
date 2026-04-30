/**
 * Phase 6.15 loop iter 485 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * EngineerTriggerButton (Engineer に実装させる) に `min-h-11` 追加、codify。
 *
 * 課題: src/components/workspace/engineer-trigger-button.tsx 行 70 の Button が
 *   `size="sm"` (h-8 = 32px) で `className="min-h-11"` 漏れ。WCAG 2.5.5 AAA (44x44 click target)
 *   違反、隣接する PR 自動起票 checkbox との誤タップが起きやすい。
 *
 * 兄弟 AI action button との不整合 (iter484 の続編、iter513-vintage AI button group cleanup):
 *   - item-decompose-button.tsx 行 49: `className="min-h-11"` ✓
 *   - item-research-button.tsx 行 40: `className="min-h-11"` ✓
 *   - item-plan-generate-button.tsx 行 47: iter484 で `className="min-h-11"` 追加済 ✓
 *   - engineer-trigger-button.tsx 行 70-94: 漏れ ✗
 *
 * 本 button は Phase 6.12 (Engineer Agent 起動) で導入された AI 系 button だが、
 * iter462-479 mobile sweep が ItemEditDialog 内 button を中心に sweep していたため
 * (本 button は標準 ItemEditDialog 外配置の場合あり) sweep を漏れた可能性が高い。
 *
 * fix (1 ファイル 1 行追加):
 *   - `<Button type="button" size="sm" variant="secondary" ...>` に
 *     `className="min-h-11"` を size と variant の間に挿入
 *
 * 機能追加なし、shadcn 編集なし、視覚 layout は h-8 → min-h-11 のみ。
 *
 * 検証: source-side regex assert + 兄弟 AI action button (4 件) 整合性 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/engineer-trigger-button.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. Button に className="min-h-11" + size="sm" 配線
  if (
    /<Button\s+type="button"\s+size="sm"\s+className="min-h-11"\s+variant="secondary"/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: Button min-h-11 + size=sm OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Button min-h-11 + size=sm 不在` })
  }

  // 2. data-testid + aria-label / aria-busy 維持 (regression)
  if (
    /data-testid="engineer-trigger-btn"/.test(src) &&
    /aria-busy=\{trigger\.isPending \|\| undefined\}/.test(src) &&
    /aria-label=\{[\s\S]{0,300}?Engineer Agent に「\$\{item\.title\}」/.test(src)
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

  // 3. confirm + autoPr opt-in 維持 (危険操作 gate、regression)
  if (/window\.confirm\(/.test(src) && /autoPr.*\?\s*'PR \(Draft\) も自動起票します'/.test(src)) {
    findings.push({ level: 'info', message: `${path}: confirm + autoPr opt-in gate 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: confirm + autoPr opt-in gate 破壊` })
  }

  // 4. 兄弟 AI action button 整合性 cross-check (decompose / research / plan-generate / engineer = 4 件)
  const sibPaths = [
    'src/components/workspace/item-decompose-button.tsx',
    'src/components/workspace/item-research-button.tsx',
    'src/components/workspace/item-plan-generate-button.tsx',
  ]
  for (const sp of sibPaths) {
    const sibSrc = readFileSync(resolve(process.cwd(), sp), 'utf8')
    if (
      /<Button[\s\S]{0,200}?size="sm"[\s\S]{0,200}?className="min-h-11"/.test(sibSrc) ||
      /<Button[\s\S]{0,200}?className="min-h-11"[\s\S]{0,200}?size="sm"/.test(sibSrc)
    ) {
      findings.push({ level: 'info', message: `${sp}: sibling AI button min-h-11 維持 OK` })
    } else {
      findings.push({ level: 'warning', message: `${sp}: sibling AI button min-h-11 破壊` })
    }
  }

  // 5. visible label + 🛠 icon 維持
  if (/aria-hidden="true">🛠/.test(src) && /Engineer に実装させる/.test(src)) {
    findings.push({ level: 'info', message: `${path}: visible label + icon 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: visible label / icon 破壊` })
  }

  console.log(`\n=== Findings (engineer-trigger-min-h-iter485) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
