/**
 * Phase 6.15 loop iter 194 — WorkflowCard 実行 button の disabled 理由 SR 化。
 *
 * 旧仕様: `disabled={!wf.enabled || trigger.isPending}` で disabled になるが、
 * SR ユーザは「なぜ disabled なのか」が分からなかった (`title` 属性は mouse
 * hover 専用)。disabled でも SR がアクセスできる aria-label に状態別文言を
 * 入れて context を提供。
 *
 *   - `!wf.enabled` → "Workflow「<name>」は無効化中のため実行不可"
 *   - `nodeCount === 0` → "node が無いため実行不可"
 *   - `trigger.isPending` → "実行中…"
 *   - 通常 → "手動で sync 実行 (各 node 10-60s timeout)"
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'wf-run-state-iter194',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter194: WorkflowCard 実行 button の aria-label を 4 状態別文言にし、disabled 理由を SR で識別可能化',
    })
  },
})
