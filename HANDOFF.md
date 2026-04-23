# HANDOFF.md — 次セッション開始用ガイド

> このファイルは context を `/clear` した後に **次の Claude (or 同一 Claude の続き)** が
> 即座にプロジェクト状態を把握するためのもの。役目を終えたら削除して構わない。
>
> 最終更新: 2026-04-24

## 1. 最初に読む順番 (5 分で把握)

1. **本書** (HANDOFF.md) — 現在地と次の一手
2. `CLAUDE.md` — AI 向け規約 (短縮版, 必読)
3. `git log --oneline | head -10` — 直近の commit 履歴
4. `REQUIREMENTS.md` (§7 スケジュール部分だけでも) — どこを作っているか
5. 詳細が必要になったら: `ARCHITECTURE.md` (規約) / `~/.claude/plans/smooth-dancing-aurora.md` (実装プラン)

## 2. 現在地

**進捗: 5 / 33 日 (Week 0 完了 + Week 1 Day 1-4 完了)**

完了:

- Week 0: Next.js 16 + Supabase local + Drizzle + shadcn + multilingual-e5 + Anthropic SDK PoC
- Week 1 Day 1: Drizzle schema 26 テーブル + 初回マイグレーション
- Week 1 Day 2: env / errors / result / Supabase clients (server/browser/middleware) /
  scoped Drizzle (`withUserDb`) / auth guard (`requireUser`, `requireWorkspaceMember`)
- Week 1 Day 3: RLS policies (38) + handle_new_user trigger + create_workspace RPC +
  shadcn primitives (input/label/card) + IMEInput / AsyncStates + Auth UI (login/signup) +
  Workspace 作成 UI + Root page + workspace-scoped page placeholder
- Week 1 Day 4: Item CRUD (Repository / Service / Action) + 楽観ロック + DoD バリデーション +
  audit_log helper + **RLS soft-delete バグ発見・修正・規約化**

次にやること:

- **Week 1 Day 5**: Doc / Comment feature (Item パターン踏襲、コピペベース)
- **Week 1 Day 6**: LTREE ヘルパ (move subtree FOR UPDATE / fractional reorder / descendants) — **要警戒**
- **Week 1 Day 7**: TanStack Query hooks + cmdk コマンドパレット雛形 + バッファ
- (以降 Week 2 以降は `REQUIREMENTS.md` §7 参照)

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

# End-to-End 動作確認 PoC (実 Auth + RLS + RPC を通す)
pnpm tsx --env-file=.env.local scripts/poc-auth-workspace.ts   # Workspace 系
pnpm tsx --env-file=.env.local scripts/poc-item.ts             # Item CRUD 系
# 全て "All ... checks PASSED. 🎉" で終わるべし

# UI smoke (Day 3 で動作確認済)
pnpm dev                                        # http://localhost:3001
# /login /signup → 200, / (logged out) → 307 → /login
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

## 6. 次セッションの Day 5 着手タスク (具体)

Item パターンを踏襲して以下を量産:

### Doc feature (`src/features/doc/`)

- `schema.ts`: CreateDocInput / UpdateDocInput / SoftDeleteDocInput (Item と同形)
- `repository.ts`: docRepository (insert / findById / list / updateWithLock / softDelete)
- `service.ts`: docService (create / update / softDelete / list / \_mutateWithGuard)
- `actions.ts`: createDocAction / updateDocAction / softDeleteDocAction

### Comment feature (`src/features/comment/`)

- Item 用 / Doc 用に分離 (テーブルも分離してある: `comments_on_items` / `comments_on_docs`)
- 一括して `commentService.{onItem, onDoc}.{create, update, delete, list}` でラップしてもよい

### PoC: `scripts/poc-doc-comment.ts`

- 同パターンで CRUD + soft delete + RLS 漏洩テスト

## 7. リスク & 警戒点 (Day 6 LTREE)

`lib/db/ltree.ts` で必要:

- `insertUnder(parentPath, name)` — `parent.path || '.' || name`
- **`moveSubtree(itemId, newParentPath)`** — 自分 + 全子孫 path を一括 UPDATE
  必須: トランザクション + `SELECT ... FOR UPDATE` で対象サブツリー全行ロック
  詰まり予測: 1-2 回書き直し見込み
- `reorderSiblings(itemIds[])` — fractional indexing で隣接位置を計算
- `findDescendants(itemId)` — `path <@ parent_path`

参考実装: PostgreSQL ltree docs, Drizzle の sql template での生 SQL 利用

## 8. その他

- 自動メモリ (`~/.claude/projects/.../memory/MEMORY.md`) も自動でロードされる
- 実装プラン詳細: `~/.claude/plans/smooth-dancing-aurora.md`
- やらないリスト: `POST_MVP.md`
- ローカル `.env.local` は git ignored だが Supabase ローカル keys 入り

完。
