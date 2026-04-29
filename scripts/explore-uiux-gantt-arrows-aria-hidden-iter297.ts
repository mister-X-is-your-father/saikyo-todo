/**
 * Phase 6.15 loop iter 297 — gantt-dependency-arrows.tsx の SVG が
 * `aria-hidden` 指定無しで accessibility tree に露出している問題。
 *
 * 現状: GanttDependencyArrows は Gantt timeline 上の依存関係 (prerequisite /
 * related) を矢印 path で **視覚的に** 描画する SVG。依存情報は同 page の
 * item-dependencies-panel.tsx 等で textual に accessible なので、矢印自体は
 * sighted user 向けの decorative element。
 *
 * SVG が aria-hidden 無しだと SR が svg 内 path / marker を walk する場合が
 * あり、空コンテンツの shape ノイズが a11y tree に流入する。decorative SVG
 * は ARIA Authoring Practices に従って `aria-hidden="true"` で除外推奨。
 *
 * codebase 内 item-checkbox.tsx の checkmark SVG は既に aria-hidden="true"
 * 設定済 → gantt-dependency-arrows のみ非対称だった。
 *
 * 期待 (fix 後):
 *   `<svg aria-hidden="true" ...>` で SR 露出を遮断、依存情報は別 panel の
 *   textual access path から取得する設計に統一。
 *
 * Supabase 必須画面 (Gantt は workspace 内) のため runtime 検証は環境依存。
 * source 側 regex assert で fix を verify。
 *
 *   pnpm tsx scripts/explore-uiux-gantt-arrows-aria-hidden-iter297.ts
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
    resolve(process.cwd(), 'src/components/workspace/gantt-dependency-arrows.tsx'),
    'utf8',
  )

  // 1. <svg ... aria-hidden="true"> を含む
  if (!/<svg[\s\S]*?aria-hidden="true"[\s\S]*?>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `gantt-dependency-arrows.tsx: <svg> に aria-hidden="true" が無い (decorative SVG が a11y tree に露出)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `gantt-dependency-arrows.tsx: <svg aria-hidden="true"> 確認 OK`,
    })
  }

  // 2. (回帰防止) item-checkbox.tsx の SVG aria-hidden は維持
  const checkbox = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-checkbox.tsx'),
    'utf8',
  )
  if (!/<svg[\s\S]*?aria-hidden="true"/.test(checkbox)) {
    findings.push({
      level: 'warning',
      message: `item-checkbox.tsx: <svg aria-hidden="true"> が消えている (既存 invariant 違反)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `item-checkbox.tsx の <svg aria-hidden> 維持 OK`,
    })
  }

  console.log(`\n=== Findings (gantt-arrows-aria-hidden-iter297) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
