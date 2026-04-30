/**
 * Visual artifact (flicker / プル / ジャンプ) を録画 + フレーム判定で検出する
 * Playwright 用 helper。`useSortable` 等の DnD 系で「drop 直後の 1-3 frame の
 * 視覚不整合」を assert で検出する。
 *
 * 仕組み:
 *   1. 操作前に対象要素群の bounding rect を記録 (= "before snap")
 *   2. 操作 (drag/drop / status toggle 等) を実行
 *   3. requestAnimationFrame で **連続 N frame** の bounding rect を browser 側で計測
 *   4. JSON で取得 → 各 frame で「前 frame からの jump 距離」を計算
 *   5. **expected な動き (drop 着地)** と **artifact (一瞬飛んで戻る等)** を区別
 *      - expected: 同方向に monotonic、最終位置で stable
 *      - artifact: 方向反転 (上→下→上)、または 1 frame だけ大ジャンプ
 *
 * Playwright の標準 video 録画より精度高い (frame 単位の bounding rect 取得)。
 *
 * 使い方:
 *   import { recordTrajectories, detectArtifact } from './lib/visual-artifact-detector'
 *
 *   await runExplore({
 *     name: 'subtask-reorder-flicker-iter<N>',
 *     body: async ({ page, findings }) => {
 *       // ... seed: parent + 4 subtasks
 *       const trajectories = await recordTrajectories(page, {
 *         selectors: ['[data-testid="subtask-A"]', '[data-testid="subtask-B"]', ...],
 *         frames: 30,  // 60fps なら 0.5 秒
 *         action: async () => {
 *           // drop 操作
 *           await page.dragAndDrop('[data-testid="subtask-D-handle"]', '[data-testid="subtask-A"]')
 *         },
 *       })
 *       const artifacts = detectArtifact(trajectories)
 *       for (const a of artifacts) findings.push({ level: 'error', source: 'observation', message: a })
 *     },
 *   })
 */
import type { Page } from '@playwright/test'

export interface FrameSnapshot {
  /** ms since action start */
  t: number
  /** selector → bounding rect (frame 取得時の) */
  rects: Record<string, { x: number; y: number; w: number; h: number } | null>
}

export interface RecordTrajectoriesOptions {
  /** 観察対象要素の selector 一覧 */
  selectors: string[]
  /** action 実行後に取得する frame 数 (60fps 前提なら 30 frame ≒ 0.5s) */
  frames: number
  /** 視覚 artifact を引き起こす可能性のある操作 (drag drop / click 等) */
  action: () => Promise<void>
}

/**
 * Action 前後の対象要素 bounding rect を **frame 単位で連続取得**。
 *
 * Playwright の `page.evaluate` 内で `requestAnimationFrame` ループを回し、
 * 各 frame で `getBoundingClientRect()` を呼ぶ。実際には Chrome の rendering
 * pipeline と同期するので、user 視点での視覚遷移を高精度で記録できる。
 */
export async function recordTrajectories(
  page: Page,
  opts: RecordTrajectoriesOptions,
): Promise<FrameSnapshot[]> {
  // 操作前の "before snap" を frame 0 として記録
  const before = await captureRects(page, opts.selectors)

  // browser 側で次 N frame を予約 (action 実行を browser timer と同期)
  // action 開始時刻を t=0、各 frame で経過時刻 + rects を JSON に push
  const frameCollectorPromise = page.evaluate(
    async ({ selectors, frames }: { selectors: string[]; frames: number }) => {
      const start = performance.now()
      const result: FrameSnapshot[] = []
      // requestAnimationFrame で連続取得
      let count = 0
      return await new Promise<FrameSnapshot[]>((resolve) => {
        function tick() {
          if (count >= frames) {
            resolve(result)
            return
          }
          const t = performance.now() - start
          const rects: FrameSnapshot['rects'] = {}
          for (const sel of selectors) {
            const el = document.querySelector(sel)
            if (!el) {
              rects[sel] = null
              continue
            }
            const r = el.getBoundingClientRect()
            rects[sel] = { x: r.x, y: r.y, w: r.width, h: r.height }
          }
          result.push({ t, rects })
          count++
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    },
    { selectors: opts.selectors, frames: opts.frames },
  )

  // action 実行 (= drag drop など)
  await opts.action()

  // browser 側 collector の完了を待つ
  const frames = await frameCollectorPromise

  // before snap を先頭に挿入 (t=-1 は action 前を示す sentinel)
  return [{ t: -1, rects: before }, ...frames]
}

async function captureRects(
  page: Page,
  selectors: string[],
): Promise<Record<string, { x: number; y: number; w: number; h: number } | null>> {
  return await page.evaluate((sels: string[]) => {
    const r: Record<string, { x: number; y: number; w: number; h: number } | null> = {}
    for (const s of sels) {
      const el = document.querySelector(s)
      if (!el) {
        r[s] = null
        continue
      }
      const b = el.getBoundingClientRect()
      r[s] = { x: b.x, y: b.y, w: b.width, h: b.height }
    }
    return r
  }, selectors)
}

export interface ArtifactReport {
  /** 検出した artifact の説明 (人間向け) */
  message: string
  /** 該当 selector */
  selector: string
  /** artifact が起きた frame index range */
  frameRange: [number, number]
  /** 判定根拠の数値 (ピクセル単位 jump 等) */
  details: Record<string, number>
}

/**
 * Trajectories から視覚 artifact (一瞬飛んで戻る、急ジャンプ後復帰、振動) を検出する。
 *
 * 検出 rules:
 *   1. **方向反転 (= 「プル」「ビクッ」)**: y 座標が `up → down → up` (or 逆) で
 *      振幅 > 4px の動きを連続 3 frame 以内で見せた場合
 *   2. **異常ジャンプ**: 1 frame で 50px 以上動き、次 frame で同等距離 戻った場合
 *   3. **遅延着地**: action 後 200ms 経過しても rect が change 続けている場合
 *
 * 通常の expected な動き (drop が新位置に瞬時着地、または smooth animation)
 * は検出されない。
 */
export function detectArtifact(trajectories: FrameSnapshot[]): ArtifactReport[] {
  const reports: ArtifactReport[] = []
  if (trajectories.length < 3) return reports

  const selectors = Object.keys(trajectories[1]!.rects)

  for (const sel of selectors) {
    // selector ごとに y 軌跡を抽出 (NULL frame は skip)
    const ys: { frameIdx: number; t: number; y: number }[] = []
    trajectories.forEach((snap, idx) => {
      const r = snap.rects[sel]
      if (r) ys.push({ frameIdx: idx, t: snap.t, y: r.y })
    })
    if (ys.length < 3) continue

    // Rule 1: 方向反転 (up→down→up or down→up→down) を検出
    for (let i = 1; i < ys.length - 1; i++) {
      const dy1 = ys[i]!.y - ys[i - 1]!.y
      const dy2 = ys[i + 1]!.y - ys[i]!.y
      // 反転 + 振幅 > 4px の動き
      if (dy1 * dy2 < 0 && Math.abs(dy1) > 4 && Math.abs(dy2) > 4) {
        reports.push({
          message: `視覚 artifact: ${sel} が ${ys[i - 1]!.frameIdx}→${ys[i]!.frameIdx}→${ys[i + 1]!.frameIdx} frame で y 方向反転 (dy1=${dy1.toFixed(1)}px, dy2=${dy2.toFixed(1)}px)`,
          selector: sel,
          frameRange: [ys[i - 1]!.frameIdx, ys[i + 1]!.frameIdx],
          details: { dy1, dy2 },
        })
      }
    }

    // Rule 2: 異常ジャンプ (1 frame で 50px+ 動き、次 frame で 80% 以上戻る)
    for (let i = 1; i < ys.length - 1; i++) {
      const dy1 = ys[i]!.y - ys[i - 1]!.y
      const dy2 = ys[i + 1]!.y - ys[i]!.y
      if (Math.abs(dy1) > 50 && Math.abs(dy2) > Math.abs(dy1) * 0.8 && dy1 * dy2 < 0) {
        reports.push({
          message: `異常ジャンプ: ${sel} が frame ${ys[i]!.frameIdx} で ${dy1.toFixed(0)}px ジャンプ → 次 frame で ${dy2.toFixed(0)}px 戻る`,
          selector: sel,
          frameRange: [ys[i - 1]!.frameIdx, ys[i + 1]!.frameIdx],
          details: { jumpDy: dy1, returnDy: dy2 },
        })
      }
    }

    // Rule 3: 遅延着地 (200ms 後にも rect が変化し続ける)
    const lateFrames = ys.filter((p) => p.t > 200)
    if (lateFrames.length >= 2) {
      let stillMoving = false
      for (let i = 1; i < lateFrames.length; i++) {
        if (Math.abs(lateFrames[i]!.y - lateFrames[i - 1]!.y) > 1) {
          stillMoving = true
          break
        }
      }
      if (stillMoving) {
        reports.push({
          message: `遅延着地: ${sel} は action 後 200ms 経過しても rect が変化中`,
          selector: sel,
          frameRange: [lateFrames[0]!.frameIdx, lateFrames[lateFrames.length - 1]!.frameIdx],
          details: { lateFrameCount: lateFrames.length },
        })
      }
    }
  }

  return reports
}
