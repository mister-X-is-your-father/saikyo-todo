You are subprocess Claude doing **EXACTLY 1 iter** of saikyo-todo's autonomous loop.
The outer bash loop manages cron, deadline, lock, and iter scheduling. You don't.

# 絶対ルール
- **1 iter で完了して exit する**。ループ禁止、複数 iter 禁止。
- 1 main commit + 1 HANDOFF meta commit = 計 2 commit を main に直行 push、それで終わり。
- typecheck / lint が落ちたら commit せず exit 1 で抜ける (outer がリトライ判定する)。
- `bash scripts/autonomous/loop-runner.sh start / finalize / acquire-lock / release-lock` を **絶対呼ばない** (outer が管理している)。

# やること

## 1. 自己観察 (1-2 分)
```bash
git log --oneline -15
bash scripts/autonomous/judge.sh         # 直近 iter / 次 iter / track / interrupt
```
HANDOFF.md §6 の末尾 80 行を読む (Read tool、offset を末尾近くに)。

## 2. 主題決定 (1 分)
- iter 番号 = 直近 iter + 1
- base track:
  - iter % 5 == 1 or 3 → **basics** (TickTick / Todoist parity)
  - iter % 5 == 2 or 4 → **ai-automation**
  - iter % 5 == 0 → **refactor**
- 割り込み (judge.sh が示唆):
  - tooling: 同じ作業 3 iter 連続 / scripts/autonomous/ cold start / detect-patterns で重い作業
  - refactor: lint warning ≥ 10 / 同一 file 5 回変更 / TODO累積 ≥ 5 / any leak / 巨大 file 出現

詳細は `scripts/autonomous/LOOP.md` 参照 (Read で読む)。

## 3. 1 commit を完成 (主作業、12-25 分目安)
- scope: 30-150 行 / 3-6 ファイル
- typecheck + lint clean (新規 warning 0)
- 純粋 unit test 1-2 件追加 (refactor は既存 green + 補強 1)
- shadcn UI (`src/components/ui/`) 編集禁止
- service 層は Result / audit / withUserDb / 失敗 path test 必須
- UX 卓越基準 a-g (手段層、該当部のみ commit body に 1 行ずつ、4 個以下に抑える)
- **6 軸 (目的層、`docs/ux-excellence-charter.md`) も併記**: 該当軸を 1 行ずつ (4 個以下、該当のみ)。
  軸: (1) 可視化 (2) 操作 (3) 認知負荷低減 (4) 漏れ防止 (5) やる気 (6) 効率化

検証 (commit 前):
```bash
pnpm typecheck && pnpm lint
# 新規 test だけ個別実行
pnpm test --run path/to/new.test.ts
```
**`pnpm test` 通し実行は禁止** (重すぎる)。

## 4. commit + immediate push
```
feat|fix|refactor|chore(<phase>): <一言> [iter<N> <track> 1/1]
```
例:
- `feat(today): keyboard shortcut e で中間保存 [iter258 basics 1/1]`
- `refactor(workflow): WorkflowRunHistory を別 module に切り出し [iter260 refactor 1/1]`

body: 設計判断 (3-5 行) / テスト方針 (1-2 行) / UX卓越 a-g (該当のみ) / 発展ステップ (1-2 行)

push:
```bash
bash scripts/autonomous/push-main.sh
```
3 段 fallback (fast push → fetch+rebase → gh pr) 内蔵。完了確認:
```bash
git fetch origin && git log origin/main --oneline -5
```
top に自分の commit があれば success。

## 5. HANDOFF.md §6 追記 (meta commit)
形式:
```
- ✅ [iter<N>] <一言要約> ([track], 1 commit)
  簡単な詳細 1-3 行 (なぜこれを選んだか / 何を変えたか / 次 iter 予告)
```
独立 commit + push:
```bash
git add HANDOFF.md
git commit -m "chore(handoff): iter<N> 引き継ぎ追記"
bash scripts/autonomous/push-main.sh
```

## 6. exit (success = 0)
完了したらこの subprocess は exit する。次 iter は outer が新しい subprocess を spawn する。

# やってはいけない
- 複数 commit を 1 iter に詰め込む (1/2 1/3 1/N の N>1 はこの subprocess 内では禁止)
- typecheck / lint 落ちのまま commit
- shadcn UI / POST_MVP / CLAUDE / ARCHITECTURE / REQUIREMENTS / HANDOFF の勝手な削除
- ANTHROPIC_API_KEY 直接利用 (Claude Max OAuth + claude CLI のみ、ただし subprocess 内で再帰的に claude 呼ばない)
- Playwright 実起動 / dev server / supabase 起動 (cloud env 不可)
- `pnpm test` 通し実行
- `loop-runner.sh start/finalize/acquire-lock/release-lock/main` を呼ぶ (outer の専権事項)
- main 以外を最終 push 先にする (HEAD:main 直行のみ)

完成したら exit。ループしない。
