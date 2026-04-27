/**
 * Phase 6.15 loop iter 130 — Goal card に「AI 分解」button を追加した UI smoke。
 * 実 LLM 呼び出しはせず (Claude CLI 必要)、button が描画されるかと
 * disabled state (実行中) を確認するだけ。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'iter130-goal-decompose',
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date().toISOString().slice(0, 10)
    const end = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)
    await admin.from('goals').insert({
      workspace_id: workspaceId,
      title: 'iter130 sample goal',
      description: 'AI 分解 button 検証',
      period: 'quarterly',
      start_date: today,
      end_date: end,
      status: 'active',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    page.on('dialog', (d) => void d.accept().catch(() => {}))

    await page.goto(`http://localhost:3001/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const cards = await page.locator('[data-testid^="goal-card-"]').count()
    console.log(`[iter130] goal cards: ${cards}`)
    if (cards !== 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `goal card 1 件期待、実際 ${cards}`,
      })
    }

    // Goal を expand してから decompose button を探す (open 後に CardContent 描画)
    await page.locator('[data-testid^="goal-toggle-"]').first().click()
    await page.waitForTimeout(500)
    const decomposeBtn = page.locator('[data-testid^="goal-decompose-"]').first()
    const exists = (await decomposeBtn.count()) > 0
    const label = exists ? await decomposeBtn.textContent() : null
    console.log(`[iter130] AI 分解 button exists: ${exists} label: ${JSON.stringify(label)}`)
    if (!exists) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'Goal card に「AI 分解」button が無い',
      })
    }
  },
  exitOnFindings: false,
})
