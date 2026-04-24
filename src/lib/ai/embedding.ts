/**
 * multilingual-e5-small (384 次元, ONNX) の薄いラッパ。
 *
 * - モデルは `Xenova/multilingual-e5-small` (初回 ~120MB ダウンロード、以後キャッシュ)
 * - e5 系は passage/query で prefix を変える規約: "passage: " / "query: "
 * - pooling='mean' + normalize=true で cosine similarity = dot product
 *
 * メモリ: worker プロセスで load すると ~200MB 常駐する。web プロセスでは使わないこと。
 */
import 'server-only'

import { type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers'

export const EMBEDDING_MODEL = 'Xenova/multilingual-e5-small'
export const EMBEDDING_DIM = 384

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', EMBEDDING_MODEL, {
      dtype: 'fp32',
    }) as Promise<FeatureExtractionPipeline>
  }
  return extractorPromise
}

/** テスト向け: キャッシュをクリアして次回再ロードさせる。 */
export function __resetEmbeddingCacheForTests(): void {
  extractorPromise = null
}

/**
 * 複数の passage (Doc 本文・chunk) を埋め込む。並列 batch 処理。
 * 返り値は normalize 済 (cosine に dot product が使える)。
 */
export async function encodeTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const extractor = await getExtractor()
  const prefixed = texts.map((t) => `passage: ${t}`)
  const out = await extractor(prefixed, { pooling: 'mean', normalize: true })
  return out.tolist() as number[][]
}

/**
 * 検索クエリ 1 件を埋め込む (e5 の "query: " prefix を付与)。
 * Day 17 の RAG 検索 Service から呼ばれる想定。
 */
export async function encodeQuery(query: string): Promise<number[]> {
  const extractor = await getExtractor()
  const out = await extractor([`query: ${query}`], { pooling: 'mean', normalize: true })
  const rows = out.tolist() as number[][]
  const first = rows[0]
  if (!first) throw new Error('encodeQuery: extractor returned no row')
  return first
}
