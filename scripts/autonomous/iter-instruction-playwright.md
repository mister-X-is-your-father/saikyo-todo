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
ls scripts/explore-uiux-mobile-* 2>/dev/null | sort -V | tail -3   # mobile 連番別系列
```
HANDOFF.md §9 の末尾 80 行を読む。

## 2. mode 選択 (mobile audit 必須化)

毎 iter 最初に以下のどちらの mode かを決める:

**mode-D (Desktop a11y/UX、従来通り)**:
- viewport 1280x800 で a11y / aria / focus / SR 周りの polish
- 経路 A (MCP) または 経路 B (script)、`scripts/explore-uiux-<画面>-iter<N>.ts`

**mode-M (Mobile audit、ユーザ要望 2026-04-30 対応)**:
- viewport iPhone 13 (390x844) または iPhone SE (375x667)
- 「潰れ / overflow / 44x44 click target / text truncate / chip 押し出し」を点検
- **screenshot を必ず保存** (`/tmp/uiux-mobile-<view>-iter<N>.png` など)、修正前後の比較を commit body に
- 経路 B 必須: `scripts/explore-uiux-mobile-<画面>-iter<N>.ts` (連番別系列、Desktop と分離)
- explore-uiux-runner の `viewport` / `device` / `isMobile` option を使う:
  ```ts
  await runExplore({
    name: 'mobile-<view>-iter<N>',
    device: 'iPhone 13',
    isMobile: true,
    body: async ({ page, findings }) => {
      // 1. viewport 内で要素が overflow してないか scroll position で確認
      const docW = await page.evaluate(() => document.documentElement.scrollWidth)
      if (docW > 390) findings.push({ level: 'warning', source: 'observation', message: `documentElement.scrollWidth=${docW}px > viewport 390px` })

      // 2. 主要 click target が 44x44 以上か確認
      for (const sel of ['[data-testid^="quick-add"]', '[data-testid^="today-must-"]', /* etc */]) {
        const box = await page.locator(sel).first().boundingBox()
        if (box && (box.width < 44 || box.height < 44)) {
          findings.push({ level: 'warning', source: 'observation', message: `${sel}: ${box.width}x${box.height} < 44x44` })
        }
      }

      // 3. screenshot 保存 (commit には含めない、gitignore 済 /tmp/)
      await page.screenshot({ path: '/tmp/uiux-mobile-<view>-iter<N>.png', fullPage: true })
    },
  })
  ```

**mode 選び方**:
- 直近 3 iter で mode-D 連続 → mode-M 強制
- 直近 3 iter で mode-M 連続 → mode-D に戻す
- ユーザ要望「スマホ表示が全体的にいけてない」(2026-04-30) を消化する間は **mode-M を 50% 以上** にする

直近 3 iter で同じ画面が連続選択されてたら別画面を強制選択 (mode 問わず)。

## 3. 1 fix を完成
- scope: 5-30 行 / 影響面 1-2 ファイル
- **機能追加禁止**、a11y / UX polish のみ
- shadcn UI (`src/components/ui/`) 編集禁止

修正対象 (mode-D = Desktop a11y/UX で見るポイント):
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

修正対象 (mode-M = Mobile audit で見るポイント、上記 + 以下):
- **layout 潰れ**: documentElement.scrollWidth > viewport (= 横スクロール発生)
  - 多くは flex の `min-w-0` 漏れ / `truncate` 抜け / table の `min-w-` 固定 / dialog の max-w 大きすぎ
- **click target 44x44px 未満**: `boundingBox()` で測る、icon button (32px 等) は touch では押し難い
- **chip / badge text 押し出し**: `MustBadge` `StatusBadge` 等の chip が日本語長文で 親 width を超える
  → `max-w-[Npx] truncate` or `whitespace-nowrap overflow-hidden` で対応
- **dialog / modal が viewport より大きい**: iter104/107/109 の svh 系 fix の漏れ箇所
- **bottom 浮動要素の重なり**: active-timer-panel と他の sticky / fixed が衝突
- **subtask 番号 + status icon + title** 等の高密度行が 320-390px で破綻
- **screenshot 観察**: 「これは小さい画面で見て使いやすいか」 を screenshot で確認、
  - 例: chip が 3 つ並んで親 row を hard wrap してたら mobile では shrink / hide / disclosure 化を検討
  - 例: gantt / swim-lane が横スクロール必須なら hint メッセージ (「→ で横スクロール」) を追加
  - 例: subtask 行が 3 行に折り返してたら icon + 番号 + title 1 行に収める or row height 拡大
- **修正アプローチの優先順位** (mobile では特に重要):
  1. `min-w-0` を flex 親に追加 (= 子の `truncate` を効かせる前提)
  2. `truncate` / `text-ellipsis` を text に
  3. `flex-wrap` / `gap` で複数 chip を改行可能に
  4. `hidden sm:inline` で `<sm` に label を隠して icon のみに
  5. それでも狭ければ disclosure (折り畳み button) に逃がす

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
