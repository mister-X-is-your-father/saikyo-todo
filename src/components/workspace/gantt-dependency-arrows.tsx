'use client'

/**
 * Gantt 依存線 SVG オーバーレイ (Phase 6.15 iter 2、TeamGantt / GanttPRO ベンチマーク)。
 *
 * 既存の GanttView は棒だけ描画する div + Tailwind 実装。本 component は同じ座標系を
 * 受け取り **絶対配置 SVG** を被せて、Phase 6.10 の item_dependencies (type='blocks')
 * を矢印 (Manhattan-style L 字 + 末端三角) で可視化する。
 *
 * 設計:
 *   - 純粋プレゼンテーション (DB / hook 不参照)。bars と edges を受け取って描画するだけ
 *   - 親要素は `position: relative` を仮定。SVG は `position: absolute; pointer-events: none`
 *     で被さり、ホバーやクリックは下の bar 行に通る
 *   - 矢印は from の右端 (x=ef, y=row+ROW/2) から to の左端 (x=es, y=row+ROW/2) へ
 *     L 字 (右 → 下/上 → 右) で結ぶ。同じ行だと縦線が要らないので直線
 *   - critical な edge (両端の bar が isCritical=true) は赤、そうでなければ slate
 *
 * 注: barLayout に存在しない edge endpoint (item が表示外 / 日付未設定) は **skip**。
 * 5px の矢じりはやや小さめだが、TeamGantt の見た目に近い。
 */
import { useMemo } from 'react'

export interface GanttBar {
  /** Item id */
  id: string
  /** SVG 座標。bar 左端 (= startDate) からの px */
  leftPx: number
  /** SVG 座標。bar 右端 (= dueDate + 1day) からの px */
  rightPx: number
  /** SVG 座標。bar の vertical 中央線 (px) */
  centerYPx: number
  /** critical path 上にあるか (赤色強調用) */
  isCritical?: boolean
}

export interface GanttDepEdge {
  fromId: string
  toId: string
}

interface Props {
  /** SVG 全体のサイズ。GanttView の bars container と一致させる */
  width: number
  height: number
  /** Item 単位の bar 座標 */
  bars: GanttBar[]
  /** 依存辺 (blocks 系のみ) */
  edges: GanttDepEdge[]
  /** label 列との offset (= bars container の left padding) */
  offsetLeftPx?: number
}

const ARROW_PAD = 6 // bar 端から矢印の発射点までの隙間
const ARROW_HEAD = 5 // 矢じりの大きさ (px)
const STROKE_DEFAULT = 'rgb(100, 116, 139)' // slate-500
const STROKE_CRITICAL = 'rgb(220, 38, 38)' // red-600

export function GanttDependencyArrows({ width, height, bars, edges, offsetLeftPx = 0 }: Props) {
  const barById = useMemo(() => new Map(bars.map((b) => [b.id, b])), [bars])

  return (
    <svg
      data-testid="gantt-dep-arrows"
      width={width}
      height={height}
      className="pointer-events-none absolute top-0 left-0 z-10"
      style={{ marginLeft: offsetLeftPx }}
    >
      <defs>
        <marker
          id="gantt-arrow-default"
          viewBox={`0 0 ${ARROW_HEAD * 2} ${ARROW_HEAD * 2}`}
          refX={ARROW_HEAD * 2}
          refY={ARROW_HEAD}
          markerWidth={ARROW_HEAD * 2}
          markerHeight={ARROW_HEAD * 2}
          orient="auto-start-reverse"
        >
          <path
            d={`M0,0 L${ARROW_HEAD * 2},${ARROW_HEAD} L0,${ARROW_HEAD * 2} z`}
            fill={STROKE_DEFAULT}
          />
        </marker>
        <marker
          id="gantt-arrow-critical"
          viewBox={`0 0 ${ARROW_HEAD * 2} ${ARROW_HEAD * 2}`}
          refX={ARROW_HEAD * 2}
          refY={ARROW_HEAD}
          markerWidth={ARROW_HEAD * 2}
          markerHeight={ARROW_HEAD * 2}
          orient="auto-start-reverse"
        >
          <path
            d={`M0,0 L${ARROW_HEAD * 2},${ARROW_HEAD} L0,${ARROW_HEAD * 2} z`}
            fill={STROKE_CRITICAL}
          />
        </marker>
      </defs>
      {edges.map((e, idx) => {
        const from = barById.get(e.fromId)
        const to = barById.get(e.toId)
        if (!from || !to) return null
        const isCritical = from.isCritical && to.isCritical
        const stroke = isCritical ? STROKE_CRITICAL : STROKE_DEFAULT
        const marker = isCritical ? 'url(#gantt-arrow-critical)' : 'url(#gantt-arrow-default)'
        const startX = from.rightPx + ARROW_PAD
        const startY = from.centerYPx
        const endX = to.leftPx - ARROW_PAD
        const endY = to.centerYPx
        // 同じ行 (row) なら直線、違う行なら L 字 (右 → 下/上 → 右)
        const path =
          Math.abs(startY - endY) < 1
            ? `M${startX},${startY} L${endX},${endY}`
            : `M${startX},${startY} L${(startX + endX) / 2},${startY} L${(startX + endX) / 2},${endY} L${endX},${endY}`
        return (
          <path
            key={`${e.fromId}-${e.toId}-${idx}`}
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={isCritical ? 1.75 : 1.25}
            strokeDasharray={isCritical ? undefined : '4 3'}
            markerEnd={marker}
          />
        )
      })}
    </svg>
  )
}
