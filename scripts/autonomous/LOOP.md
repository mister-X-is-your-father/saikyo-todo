# autonomous loop spec — saikyo-todo

cloud trigger 起動 1 回内で **複数 iter を loop で回し**、各 iter ごとに
**1 commit を即 push** する仕様。cloud CCR の hard timeout (推測 60-90 min) で
殺される可能性があるため、push 頻度を上げて「途中で死んでも push 済は安全」
を担保する。

## 起動 (trigger prompt から呼ばれる)

```bash
# autonomous (cron 0 */2 * * * = 12 起動/日)
bash scripts/autonomous/loop-runner.sh start --mode=autonomous --deadline=1h45m

# playwright (cron 30 0,8,16 * * * = 3 起動/日)
bash scripts/autonomous/loop-runner.sh start --mode=playwright --deadline=7h45m
```

`deadline` は「1 起動あたりの上限稼働時間」、ラストオーダー (新規 iter 着手禁止) は
`deadline - 15 min` (`LAST_ORDER_BUFFER_MIN` で上書き可)。

## 1 iter の流れ (agent が回す)

```
[ループ先頭]
1. bash scripts/autonomous/loop-runner.sh check で残り時間取得
   - OVER_LAST_ORDER=1 → ループ終了 (5. へ)
   - REMAINING_MIN < 20 → ループ終了 (cloud timeout 余裕を持って退場)
   - それ以外 → 2. へ

2. 自己観察 + iter 番号判定
   - git log --oneline -10 / HANDOFF.md §6 (or §9 = playwright) を読む
   - 直近 iter 番号 + 1
   - autonomous: iter % 5 で track (basics/ai-automation/refactor、tooling/refactor 割り込み判定)
   - playwright: 経路 A=MCP / 経路 B=script を選ぶ (iter 内併用 OK)

3. 1 commit を完成させる
   - autonomous: 30-150 行 / 3-6 ファイル / typecheck+lint clean / 純粋 unit test 1-2 件
   - playwright: 5-30 行 / a11y polish のみ / 機能追加禁止
   - shadcn UI (src/components/ui/) は編集禁止
   - commit message:
     - autonomous: feat|fix|refactor|chore(<phase>): <一言> [iter<N> <track> 1/1]
     - playwright: fix(<phase>): <一言> — <画面> a11y/UX gap [playwright-iter<N> 1/1]

4. **即 push** (まとめて push しない)
   bash scripts/autonomous/push-main.sh
   # 失敗 (non-fast-forward) なら fetch + rebase + 再 push、それでも無理なら gh pr で merge
   # push 完了確認: git fetch origin && git log origin/main --oneline -3 で
   # HEAD top に自分の commit が乗っているか

5. HANDOFF.md に 1 行追記 + commit + push
   - autonomous: §6 に `[iter<N>] <一言>` を 1 行
   - playwright: §9 に `[playwright-iter<N> 1/1] <画面>: <bug> → <修正>` を 1 行
   - これも独立 commit として push (history に残る)

6. ループ先頭に戻る
```

## 終了

```bash
bash scripts/autonomous/loop-runner.sh finalize
```

`finalize` は state file を消すだけ (idempotent)。死亡時に呼ばれなくても次起動で
`start` するときに上書きされるので問題なし。

## やってはいけない

- 1 iter で複数 commit を作って **まとめて push** (細かく immediate push が原則)
- 「今の commit を諦めず deadline 越えてでも push する」 (cloud timeout で殺されるリスク)
- `finalize` を忘れる (本質的に問題ないが、loop 開始時の state リーク防止のため呼ぶ)
- `OVER_LAST_ORDER=1` を無視して新規 iter に着手する
- HANDOFF.md 更新を後回しにする (next iter が「自己観察」で読むので必ず最新に保つ)
- shadcn UI / POST_MVP / CLAUDE / ARCHITECTURE / REQUIREMENTS / HANDOFF の勝手な削除
- ANTHROPIC_API_KEY 直接利用 (Claude Max OAuth + claude CLI のみ)

## モード別 詳細仕様

### autonomous モード

トラック判定 (iter 番号 % 5):
- 1, 3 → basics (TickTick / Todoist parity)
- 2, 4 → ai-automation (AI / MCP / 自動化)
- 0 → refactor

割り込み (発動なら通常トラックを次 iter に持ち越し):
- tooling: 同じ作業 3 iter 連続 / cold start (scripts/autonomous/ 空) / detect-patterns で重い作業検出
- refactor: lint warning ≥ 10 / 同一 file が直近 10 iter で 5 回変更 / TODO/FIXME 累積 ≥ 5 件 / any leak / 巨大 file 出現

UX 卓越基準 (a-g、commit body に該当部を 1 行ずつ記載):
- a 発見可能性、b アクセシビリティ、c 状態網羅 (loading/error/empty/success)、
- d 速度感 (optimistic)、e 細部 delight、f レスポンシブ (320px〜4K)、g 一貫性 (shadcn)

cloud env 制約:
- dev server / Supabase / Playwright 実起動は **使えない** (ローカル依存)
- コード変更 + lint/typecheck + 個別 unit test (`pnpm test --run path/to/file`) のみ
- `pnpm test` 通し実行は重すぎるので skip

### playwright モード

setup (5-7 分):
```bash
npm install -g pnpm@10.13.1 || corepack enable
pnpm install --frozen-lockfile --prefer-offline
npx playwright install --with-deps chromium
supabase start || echo '[supabase fail] login screen only mode'
pnpm db:reset || true
nohup pnpm dev > /tmp/nextdev.log 2>&1 &
for i in {1..30}; do curl -fsS http://localhost:3001/login -o /dev/null && break; sleep 2; done
```

2 経路を併用:
- **経路 A (MCP)**: `mcp__playwright__browser_navigate` 等で対話的探索 (allowed_tools に `mcp__playwright__*`、`.mcp.json` で auto-spawn)
- **経路 B (script)**: `scripts/lib/explore-uiux-runner.ts` HOF + `pnpm tsx scripts/explore-uiux-<画面>-iter<N>.ts`

選び方:
- 未知の画面探索 → 経路 A
- 修正前後の verify codify → 経路 B
- MCP で見つけた bug は **修正後 verify を script に codify** (再現性確保、次 iter が同 bug 再発見しないように)

修正対象 (a11y / UX polish のみ、機能追加禁止):
- aria-label / aria-describedby / aria-hidden 漏れ
- visible text と aria-label の衝突 (×, >> 等)
- disabled button の理由不明 (sr-only / title)
- loading / empty / error 4 状態の表示不備
- focus トラップ漏れ / Tab 順序逆転
- color contrast 不足
- IME 中 Enter 誤送信
- empty input で submit 可能
- `<div onClick>` (キーボード不可)
- click-target < 44x44px
- placeholder のみで label 無し
- 色のみで意味伝達

setup 失敗時は何も commit せず HANDOFF.md §9 に
`[playwright-iter<N>] setup 失敗 / 候補 bug: ...` を 1 行記録して終了。

## main 直行 push 補助

`scripts/autonomous/push-main.sh` が 3 段 fallback (fast push → fetch+rebase → gh PR) を
内部で持つ。各 iter の push はこれを呼べば良い。

## state file

- 既定: `/tmp/saikyo-loop.state`
- 上書き: `SAIKYO_LOOP_STATE=/path/to/state` env で
- 中身: `MODE=` / `START_TS=` / `DEADLINE_MIN=` / `LAST_ORDER_MIN=` (KV)

## ローカル test

```bash
bash scripts/autonomous/loop-runner.test.sh
```

28 ケース (start/check/finalize/parse_duration/不正入力 等) が PASS することを確認。
