# 最強TODO 要件定義 v4

> チーム共有の Web TODO。Kanban / Gantt / Backlog を切り替え、AI 部署メンバーが
> ナレッジを参照しながら自律的にタスクを回す。**MUST を絶対に落とさない**。
>
> このドキュメントは生きた仕様書。`/home/neo/.claude/plans/smooth-dancing-aurora.md`
> (実装プラン v1) で整理した決定をすべて反映済み。設計判断が変わったら更新する。

---

## 1. 利用形態

- **Web** (SPA, 動的画面切替)
- **チーム共有・要ログイン** (Workspace 単位)
- **ローカル開発**: Supabase CLI + Docker で全層 localhost (`supabase start`)
- **本番デプロイ**: Docker Compose (`web` / `worker` / `supabase` / `caddy`) で自前ホスト (社内サーバ)
- **社外非公開** — ライブラリ・モリモリ主義 (依存膨張のリスクは許容、確立ライブラリを使い倒す)

---

## 2. コア原子 (2原子 + 付随物 + 正規化テーブル)

タスクとナレッジの境界は明確に分ける。1原子 (Notion 方式) は UX が崩れるので不採用。
v3 まで `uuid[]` / `text[]` で持っていた assignees / tags は **中間テーブルに正規化** (後付けマイグレーション地獄の回避)。

### 2.1 全テーブル一覧 (Drizzle 定義先 = `src/lib/db/schema/*.ts`)

#### コア

| テーブル                | 主なカラム                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `profiles`              | id PK = auth.users.id, display_name, avatar_url, timezone (default 'Asia/Tokyo'), locale (default 'ja') |
| `workspaces`            | id, name, slug uniq, owner_id FK profiles, deleted_at, version, timestamps                              |
| `workspace_members`     | (workspace_id, user_id) PK, role enum(`owner`/`admin`/`member`/`viewer`), joined_at                     |
| `workspace_settings`    | workspace_id PK, timezone, standup_cron, wip_limit_must, ...                                            |
| `workspace_statuses`    | (workspace_id, key) PK, label, color, "order" int, type enum(`todo`/`in_progress`/`done`)               |
| `workspace_invitations` | id, workspace_id, email, role, token, invited_by, expires_at, accepted_at                               |

#### Item / Doc / Comment

| テーブル            | 主なカラム                                                                                                                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`             | id, workspace_id FK, title, description, status, parent_path **ltree**, start_date, due_date, **is_must**, **dod**, position **numeric** (fractional indexing), custom_fields jsonb, created_by_actor_type enum(`user`/`agent`), created_by_actor_id, **deleted_at**, archived_at, **version**, timestamps |
| `item_assignees`    | (item_id, actor_type, actor_id) PK, assigned_at                                                                                                                                                                                                                                                            |
| `tags`              | id, workspace_id, name, color, UNIQUE(workspace_id, name)                                                                                                                                                                                                                                                  |
| `item_tags`         | (item_id, tag_id) PK                                                                                                                                                                                                                                                                                       |
| `item_dependencies` | (from_item_id, to_item_id, type) PK, type enum(`blocks`/`relates_to`)                                                                                                                                                                                                                                      |
| `docs`              | id, workspace_id, title, body text, source_template_id nullable, created_by_actor_type, created_by_actor_id, deleted_at, version, timestamps                                                                                                                                                               |
| `doc_chunks`        | id, doc_id, chunk_index, content text, **embedding vector(384)** (multilingual-e5-small)                                                                                                                                                                                                                   |
| `comments_on_items` | id, item_id FK, body, author_actor_type, author_actor_id, deleted_at, timestamps                                                                                                                                                                                                                           |
| `comments_on_docs`  | id, doc_id FK, body, author_actor_type, author_actor_id, deleted_at, timestamps                                                                                                                                                                                                                            |

> Comment は polymorphic `parent_type/parent_id` を捨て、Item 用 / Doc 用に **テーブル分離** (FK と整合制約が効くため)

#### Template

| テーブル                  | 主なカラム                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates`               | id, workspace_id, name, description, kind enum(`manual`/`recurring`), schedule_cron nullable, variables_schema jsonb, tags text[], created_by, deleted_at, timestamps |
| `template_items`          | id, template_id, parent_path ltree, title, description, status_initial, due_offset_days int, is_must, dod, default_assignees jsonb, agent_role_to_invoke text         |
| `template_docs`           | id, template_id, title, body text                                                                                                                                     |
| `template_instantiations` | id, template_id, variables jsonb, instantiated_at, instantiated_by, root_item_id FK items, **cron_run_id text UNIQUE** (recurring 重複展開防止)                       |

#### AI

| テーブル            | 主なカラム                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `agents`            | id, workspace_id, role text, display_name, system_prompt_version int                                                                                                                                                                                                                                                                       |
| `agent_prompts`     | id, role text, version int, system_prompt text, active bool (prompt versioning)                                                                                                                                                                                                                                                            |
| `agent_memories`    | id, agent_id, role enum(`user`/`assistant`/`tool_call`/`tool_result`), content text, tool_calls jsonb, created_at (永続会話履歴)                                                                                                                                                                                                           |
| `agent_invocations` | id, agent_id, workspace_id, target_item_id nullable, status enum(`queued`/`running`/`completed`/`failed`/`cancelled`), input jsonb, output jsonb, model text, input_tokens int, output_tokens int, cache_creation_tokens int, cache_read_tokens int, cost_usd numeric, started_at, finished_at, error_message, idempotency_key text UNIQUE |

#### 監査・通知

| テーブル                   | 主なカラム                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `audit_log`                | id, workspace_id, actor_type, actor_id, target_type, target_id, action, before jsonb, after jsonb, ts |
| `notifications`            | id, user_id, workspace_id, type, payload jsonb, read_at nullable, created_at                          |
| `notification_preferences` | user_id, type, channel, enabled (default 全 ON)                                                       |

### 2.2 PostgreSQL 拡張

```sql
-- supabase/migrations/0001_extensions.sql
create extension if not exists "ltree";
create extension if not exists "vector";   -- pgvector
create extension if not exists "pg_trgm";
create extension if not exists "pg_bigm";  -- 日本語 FTS。動かなければ pg_trgm + tsvector フォールバック
create extension if not exists "pg_cron";  -- recurring Template / Stand-up
```

### 2.3 重要インデックス

```sql
create index items_parent_path_gist on items using gist (parent_path);
create index items_workspace_status on items (workspace_id, status) where deleted_at is null;
create index items_must_partial    on items (workspace_id, due_date) where is_must = true and deleted_at is null;
create index doc_chunks_embedding_hnsw on doc_chunks using hnsw (embedding vector_cosine_ops);
```

---

## 3. AI ロール (部署メンバー)

MVP は **PM + Researcher** の 2 体。Engineer / Reviewer は post-MVP。
両 Agent とも `agents` テーブル + 専用 JWT で動き、**author として Comment や Item 作成**ができる。

### PM Agent (常駐, 1 Workspace に 1 体)

- **モデル**: `claude-haiku-4-5` (常駐・軽量・コスト重視)
- **役割**: 優先度判定 / MUST 監視 / Stand-up / 3段エスカレーション (7d/3d/1d)
- **入力**: Workspace 全 Item + Doc + Comment + イベント (status 変更等) — プロンプトキャッシュ活用
- **出力**: Comment 投稿, Notification 発行, workspace_announcements への投稿

### Researcher Agent (オンデマンド, 並列起動可)

- **モデル**: `claude-sonnet-4-6` (深い思考)
- **役割**: コード調査 (社内コード前提) / Doc 要約 / Item 分解 / Template 起動
- **入力**: 指定 Item + 関連 Doc (pgvector + Hybrid search) + 過去 agent_memories
- **出力**: Doc 生成, 子 Item 生成, Comment, Template instantiate

### コンテキスト共有基盤

- **Doc を chunk 化 → 自前 embedding (multilingual-e5-small, 384次元)** → `doc_chunks` に保存
- Hybrid search (BM25 + semantic) を **Service 層で RRF (Reciprocal Rank Fusion)** で統合
- Template 同梱 Doc は通常 Doc より優先的にヒットさせる (重み付け)
- 会話メモリは `agent_memories` テーブルに永続化 (file-based memory はサーバ再起動で消えるため不採用)

### Tool 設計 (`src/features/agent/tools/`)

- `read.ts`: read_items, read_docs, search_docs (semantic), search_items (FTS), get_workspace_summary
- `write.ts`: create_item, update_item_status, write_comment, create_doc
- `template.ts`: instantiate_template, list_templates
- **`delete_*` は MVP で全 role に渡さない** (誤削除防止)
- 各 tool は workspace_id を必ず取り、Repository 層で workspace 越境を強制

---

## 4. MUST を落とさない仕掛け

| #   | 仕掛け                                                             | MVP                |
| --- | ------------------------------------------------------------------ | ------------------ |
| 1   | `is_must` フラグ + 専用レーン / 専用ダッシュボード                 | ✓                  |
| 2   | WIP 制限 (assignee あたり N 件, **警告のみ・ブロックは post-MVP**) | ✓                  |
| 3   | 二重承認 (MUST 追加/降格に PM Agent 承認)                          | post-MVP           |
| 4   | PM Agent 死活監視 (Heartbeat 検出, 期日近 + 動きなし)              | ✓                  |
| 5   | エスカレーション 3 段 (7d/3d/1d)                                   | ✓ (Xh は post-MVP) |
| 6   | Stand-up エージェント (毎朝 workspace_announcements + Comment)     | ✓                  |
| 7   | Pre-mortem (リスク予測)                                            | post-MVP           |
| 8   | 依存ブロック検出 (PM Agent)                                        | post-MVP           |
| 9   | DoD 必須 (作成時バリデーション, MUST のみ強制)                     | ✓                  |

---

## 5. ビュー (MVP)

- **Kanban** (status カラム, ドラッグ移動, fractional indexing で並び順)
- **Gantt** (棒のみ・依存線は post-MVP)
- **Backlog** (リスト + フィルタ + ソート, 仮想化)
- **MUST 専用ダッシュボード** (Recharts バーンダウン, Heartbeat 警告)
- **コマンドパレット** (cmdk, `Cmd+K` で Item 作成 / 切替)

---

## 6. 拡張ポイント (interface のみ MVP で固定)

レゴの「凸」を最初に決める。MVP では動的ロードしないが、コアは必ずこの interface 越しに呼ぶ。

```ts
interface ViewPlugin {
  id
  render(items: Item[]): ReactNode
  supports(filter): boolean
}
interface FieldPlugin {
  id
  type
  schema: ZodType
  render(value)
  edit(value)
}
interface ActionPlugin {
  id
  label
  applicableTo(item): boolean
  execute(ctx): Promise<Result>
}
interface AgentRole {
  id
  systemPrompt
  tools: Tool[]
  onEvent(event): Promise<void>
}
```

新ビュー追加 = `src/plugins/core/views/` にファイル追加 + `index.ts` で 1 行登録。コア改変ゼロ。

---

## 7. スケジュール (約33日, Week 0〜4)

### Week 0 (準備フェーズ, 3日)

| Day | タスク                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 | Next.js 15+ + React 19 + TS strict + pnpm + ESLint/Prettier/simple-import-sort + Husky/lint-staged + Vitest + Playwright 雛形 + `next-intl` 骨組み |
| 0.2 | Supabase CLI + Docker 起動 + LTREE/pgvector/pg_trgm/pg_bigm/pg_cron 拡張動作確認 + Drizzle custom type ヘルパ                                      |
| 0.3 | shadcn/ui (Tailwind v4) 互換性検証 + multilingual-e5-small ロード PoC + Anthropic SDK Hello world + CLAUDE.md 起草                                 |

### Week 1 (Day 1-7): スカフォールド + Auth + CRUD

| Day | タスク                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Drizzle schema 全テーブル定義 + drizzle-zod 派生 + 初回 migration → `supabase/migrations/`                     |
| 2   | Supabase Auth (server/browser/middleware) + scoped Drizzle wrapper (RLS 効かす JWT 注入) + Auth ガード         |
| 3   | RLS ポリシー (workspace_members 経由) + login/signup 画面 + workspace 作成/参加/切替 UI                        |
| 4   | Item Repository + Service + Action + zod CreateItemInput (DoD + idempotency_key) + 楽観ロック + audit_log hook |
| 5   | Doc / Comment 同パターン + lib/result + lib/errors + handle-result + AsyncStates + IMEInput wrapper            |
| 6   | LTREE ヘルパ (insert / move subtree FOR UPDATE / reorder fractional / descendants)                             |
| 7   | TanStack Query hooks + 楽観更新ベース + cmdk 雛形 + バッファ                                                   |

### Week 2 (Day 8-14): ビュー + MUST + Template 基盤

| Day | タスク                                                                                   |
| --- | ---------------------------------------------------------------------------------------- |
| 8   | Plugin Registry + 拡張ポイント型 + Core 一括登録 bootstrap                               |
| 9   | Kanban View (@dnd-kit + sortable + fractional + 楽観 mutation)                           |
| 10  | Backlog View (@tanstack/react-table + react-virtual + nuqs フィルタ) + 検索 (cmdk + FTS) |
| 11  | Gantt View (gantt-task-react, 棒のみ) + date-fns + 日付ユーティリティ                    |
| 12  | MUST ダッシュボード + WIP 警告 + Recharts バーンダウン + DoD 最終化                      |
| 13  | Template Drizzle schema + CRUD + 基本 UI                                                 |
| 14  | 変数展開 (Mustache + zod → react-hook-form 動的フォーム, 4型) + 手動 instantiate         |

### Week 3 (Day 15-21): AI 基盤 + Researcher + RAG

| Day | タスク                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | Anthropic SDK ラッパ + tool loop 自前実装 + agent_invocations モデル + pg-boss + worker プロセス + Anthropic ストリーミング → DB → Realtime push 基盤 |
| 16  | multilingual-e5 worker + Doc embedding pipeline (chunk + embed + UPSERT) + pg-boss ジョブ                                                             |
| 17  | RAG 検索 Service (HNSW cosine + workspace スコープ + Template Doc 重み付け) + Hybrid (RRF)                                                            |
| 18  | Researcher Agent (system prompt + tool whitelist + agent_memories)                                                                                    |
| 19  | Action plugin "AI 分解" (Item → 子 Item 群, parent_path 自動)                                                                                         |
| 20  | Action plugin "AI 調査" (Item → Doc 生成, embedding 連動)                                                                                             |
| 21  | Researcher → Template 起動 tool + agent_role_to_invoke 自動起動 + 進捗ストリーム UI                                                                   |

### Week 4 (Day 22-30): PM Agent + Realtime + デプロイ + 仕上げ

| Day   | タスク                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------- |
| 22    | PM Agent (system prompt + tool + プロンプトキャッシュ) + Stand-up tool                            |
| 23    | MUST Heartbeat + 3段エスカレーション (7d/3d/1d)                                                   |
| 24    | Realtime 統合 (postgres_changes → TanStack Query) + presence + drag protect                       |
| 25    | pg_cron + recurring Template (cron_run_id 冪等) + PM Agent 朝 standup cron 化                     |
| 26    | Docker Compose (web/worker/supabase/caddy) + entrypoint 経由 migration + pg_dump 日次バックアップ |
| 27    | E2E golden path (Playwright): signup → workspace → Item → Kanban → AI 分解 → Template → MUST 通知 |
| 28-30 | 受け入れ基準通し検証 + RLS 抜けスキャン + バグ潰し + ローカル `supabase start` 完全動作 + README  |

### バッファ

Week 1 末 0.5日 / Week 2 末 1日 / Week 3 末 1.5日 / Week 4 Day 28-30 = 計 ~6日 (工数 20%)

---

## 8. 非目標 (今はやらない / post-MVP)

詳細は `POST_MVP.md` を参照。主要な落とし項目:

- **Engineer Agent** (コード書き) + git worktree 隔離
- **Reviewer Agent**
- **Yjs/Tiptap collab で Doc 同時編集** (MVP は楽観ロック)
- **添付ファイル** (Storage バケット・テーブルだけ用意, UI は post-MVP)
- **メール / Slack 通知** (MVP は in-app + Comment + sonner)
- **Researcher の Web 調査 tool** (web_fetch + サニタイズ)
- 二重承認 / Pre-mortem / 依存ブロック検出 / 動的プラグインロード / 複数 AI モデル切替
- Gantt 依存線 / WIP ブロック動作 / カスタムフィールドフル実装
- モバイル / オフライン同期 / 監査ログ UI / ゴミ箱 UI / @mention 通知

---

## 9. 技術スタック

### 方針: **ライブラリ・モリモリ主義**

社内利用・社外非公開のため、依存膨張のリスクは許容して **確立ライブラリを使い倒す**。
似た機能の自前実装と既製ライブラリがあれば、デフォルトで既製を採用。

### コア層

| 層                   | 採用                                                                                  | 理由                                        |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| Frontend             | Next.js 15+ (App Router) + React 19 + TypeScript strict                               | 動的画面切替の本命・SSR/CSR 自在            |
| UI 基盤              | Tailwind v4 + shadcn/ui + Framer Motion                                               | ビュー間トランジション                      |
| DB / Auth / Realtime | **Supabase** (Postgres 17 + GoTrue + Realtime + pgvector + ltree + pg_bigm + pg_cron) | ローカル動作可・自前ホスト可・Postgres 標準 |
| ORM                  | Drizzle ORM + drizzle-zod + customType (`ltree`/`vector(384)`)                        | TS 完全型・LTREE/pgvector も生 SQL 可       |
| Job Queue            | **pg-boss** (Postgres 内)                                                             | Redis 不要・cron + retry + worker 分離      |
| AI (LLM)             | `@anthropic-ai/sdk` + 自前 tool loop                                                  | API 安定・SDK 依存最小                      |
| AI (Embedding)       | **`@huggingface/transformers` (ONNX) + `Xenova/multilingual-e5-small` (384次元)**     | 自前ホスト・無料・社内データ外部送信ゼロ    |
| i18n                 | `next-intl` (骨組みのみ, ja 翻訳)                                                     | 後付け回避                                  |
| ローカル開発         | Supabase CLI + Docker                                                                 | `supabase start` で全層 localhost           |
| デプロイ             | Docker Compose (`web` / `worker` / `supabase` / `caddy`)                              | 自前ホスト・シンプル                        |
| HTTPS                | Caddy (自動 Let's Encrypt)                                                            | 設定最小                                    |

### 機能別ライブラリ候補 (モリモリ採用)

| 機能                      | 候補                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| Kanban DnD                | `@dnd-kit/core` + `@dnd-kit/sortable` + `fractional-indexing`    |
| Gantt                     | `gantt-task-react`                                               |
| 表 / Backlog              | `@tanstack/react-table` + `@tanstack/react-virtual`              |
| Markdown エディタ (Doc)   | `BlockNote` (Tiptap ベース・Notion 風 UX)                        |
| Markdown レンダリング     | `react-markdown` + `remark-gfm` + `rehype-sanitize`              |
| フォーム                  | `react-hook-form` + `zod` + `@hookform/resolvers`                |
| 日付                      | `date-fns` + `date-fns-tz` + `react-day-picker`                  |
| 状態管理                  | `Zustand` (グローバル UI) + `@tanstack/react-query` (サーバ状態) |
| URL state                 | `nuqs`                                                           |
| トースト / 通知           | `sonner`                                                         |
| アイコン                  | `lucide-react`                                                   |
| グラフ                    | `Recharts`                                                       |
| 依存関係グラフ (post-MVP) | `React Flow`                                                     |
| キーボード                | `react-hotkeys-hook`                                             |
| コマンドパレット          | `cmdk`                                                           |
| 環境変数型付け            | `@t3-oss/env-nextjs`                                             |
| ロガー                    | `pino` + `pino-pretty`                                           |
| テスト                    | `Vitest` + `Playwright`                                          |
| ファイル DnD              | `react-dropzone` (post-MVP)                                      |

---

## 10. テンプレート機能

### 概要

繰り返しタスク・定型タスク群・関連ナレッジを **「ワークパッケージ」** として登録 → 呼び出すと変数を埋めて即実行可能な Item ツリー + Doc が生成される。AI Agent に渡せばその場で作業開始。

### 変数展開

- Mustache 構文 (`{{client_name}}`, `{{month}}`)
- `variables_schema` (zod-json) → react-hook-form 動的フォーム自動生成
- MVP は string / number / date / select の 4 型のみ対応

### 繰り返し起動

- `kind='recurring'` は **pg_cron** で定期実行 → pg-boss にジョブ enqueue → worker が展開
- **`cron_run_id` UNIQUE** で重複展開防止 (date_trunc('hour', now()) + cron_id 等で生成)

### AI 連携 (このプロジェクトの目玉)

- Researcher Agent は Template を引数に取れる:
  `instantiate("クライアント onboarding", {client_name: "Acme"})` → Item 群 + Doc 群が生成され、Agent はそれを **コンテキストの最優先層** として作業開始
- Template 同梱 Doc は通常 Doc より優先的に RAG ヒットさせる (重み付け)
- `agent_role_to_invoke` 指定の Item は展開と同時に該当 Agent を自動起動

### 例: 「クライアント onboarding」Template

- Items: アカウント作成 / Welcome メール送付 / キックオフ会議設定 / 初回成果物レビュー
- Docs: クライアント情報シート, Welcome メール文面雛形, 過去の onboarding 議事録
- Variables: `{client_name, contract_start_date, account_owner}`
- 展開時に Researcher Agent が Welcome メール下書きを生成、PM Agent がキックオフ候補日3案を提示

---

## 11. 受け入れ基準 (33日後の "完成" 定義)

- [ ] `pnpm dev` + `supabase start` だけで全機能動く (添付以外)
- [ ] 2 workspace を作って member を分け、cross-workspace で Item / Doc が漏れないことを E2E で確認
- [ ] サインアップ → 最初の workspace 作成 → サンプル Template 1個自動投入 → Item ツリー作成 → Kanban で MUST 表示 → Researcher に Item を渡して「分解」「調査」が動く
- [ ] PM Agent が朝 standup を Comment + announcement として 1 回投稿
- [ ] 期日近 MUST が Heartbeat で in-app 通知に飛ぶ (7d/3d/1d の 3 段)
- [ ] Template "クライアント onboarding" を作り、変数フォームから手動展開 → 即 Researcher が自動起動して Welcome メール下書き Doc を作る
- [ ] recurring Template が指定 cron で自動展開され、`cron_run_id` で 2重展開しない
- [ ] AI コスト追跡: `agent_invocations` に毎回 token / cost が記録され、workspace 月次集計が出る
- [ ] 監査ログ: Item / Doc / Workspace の mutation 全てが `audit_log` に actor_type 区別で記録される
- [ ] Realtime: 同じ Workspace を 2 ブラウザで開き、片方の status 変更が即時反映 + presence (今見てる人) 表示
- [ ] Soft delete: Item を削除しても `deleted_at` が入るだけで物理削除されない
- [ ] `docker compose up -d` 一発で全層立ち上がり、Caddy 経由 HTTPS で外部からアクセス可能
- [ ] `pg_dump` の日次バックアップが動く

---

## 12. 検証手順 (E2E)

```bash
# ローカル開発
pnpm install
supabase start              # Postgres + Auth + Realtime + Studio
pnpm db:migrate             # Drizzle Kit → supabase/migrations/ 適用
pnpm db:seed                # サンプル workspace + 3 Template
pnpm dev                    # Next.js
pnpm worker                 # tsx scripts/worker.ts (pg-boss + AI + embedding)

# 検証
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e               # Playwright golden path

# 本番想定
docker compose up -d
docker compose exec migrator pnpm db:migrate
# https://your-domain (Caddy) でアクセス
```

---

_このドキュメントは生きた仕様書。設計判断が変わったら更新する。_
_規約は `ARCHITECTURE.md` (詳細) と `CLAUDE.md` (AI 向け短縮) を参照。_
_post-MVP のバックログは `POST_MVP.md`。_
