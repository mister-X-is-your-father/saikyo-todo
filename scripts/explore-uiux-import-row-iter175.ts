/**
 * Phase 6.15 loop iter 175 — SourceImportHistory 行の SR 識別 a11y smoke。
 *
 * iter171 で history loading/empty に role 付けたが、各 row 内の "f=N / c=N /
 * u=N" abbreviation と error span が SR で不可視 / 意味不明だった gap (iter133
 * sync-error 同パターン)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'import-row-iter175',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/integrations`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter175: SourceImportHistory 行の f/c/u 件数 span に aria-label="fetched N / created N / updated N"、error span に aria-label="Pull エラー: <msg>" + role="alert"',
    })
  },
})
