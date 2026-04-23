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
- RLS / extension / pg_cron は手書き SQL を同フォルダに番号 prefix で
- ファイル番号帯: `0001_extensions` / `0010_tables` / `0050_policies` / `0070_triggers`
- `pnpm db:migrate` で適用

### 6. テスト

- Service の主要 happy path + 権限 + DoD 分岐は **必ず** Vitest
- Component テストは書かない
- E2E は golden path 1 本のみ (Playwright)

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

- ❌ Component から service / repository を直接呼ぶ (Server Action 経由必須)
- ❌ Service から Drizzle 直接呼び (Repository 経由)
- ❌ Repository から他 Repository 呼び (循環防止)
- ❌ UI に try/catch (Result 型で受ける)
- ❌ サーバ状態を Zustand に複製
- ❌ shadcn 生成物 (`src/components/ui/`) を編集
- ❌ `delete_*` ツールを Agent に渡す (MVP)
- ❌ 物理削除 (`deleted_at` 使う)
- ❌ `uuid[]` / `text[]` で関連を持つ (中間テーブル化済み)
- ❌ Vercel 専用機能 (`unstable_after` 等) — 自前ホストなので
- ❌ POST_MVP.md にあるものを MVP で実装

## 困ったら

- まず `ARCHITECTURE.md` の該当章を読む
- 既存の `features/item/` をコピペベースに
- 規約自体を変えたいときは **先に ARCHITECTURE.md / 本書を更新** してから実装
