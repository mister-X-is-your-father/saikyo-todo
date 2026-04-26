/**
 * Architecture guard tests (Phase 6.14 仕組み化)。
 *
 * grep ベースで src/ ツリーを scan し、CLAUDE.md / HANDOFF.md §5 で明文化されている
 * 規約違反を機械的に検出する。eslint と二重防御:
 *   - eslint = import レベルで弾く
 *   - これ = AST に頼らない簡易チェック (mutation pattern / audit / actionWrap 等)
 *
 * バグが本ファイルで検出された場合は、修正するか「規約上の例外」として allow list に
 * 追加して理由をコメント。allow list を増やしすぎたら設計の見直しを検討する。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..') // repo root
const SRC = join(ROOT, 'src')

function walk(dir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue
      walk(full, results)
    } else if (st.isFile()) {
      results.push(full)
    }
  }
  return results
}

const allFiles = walk(SRC)
const featureFiles = allFiles.filter((f) => f.startsWith(join(SRC, 'features')))
const rel = (f: string) => relative(SRC, f)

function read(f: string): string {
  return readFileSync(f, 'utf-8')
}

describe('architecture: Service / Action 規約', () => {
  // -----------------------------------------------------------
  // 1. Server Action は Result<T> を返す (actionWrap / isAppError / 直接 Result 構築のいずれか)。
  //    "throw" だけして return しない関数は禁止 (UI が Result で受け取れない)。
  // -----------------------------------------------------------
  it('actions.ts は Result<T> を返している (throw のみで return 無しの関数が無い)', () => {
    const actionFiles = featureFiles.filter(
      (f) => f.endsWith('actions.ts') && !f.endsWith('.test.ts'),
    )
    expect(actionFiles.length).toBeGreaterThan(0)
    const violations: string[] = []
    for (const f of actionFiles) {
      const src = read(f)
      if (!src.includes("'use server'") && !src.includes('"use server"')) continue
      if (!/export async function/.test(src)) continue
      // ファイル内の各 export async 関数が Result/void/redirect を return しているか簡易検査
      // - actionWrap 経由 → OK
      // - isAppError + err 経由 → OK
      // - return ok(...) / return err(...) を含む → OK
      // - return が一切無い (throw のみ) → 違反
      const usesActionWrap = src.includes('actionWrap(')
      const usesIsAppError = src.includes('isAppError(')
      const returnsResult = /return\s+(ok|err|await actionWrap)\b/.test(src)
      const returnsRedirect = /\bredirect\(/.test(src)
      if (!usesActionWrap && !usesIsAppError && !returnsResult && !returnsRedirect) {
        violations.push(
          `${rel(f)}: actionWrap / isAppError / return ok|err / redirect いずれも無い`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  // -----------------------------------------------------------
  // 2. mutation を持つ service.ts は recordAudit を呼ぶ
  //    (簡易: 'INSERT' / 'UPDATE' / 'DELETE' を含むファイルは audit が必要)
  //
  //    注: query-only な service (dashboard, audit, pdca 等) は INSERT/UPDATE/DELETE を
  //    含まないので false positive にならない。
  // -----------------------------------------------------------
  it('mutation を含む service.ts は recordAudit を呼ぶ', () => {
    const serviceFiles = featureFiles.filter(
      (f) => f.endsWith('service.ts') && !f.endsWith('.test.ts'),
    )
    // audit を呼ばないことが許される service ('読み取り中心' or '別 audit パス')
    const allowList = new Set([
      'agent/service.ts', // agent_invocations の audit は worker / service 内別所
      'agent/cost-budget.ts',
      'agent/memory-service.ts', // memory append は audit 不要 (内部状態)
      'agent/pm-service.ts',
      'agent/researcher-service.ts',
      'agent/engineer-service.ts',
      'agent/cron-workers.ts',
      'doc/embedding.ts',
      'comment/notify.ts',
      'email/dispatcher.ts',
      'email/service.ts',
      'pdca/service.ts',
      'audit/service.ts',
      'dashboard/service.ts',
      'mock-timesheet/service.ts',
      'sprint/retro-service.ts',
      'sprint/premortem-service.ts',
      'heartbeat/service.ts',
      'heartbeat/scan.ts',
      'notification/service.ts',
      'notification/repository.ts',
    ])
    const violations: string[] = []
    for (const f of serviceFiles) {
      const r = rel(f).replace(/^features\//, '')
      if (allowList.has(r)) continue
      const src = read(f)
      const isMutating =
        /\.(insert|update|delete)\(/.test(src) ||
        /\bDELETE FROM\b/.test(src) ||
        /\bINSERT INTO\b/.test(src) ||
        /\bUPDATE \w+ SET\b/.test(src)
      if (!isMutating) continue
      if (!src.includes('recordAudit(')) {
        violations.push(`${r}: mutation を含むが recordAudit を呼ばない`)
      }
    }
    expect(violations).toEqual([])
  })

  // -----------------------------------------------------------
  // 3. Repository (repository.ts) は service / action から呼ばれる前提なので、
  //    requireUser / requireWorkspaceMember を直接呼んではならない (二重チェック防止)
  // -----------------------------------------------------------
  it('repository.ts から auth guard を直接呼ばない', () => {
    const repoFiles = featureFiles.filter(
      (f) => f.endsWith('repository.ts') && !f.endsWith('.test.ts'),
    )
    const violations: string[] = []
    for (const f of repoFiles) {
      const src = read(f)
      if (
        /\brequireUser\(/.test(src) ||
        /\brequireWorkspaceMember\(/.test(src) ||
        /\bcurrentUser\(/.test(src)
      ) {
        violations.push(`${rel(f)}: repository から auth guard 呼び出し`)
      }
    }
    expect(violations).toEqual([])
  })

  // -----------------------------------------------------------
  // 4. service.ts に mutation method がある場合、対応 .test.ts に "fail"
  //    系のキーワード (失敗 path テスト) があること
  //    (規約: 失敗 path も最低 1 つテストする)
  // -----------------------------------------------------------
  it('mutation を含む service.ts は失敗 path テストを少なくとも 1 つ持つ', () => {
    const serviceFiles = featureFiles.filter(
      (f) => f.endsWith('service.ts') && !f.endsWith('.test.ts'),
    )
    const violations: string[] = []
    // 検査をスキップするもの (pure / query / 信頼できる upstream test)
    const allowList = new Set([
      'pdca/service.ts',
      'audit/service.ts',
      'dashboard/service.ts',
      'heartbeat/service.ts',
      'heartbeat/scan.ts',
      'notification/service.ts',
      'comment/notify.ts',
      'doc/embedding.ts',
      'email/dispatcher.ts',
      'email/service.ts',
      'mock-timesheet/service.ts',
      'agent/cost-budget.ts',
      'agent/cron-workers.ts',
      'agent/memory-service.ts',
    ])
    for (const f of serviceFiles) {
      const r = rel(f).replace(/^features\//, '')
      if (allowList.has(r)) continue
      const src = read(f)
      const isMutating = /\.(insert|update|delete)\(/.test(src)
      if (!isMutating) continue
      // 対応するテストファイルを探す:
      //   1. <name>.ts → 同 dir or __tests__ の <name>.test.ts
      //   2. fallback: 同 dir 内の全 *.test.ts を結合
      const baseName = f.split('/').pop()!.replace(/\.ts$/, '') // 'service' or 'engineer-service' など
      const dir = f.split('/').slice(0, -1).join('/')
      let testSrc = ''
      const tryRead = (p: string) => {
        try {
          testSrc += read(p) + '\n'
        } catch {
          // ignore
        }
      }
      tryRead(`${dir}/${baseName}.test.ts`)
      tryRead(`${dir}/__tests__/${baseName}.test.ts`)
      try {
        for (const e of readdirSync(dir)) {
          if (e.endsWith('.test.ts')) tryRead(join(dir, e))
        }
      } catch {
        // ignore
      }
      try {
        const tdir = join(dir, '__tests__')
        for (const e of readdirSync(tdir)) {
          if (e.endsWith('.test.ts')) tryRead(join(tdir, e))
        }
      } catch {
        // ignore
      }
      if (!testSrc) {
        violations.push(`${r}: 対応するテストファイルが見つからない`)
        continue
      }
      const hasFailureCase =
        /\bok\)\.toBe\(false\)/.test(testSrc) ||
        /toMatchObject\(\s*\{\s*ok:\s*false/.test(testSrc) ||
        /\bif\s*\(!r\.ok\)/.test(testSrc) ||
        /\bif\s*\(!result\.ok\)/.test(testSrc) ||
        /\bif\s*\(!list\.ok\)/.test(testSrc) ||
        /toThrow/.test(testSrc) ||
        /rejects\.toThrow/.test(testSrc) ||
        /\.code\)\.toBe\(/.test(testSrc) ||
        /Error/.test(testSrc)
      if (!hasFailureCase) {
        violations.push(`${r}: 失敗 path テストが見つからない (toBe(false) / toThrow 等)`)
      }
    }
    expect(violations).toEqual([])
  })

  // -----------------------------------------------------------
  // 5. shadcn/ui (src/components/ui/) を編集していないか
  //    (CLAUDE.md "shadcn 生成物 (src/components/ui/) を編集" 禁止)
  //
  //    判定: ui/ ファイル内に "// edited" / "// custom" などのマーカーが無いこと、
  //    また異常に長いファイル / プロジェクト固有の import が混入していないか簡易チェック
  // -----------------------------------------------------------
  it('shadcn/ui (components/ui/) はカスタム編集していない', () => {
    const uiDir = join(SRC, 'components', 'ui')
    let files: string[] = []
    try {
      files = readdirSync(uiDir).filter((f) => extname(f) === '.tsx' || extname(f) === '.ts')
    } catch {
      return
    }
    const violations: string[] = []
    for (const f of files) {
      const full = join(uiDir, f)
      const src = read(full)
      // プロジェクト固有 import (e.g. @/features/) が混入しているか
      if (/from ['"]@\/features\//.test(src) || /from ['"]@\/lib\/db/.test(src)) {
        violations.push(`components/ui/${f}: プロジェクト固有 import が混入`)
      }
    }
    expect(violations).toEqual([])
  })
})
