/**
 * queue: AP-6 substrate — automation-part registry → MCP server tool 配列 builder。
 *
 * MCP (Model Context Protocol) tool definition shape:
 *   { name: string  // ^[a-zA-Z0-9_-]{1,64}$ (Anthropic と同制約)
 *     description?: string
 *     inputSchema: { type: 'object', properties, required, ... } }
 *
 * Anthropic Messages API tool shape との差分:
 *   - field 名が `input_schema` ではなく `inputSchema` (camelCase)
 *   - description が optional (空 string でも MCP 側は許容するが SDK の型は ?: なので
 *     空の場合は省略する形で出す方が誠実)
 *
 * その他の build 規約 (name 変換 / description 結合) は Anthropic bridge と統一して、
 * AP-5 / AP-6 の両 layer から同じ part が同じ振る舞いで露出する保証をする。
 *
 * 設計メモ:
 *   - `@modelcontextprotocol/sdk` の Tool 型を import せず McpToolDefinition interface
 *     を自前型表現 (= 本 helper を server-only でない module 経由で参照可能、
 *     type 引きずりを最小化)
 *   - filter は buildPartManifest と同 shape (sideEffect / category)、scope key
 *     絞込は AP-6 後続 (api_keys.scopes での権限判定) に委ねる
 *   - name 変換 / 逆引きは anthropic-bridge と共通 (= partId 'item.create' →
 *     'item_create')
 */
import { partIdToToolName } from './anthropic-bridge'
import { buildPartManifest } from './registry'
import type { PartCategory, PartSideEffect } from './types'

/**
 * MCP tool 定義 shape (subset)。`@modelcontextprotocol/sdk` の Tool 型と互換。
 * description は MCP では optional だが、part 側は必須なので本 helper では
 * 必ず string で出力 (空 string にはならない、definePart で min(1) 保証)。
 */
export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

/**
 * registry 全 part (or filter 一致) を MCP Tool 配列に変換する。
 *
 * Anthropic 版と同じく description は label === description なら単独、
 * 異なるなら "label — description" で結合。input_schema (Anthropic) → inputSchema
 * (MCP) の field 名置換のみが本 helper 固有の責任。
 */
export function buildMcpToolDefinitions(filter?: {
  category?: PartCategory
  sideEffect?: PartSideEffect
}): McpToolDefinition[] {
  return buildPartManifest(filter).map((m) => ({
    name: partIdToToolName(m.id),
    description: m.label === m.description ? m.label : `${m.label} — ${m.description}`,
    inputSchema: m.inputJsonSchema as Record<string, unknown>,
  }))
}
