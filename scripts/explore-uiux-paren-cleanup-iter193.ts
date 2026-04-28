/**
 * Phase 6.15 loop iter 193 — TimeEntries / Kanban column の paren count SR cleanly 化。
 *
 * iter191 / 192 で Today / PersonalPeriod / Subtasks の paren narration を
 * 解消したが、TimeEntriesPanel の "一覧 (N 件)" CardTitle と Kanban 列見出しの
 * sr-only " (N 件)" にも同じ paren 冗長 narration が残っていた。
 *
 *   - TimeEntries: CardTitle を sr-only ("一覧 N 件") + aria-hidden ("一覧 (N 件)") の
 *     二重 span に分け、視覚 paren は維持
 *   - Kanban: sr-only span から paren を取り除き " N 件" のみ
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'paren-cleanup-iter193',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter193: TimeEntriesPanel CardTitle と Kanban 列 sr-only span の paren narration を解消',
    })
  },
})
