/**
 * Phase 6.15 iter147: claude-flow-runner の本体は
 * `src/lib/agent/claude-flow-runner.ts` に移動した (Server Action から
 * import 可能にするため、`@/*` 解決パスに乗せる必要があった)。
 * 本ファイルは backward compat 用の re-export だけ残す。
 */
export {
  type ClaudeFlowInput,
  type ClaudeFlowOutput,
  runFlowViaClaude,
} from '@/lib/agent/claude-flow-runner'
