/**
 * Phase 6.15 loop iter 121 — Workflow webhook 受信 endpoint の動作検証。
 * curl 相当を fetch で直接打つ (UI なし → runner の login part をスキップ)。
 */
import { runExplore } from './lib/explore-uiux-runner'

const SECRET = `iter122-secret-${Math.random().toString(36).slice(2, 12)}`

await runExplore({
  name: 'iter122-webhook',
  // body は webhook を fetch で叩くだけ、page は使わない
  seed: async (admin, { workspaceId, userId }) => {
    // workflow を直接 admin で seed (webhook trigger + noop node)
    await admin.from('workflows').insert({
      workspace_id: workspaceId,
      name: 'iter122 webhook wf',
      graph: { nodes: [{ id: 'n1', type: 'noop', config: {} }], edges: [] },
      trigger: { kind: 'webhook', secret: SECRET },
      enabled: true,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ findings }) => {
    const url = `http://localhost:3001/api/workflows/webhook/${SECRET}`

    // 1. 不正 secret は 404
    const bad = await fetch(`http://localhost:3001/api/workflows/webhook/no-such-secret-xx`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'world' }),
    })
    console.log(`[iter122] bad secret status: ${bad.status}`)
    if (bad.status !== 404) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `不正 secret は 404 期待、実際 ${bad.status}`,
      })
    }

    // 2. 正しい secret + JSON body → 200 + runId
    const ok = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'webhook test' }),
    })
    const okBody = (await ok.json()) as {
      runId?: string
      status?: string
      output?: unknown
      error?: string
    }
    console.log(`[iter122] ok status: ${ok.status} body: ${JSON.stringify(okBody).slice(0, 150)}`)
    if (ok.status !== 200) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `webhook 200 期待、実際 ${ok.status}: ${JSON.stringify(okBody)}`,
      })
    }
    if (okBody.status !== 'succeeded' || !okBody.runId) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `runId / succeeded 期待、実際 ${JSON.stringify(okBody)}`,
      })
    }

    // 3. GET は 405
    const getRes = await fetch(url, { method: 'GET' })
    console.log(`[iter122] GET status: ${getRes.status}`)
    if (getRes.status !== 405) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `GET は 405 期待、実際 ${getRes.status}`,
      })
    }
  },
  exitOnFindings: false,
})
