# `saikyo-engineer` e2b custom template

Engineer / Researcher Agent を e2b cloud sandbox で完全実行 (verify + e2e 含む)
するための custom template。

## 同梱物

- Node 20 + git (e2b base image)
- **pnpm** (corepack)
- **Supabase CLI** (local Postgres + GoTrue + Realtime — service test 用)
- **Playwright + Chromium** (e2e 用)

## ビルド & アップロード

```bash
# 前提: E2B_API_KEY を取得して env / cli login 済
cd e2b/saikyo-engineer
e2b template build
```

ビルドが完了したら `e2b.toml` の `template_id` が上書きされる。
`saikyo-todo` 側 `.env.local`:

```
SAIKYO_ENGINEER_USE_CLOUD_SANDBOX=true
SAIKYO_ENGINEER_TEMPLATE=saikyo-engineer   # default は 'base' なので明示する
SAIKYO_ENGINEER_GIT_REPO_URL=https://github.com/<owner>/saikyo-todo.git
SAIKYO_ENGINEER_GITHUB_TOKEN=ghp_xxxxxxxxxxx
SAIKYO_ENGINEER_GIT_REF=main
SAIKYO_ENGINEER_GIT_AUTHOR_NAME=Saikyo Engineer Bot
[email protected]
E2B_API_KEY=e2b_xxxxxxxxxxxxxxxxxxxxx
# ~/.claude/.credentials.json は host 側に置く (default path で読まれる)
```

これで Engineer ジョブが pg-boss 経由で投入されると、cloud sandbox が
spawn → `verify=fast`/`autoMergeToMain=true` のフル自動 α 路線で走る。

## 設計判断

- claude CLI は **template に焼かない** — 頻繁に更新される / image 肥大回避。
  実行時に `npm i -g @anthropic-ai/claude-code` で都度入れる (~10s)。
- Supabase CLI は焼く — Service test (`supabase status` が要る fixture) を
  sandbox 内で走らせるため。
- Playwright Chromium も焼く — `npx playwright install` の cold install は
  毎 sandbox で 60s 超かかるので template 焼きのコスト合理化。
- Docker-in-Docker は e2b の plan tier 依存。当面は supabase native install で
  代替。DiD 必須になったら template tier を変更。

## 関連 iter

- iter 239–245: `src/lib/agent/cloud-sandbox-runner.ts` /
  `src/features/agent/cloud-engineer-adapter.ts` /
  `src/features/agent/engineer-worker.ts` の dispatch 配線
- iter 246 (本 commit): 本 template の scaffolding (Dockerfile + e2b.toml + README)
- 残: `template_id` を実 build で確定 / E2B_API_KEY 取得 / `.env.local` 設定
