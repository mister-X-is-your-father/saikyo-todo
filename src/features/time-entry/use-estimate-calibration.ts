'use client'

/**
 * iter267 ai-automation: 直近 bias の calibrationFactor を提供する thin hook。
 *
 * 既存 `useTimeEntries` + `useItems` の cache を再利用し、両者揃ったら
 * `selectBiasSamples` → `computeEstimateBias` を一度実行して `calibrationFactor`
 * (number | null) を返す。tendency / counts は本 hook では返さない (UI 側が
 * `EstimateBiasInsight` で別途必要なら直接 computeEstimateBias を呼ぶ)。
 *
 * 用途: QuickAdd preview chip に「30分 → 39分 (校正)」を inline で出す等の
 * 軽量 consumer。React Query が同じ key を共有するので、本 hook を複数 component
 * から呼んでもネットワーク往復は増えない。
 */
import { useMemo } from 'react'

import { useItems } from '@/features/item/hooks'
import type { Item } from '@/features/item/schema'

import { computeEstimateBias } from './bias'
import { buildItemDescriptionLookup, selectBiasSamples } from './bias-selector'
import { useTimeEntries } from './hooks'

export interface EstimateCalibrationState {
  /** 校正倍率 (sample 不足や workspaceId 空などで null) */
  calibrationFactor: number | null
  /** 数値ベースの sample 数 (UI で「3 件以上必要」表示等に) */
  withEstimateCount: number
  /** どちらかの query が loading 中 */
  isLoading: boolean
}

export function useEstimateCalibration(workspaceId: string): EstimateCalibrationState {
  const entriesQ = useTimeEntries(workspaceId)
  const itemsQ = useItems(workspaceId)

  const result = useMemo<EstimateCalibrationState>(() => {
    if (!workspaceId) {
      return { calibrationFactor: null, withEstimateCount: 0, isLoading: false }
    }
    const isLoading = entriesQ.isLoading || itemsQ.isLoading
    if (!entriesQ.data || !itemsQ.data) {
      return { calibrationFactor: null, withEstimateCount: 0, isLoading }
    }
    const lookup = buildItemDescriptionLookup(itemsQ.data as Item[])
    const samples = selectBiasSamples(entriesQ.data, lookup)
    const report = computeEstimateBias(samples)
    return {
      calibrationFactor: report.calibrationFactor,
      withEstimateCount: report.withEstimateCount,
      isLoading: false,
    }
  }, [workspaceId, entriesQ.data, entriesQ.isLoading, itemsQ.data, itemsQ.isLoading])

  return result
}
