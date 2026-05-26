/**
 * playwright-iter1365 (mode-M 探索 sweep): iPhone SE 320px で主要 view / page を
 * 横断し documentElement.scrollWidth > viewport (= 横 overflow) を検出する探索 script。
 *
 * 横 overflow は mobile で最も体感の悪い破綻 (横スクロール発生 / chip 押し出し)。
 * 1 画面 1 関数の個別 audit を多数積んできたが、cross-page の網羅 sweep で
 * 取りこぼし箇所を洗い出す。findings が出た page を次 iter (or 同 iter) で個別 fix。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-overflow-sweep-iter1365.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'mobile-overflow-sweep-iter1365',
  device: 'iPhone SE',
  isMobile: true,
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    const overdue = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: 'とても長い日本語タイトルのMUSTタスクで横幅を圧迫するテスト項目です',
        status: 'todo',
        is_must: true,
        priority: 1,
        due_date: overdue,
        scheduled_for: t,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '進行中の項目',
        status: 'in_progress',
        priority: 2,
        scheduled_for: t,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    const targets: Array<{ label: string; url: string }> = [
      { label: 'home(kanban)', url: `/${workspaceId}` },
      { label: 'today', url: `/${workspaceId}?view=today` },
      { label: 'inbox', url: `/${workspaceId}?view=inbox` },
      { label: 'backlog', url: `/${workspaceId}?view=backlog` },
      { label: 'gantt', url: `/${workspaceId}?view=gantt` },
      { label: 'dashboard', url: `/${workspaceId}?view=dashboard` },
      { label: 'goals', url: `/${workspaceId}/goals` },
      { label: 'sprints', url: `/${workspaceId}/sprints` },
      { label: 'pdca', url: `/${workspaceId}/pdca` },
      { label: 'templates', url: `/${workspaceId}/templates` },
      { label: 'time-entries', url: `/${workspaceId}/time-entries` },
      { label: 'archive', url: `/${workspaceId}/archive` },
      { label: 'workflows', url: `/${workspaceId}/workflows` },
      { label: 'integrations', url: `/${workspaceId}/integrations` },
    ]
    for (const { label, url } of targets) {
      await page.goto(`http://localhost:3001${url}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      const { docW, viewW } = await page.evaluate(() => ({
        docW: document.documentElement.scrollWidth,
        viewW: window.innerWidth,
      }))
      const mark = docW > viewW + 1 ? 'OVERFLOW' : 'ok'
      console.log(`  [${label}] doc=${docW} view=${viewW} ${mark}`)
      if (docW > viewW + 1) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `${label}: scrollWidth=${docW}px > viewport ${viewW}px (横 overflow +${docW - viewW}px)`,
        })
      }
    }
  },
})
