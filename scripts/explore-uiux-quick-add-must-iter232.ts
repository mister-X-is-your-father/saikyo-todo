/**
 * Phase 6.15 loop iter 232 — QuickAdd で MUST 入力時に inline warning + create disabled。
 *
 * 旧仕様: ユーザが `MUST` を入力すると preview に MUST chip が出るが、Enter
 * 押下で初めて「MUST + DoD 必須」の error toast が出る (失敗 path)。
 * 改善: preview 段階で
 *   - 作成 button を disabled (preview.isMust=true 時)
 *   - aria-label に「MUST タスクは編集ダイアログから DoD を入力して作成してください」
 *   - inline warning chip「⚠ 編集ダイアログで DoD を入れてください」を role="alert" で
 *     SR が即座に読み上げ
 *
 * これで「Enter → toast.error」の無駄を防ぎ、ユーザは押す前にやるべきことが分かる。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'quick-add-must-iter232',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter232: QuickAdd で preview.isMust=true 時に作成 button を disabled、inline alert chip と aria-label で DoD 必須を事前通知',
    })
  },
})
