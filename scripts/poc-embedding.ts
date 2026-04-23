/**
 * Day 0.3 PoC: multilingual-e5-small (ONNX) を Node.js で動かす
 * 実行: `pnpm tsx scripts/poc-embedding.ts`
 *
 * 初回はモデルダウンロード (~120MB) が走るため数十秒〜数分かかる。
 * キャッシュは ~/.cache/huggingface/transformers (or @huggingface/transformers の cache)。
 */
import { type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers'

const MODEL_ID = 'Xenova/multilingual-e5-small'

async function main() {
  console.log(`[load] ${MODEL_ID} (初回はダウンロード)...`)
  const t0 = Date.now()
  const extractor = (await pipeline('feature-extraction', MODEL_ID, {
    dtype: 'fp32', // CPU 推論
  })) as FeatureExtractionPipeline
  console.log(`[load] OK in ${Date.now() - t0}ms`)

  const samples = [
    'クライアント onboarding の手順を教えて',
    'クライアント受け入れ手順',
    'バグを修正する',
    'Build a Kanban board',
  ]

  console.log(`[embed] ${samples.length} 文を embedding...`)
  const t1 = Date.now()
  const out = await extractor(samples, { pooling: 'mean', normalize: true })
  console.log(`[embed] OK in ${Date.now() - t1}ms`)

  // tensor から JS 配列へ
  const dims = out.dims
  const embeddings = out.tolist() as number[][]
  console.log(`[shape] dims=${JSON.stringify(dims)}, vector_dim=${embeddings[0]!.length}`)

  // 期待: 384 次元 (multilingual-e5-small)
  if (embeddings[0]!.length !== 384) {
    throw new Error(`Expected 384-dim, got ${embeddings[0]!.length}`)
  }

  // cosine similarity (normalize 済なので dot product)
  const cos = (a: number[], b: number[]) => a.reduce((s, ai, i) => s + ai * b[i]!, 0)

  console.log('\n[similarity] (1 が完全一致, -1 が反対)')
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const sim = cos(embeddings[i]!, embeddings[j]!).toFixed(4)
      console.log(`  ${sim}  "${samples[i]}" <-> "${samples[j]}"`)
    }
  }
  console.log('\nAll checks passed (multilingual-e5-small が日本語含めて動作).')
}

main().catch((e) => {
  console.error('PoC failed:', e)
  process.exit(1)
})
