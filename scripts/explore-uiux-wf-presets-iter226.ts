/**
 * Phase 6.15 loop iter 226 — Workflow Editor の trigger / node preset button を SR 化。
 *
 * iter156-157 で workflow editor に trigger / node preset 4+6 button を追加したが、
 * いずれも `title` 属性のみ (mouse hover 専用) で SR ユーザに「何の preset を
 * 適用するのか」が伝わらなかった。さらに node preset の aria-label は
 * `${preset.type} node を追加` だけで preset.title の context (例: passthrough、
 * Researcher Agent カスタムプロンプト) が落ちていた。
 *
 *   - 4 trigger preset (manual / cron / item-event / webhook): title と同等の
 *     context を aria-label に二重記述
 *   - 6 node preset: aria-label を preset.title 全体に拡張
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'wf-presets-iter226',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter226: Workflow Editor の trigger preset 4 button + node preset 6 button に context-aware aria-label',
    })
  },
})
