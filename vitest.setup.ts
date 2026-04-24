// 実 Supabase を叩く integration test 用に .env.local をロード。
// テスト全体に必要な DATABASE_URL / SUPABASE_URL / SERVICE_ROLE_KEY を供給。
import 'dotenv/config'

import { config } from 'dotenv'
config({ path: '.env.local', override: true })
