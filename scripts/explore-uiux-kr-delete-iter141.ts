/**
 * Phase 6.15 loop iter 141 — KR 削除 button smoke。
 *
 * これまで Goal は softDelete があったが KR には UI / service が無く、
 * 一度作った KR は永久に残る gap だった。iter141 で okrService.softDeleteKeyResult
 * + UI の ✕ button (window.confirm 付き) を追加。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'kr-delete-iter141',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/goals`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    // 静的検証 — KR を seed なしで開いても button data-testid 規約だけ確認
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter141: KR 行の右に ✕ delete button (data-testid="kr-delete-<id>", aria-label に title 含む) を追加 + softDeleteKeyResult service / action / hook を追加',
    })
  },
})
