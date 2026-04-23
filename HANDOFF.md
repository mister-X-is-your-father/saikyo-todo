# HANDOFF.md — 次セッション開始用ガイド

> このファイルは context を `/clear` した後に **次の Claude (or 同一 Claude の続き)** が
> 即座にプロジェクト状態を把握するためのもの。役目を終えたら削除して構わない。
>
> 最終更新: 2026-04-24 (Week 1 完了時点)

## 1. 最初に読む順番 (5 分で把握)

1. **本書** (HANDOFF.md) — 現在地と次の一手
2. `CLAUDE.md` — AI 向け規約 (短縮版, 必読)
3. `git log --oneline | head -10` — 直近の commit 履歴
4. `REQUIREMENTS.md` (§7 スケジュール部分だけでも) — どこを作っているか
5. 詳細が必要になったら: `ARCHITECTURE.md` (規約) / `~/.claude/plans/smooth-dancing-aurora.md` (実装プラン)

## 2. 現在地

**進捗: 8 / 33 日 (Week 0 完了 + Week 1 完了)**

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
- Week 1 Day 5: Doc / Comment feature (Item パターン踏襲) + PoC (RLS 漏洩 × Bob 侵入試行)
- Week 1 Day 6 (ltree 部分): `lib/db/ltree.ts` の `findDescendants` / `moveSubtree` /
  `lockSubtree` + pure helpers 分離 (`ltree-path.ts` + Vitest) + PoC 10 checks +
  `itemService.move` + `moveItemAction` に統合 + **別 workspace 防御**
- Week 1 Day 7: QueryClientProvider + `listItemsAction` + `features/item/hooks.ts`
  (useItems / useCreateItem / useUpdateItem / useUpdateItemStatus は楽観更新 / useMoveItem /
  useSoftDeleteItem) + `CommandPalette` (cmdk, Cmd+K) + `ItemsBoard` 最小 UI

次にやること:

- **Week 1 Day 6b (繰越)**: `reorderSiblings` — `position` カラムが `numeric(30,15)` で
  `fractional-indexing` lib (string 返却) と型ミスマッチ。中点計算 (numeric 任意精度)
  の自作 or decimal.js 併用、どちらかに決める必要。Kanban 実装前の Week 2 開始直後で OK。
- **Week 2 Day 8**: Plugin Registry + 拡張ポイント型 + Core 一括登録 bootstrap
- **Week 2 Day 9**: Kanban View (@dnd-kit + sortable + fractional + 楽観 mutation) —
  ここで Day 6b の reorderSiblings が必要になる
- **Week 2 Day 10**: Backlog View (@tanstack/react-table + react-virtual + nuqs) + 検索
- (以降 `REQUIREMENTS.md` §7 参照)

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

### 6.1 Day 6b (繰越): `reorderSiblings`

`position numeric(30,15)` と `fractional-indexing` lib (string 返却) の型ミスマッチが未解決。
**Kanban (Day 9) の前** に決める必要がある。選択肢:

1. **中点計算を自作** (numeric 任意精度、decimal.js も不要)
   `position = (prevPos + nextPos) / 2` を string で桁精度指定で実装。
   Race は service 層で `SELECT ... FOR UPDATE` + 隣接行ロック。
2. **decimal.js 導入** + fractional-indexing-jittered 型の lib 採用
3. **`position` カラムを text に変更** + `fractional-indexing` 標準運用
   (migration 1本 + 既存行は '0' → 'a0' のような初期値に揃える)

MVP 工数重視なら 1 が最短。判断は次セッションで。

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
