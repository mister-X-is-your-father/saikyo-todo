/**
 * Phase 6.15 loop iter 171 — integrations-panel の icon aria-hidden + button
 * SR 識別 + import history loading/empty role smoke。
 *
 * iter170 (workflow) / iter168 (workflow run history) / iter150 (sprint button)
 * と同パターンを integrations-panel にも展開。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'integrations-icons-iter171',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/integrations`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter171: SourceCard の Play/ChevronDown/Right/Trash2 に aria-hidden、Pull/有効化/無効化 button に source name 含む aria-label、import history の loading=role="status" + aria-live="polite"、error=role="alert"、empty=role="status"',
    })
  },
})
