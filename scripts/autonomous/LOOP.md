# autonomous loop spec — saikyo-todo (v2: subprocess + lock)

cloud trigger 起動 1 回 = **bash がオーケストレートする**。Subprocess Claude (= 各 iter) は loop の存在を知らず、1 iter 完遂で exit する。outer agent (CCR session) は薄い shell で `loop-runner.sh main` を呼ぶだけ。

## v2 設計の核

```
┌─────────────────────────────────────────────────────────┐
│ trigger fire → outer Claude (CCR session) starts        │
│                ↓                                        │
│   bash scripts/autonomous/loop-runner.sh main \         │
│     --mode=autonomous --deadline=2h                     │
│                ↓                                        │
│   ┌── acquire-lock (git CAS race)──────────────────┐    │
│   │   既存 valid lock → exit 0 (skip this fire)    │    │
│   │   stale → take over                            │    │
│   │   push 失敗 → 別 agent 先取 → exit 0            │    │
│   └────────────────────────────────────────────────┘    │
│                ↓                                        │
│   start state file                                      │
│                ↓                                        │
│   loop:                                                 │
│     check                                               │
│     OVER_LAST_ORDER=1 || REMAINING_MIN<25 → break      │
│     spawn-iter:                                         │
│       claude --print < iter-instruction-MODE.md         │
│       (subprocess = fresh context = effectively /clear) │
│                ↓                                        │
│   trap EXIT: finalize + release-lock                    │
└─────────────────────────────────────────────────────────┘
```

## 起動 (trigger prompt から)

```bash
# autonomous (cron 0 */2 * * * = 12 起動/日)
bash scripts/autonomous/loop-runner.sh main --mode=autonomous --deadline=2h
# (deadline 2h = 120min, last_order = 1h45min, lock TTL = 150min)

# playwright (cron 30 0,8,16 * * * = 3 起動/日、setup 別途)
bash scripts/autonomous/loop-runner.sh main --mode=playwright --deadline=8h
# (deadline 8h = 480min, last_order = 7h45min, lock TTL = 510min)
```

## /clear が物理的に呼べない問題への解 (subprocess 隔離)

cloud CCR では agent は Agent SDK セッションで動く。`/clear` は Claude CLI の対話モード機能で、CCR 内では呼ぶ手段が無い (Skill tool でも built-in CLI command は不可)。

解: **subprocess `claude --print`** を毎 iter spawn することで context を完全リセット。outer agent は bash 出力 (短い) しか保持せず、全 iter 分の累積を防ぐ。Subprocess Claude は 1 iter 完了すると exit、次 iter は別 process。

## 並列実行への解 (git lock)

CCR は同 trigger の重複 fire を block しない。autonomous が 2h 越えると次 fire と被る可能性。

解: repo 内 `.autonomous-lock` ファイル + git CAS race。
- `acquire-lock`: pull → 既存 lock check → 我々の lock を commit + push
- push が non-fast-forward で失敗 = **別 agent が atomically 先取** = 我々は cleanly exit
- TTL (deadline + 30min margin) で stale lock を自動回収
- `release-lock` (release): EXIT trap 経由で finalize 時に呼ばれる

## subcommand 一覧

| subcommand | 役割 |
|---|---|
| `main --mode=X --deadline=DUR` | 全部入りオーケストレータ (trigger からはこれだけ) |
| `probe-claude` | cloud env で claude CLI / OAuth 動作確認 |
| `start --mode=X --deadline=DUR` | state file 作成 (main の中で呼ばれる) |
| `check [--json]` | 残り時間 KV (ELAPSED_MIN / REMAINING_MIN / OVER_LAST_ORDER 等) |
| `acquire-lock --mode=X --ttl-min=N` | git lock 取得 (main の中で) |
| `release-lock` | git lock 解除 (main の trap で) |
| `spawn-iter` | subprocess `claude --print` を 1 回 spawn |
| `finalize` | state file 削除 (idempotent) |

## iter-instruction (subprocess Claude が読む)

Subprocess Claude には outer の存在は隠されている。1 iter の完成を指示するだけ:

- `scripts/autonomous/iter-instruction-autonomous.md` — autonomous 1 iter spec
- `scripts/autonomous/iter-instruction-playwright.md` — playwright 1 iter spec

これら instruction は **「ループするな」「1 commit + 1 handoff meta = 2 commit で exit せよ」** を強調。Subprocess は `loop-runner.sh start/finalize/acquire-lock/release-lock` を呼んではいけない (outer の専権)。

## Subprocess Claude の制約

```bash
claude --print --max-turns 120 --allowed-tools "Bash,Read,Write,Edit,Glob,Grep" < iter-instruction-MODE.md
```

playwright モードは `--allowed-tools` に `mcp__playwright__*` も追加。

OAuth credential は `~/.claude/.credentials.json` (cloud sandbox に存在前提)、または `ANTHROPIC_API_KEY` env var fallback。outer の credential が subprocess に継承される。

## やってはいけない

- subprocess 内で `loop-runner.sh main / start / finalize / acquire-lock / release-lock` を呼ぶ (outer の専権)
- subprocess 内で再帰的に `claude --print` を呼ぶ (再帰課金)
- subprocess で **複数 commit を 1 iter に詰め込む** (1 commit + 1 meta = 2 commit が上限)
- typecheck / lint 落ちのまま commit (subprocess は exit 1 で抜ける)
- shadcn UI / POST_MVP / CLAUDE / ARCHITECTURE / REQUIREMENTS / HANDOFF の勝手な削除
- ANTHROPIC_API_KEY 直接利用 (Claude Max OAuth が前提)
- main 以外を最終 push 先にすること
- `git push --force` (lock CAS が成立しなくなる)
- lock TTL を短くしすぎる (deadline 越えで殺された場合に stale lock が残らないよう、deadline + 30min margin が default)

## モード別補足

### autonomous
- track 判定 (iter % 5): 1,3=basics / 2,4=ai-automation / 0=refactor
- 割り込み: tooling (cold start / 同一作業 3 連続) / refactor (lint warning ≥10 / hotspot / TODO累積 / any leak / 巨大 file)
- UX 卓越 a-g を commit body に該当部のみ記載 (4 個以下に抑える)
- cloud env 制約: dev server / supabase / Playwright 起動 不可

### playwright
- setup (pnpm dev / chromium / supabase) は trigger prompt で 1 回実行 (loop 開始前)
- 経路 A (MCP) と 経路 B (script) を併用、A → B codify 推奨
- 機能追加禁止、a11y / UX polish のみ (5-30 行)
- HANDOFF §9 に各 iter 1 行記録

## ローカル test

```bash
bash scripts/autonomous/loop-runner.test.sh   # 28 ケース
bash scripts/autonomous/loop-runner.sh probe-claude  # claude CLI 動作確認
```

cloud env 統合 test は `probe-claude` を最初の commit で push して trigger fire → 結果を log で確認。

## state file / lock file

- state: `/tmp/saikyo-loop.state` (cloud sandbox は ephemeral なので問題なし)
- lock: `<repo>/.autonomous-lock` (git に commit + push される、across-fire visibility)

state は KV (`MODE=` `START_TS=` `DEADLINE_MIN=` `LAST_ORDER_MIN=` `ITER_COUNT=`)。
lock は KV (`MODE=` `STARTED_AT=` `STARTED_TS=` `EXPIRES_TS=` `SESSION=`)。

## 失敗時のリカバリ

- subprocess が exit 1 (typecheck/lint fail 等) → outer が次 iter を spawn (3 連続失敗で abort)
- cloud session timeout → trap EXIT が呼ばれず lock が stale 状態で残る
  → 次 fire が `EXPIRES_TS < now` を検知して take over (TTL = deadline + 30min)
- git push 競合 → main の 3 段 fallback (`scripts/autonomous/push-main.sh`) で吸収
- lock 取得 push 失敗 → 別 agent 先取と判断、cleanly exit (skip this fire)
