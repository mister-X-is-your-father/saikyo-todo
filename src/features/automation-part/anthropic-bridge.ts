/**
 * queue: AP-5 substrate — automation-part registry → Anthropic SDK Tool 配列 builder。
 *
 * 既存の buildPartManifest() (registry.ts) は zod → JSON Schema を持つ汎用 manifest
 * を出すが、Anthropic Messages API の `tools` parameter は固有 shape を要求する:
 *
 *   { name: string  // ^[a-zA-Z0-9_-]{1,64}$ (dot 不可)
 *     description: string
 *     input_schema: { type: 'object', properties, required, ... } }
 *
 * 本 helper は manifest entry を Anthropic Tool に詰め替える + 双方向の name ↔ id
 * 変換を提供する (Claude の tool_use block name から partId を逆引きするため)。
 *
 * 設計メモ:
 *   - id 'item.create' は Anthropic name 'item_create' に変換 (dot 不可)
 *   - AP-3 / AP-4 で part 数が増えても本 helper は registry を loop するだけなので
 *     新 part 追加時に Anthropic Tool 配列が自動拡張する
 *   - filter は listParts と同じ shape (workflow / agent / MCP の scope key で絞込み可能)
 */
import { buildPartManifest, listParts } from './registry'
import type { PartCategory, PartSideEffect } from './types'

/**
 * Anthropic Messages API の Tool 定義 shape (subset)。
 * 本プロジェクトでは `@anthropic-ai/sdk` は claude CLI 経路化のため import せず、
 * 構造のみ自前で型表現 (= dep 増加なし、CLI / SDK 両 path で再利用可)。
 */
export interface AnthropicToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

/**
 * partId ('item.create') → Anthropic tool name ('item_create') に変換。
 * Claude API の name 制約 `^[a-zA-Z0-9_-]{1,64}$` (dot 不可) を満たす。
 */
export function partIdToToolName(partId: string): string {
  return partId.replaceAll('.', '_')
}

/**
 * Anthropic tool name ('item_create') → partId ('item.create') の逆引き候補生成。
 * 注意: 単純な _ → . 全置換ではなく、registry 上に該当 id があるかの確認まで責任は
 * 呼出元 (consumePartIdFromToolName など) で行う。
 */
export function toolNameToPartIdCandidate(toolName: string): string {
  return toolName.replaceAll('_', '.')
}

/**
 * iter1376: tool name から registry 上の **正しい** partId を解決する (round-trip 安全版)。
 *
 * `toolNameToPartIdCandidate` の単純 '_'→'.' 全置換は、partId 自体に '_' を含む id
 * (例 'item.list_today' / 'comment.create_on_item' / 'schedule.start_timer') を誤変換する
 * ('schedule.start_timer' → tool 'schedule_start_timer' → 候補 'schedule.start.timer' ✗)。
 * Claude / MCP の tool_use block name から part を逆引きする時、この候補をそのまま
 * `getPart` に渡すと underscore 入り part が常に miss する。
 *
 * 本 resolver は登録済 part を `partIdToToolName()` で前向き写像し、tool name と完全一致
 * する partId を返す (= '_' を含む id でも正しく解決)。未登録 / 不一致は undefined。
 * registry に依存するため、bootstrapAutomationParts() 後に呼ぶこと。
 */
export function resolvePartIdFromToolName(toolName: string): string | undefined {
  for (const part of listParts()) {
    if (partIdToToolName(part.id) === toolName) return part.id
  }
  return undefined
}

/**
 * registry 全 part (or filter 一致) を Anthropic Tool 配列に変換する。
 *
 * description は label + description を結合 (label は短い JP 概要、description は詳細)。
 * 同じ情報を Claude に 2 形で渡すため tool 選択精度が上がる想定。
 *
 *   tools: [
 *     { name: 'item_create', description: 'item を作成 — workspace に新規 item を ...',
 *       input_schema: { type: 'object', properties: {...}, required: [...] } },
 *     ...
 *   ]
 */
export function buildAnthropicToolDefinitions(filter?: {
  category?: PartCategory
  sideEffect?: PartSideEffect
}): AnthropicToolDefinition[] {
  return buildPartManifest(filter).map((m) => ({
    name: partIdToToolName(m.id),
    description: m.label === m.description ? m.label : `${m.label} — ${m.description}`,
    input_schema: m.inputJsonSchema as Record<string, unknown>,
  }))
}
