/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // server-only は Next の react-server condition 前提。
      // vitest では非 Next 環境なので throw しない no-op に差し替える。
      'server-only': path.resolve(__dirname, './src/test/server-only-shim.ts'),
    },
  },
  test: {
    // Service / Repository / lib の大半は Node API。
    // Component テストは書かない方針 (CLAUDE.md) なので jsdom は不要。
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // 実 DB を叩く integration test が同時実行で衝突しないよう pool を絞る。
    // ファイル内 test は serial (vitest 既定)、ファイル間は unique user/ws で分離。
    maxWorkers: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/app/**', // RSC は E2E でカバー
        'src/components/ui/**', // shadcn 生成物
      ],
    },
  },
})
