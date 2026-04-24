# HANDOFF.md — 次セッション開始用ガイド

> このファイルは context を `/clear` した後に **次の Claude (or 同一 Claude の続き)** が
> 即座にプロジェクト状態を把握するためのもの。役目を終えたら削除して構わない。
>
> 最終更新: 2026-04-24 (Week 3 Day 15 P3 完了 — executeToolLoop 自前実装)

## 1. 最初に読む順番 (5 分で把握)

1. **本書** (HANDOFF.md) — 現在地と次の一手
2. `CLAUDE.md` — AI 向け規約 (短縮版, 必読)
3. `git log --oneline | head -10` — 直近の commit 履歴
4. `REQUIREMENTS.md` (§7 スケジュール部分だけでも) — どこを作っているか
5. 詳細が必要になったら: `ARCHITECTURE.md` (規約) / `~/.claude/plans/smooth-dancing-aurora.md` (実装プラン)

## 2. 現在地

**進捗: 15 / 33 日 (Week 3 Day 15 P1+P2+P3 完了、P4=streaming/Realtime は Day 19+ 統合)**

完了 (要点のみ、詳細は git log):

- Week 0: 基盤 (Next.js 16 + Supabase + Drizzle + shadcn + e5 + Anthropic SDK PoC)
- Week 1 Day 1-4: Drizzle schema 26 テーブル / auth guard / Item CRUD (楽観ロック + DoD + audit)
  **RLS soft-delete バグ発見・修正・規約化**
- Week 1 Day 5: Doc / Comment feature (Item パターン踏襲 + PoC RLS 漏洩検証)
- Week 1 Day 6 (ltree): findDescendants / moveSubtree (FOR UPDATE + 自己ループ検知) + PoC 10
  - `itemService.move` 統合 + 別 workspace 防御
- Week 1 Day 6b: `reorderSiblings` — position を **numeric → text** migration (a0, a1,...)
  - `fractional-indexing` 標準採用 + `itemService.reorder` + useReorderItem (楽観更新)
- Week 1 Day 7: QueryClientProvider + item hooks.ts (楽観更新複数) + CommandPalette (cmdk)
- Week 1 Day 7.5 **テスト駆動開発切替**:
  - src/test/fixtures.ts (実 Supabase + auth guard mock パターン)
  - itemService / docService / commentService / fractional-position の Vitest integration
  - **audit_log の RLS INSERT policy 欠落バグを検出・修正**
  - Playwright baseline E2E (login → workspace → Item 作成)
  - CLAUDE.md §6 を TDD 運用に更新
- Week 2 Day 8: Plugin Registry (types / registry / register\* / core 一括 bootstrap + Vitest)
- Week 2 Day 9: Kanban View (dnd-kit、DnD で status 切替 + reorder、楽観更新)
  - **TDD 初サイクル**: `workspaceService.listStatuses` 失敗テスト先 → 実装 → green
- Week 2 Day 10a: Backlog View (react-table + react-virtual) + nuqs URL フィルタ
  - view switcher (kanban / backlog / gantt)
- Week 2 Day 11: Gantt View (自作、棒のみ、date-fns) — gantt-task-react は
  React 18 peerDeps で不可、SVG 不要なら div + Tailwind で十分
- Week 2 Day 12: MUST Dashboard (4th ViewPlugin) + WIP 警告 + Recharts Burndown + DoD 最終化
  - `items.done_at` + BEFORE trigger (status type=done で自動セット/クリア)。burndown 単純化
  - `src/features/dashboard/` — getMustSummary / getBurndown (TDD: service.test.ts 8 tests)
  - Dashboard View: StatCard x4 / WIP 警告バナー / Recharts LineChart 14 日 / MUST 一覧
  - `itemService.updateStatus` に MUST+done 時の DoD 必須 belt-and-suspenders 追加
    (通常は create/update で invariant 保証、直接 DB 更新への二重防御)
- Week 2 Day 13: Template Drizzle feature (CRUD + 子 item CRUD) + 基本 UI
  - `src/features/template/` — templateService / templateItemService (TDD: 14 tests)
    - recurring kind は scheduleCron 必須 (create + update 両方で検証)
    - templateItemService は templateId → workspaceId を scoped tx で引き直して member gate
    - isMust=true は dod 必須 (Item 規約を踏襲)
  - `/w/[workspaceId]/templates` 新規ページ + workspace ヘッダに導線
  - templates-panel: 作成フォーム + カード inline expansion、削除は楽観ロック付き
  - template-items-editor: 子 item 追加 / 一覧 / 削除 (parent_path は Day 14 で階層対応)
- Week 2 Day 14: Template instantiate (展開) + "即実行" UI
  - `instantiate-plan.ts` — pure helper (Mustache 変数展開、depth 昇順で label map 構築、
    template 世界の parent_path を items 世界に翻訳、dueOffsetDays → ISO 日付)
  - `templateService.instantiate` — cron_run_id 事前 lookup → plan 生成 → items + inst 挿入
    - audit (action='instantiate')。1 Tx で部分成功させない
  - UI `InstantiateForm`: `{{var}}` を正規表現で抽出して動的フォーム、即実行で workspace に遷移
  - TDD: pure helper 6 tests + integration 5 tests
    - 2 階層 parent_path 繋がり検証 / MUST+dod+dueOffsetDays 反映 / cron_run_id 冪等衝突
- Week 3 Day 15 P3: Agent tool loop 自前実装 (`executeToolLoop`)
  - `src/lib/ai/tool-loop.ts` — Anthropic Messages API の tool_use ループ
    - invokeModel を DI で差し替え可能 → テストで mock
    - stop_reason='tool_use' を検出 → handler 並列実行 → tool_result 追記 → 再呼出
    - maxIterations (既定 10) で無限ループ防止
    - usage 累積 / toolCalls 履歴 / finalMessages 返却
  - Day 19+ の "AI 分解" / Researcher が使う土台 (runInvocation への統合はまだ)
  - TDD: 6 tests (no-tool / 1 tool call / 複数 tool 並列 / handler 欠落 / max iter / 遅延 handler)
- **Day 15 P4 以降に残り**: Anthropic streaming + Supabase Realtime broadcast の基盤。
  **UI 消費者が無い状態で書くと dead code になる**ため、Day 19+ で Researcher UI が必要に
  なったタイミングで統合する予定 (切り分けの合理性判断)
- Week 3 Day 15 P2: pg-boss + worker プロセス分離
  - `src/lib/jobs/queue.ts` — pg-boss 12 singleton ラッパ (`startBoss` / `stopBoss` /
    `enqueueJob` / `registerWorker`)。queue 名は v10+ で明示作成必須なので
    `QUEUE_NAMES` (現状 `agent-run` のみ) をまとめて `createQueue`
  - `src/workers/start.ts` — worker プロセスエントリ。`pnpm worker` で起動。
    SIGTERM / SIGINT で graceful shutdown
  - `src/features/agent/worker.ts` — `agent-run` handler。runInvocation を呼んで
    Result.err は throw しない (pg-boss retry で多重実行を招かないため)
  - `agentService.enqueue` が wasNew=true のとき `enqueueJob('agent-run', ...)` で送信
    (既存 row の再送は pickup 済の可能性あるため skip)
  - `pnpm worker` スクリプト (`NODE_OPTIONS=--conditions=react-server tsx`)
  - テスト: `vi.mock('@/lib/jobs/queue', ...)` で全テスト差し替え、
    enqueue 新規時のみ send され再送時はされないケースを追加
  - PoC `scripts/poc-worker.ts` (worker をこのプロセス内で起動して end-to-end 確認)
- Week 3 Day 15 P1: Anthropic SDK ラッパ + 同期版 agentService (TDD)
  - `src/lib/ai/{client,invoke,pricing}.ts` — Anthropic SDK singleton、
    非ストリーミング `invokeModel` ラッパ (normalized shape)、モデル別 cost 計算
  - `src/features/agent/{schema,repository,service,service.test}.ts`
    - `ensureAgent(wsId, role)` — adminDb で idempotent upsert (agents は system 管理)
    - `enqueue` — user 文脈で queued INSERT、idempotencyKey 冪等、audit (actor=user)
    - `runInvocation` — adminDb で queued→running→completed/failed 遷移、
      tokens/cost/output 記録、audit (actor=agent)。worker が将来 pickup する前提
    - `invokeSync` — enqueue + runInvocation 便利メソッド (PoC / 初期 Server Action 用)
  - TDD: pricing 6 tests + agent service 13 tests (ensureAgent / enqueue / runInvocation /
    invokeSync、Anthropic は `vi.mock('@/lib/ai/invoke')` で差し替え、RLS / audit 本物)
  - PoC `scripts/poc-agent.ts` — ANTHROPIC_API_KEY あれば実 API 叩く構成 (未設定時 skip)

現在の数:

- Vitest **121 tests** PASS / E2E **2 tests** PASS
- Plugin Registry: action 1, view 4 (core) / pg-boss queue: `agent-run`

次にやること (REQUIREMENTS §7 の順):

- **Week 3 Day 16**: 自前 embedding worker (multilingual-e5-small) + Doc chunk+embed pipeline + pg-boss ジョブ
- **Day 15 の残課題 (P4 相当、Day 19+ と抱き合わせ想定)**: Anthropic streaming + Realtime broadcast の基盤
  - streaming を消費する Researcher UI
- **Week 1 Day 10b (繰越)**: FTS 検索 (pg_bigm / tsvector) — 専用セッション推奨
- **Week 3 Day 16-21**: 自前 embedding worker / RAG / Researcher Agent / Template 連携

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

## 6. 次セッションの着手タスク (具体)

### 6.1 Day 6b ✅ 完了 (`999ba07`)

`items.position` を `numeric(30,15)` → `text` に migration、`fractional-indexing` 標準運用。

- `src/lib/db/fractional-position.ts` (positionBetween / positionsBetween / INITIAL_POSITION)
- `itemService.reorder` + `reorderItemAction` + `useReorderItem` (楽観更新付き)
- migration `20260424130000_position_to_text.sql`
- PoC `scripts/poc-reorder.ts` 6 checks PASS

### 6.2 Week 2 Day 8: Plugin Registry

`src/plugins/core/<kind>/` + `index.ts` 1 行追加で新ビュー / アクション / Agent を登録できる
構造 (ARCHITECTURE.md §拡張ポイント参照)。

### 6.3 Week 2 Day 9: Kanban View

@dnd-kit sortable + fractional reorder + 楽観 mutation (`useUpdateItemStatus` は既に楽観更新
を仕込んである。`useMoveItem` も用意済)。Day 6b 完了後。

## 8. その他

- 自動メモリ (`~/.claude/projects/.../memory/MEMORY.md`) も自動でロードされる
- 実装プラン詳細: `~/.claude/plans/smooth-dancing-aurora.md`
- やらないリスト: `POST_MVP.md`
- ローカル `.env.local` は git ignored だが Supabase ローカル keys 入り

完。
