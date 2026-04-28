import { describe, expect, it } from 'vitest'

import { extractEstimateMinutes, formatEstimate, parseQuickAdd } from './nl-parse'

const TODAY = new Date(2026, 3, 25) // Sat 2026-04-25

describe('parseQuickAdd', () => {
  it('no tokens → title のみ', () => {
    const r = parseQuickAdd('買い物', { today: TODAY })
    expect(r.title).toBe('買い物')
    expect(r.priority).toBeUndefined()
    expect(r.dueDate).toBeUndefined()
  })

  it('今日', () => {
    const r = parseQuickAdd('今日 資料レビュー', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-25')
    expect(r.title).toBe('資料レビュー')
  })

  it('明日 + 時刻 + p1 + tag', () => {
    const r = parseQuickAdd('明日 15:00 p1 #会議 打ち合わせ', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-26')
    expect(r.dueTime).toBe('15:00')
    expect(r.priority).toBe(1)
    expect(r.tags).toEqual(['会議'])
    expect(r.title).toBe('打ち合わせ')
  })

  it('15時 の日本語形式', () => {
    const r = parseQuickAdd('明日 15時 レビュー', { today: TODAY })
    expect(r.dueTime).toBe('15:00')
  })

  it('15時30分', () => {
    const r = parseQuickAdd('明日 15時30分 レビュー', { today: TODAY })
    expect(r.dueTime).toBe('15:30')
  })

  it('明後日', () => {
    const r = parseQuickAdd('明後日 出荷', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-27')
  })

  it('来週月曜', () => {
    // Sat 2026-04-25 の来週月曜 = 2026-04-27 (next Monday)
    const r = parseQuickAdd('来週月曜 API レビュー', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-27')
  })

  it('曜日 (次の該当曜日)', () => {
    // Sat 2026-04-25 の次の "金曜" = 2026-05-01
    const r = parseQuickAdd('金曜 デプロイ', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-05-01')
  })

  it('ISO 日付', () => {
    const r = parseQuickAdd('2026-05-10 社内発表', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-05-10')
  })

  it('MUST キーワード', () => {
    const r = parseQuickAdd('MUST 明日 出荷', { today: TODAY })
    expect(r.isMust).toBe(true)
    expect(r.scheduledFor).toBe('2026-04-26')
    expect(r.title).toBe('出荷')
  })

  it('#tag 複数', () => {
    const r = parseQuickAdd('#設計 #API 明日 レビュー', { today: TODAY })
    expect(r.tags).toEqual(['設計', 'API'])
    expect(r.title).toBe('レビュー')
  })

  it('@assignee', () => {
    const r = parseQuickAdd('@tanaka 資料作成', { today: TODAY })
    expect(r.assignees).toEqual(['tanaka'])
    expect(r.title).toBe('資料作成')
  })

  it('p3 優先度', () => {
    const r = parseQuickAdd('p3 メール返信', { today: TODAY })
    expect(r.priority).toBe(3)
    expect(r.title).toBe('メール返信')
  })

  it('末尾 ? で decomposeHint', () => {
    const r = parseQuickAdd('新 API 設計?', { today: TODAY })
    expect(r.decomposeHint).toBe(true)
    expect(r.title).toBe('新 API 設計')
  })

  it('大文字 P も priority として解釈', () => {
    const r = parseQuickAdd('P2 タスク', { today: TODAY })
    expect(r.priority).toBe(2)
  })

  it('p5 は priority として扱わない', () => {
    const r = parseQuickAdd('p5 test', { today: TODAY })
    expect(r.priority).toBeUndefined()
    expect(r.title).toBe('p5 test')
  })

  it('全部乗せ', () => {
    const r = parseQuickAdd('MUST 明日 15:30 p1 #会議 #api @tanaka API 設計レビュー?', {
      today: TODAY,
    })
    expect(r.isMust).toBe(true)
    expect(r.scheduledFor).toBe('2026-04-26')
    expect(r.dueTime).toBe('15:30')
    expect(r.priority).toBe(1)
    expect(r.tags).toEqual(['会議', 'api'])
    expect(r.assignees).toEqual(['tanaka'])
    expect(r.decomposeHint).toBe(true)
    expect(r.title).toBe('API 設計レビュー')
  })

  it('複数空白は 1 個に', () => {
    const r = parseQuickAdd('  明日   レビュー   ', { today: TODAY })
    expect(r.title).toBe('レビュー')
    expect(r.scheduledFor).toBe('2026-04-26')
  })

  it('scheduledFor があれば dueDate も同じ日付', () => {
    const r = parseQuickAdd('明日 提出', { today: TODAY })
    expect(r.dueDate).toBe('2026-04-26')
    expect(r.scheduledFor).toBe('2026-04-26')
  })

  it('時刻のみ (日付なし) → dueTime だけ', () => {
    const r = parseQuickAdd('18:00 会議', { today: TODAY })
    expect(r.dueTime).toBe('18:00')
    expect(r.scheduledFor).toBeUndefined()
  })

  it('小文字 p と # が title 途中にあっても誤認しない', () => {
    const r = parseQuickAdd('supp note', { today: TODAY })
    expect(r.priority).toBeUndefined()
    expect(r.title).toBe('supp note')
  })

  // Phase 6.15 iter 230: Todoist 風の相対日付 +Nd / +Nw
  it('+3d (3 日後)', () => {
    const r = parseQuickAdd('+3d レビュー', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-28')
    expect(r.title).toBe('レビュー')
  })

  it('+2w (2 週後 = 14 日後)', () => {
    const r = parseQuickAdd('+2w 出荷', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-05-09')
    expect(r.title).toBe('出荷')
  })

  it('+1d は明日と同じ日付', () => {
    const r = parseQuickAdd('+1d 提出', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-26')
  })

  it('title 中の +X は date として誤認しない (空白で区切られない)', () => {
    const r = parseQuickAdd('cost+3dollars', { today: TODAY })
    expect(r.scheduledFor).toBeUndefined()
    expect(r.title).toBe('cost+3dollars')
  })

  it('既に日付トークンがあれば +Nd は無視される (先勝ち)', () => {
    const r = parseQuickAdd('明日 +3d レビュー', { today: TODAY })
    // 「明日」が先に消費されるので +3d は title に残る
    expect(r.scheduledFor).toBe('2026-04-26')
    expect(r.title).toBe('+3d レビュー')
  })

  // Phase 6.15 iter 233: 今週末 / 月末
  it('今週末 (土曜) — 今日が土曜なら今日を返す', () => {
    // TODAY = Sat 2026-04-25
    const r = parseQuickAdd('今週末 棚卸し', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-25')
    expect(r.title).toBe('棚卸し')
  })

  it('今週末 (水曜から見ると) = 今週土曜', () => {
    // 2026-04-22 (Wed) からの今週末 = 2026-04-25 (Sat)
    const r = parseQuickAdd('今週末 飲み会', { today: new Date(2026, 3, 22) })
    expect(r.scheduledFor).toBe('2026-04-25')
    expect(r.title).toBe('飲み会')
  })

  it('月末 = 当月最終日', () => {
    // TODAY = 2026-04-25, 4 月の月末 = 2026-04-30
    const r = parseQuickAdd('月末 締め', { today: TODAY })
    expect(r.scheduledFor).toBe('2026-04-30')
    expect(r.title).toBe('締め')
  })

  // iter254 ai-automation: 工数推定 (estimate) — TickTick / Todoist Pro の time estimate 相当。
  // timer (iter247-250) との variance 計算を狙う。
  describe('estimateMinutes', () => {
    it('30分 (JA)', () => {
      const r = parseQuickAdd('明日 30分 レビュー', { today: TODAY })
      expect(r.estimateMinutes).toBe(30)
      expect(r.title).toBe('レビュー')
      expect(r.scheduledFor).toBe('2026-04-26')
    })

    it('1時間 (JA, 端数 0)', () => {
      const r = parseQuickAdd('1時間 設計', { today: TODAY })
      expect(r.estimateMinutes).toBe(60)
      expect(r.title).toBe('設計')
    })

    it('1時間30分 (JA, 連結)', () => {
      const r = parseQuickAdd('1時間30分 ドキュメント', { today: TODAY })
      expect(r.estimateMinutes).toBe(90)
      expect(r.title).toBe('ドキュメント')
    })

    it('30m (EN, 短縮)', () => {
      const r = parseQuickAdd('30m メール返信', { today: TODAY })
      expect(r.estimateMinutes).toBe(30)
      expect(r.title).toBe('メール返信')
    })

    it('2h30m (EN, 連結)', () => {
      const r = parseQuickAdd('2h30m 設計レビュー', { today: TODAY })
      expect(r.estimateMinutes).toBe(150)
      expect(r.title).toBe('設計レビュー')
    })

    it('1.5h (EN, 小数)', () => {
      const r = parseQuickAdd('1.5h ペアプロ', { today: TODAY })
      expect(r.estimateMinutes).toBe(90)
      expect(r.title).toBe('ペアプロ')
    })

    it('45min (EN, mins/min も許容)', () => {
      const r = parseQuickAdd('45min スタンドアップ', { today: TODAY })
      expect(r.estimateMinutes).toBe(45)
      expect(r.title).toBe('スタンドアップ')
    })

    it('15時 を時刻として扱い、estimate にしない (時間 ではないので)', () => {
      // `15時` は HH:00 の時刻、estimate の `15時間` とは別物
      const r = parseQuickAdd('明日 15時 会議', { today: TODAY })
      expect(r.estimateMinutes).toBeUndefined()
      expect(r.dueTime).toBe('15:00')
      expect(r.title).toBe('会議')
    })

    it('1時間 と 15時 が同居 (estimate + 時刻 両方)', () => {
      const r = parseQuickAdd('明日 15時 1時間 会議', { today: TODAY })
      expect(r.dueTime).toBe('15:00')
      expect(r.estimateMinutes).toBe(60)
      expect(r.title).toBe('会議')
    })

    it('上限 60h を超えるものは捨てる (誤入力ガード)', () => {
      const r = parseQuickAdd('100時間 大量タスク', { today: TODAY })
      expect(r.estimateMinutes).toBeUndefined()
      // タイトルにそのまま残る
      expect(r.title).toContain('100時間')
    })

    it('0分 は捨てる', () => {
      const r = parseQuickAdd('0分 タスク', { today: TODAY })
      expect(r.estimateMinutes).toBeUndefined()
    })

    it('title 中の 30m 風文字列は単独 token じゃないので拾わない', () => {
      const r = parseQuickAdd('cost30m discount', { today: TODAY })
      expect(r.estimateMinutes).toBeUndefined()
      expect(r.title).toBe('cost30m discount')
    })
  })

  // iter254 ai-automation: 英語キーワード対応 (Todoist 互換、国際チーム)。
  describe('English keywords', () => {
    it('today', () => {
      const r = parseQuickAdd('today review docs', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-25')
      expect(r.title).toBe('review docs')
    })

    it('today (case insensitive)', () => {
      const r = parseQuickAdd('TODAY review', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-25')
    })

    it('tonight = today', () => {
      const r = parseQuickAdd('tonight ship demo', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-25')
      expect(r.title).toBe('ship demo')
    })

    it('tomorrow', () => {
      const r = parseQuickAdd('tomorrow ship fix', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-26')
      expect(r.title).toBe('ship fix')
    })

    it('tmrw / tmr / tomo (短縮)', () => {
      expect(parseQuickAdd('tmrw call', { today: TODAY }).scheduledFor).toBe('2026-04-26')
      expect(parseQuickAdd('tmr call', { today: TODAY }).scheduledFor).toBe('2026-04-26')
      expect(parseQuickAdd('tomo call', { today: TODAY }).scheduledFor).toBe('2026-04-26')
    })

    it('weekday short (mon)', () => {
      // TODAY = Sat 2026-04-25 → next mon = 2026-04-27
      const r = parseQuickAdd('mon API review', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-27')
      expect(r.title).toBe('API review')
    })

    it('weekday full (monday)', () => {
      const r = parseQuickAdd('monday standup', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-27')
      expect(r.title).toBe('standup')
    })

    it('weekday (friday) - 次の金曜', () => {
      // TODAY = Sat 2026-04-25 → next fri = 2026-05-01
      const r = parseQuickAdd('friday deploy', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-05-01')
    })

    it('next monday (= monday と同じ; 次の月曜)', () => {
      const r = parseQuickAdd('next monday review', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-27')
      expect(r.title).toBe('review')
    })

    it('next mon (短縮)', () => {
      const r = parseQuickAdd('next mon ship', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-27')
    })

    it('英語 + estimate + priority 全部乗せ', () => {
      const r = parseQuickAdd('tomorrow 1h p1 #design API review', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-26')
      expect(r.estimateMinutes).toBe(60)
      expect(r.priority).toBe(1)
      expect(r.tags).toEqual(['design'])
      expect(r.title).toBe('API review')
    })

    it('Monthly (mon を含むが word boundary 外) は誤認しない', () => {
      const r = parseQuickAdd('Monthly retro', { today: TODAY })
      expect(r.scheduledFor).toBeUndefined()
      expect(r.title).toBe('Monthly retro')
    })

    it('thursday も拾う', () => {
      // TODAY = Sat 2026-04-25 → next thursday = 2026-04-30
      const r = parseQuickAdd('thursday review', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-30')
    })

    it('thur (短縮) も拾う', () => {
      const r = parseQuickAdd('thur design', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-30')
    })

    it('tuesday も拾う (TODAY=Sat → 次の Tue = 2026-04-28)', () => {
      const r = parseQuickAdd('tuesday lunch', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-28')
    })

    it('英語 weekday と JA `今日` が混在 → 先勝ち (今日)', () => {
      const r = parseQuickAdd('今日 monday hybrid', { today: TODAY })
      expect(r.scheduledFor).toBe('2026-04-25')
      // `今日` が先に消費 → date 確定後は weekday 検出を skip するので
      // `monday` は title に残る (一貫性: 1 入力 1 日付)
      expect(r.title).toBe('monday hybrid')
    })
  })

  describe('formatEstimate', () => {
    it('undefined / 0 / 負値は空文字', () => {
      expect(formatEstimate(undefined)).toBe('')
      expect(formatEstimate(0)).toBe('')
      expect(formatEstimate(-10)).toBe('')
    })
    it('60 未満は X分', () => {
      expect(formatEstimate(15)).toBe('15分')
      expect(formatEstimate(59)).toBe('59分')
    })
    it('60 ちょうどは 1時間', () => {
      expect(formatEstimate(60)).toBe('1時間')
    })
    it('時 + 分 のフルフォーマット', () => {
      expect(formatEstimate(90)).toBe('1時間30分')
      expect(formatEstimate(150)).toBe('2時間30分')
    })
    it('120 は 2時間 (端数なし)', () => {
      expect(formatEstimate(120)).toBe('2時間')
    })
  })

  // iter254 ai-automation: description プレフィクスから estimate を復元
  // (timer Stop 時の variance 計算で使う)。
  describe('extractEstimateMinutes', () => {
    it('null / undefined / 空 は undefined', () => {
      expect(extractEstimateMinutes(null)).toBeUndefined()
      expect(extractEstimateMinutes(undefined)).toBeUndefined()
      expect(extractEstimateMinutes('')).toBeUndefined()
    })
    it('見積 プレフィクスが無いと undefined', () => {
      expect(extractEstimateMinutes('普通の説明文')).toBeUndefined()
    })
    it('見積: 30分', () => {
      expect(extractEstimateMinutes('見積: 30分')).toBe(30)
    })
    it('見積: 1時間', () => {
      expect(extractEstimateMinutes('見積: 1時間')).toBe(60)
    })
    it('見積: 1時間30分 (連結)', () => {
      expect(extractEstimateMinutes('見積: 1時間30分')).toBe(90)
    })
    it('見積: 30m (英)', () => {
      expect(extractEstimateMinutes('見積: 30m')).toBe(30)
    })
    it('見積: 1.5h (英、小数)', () => {
      expect(extractEstimateMinutes('見積: 1.5h')).toBe(90)
    })
    it('見積: 2h30m (英、連結)', () => {
      expect(extractEstimateMinutes('見積: 2h30m')).toBe(150)
    })
    it('複数行 description は 1 行目のみ参照', () => {
      expect(extractEstimateMinutes('見積: 1時間\n本文')).toBe(60)
      expect(extractEstimateMinutes('本文\n見積: 1時間')).toBeUndefined()
    })
    it('範囲外 (>3600) は undefined', () => {
      expect(extractEstimateMinutes('見積: 100時間')).toBeUndefined()
    })
    it('見積: が空マッチでも undefined', () => {
      expect(extractEstimateMinutes('見積: 0分')).toBeUndefined()
    })
    it('round-trip: format → extract', () => {
      const formatted = formatEstimate(135)
      expect(extractEstimateMinutes(`見積: ${formatted}`)).toBe(135)
    })
  })
})
