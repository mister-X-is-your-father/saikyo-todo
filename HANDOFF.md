# HANDOFF.md — 次セッション開始用ガイド

> 最終更新: 2026-04-24 (**MVP クローズ**)
>
> - MVP の実装 + 受け入れ検証は完了。POST_MVP.md の先頭「稼働入力」が次の山。
> - §3 〜 §5 は実装時に踏んだ落とし穴の備忘録として残す。POST_MVP 作業時も参照価値あり。

## 0. MVP クローズ宣言

- 受け入れ基準 **8/8 自動 PASS** (Template seed / Heartbeat 冪等 / AI 分解 / AI 調査 /
  PM Stand-up / invocations cost / monthly 集計 / 越境 RLS)
- 自動テスト: Vitest **227**, E2E **3**, 受け入れ検証 **8/8**
- AI 検証は Anthropic API Key なし (**Claude Code Max プラン OAuth + MCP 経由**) で通る:
  ```bash
  NODE_OPTIONS="--conditions=react-server" \
    pnpm tsx --env-file=.env.local scripts/verify-acceptance.ts
  ```
  本番は `ANTHROPIC_API_KEY` を `.env.local` に入れて Next 側で叩く想定 (検証スクリプトとは別経路)。

## 1. 最初に読む順番 (5 分で把握)

1. **本書** (HANDOFF.md) — MVP クローズの宣言 + 落とし穴メモ
2. `CLAUDE.md` — AI 向け規約 (短縮版, 必読)
3. `POST_MVP.md` — 次に着手する機能 (先頭の「稼働入力」最優先)
4. `git log --oneline | head -10` — 直近の commit 履歴
5. 詳細が必要になったら: `ARCHITECTURE.md` (規約) / `REQUIREMENTS.md` (受け入れ基準)

## 2. 現在地

**MVP クローズ済 (2026-04-24)**。詳細な開発ログは `git log` を参照。

完成したスコープ (主要ブロックのみ):

- **認証 + RLS**: Supabase Auth + workspace_members / ws-scoped policies。
  soft-delete + RLS の既知の罠は §4.1 参照
- **Item**: ltree 階層 + 楽観ロック + fractional-indexing position + MUST/DoD 不変条件
- **Doc / Comment**: Item と同じ CRUD パターン。embedding は worker 経由で非同期
- **View plugin**: Kanban (dnd-kit) / Backlog (react-table) / Gantt (自作 div) / Dashboard (Recharts)
- **Template**: 手動 / recurring (pg-boss cron + cron_run_id 冪等) / Mustache 変数展開 / 即実行 UI
- **AI Agent**: Researcher (Sonnet, whitelist 8 tools) / PM (Haiku, whitelist 6 tools) +
  `executeToolLoop` 自前実装 + agent_memories 永続化 + agent_invocations cost 集計
- **RAG**: multilingual-e5-small 384 次元 + pgvector HNSW + pg_trgm 全文 + RRF Hybrid
- **自動化**: pg-boss worker 6 queues / daily Stand-up / MUST Heartbeat 3 段エスカレ
- **受け入れ検証**: `scripts/verify-acceptance.ts` 8 項目並列 (§6 参照)
- **配信**: Docker Compose (web / worker / caddy / db-backup pg_dump 日次)

数値:

- Vitest **227** PASS / Playwright E2E **3** PASS / 受け入れ検証 **8/8** PASS
- Drizzle schema **26** テーブル / RLS policy 全テーブル
- Plugin Registry: action 3 / view 4 / pg-boss queues 6

## 3. 動作確認コマンド (信頼できる checkpoint)

```bash
# 開発環境立ち上げ
pnpm install                                    # 依存解決 (実は不要、既に入ってる)
docker ps | grep supabase                       # Supabase containers が動いてるか
pnpm exec supabase status                       # 詳細状態 (DB URL / API URL / keys)
# もし supabase が止まってたら: pnpm db:start

# DB マイグレーション再適用 (schema 変更後)
pnpm db:reset                                   # 全マイグレーションを reset から再適用

# 検証 (commit 前は必ずこれを通す)
pnpm typecheck && pnpm lint && pnpm test

# E2E (Playwright、auto dev server 起動 + auto Supabase)
pnpm test:e2e

# End-to-End 動作確認 PoC (実 Auth + RLS + RPC を通す)
pnpm tsx --env-file=.env.local scripts/poc-auth-workspace.ts   # Workspace 系
pnpm tsx --env-file=.env.local scripts/poc-item.ts             # Item CRUD 系
pnpm tsx --env-file=.env.local scripts/poc-doc-comment.ts      # Doc + Comment 系 (RLS 込み)
NODE_OPTIONS="--conditions=react-server" \
  pnpm tsx --env-file=.env.local scripts/poc-ltree.ts          # LTREE 系
# 全て "All ... checks PASSED. 🎉" で終わるべし

# UI smoke (Day 7 で動作確認済)
pnpm dev                                        # http://localhost:3001
# /login /signup → 200, / (logged out) → 307 → /login
# workspace に入ると Cmd+K でコマンドパレット、Item 作成 / status ローテ / 削除が動く
```

## 4. 非自明な落とし穴 (踏んだ後の規約)

### 4.1 RLS SELECT policy に `deleted_at IS NULL` を入れない (MUST)

- Postgres は UPDATE 時に **新行が SELECT.using を満たすか** を暗黙チェックする
- soft delete (`UPDATE ... SET deleted_at = NOW()`) で新行が SELECT を満たさず、
  `new row violates row-level security policy` で必ず失敗
- **対策**: SELECT policy は `is_workspace_member` のみ。フィルタは Repository クエリの
  `WHERE deleted_at IS NULL` で強制 (二重防御は維持)
- 既存 migration: `20260424120000_rls_remove_deleted_at_from_select.sql`

### 4.2 Drizzle Kit 生成時の auth schema 削除

- `_shared.ts` の `pgSchema('auth') / authUsers` 宣言で、`pnpm db:generate` の出力に
  `CREATE SCHEMA "auth"` と `CREATE TABLE "auth"."users"` が毎回含まれる
- **生成直後に手で削除** (Supabase 管理テーブルなので不要)。`pnpm db:reset` でエラーが出たら原因はこれ

### 4.3 dotenv の env 読み込み

- `pnpm tsx scripts/X.ts` だけでは `.env.local` が読まれない
- **`pnpm tsx --env-file=.env.local scripts/X.ts`** を使う
- (`scripts/poc-auth-workspace.ts` のヘッダコメントにも記載済)

### 4.4 ポート 3000 占有

- 別の docker container が port 3000 を使っているので、`pnpm dev` は **port 3001**
- `playwright.config.ts` も 3001 で設定済

### 4.5 マイグレーションの順序

- 手書き SQL は `0XXX_*.sql` 命名 → Drizzle 生成 (`2026XXXX_*.sql`) より前に実行
- ただし RLS 等のテーブル前提なら、Drizzle 生成より **後** にする必要 → タイムスタンプを大きくする
- 例: `20260424000000_rls_policies.sql` (Drizzle の `20260423XXXXXX` より後)

### 4.6 PG15 LTREE `subpath(x, nlevel(x))` guard (Day 6 で踏んだ)

- `subpath(parent_path, nlevel(oldFull))` は offset == nlevel で **empty ltree を返すべき**
  だが PG15 の実装は "invalid positions" エラーを投げる (ltree_op.c:inner_subltree)
- `moveSubtree` の一括 UPDATE で CASE を **3 分岐** にして回避:
  target 自身 / 直接の子 (parent_path = oldFull) / 孫以降 (subpath 使う)
- 参考: `src/lib/db/ltree.ts` の `moveSubtree` 内のコメント

### 4.7 `server-only` と tsx スクリプト (Day 6 で踏んだ)

- Service / Repository / ltree.ts 等の server-only ファイルを tsx から load すると
  `server-only` package が throw する (Next 外では react-server condition が立たないため)
- **対処**: `NODE_OPTIONS="--conditions=react-server" pnpm tsx ...` を使う
- Pure 計算は別ファイル (例: `ltree-path.ts`) に分離してテスト可能に

### 4.8 shadcn add command の副作用 (Day 7 で踏んだ)

- `pnpm dlx shadcn@latest add command` は `button.tsx` / `input.tsx` を **再生成** する
  (quote スタイル差分のみ、機能同一) + `dialog` / `input-group` / `textarea` も自動追加
- 競合したら `--overwrite` フラグを付けて OK (機能変化なし)。prettier が後で整形

### 4.9 agent_invocations の UPDATE は adminDb 経由 (Day 15 P1)

- `agent_invocations` は **INSERT だけ** authenticated (ws member) policy が付いていて、
  **UPDATE policy は無い** (= worker/service_role のみ書ける設計)
- `agentService.runInvocation` は worker 相当なので `adminDb.transaction(...)` を使う
  (CLAUDE.md の「Repository は scoped Drizzle」例外扱い)
- 同じ理由で `ensureAgent` も adminDb (`agents` の INSERT policy は admin 限定だが、
  system 管理なので service_role で idempotent upsert)

### 4.10 Anthropic SDK mock 位置 (Day 15 P1)

- 単体 test は `vi.mock('@/lib/ai/invoke', () => ({ invokeModel: vi.fn() }))` で差し替え
- 実 API 呼び出し検証は `scripts/poc-agent.ts` に寄せる (`ANTHROPIC_API_KEY` 設定時のみ)
- `server-only` を含むモジュールを tsx から触るので
  `NODE_OPTIONS="--conditions=react-server" pnpm tsx --env-file=.env.local ...` が必要

### 4.11 pg-boss queue 名にコロン使用不可 (Day 15 P2)

- pg-boss v10+ は queue 名 (= object 名) を英数 / `_-./` だけに制限
- `agent:run` は ERR_ASSERTION で落ちるので `agent-run` にした
- 新キューを増やすときは `QUEUE_NAMES` (src/lib/jobs/queue.ts) に足すだけで
  `createQueue` が自動で呼ばれる (start 時に全 queue 作成)

### 4.12 pg-boss v12 の型 import (Day 15 P2)

- 名前付き export: `import { PgBoss } from 'pg-boss'` (default export なし)
- `stop()` の option に `wait` は無い (v10 の名残)。graceful + timeout(ms) を使う

### 4.13 multilingual-e5-small の prefix 規約 (Day 16)

- Document/passage は `"passage: "` 前置 (encodeTexts で自動付与済)
- Query は `"query: "` 前置 (encodeQuery で自動付与済)
- 省略すると similarity が大きく劣化する。独自 encode を書くときは注意

### 4.14 chunk overlap 制約 (Day 16)

- `chunkText` の `overlap` は `[0, maxChars)` 範囲でないと無限ループ防止のため throw
- デフォルト `maxChars=500 / overlap=50` なので短いテスト用に `maxChars=10` を渡すなら
  `overlap` も一緒に明示する (e.g. `{ maxChars: 10, overlap: 2 }`)

### 4.15 embedding model の初回ダウンロード (Day 16)

- `@huggingface/transformers` の pipeline() は初回 ~120MB を `~/.cache/huggingface/`
  にダウンロード。Docker 運用時は volume で永続化すべし
- 2 回目以降は数秒でロード。プロセス内は singleton 化済 (`extractorPromise`)
- Vitest では `vi.mock('@/lib/ai/embedding')` 相当を使うか、`embedDoc` の
  `encoder` DI で mock を渡す (embedding.test.ts のパターン)

### 4.16 pg_trgm 閾値の既定 (Day 17 P2)

- `pg_trgm.word_similarity_threshold` の既定は 0.6 で短いクエリに厳しすぎる
- fullTextHits は WHERE 内で `word_similarity(q, content) > 0.2` を直接指定。
  GIN index は `%>` / `<%` 演算子が既定閾値依存なので、フル活用はできない点は
  割り切り (MVP 規模では性能問題にならない)。
- ARCHITECTURE.md #U は pg_bigm 採用だったが、Supabase local には存在せず
  pg_trgm (既 install) で代替 (日本語 trigram 実用充分、HANDOFF 先頭参照)

## 5. 重要な抽象 (Service 層を書くときに使うもの)

```ts
// 認証
const user = await requireUser()                                    // AuthError throw
const { user, role } = await requireWorkspaceMember(wsId, 'member') // PermissionError throw

// DB アクセス (RLS 効かせる)
const result = await withUserDb(userId, async (tx) => {
  const item = await itemRepository.insert(tx, values)              // Repository は tx を受ける
  await recordAudit(tx, { workspaceId, actorType: 'user', actorId, ... })
  return ok(item)
})

// エラー
return err(new ValidationError('...'))     // 400 系
return err(new ConflictError())            // 楽観ロック衝突
return err(new NotFoundError('...'))
throw new AuthError()                      // ガード違反
```

## 6. 受け入れ検証 (自動化済)

MVP 受け入れ基準は `scripts/verify-acceptance.ts` 1 本で 8 項目を並列検証する:

```bash
NODE_OPTIONS="--conditions=react-server" \
  pnpm tsx --env-file=.env.local scripts/verify-acceptance.ts
```

カバー内容 (全項目 PASS を確認済):

- サンプル Template 自動投入 (ws 作成時)
- MUST Item + Heartbeat 冪等 (7d/3d/1d stage)
- AI 分解 (Researcher → 子 Item) — claude CLI + MCP 経由
- AI 調査 (Researcher → Doc 生成) — 同上
- PM Stand-up (Daily Doc) — 同上
- agent_invocations に cost/tokens/audit
- Dashboard 月次コスト集計
- 越境 RLS (別途 `src/test/rls-cross-workspace.test.ts` 6 ケース)

AI 系は Claude Code Max プラン経由 (OAuth) なので `ANTHROPIC_API_KEY` 無しでも検証完走。
本番 Next.js は `ANTHROPIC_API_KEY` で Anthropic SDK を直接叩く (別経路)。

### 失敗時の挙動 (本番相当)

- Agent が Anthropic エラーを返した場合、`agent_invocations.status=failed` +
  `error_message` 記録、UI は toast.error
- 期限超過 MUST は 1d stage で Heartbeat 通知

## 7. 次にやること

**POST_MVP.md 先頭の「稼働入力」が最優先**。他候補も同ファイルにリストあり。

本セッションで積み残した候補 (POST_MVP.md へ移す):

- Anthropic streaming + Supabase Realtime push UI
- TZ 別 cron + `cron-parser` (現状 UTC 09:00 固定)
- `workspace_announcements` テーブル (PM 出力ストリーム分離)
- `agent_prompts` テーブルから system prompt 動的読込
- Kanban カードにも Agent アクション
- E2E の AI パス (real Anthropic or MSW + invokeModel DI)

## 8. その他

- 自動メモリ (`~/.claude/projects/.../memory/MEMORY.md`) も自動でロードされる
- 実装プラン詳細: `~/.claude/plans/smooth-dancing-aurora.md`
- やらないリスト: `POST_MVP.md`
- ローカル `.env.local` は git ignored だが Supabase ローカル keys 入り

完。
