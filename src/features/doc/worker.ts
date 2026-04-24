/**
 * pg-boss 'doc-embed' キュー handler。1 job = 1 Doc の chunk+embed+UPSERT。
 *
 * agent worker と同じ方針: エラーは throw せずログだけ残す
 * (pg-boss retry で embedding モデルが毎回再ロードされるとコストが見合わない)。
 */
import 'server-only'

import type { DocEmbedJobData } from '@/lib/jobs/queue'

import { embedDoc } from './embedding'

export async function handleDocEmbed(
  jobs: Array<{ id: string; data: DocEmbedJobData }>,
): Promise<void> {
  for (const job of jobs) {
    const { docId } = job.data
    const short = docId.slice(0, 8)
    try {
      const result = await embedDoc(docId)
      if (result.skipped) {
        console.log(`[doc-embed] doc=${short} skipped reason=${result.skipped}`)
      } else {
        console.log(`[doc-embed] doc=${short} chunks=${result.chunks}`)
      }
    } catch (e) {
      console.error(`[doc-embed] doc=${short} unexpected error:`, e)
    }
  }
}
