# 最強TODO (saikyo-todo)

チーム共有 Web TODO + 自律 AI 部署メンバー (PM Agent + Researcher Agent)。
Kanban / Gantt / Backlog 切替、Template (即実行ワークパッケージ)、MUST 絶対落とさない設計。

社内利用・社外非公開。Docker Compose で自前ホスト。

## スタック

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui
- **Backend**: Next.js Server Actions + Drizzle ORM + Supabase (Postgres + RLS + Auth + Realtime)
- **AI**: Anthropic SDK (claude-sonnet-4-6 / claude-haiku-4-5) + multilingual-e5-small (自前 embedding)
- **Job Queue**: pg-boss (Redis 不要)
- **Tests**: Vitest (integration, 実 Supabase + RLS) + Playwright (E2E)

## セットアップ (開発)

前提: Node 22+, pnpm 9+, Docker (Supabase CLI), Anthropic API Key (任意)

```bash
pnpm install
pnpm exec supabase start           # local Supabase + Postgres 起動
pnpm db:reset                      # migrations 適用
cp .env.local.example .env.local   # 値を埋める (supabase status で取れる)

pnpm dev                           # http://localhost:3001

# 別ターミナルで worker (pg-boss 消費者 + daily cron)
pnpm worker
```

### 環境変数 (.env.local)

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase status で取得>
SUPABASE_SERVICE_ROLE_KEY=<supabase status で取得>
ANTHROPIC_API_KEY=sk-ant-...       # AI 機能を使うなら必須
```

## テスト

```bash
pnpm typecheck         # tsc --noEmit
pnpm lint              # ESLint
pnpm test              # Vitest integration (実 Supabase を使用、要 supabase start)
pnpm test:e2e          # Playwright (auto dev server + Supabase)

# Tailscale 経由 (本番ドメイン相当) の E2E:
#   事前に `pnpm build && pnpm start` で production server を立てる
#   (dev + Turbopack は HTTPS proxy 下で hydration が不安定なため)
pnpm test:e2e:tailscale  # playwright.tailscale.config.ts を使う
```

## 主要機能

### ビュー (Plugin Registry 経由で追加可能)

- **Kanban**: dnd-kit でステータス/並び替え、楽観更新
- **Backlog**: react-table + react-virtual、status/MUST フィルタ
- **Gantt**: 自作 (div + Tailwind)、棒のみ、date-fns
- **Dashboard**: MUST 集計 + WIP 警告 + Recharts バーンダウン

### Item / Template

- Item (TODO) は ltree で階層化、楽観ロック、soft delete、MUST フラグ (DoD 必須)
- Template は変数展開 (Mustache) で Item ツリー + Doc を 1 クリック展開
- recurring Template は `cron_run_id` で pg-boss cron 自動実行

### AI Agent

- **Researcher Agent** (Sonnet): Item の分解 / 調査 / Template 展開 (whitelist 8 tools)
- **PM Agent** (Haiku): 朝 09:00 の Stand-up (Doc 自動生成) / MUST Heartbeat 監視
- 会話は `agent_memories` に永続化、実行コストは `agent_invocations` で追跡

### RAG

- multilingual-e5-small (384次元) で Doc を自動 chunking + embed (worker 経由)
- 検索: pgvector HNSW (semantic) + pg_trgm (全文) + RRF Hybrid

## デプロイ (Docker Compose)

```bash
cp .env.production.example .env.production   # 値を埋める
docker compose --env-file .env.production up -d
```

サービス: `web` (Next.js standalone) / `worker` (pg-boss) / `caddy` (reverse proxy) /
`db-backup` (pg_dump 日次 gzip、7 日保持)。

Supabase 本体は別 compose で運用する想定 (managed Supabase か self-hosted)。

## アーキテクチャ詳細

- 規約とパターン: `CLAUDE.md` (AI 向け短縮版) / `ARCHITECTURE.md` (詳細)
- やらないこと (post-MVP): `POST_MVP.md`
- 要件と受け入れ基準: `REQUIREMENTS.md`

## ライセンス

社内利用 (公開なし)。
