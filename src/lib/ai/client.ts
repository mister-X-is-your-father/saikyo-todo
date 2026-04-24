/**
 * Anthropic SDK クライアントのシングルトン。
 * Service 層からは `invokeModel` (invoke.ts) を使うこと。
 * ここを直接触るのはストリーミング対応 (Day 15 P3) のときのみ。
 */
import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (client) return client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  client = new Anthropic({ apiKey })
  return client
}

export function __resetAnthropicClientForTests(): void {
  client = null
}
