/**
 * Phase 6.15 iter157: graph editor の node preset append 関数 unit test。
 * UI 側 (component) は project policy で書かないが、append ロジックは pure
 * function なので単体検証する。
 */
import { describe, expect, it } from 'vitest'

import { appendNodePreset } from './workflows-panel'

const HTTP_PRESET = {
  type: 'http' as const,
  title: 'http',
  config: { url: 'https://example.com', method: 'GET' },
}

describe('appendNodePreset', () => {
  it('空 graph に最初の node を追加 (id=n1)', () => {
    const text = JSON.stringify({ nodes: [], edges: [] })
    const out = JSON.parse(appendNodePreset(text, HTTP_PRESET)) as {
      nodes: Array<{ id: string; type: string }>
    }
    expect(out.nodes).toHaveLength(1)
    expect(out.nodes[0]!.id).toBe('n1')
    expect(out.nodes[0]!.type).toBe('http')
  })

  it('既存 n1 がある graph に追加 → n2', () => {
    const text = JSON.stringify({
      nodes: [{ id: 'n1', type: 'noop', config: {} }],
      edges: [],
    })
    const out = JSON.parse(appendNodePreset(text, HTTP_PRESET)) as {
      nodes: Array<{ id: string }>
    }
    expect(out.nodes.map((n) => n.id)).toEqual(['n1', 'n2'])
  })

  it('既存 n1 / n3 (n2 抜け) に追加 → n2 を先に埋める', () => {
    const text = JSON.stringify({
      nodes: [
        { id: 'n1', type: 'noop', config: {} },
        { id: 'n3', type: 'noop', config: {} },
      ],
      edges: [],
    })
    const out = JSON.parse(appendNodePreset(text, HTTP_PRESET)) as {
      nodes: Array<{ id: string }>
    }
    expect(out.nodes.map((n) => n.id)).toEqual(['n1', 'n3', 'n2'])
  })

  it('preset の config が node に反映される', () => {
    const text = JSON.stringify({ nodes: [], edges: [] })
    const out = JSON.parse(appendNodePreset(text, HTTP_PRESET)) as {
      nodes: Array<{ config: Record<string, unknown> }>
    }
    expect(out.nodes[0]!.config).toEqual({ url: 'https://example.com', method: 'GET' })
  })

  it('parse 失敗時は元テキストをそのまま返す', () => {
    const malformed = '{ nodes: [ ] }' // 未 quote / 不正 JSON
    const out = appendNodePreset(malformed, HTTP_PRESET)
    expect(out).toBe(malformed)
  })

  it('edges 配列が無い時も新規 edges:[] で形を整える', () => {
    const text = JSON.stringify({ nodes: [] })
    const out = JSON.parse(appendNodePreset(text, HTTP_PRESET)) as {
      edges: unknown[]
    }
    expect(Array.isArray(out.edges)).toBe(true)
  })
})
