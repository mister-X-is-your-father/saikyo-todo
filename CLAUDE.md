# CLAUDE.md — AI 開発者向け短縮ガイド

> AI Agent (Claude / Researcher / 開発支援) が**新機能を足すとき** に最初に読むファイル。
> 詳細は `ARCHITECTURE.md` を参照。

## 読む順番

1. **本書 (CLAUDE.md)** — まずここ
2. 該当ドメインの `src/features/<name>/` 既存コード — パターン確認
3. 不足あれば `ARCHITECTURE.md` の該当章 — 規約詳細
4. 仕様の確認は `REQUIREMENTS.md`
5. やらない機能リストは `POST_MVP.md`

## プロジェクト要約

- **何**: チーム共有 Web TODO + 自律 AI 部署メンバー (PM Agent + Researcher Agent)
- **誰**: 社内チーム利用・社外非公開 (Docker Compose 自前ホスト)
- **目玉**: Kanban / Gantt / Backlog 切替 + Template (即実行ワークパッケージ) + MUST 絶対落とさない設計
- **スタック**: Next.js 15+ + Supabase + Drizzle + pg-boss + Anthropic SDK + multilingual-e5 (自前 embedding)

## 新機能を足すとき

### 1. ディレクトリ

- `src/features/<name>/` を作って以下を順に書く:
  ```
  schema.ts        # zod 一次定義 (drizzle-zod から派生)
  types.ts         # zod 派生 TS 型
  repository.ts    # DB アクセス (scoped Drizzle 使用)
  service.ts       # ビジネスロジック・権限・audit_log・Tx
  actions.ts       # Server Actions (Result<T> 返す)
  hooks.ts         # TanStack Query
  __tests__/       # service の主要 happy path
  ```
- UI は `src/components/<name>/`
- 新ビュー / フィールド / アクション / Agent は `src/plugins/core/<kind>/` + `index.ts` 1 行追加

### 2. 必ず守ること

- **Server Action は `Result<T>` を返す** (try/catch 投げない)
- **エラーは `AppError` 派生のみ** (`lib/errors.ts`)
- **Service 層で権限チェック** (`requireWorkspaceMember`)
- **Service 層で `recordAudit(...)`** を mutation のたびに書く
- **Mutation は `db.transaction(...)`** 内で実行
- **楽観ロック**: `WHERE id = ? AND version = ?` で 0 行更新なら `ConflictError`
- **Soft delete**: 物理削除しない。`deleted_at` を入れる。クエリは `WHERE deleted_at IS NULL`
  (重要: **RLS SELECT policy に `deleted_at IS NULL` を入れてはならない** — Postgres は UPDATE 時に
  新行が SELECT.using を満たすか暗黙チェックするため、soft delete UPDATE が "new row violates RLS"
  で必ず弾かれる。フィルタは Repository クエリ側で `WHERE deleted_at IS NULL` を強制する)
- **Repository は scoped Drizzle (`getDb(req)`) を使う** (RLS 効くように)
- **workspace_id を全 query に**

### 3. AI Agent / Tool を増やすとき

- Tool は `src/features/agent/tools/` に分類 (read / write / template)
- 新 Agent role は `src/plugins/core/agents/` + AgentRole interface 実装
- **`delete_*` ツールは MVP で全 role に渡さない**
- ツール内で必ず workspace_id を Repository に渡す

### 4. UI コンポーネント

- 既製ライブラリを優先 (Gantt / Kanban DnD / Markdown / 表 / フォーム / 日付 等)
- shadcn/ui の生成物 (`src/components/ui/`) は **編集禁止**
- 状態:
  - サーバ状態 → TanStack Query
  - グローバル UI → Zustand
  - フォーム → react-hook-form + zodResolver
  - URL → nuqs
- `<input>` を直接使わず `IMEInput` (日本語 Enter submit 対策)
- Loading / Empty / Error は `AsyncStates` で

### 5. マイグレーション

- Drizzle Kit で生成 → `supabase/migrations/<番号>_<名前>.sql` に置く
  - drizzle.config.ts で `migrations.prefix: 'supabase'` (タイムスタンプ命名) を採用済み
  - 手書き SQL (`0001_extensions.sql` 等) は `0XXX_` 命名で必ずタイムスタンプより前に実行される
- RLS / extension / pg_cron は手書き SQL を同フォルダに番号 prefix で
- ファイル番号帯 (手書き): `0001_extensions` / `0050_policies` / `0070_triggers`
- `pnpm db:reset` で全マイグレーション再適用
- **Drizzle 生成時の auth schema 規約**: schema/\_shared.ts で `pgSchema('auth')` + `authUsers` を
  参照のみ目的で宣言しているため、`pnpm db:generate` の出力には毎回 `CREATE SCHEMA "auth"` と
  `CREATE TABLE "auth"."users"` が含まれる。**生成直後にこの 2 ブロックを手動で削除/コメントアウト**
  すること (Supabase 管理テーブルなので作成不要)。コミット前に `pnpm db:reset` で確認。

### 6. テスト (TDD 運用)

- **新規 Service method / branch は失敗テスト先行**。red → green → refactor。
- Service test は **実 Supabase** (local docker) + `vi.mock('@/lib/auth/guard')` で guard だけ stub。
  RLS / trigger / constraint は本物を通す。
  - fixture: `src/test/fixtures.ts` の `createTestUserAndWorkspace` + `mockAuthGuards`
  - 実行前提: `pnpm exec supabase status` で Supabase 起動中
  - config: `vitest.config.ts` の `maxWorkers: 2` + `.env.local` 自動ロード
- カバー対象: happy path + 権限 + 楽観ロック衝突 + バリデーション主要分岐 + audit_log
- **失敗 path テスト必須** (`src/__tests__/architecture.test.ts` で検査):
  mutation を含む service.ts には `ok).toBe(false)` / `toThrow` / `error.code` のいずれかを
  含むテストが少なくとも 1 件必要 (規約自動検査済)
- **新規テーブルを Service 層から書く時は RLS に INSERT policy を忘れない**
  (authenticated ロール + workspace_member 条件。過去に audit_log で踏んだ)
- Component テストは書かない (shadcn / RHF に任せる)
- Pure 関数 (`ltree-path.ts` / `fractional-position.ts`) は単体 Vitest で別ファイル分離
- **E2E**: UI が Kanban 以降で揃ったら Playwright golden path 1 本
  (signup → workspace → Item → Kanban → AI → Template → MUST)

### 7. 命名 (覚書)

| 対象          | 規則                                |
| ------------- | ----------------------------------- |
| ファイル      | kebab-case (`item-card.tsx`)        |
| Component     | PascalCase (`ItemCard`)             |
| Server Action | `*Action` 接尾 (`createItemAction`) |
| Service       | 動詞 (`itemService.create`)         |
| Repository    | 動詞 (`insertItem`, `findItemById`) |
| zod スキーマ  | `*Schema` / `*Input`                |
| Hook          | `use*`                              |

### 8. Import 順 (eslint で自動)

1. React / Next built-in
2. 外部ライブラリ
3. `@/lib/*`
4. `@/features/*`
5. `@/components/*`, `@/plugins/*`
6. 相対

## してはいけない

- ❌ Component から service / repository を直接呼ぶ (Server Action 経由必須) — **eslint で機械検出**
- ❌ Service / Action 層から `adminDb` を直接使う (RLS bypass) — **eslint で機械検出 / allow list 制**。
  通常は `withUserDb(user.id, async (tx) => ...)` を使う。Worker / heartbeat / Pre-mortem 等の
  「ws 横断 admin 操作」は `eslint.config.mjs` の `ignores` に明示追加して理由をコメント
- ❌ Service Action で **item を adminDb で取得 → workspace member チェック** (情報漏洩)。
  RLS 経由 (`withUserDb`) で取得 → 見えなければ NotFound。同時に `requireWorkspaceMember` を呼ぶ
- ❌ Service から Drizzle 直接呼び (Repository 経由)
- ❌ Repository から他 Repository 呼び (循環防止)
- ❌ Repository から `requireUser` / `requireWorkspaceMember` (二重チェック禁止) — **architecture テストで検出**
- ❌ UI に try/catch (Result 型で受ける)
- ❌ Server Action 内で `throw` のみ (return Result が無い) — **architecture テストで検出**
- ❌ サーバ状態を Zustand に複製
- ❌ shadcn 生成物 (`src/components/ui/`) を編集 — **architecture テストで検出**
- ❌ jsonb 列に streaming で部分書き込みして後で全置換する (Drizzle の `update().set({jsonb: {...}})` は
  完全置換)。streaming text は別カラムに分離するか、最終 output に必ず含める
- ❌ pg-boss の `singletonKey` を「同じ Item」の粒度で作る (multi-user 同時起動が silent skip)。
  `${workspaceId}-${entityId}-${userId}-${timeBucket}` パターンで user 別 + 短時間バケット
- ❌ `addEventListener` を `useEffect` 内で書いて cleanup の `removeEventListener` に渡す関数参照が
  effect 再実行で別になる (cancelled flag を立てて hook 内でガードする)
- ❌ Service Worker (`@serwist/next` 等) の `defaultCache` をそのまま使う (POST / Server Action /
  `/auth/*` / `/api/*` を `NetworkOnly` で素通しする runtimeCaching を **先頭に** 追加)
- ❌ `git status --porcelain` の出力を `trim().slice(3)` (status コードを潰す)。**先頭 trim 禁止**、
  `l.length > 3 && l.slice(3).trim()` で 4 文字目以降だけ取る
- ❌ `delete_*` ツールを Agent に渡す (MVP)
- ❌ 物理削除 (`deleted_at` 使う)
- ❌ `uuid[]` / `text[]` で関連を持つ (中間テーブル化済み)
- ❌ Vercel 専用機能 (`unstable_after` 等) — 自前ホストなので
- ❌ POST_MVP.md にあるものを MVP で実装

## 困ったら

- まず `ARCHITECTURE.md` の該当章を読む
- 既存の `features/item/` をコピペベースに
- 規約自体を変えたいときは **先に ARCHITECTURE.md / 本書を更新** してから実装

## 仕組みで弾いている違反 (新規実装前に把握しておくと早い)

- **eslint** (`eslint.config.mjs`): `adminDb` import / Client Component から service / DB 直接呼び
- **architecture テスト** (`src/__tests__/architecture.test.ts`):
  Service Action の Result return / mutation の `recordAudit` 呼び出し / Repository の auth guard 呼び /
  失敗 path テスト存在 / shadcn UI へのプロジェクト固有 import 混入
- **vitest 規約テスト**: 414+ ケースで RLS / 権限 / 楽観ロック衝突を本物 Supabase で検証

新規 Phase 実装前に `HANDOFF.md §5 の罠` を必ず読み返す。`§5.18` (Realtime setAuth) /
`§5.19` (postgres-js 制約違反) / `§5.22` (SW POST 事故) / `§5.28` (git status path) /
`§5.29` (Serwist + Turbopack) は特に踏みやすい。
