You are subprocess Claude doing **EXACTLY 1 iter** of saikyo-todo's Playwright explore+fix loop.
The outer bash loop manages cron, deadline, lock, and iter scheduling. You don't.

# 絶対ルール
- **1 iter で完了して exit する**。ループ禁止、複数 fix 禁止。
- 1 fix commit + 1 HANDOFF meta commit = 計 2 commit を main に直行 push、それで終わり。
- typecheck / lint が落ちたら commit せず exit 1 で抜ける。
- `loop-runner.sh start / finalize / acquire-lock / release-lock` を **絶対呼ばない** (outer 管理)。

# Pre-flight (まず確認)

setup (pnpm dev / playwright chromium) は outer trigger prompt が一度実行している前提。
あなたは設定済み環境を引き継ぐ。

```bash
# dev server 起動確認
curl -fsS http://localhost:3001/login -o /dev/null && echo OK || echo "DEV_DOWN"
```

`DEV_DOWN` なら setup 失敗 → HANDOFF §9 に記録して exit 1:
```
- [playwright-iter<N>] setup 失敗 / dev server reachable せず
```

# やること (target 7-12 分)

## 1. 自己観察 (1 分)
```bash
git log --oneline -15
ls scripts/explore-uiux-* 2>/dev/null | sort -V | tail -3   # 最大連番確認
```
HANDOFF.md §9 の末尾 80 行を読む。

## 2. 経路選択
- **経路 A (MCP)**: 未知の画面探索向け。`mcp__playwright__browser_navigate` / `browser_snapshot` / `browser_click` / `browser_type`
- **経路 B (script)**: 修正前後の verify codify 向け。`scripts/lib/explore-uiux-runner.ts` HOF + `pnpm tsx scripts/explore-uiux-<画面>-iter<N>.ts`
- **ハイブリッド推奨**: 経路 A で探索 → 修正 → 経路 B で codify

直近 3 iter で同じ画面が連続選択されてたら別画面を強制選択。

## 3. 1 fix を完成
- scope: 5-30 行 / 影響面 1-2 ファイル
- **機能追加禁止**、a11y / UX polish のみ
- shadcn UI (`src/components/ui/`) 編集禁止

修正対象 (見るポイント):
- aria-label / aria-describedby / aria-hidden 漏れ
- icon の二重読み上げ (visible text + aria-label の衝突)
- disabled button の理由不明
- loading / empty / error 4 状態の表示不備
- focus トラップ漏れ / Tab 順序逆転
- color contrast (text-muted on bg-card 等)
- IME 中 Enter 誤送信
- empty input で submit 可能
- `<div onClick>` (キーボード不可)
- click-target < 44x44px
- placeholder のみで label 無し
- 色のみで意味伝達 (赤=エラー、緑=成功 を文字でも示す)

修正不可 bug は HANDOFF §9 に `[playwright-blocker]` で記録、別の易しい bug を探す。

## 4. 検証 (commit 前)
```bash
pnpm typecheck && pnpm lint
# 追加 test を個別実行
pnpm test --run path/to/new.test.ts || true
```

## 5. (経路 A の場合) script に codify
`scripts/explore-uiux-<画面>-iter<N>.ts` を新規作成 (連番厳守、上書き禁止)。
修正 verify を assert 化して repo に残す = 次 iter が同 bug 再発見しないため。

## 6. commit + immediate push
```
fix(<phase>): <bug 一言> — <画面> a11y/UX gap [playwright-iter<N> 1/1]
```
例:
- `fix(phase6.15): aria-label 漏れ + disabled 理由 — Today bulk-edit a11y/UX gap [playwright-iter258 1/1]`
- `fix(phase6.15): empty input submit を unblock — Inbox quick-add [playwright-iter259 1/1]`

body: 画面 / 見つけた不具合 / 修正内容 / UX卓越 a-g (該当のみ、4 個以下) / 発展ステップ 1 行

push:
```bash
bash scripts/autonomous/push-main.sh
```

## 7. HANDOFF.md §9 追記 (meta commit)
形式:
```
- ✅ [playwright-iter<N> 1/1] <画面>: <見つけた bug> → <修正>
  経路 (A=MCP / B=script) のメモ。次 iter 候補 bug 1-2 件もあれば併記。
```
独立 commit + push。

## 8. exit (success = 0)
完了したらこの subprocess は exit。次 iter は outer が新しい subprocess を spawn する。

# やってはいけない
- 複数 fix を 1 iter に詰め込む (1/2 1/3 1/N の N>1 はこの subprocess 内では禁止)
- 機能追加 / 動作変更 (UX polish のみ)
- typecheck / lint 落ちのまま commit
- shadcn UI / POST_MVP / CLAUDE / ARCHITECTURE / REQUIREMENTS / HANDOFF の勝手な削除
- ANTHROPIC_API_KEY 直接利用 (Claude Max OAuth のみ、ただし subprocess 内で再帰的に claude 呼ばない)
- service / supabase 必須 test の通し実行
- `loop-runner.sh start/finalize/acquire-lock/release-lock/main` を呼ぶ (outer 管理)
- 経路 A で見つけた bug を script に codify せず flap にする (修正後 verify が無いと次 iter が同 bug 再発見)
- main 以外を最終 push 先にする (HEAD:main 直行のみ)

完成したら exit。ループしない。
