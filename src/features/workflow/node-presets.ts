/**
 * Workflow graph editor の node プリセット (iter260 で workflows-panel.tsx 847 行
 * から抽出 / pure module 化)。
 *
 * 各 type の skeleton config (registry.ts の executor が読む典型値) を持っており、
 * `appendNodePreset(graphText, preset)` で graph.nodes に追記する。id は既存と
 * 被らない n1 / n2 / ... に自動採番。
 *
 * UI コンポーネントから完全に切り離されているので vitest で単体検証可能 — server-only
 * import の連鎖 (hooks → actions → service) を踏まなくなった。
 */

export interface NodePreset {
  type: 'noop' | 'http' | 'ai' | 'slack' | 'email' | 'script'
  title: string
  config: Record<string, unknown>
}

export const NODE_PRESETS: NodePreset[] = [
  { type: 'noop', title: 'noop (passthrough — debug 用)', config: {} },
  {
    type: 'http',
    title: 'http (任意 URL に fetch)',
    config: { url: 'https://example.com', method: 'GET' },
  },
  {
    type: 'ai',
    title: 'ai (Researcher Agent カスタムプロンプト)',
    config: { prompt: 'タスクをこなしてください' },
  },
  {
    type: 'slack',
    title: 'slack (workspace webhook へ通知)',
    config: { text: 'Workflow 完了しました' },
  },
  {
    type: 'email',
    title: 'email (mock_email_outbox に投入、本番は dispatcher で実送信)',
    config: { to: 'team@example.com', subject: '通知', body: 'Workflow 完了' },
  },
  {
    type: 'script',
    title: 'script (scripts/ 配下の .ts を tsx で実行)',
    config: { name: 'verify-acceptance.ts', args: [] },
  },
]

/**
 * graphText (JSON) に preset の skeleton node を append する。
 * 既存の id とぶつからないよう n1 / n2 / ... の連番から空きを探す。
 * parse 失敗 / unknown shape のときは現状のテキストをそのまま返す (UI 側で error 表示)。
 */
export function appendNodePreset(graphText: string, preset: NodePreset): string {
  let parsed: { nodes?: unknown[]; edges?: unknown[] } | null = null
  try {
    parsed = JSON.parse(graphText) as { nodes?: unknown[]; edges?: unknown[] }
  } catch {
    return graphText
  }
  if (!parsed || typeof parsed !== 'object') return graphText
  const nodes = Array.isArray(parsed.nodes) ? [...parsed.nodes] : []
  const edges = Array.isArray(parsed.edges) ? [...parsed.edges] : []
  const existingIds = new Set(
    nodes
      .filter(
        (n): n is { id: string } => Boolean(n) && typeof (n as { id: unknown }).id === 'string',
      )
      .map((n) => n.id),
  )
  let n = 1
  while (existingIds.has(`n${n}`)) n += 1
  const newNode = {
    id: `n${n}`,
    type: preset.type,
    label: `${preset.type} ${n}`,
    config: preset.config,
  }
  return JSON.stringify({ ...parsed, nodes: [...nodes, newNode], edges }, null, 2)
}
