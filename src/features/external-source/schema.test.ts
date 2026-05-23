/**
 * iter1099 basics: `external-source/schema.ts` の zod schema test を追加。
 *
 * 外部取込 source 系 schema (Yamory / CustomRest config + Create/Update input)。
 * discriminatedUnion('kind') で 2 つの source kind を分岐、各 config の URL 必須
 * + token min 1 + Update の「最低 1 件 patch」 refine を回帰防止。
 */
import { describe, expect, it } from 'vitest'

import {
  CreateSourceInputSchema,
  CustomRestConfigSchema,
  UpdateSourceInputSchema,
  YamoryConfigSchema,
} from './schema'

const VALID_UUID = '00000000-0000-4000-8000-000000000000'

describe('YamoryConfigSchema', () => {
  it('token のみ最小入力で accept', () => {
    expect(() => YamoryConfigSchema.parse({ token: 'secret' })).not.toThrow()
  })

  it('token 空文字を reject', () => {
    expect(() => YamoryConfigSchema.parse({ token: '' })).toThrow()
  })

  it('baseUrl が URL 形式でないと reject', () => {
    expect(() => YamoryConfigSchema.parse({ token: 'x', baseUrl: 'not-url' })).toThrow()
  })

  it('projectIds 配列 + 各種 path を accept', () => {
    expect(() =>
      YamoryConfigSchema.parse({
        token: 'secret',
        projectIds: ['proj1', 'proj2'],
        endpointTemplate: '/v3/{projectId}/issues',
        itemsPath: 'data',
        idPath: 'uuid',
        titlePath: 'name',
        duePath: 'deadline',
      }),
    ).not.toThrow()
  })

  // iter1153: config 内 string.min(1) に ja message 付与の回帰防止
  it('token 空 reject 時 ja message が出る', () => {
    const r = YamoryConfigSchema.safeParse({ token: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('Yamory API token'))).toBe(true)
    }
  })

  it('projectIds 内の空文字 reject 時 ja message が出る', () => {
    const r = YamoryConfigSchema.safeParse({ token: 'ok', projectIds: ['p1', ''] })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('projectId は空でない'))).toBe(true)
    }
  })

  it('endpointTemplate 空 reject 時 ja message が出る', () => {
    const r = YamoryConfigSchema.safeParse({ token: 'ok', endpointTemplate: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('エンドポイント template'))).toBe(true)
    }
  })
})

describe('CustomRestConfigSchema', () => {
  const baseValid = {
    url: 'https://api.example.com/items',
    idPath: 'id',
    titlePath: 'title',
  }

  it('url + idPath + titlePath で accept、method default GET', () => {
    const parsed = CustomRestConfigSchema.parse(baseValid)
    expect(parsed.method).toBe('GET')
  })

  it('url が URL 形式でないと reject', () => {
    expect(() => CustomRestConfigSchema.parse({ ...baseValid, url: 'bad' })).toThrow()
  })

  it('method は GET / POST のみ accept', () => {
    expect(() => CustomRestConfigSchema.parse({ ...baseValid, method: 'PUT' })).toThrow()
    expect(() => CustomRestConfigSchema.parse({ ...baseValid, method: 'POST' })).not.toThrow()
  })

  it('idPath / titlePath 空文字を reject', () => {
    expect(() => CustomRestConfigSchema.parse({ ...baseValid, idPath: '' })).toThrow()
    expect(() => CustomRestConfigSchema.parse({ ...baseValid, titlePath: '' })).toThrow()
  })

  // iter1153: config 内 string.min(1) に ja message 付与の回帰防止
  it('idPath 空 ja message が出る', () => {
    const r = CustomRestConfigSchema.safeParse({ ...baseValid, idPath: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('id パスを入力'))).toBe(true)
    }
  })

  it('titlePath 空 ja message が出る', () => {
    const r = CustomRestConfigSchema.safeParse({ ...baseValid, titlePath: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs.some((m) => m.includes('title パスを入力'))).toBe(true)
    }
  })
})

describe('CreateSourceInputSchema (discriminatedUnion)', () => {
  const yamoryValid = {
    workspaceId: VALID_UUID,
    name: 'Yamory 本番',
    kind: 'yamory' as const,
    config: { token: 'secret' },
  }
  const customValid = {
    workspaceId: VALID_UUID,
    name: 'カスタム REST',
    kind: 'custom-rest' as const,
    config: {
      url: 'https://api.example.com/items',
      idPath: 'id',
      titlePath: 'title',
    },
  }

  it('kind=yamory + YamoryConfig で accept、scheduleCron default null', () => {
    const parsed = CreateSourceInputSchema.parse(yamoryValid)
    expect(parsed.kind).toBe('yamory')
    expect(parsed.scheduleCron).toBe(null)
  })

  it('kind=custom-rest + CustomRestConfig で accept', () => {
    expect(() => CreateSourceInputSchema.parse(customValid)).not.toThrow()
  })

  it('kind 不明だと discriminator で reject', () => {
    expect(() => CreateSourceInputSchema.parse({ ...yamoryValid, kind: 'jira' })).toThrow()
  })

  it('name 空文字 / 200 文字超過で reject', () => {
    expect(() => CreateSourceInputSchema.parse({ ...yamoryValid, name: '' })).toThrow()
    expect(() => CreateSourceInputSchema.parse({ ...yamoryValid, name: 'x'.repeat(201) })).toThrow()
  })
})

describe('UpdateSourceInputSchema', () => {
  it('patch 空オブジェクトを reject (refine `keys > 0`)', () => {
    expect(() =>
      UpdateSourceInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: {},
      }),
    ).toThrow()
  })

  it('name のみ patch で accept', () => {
    expect(() =>
      UpdateSourceInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { name: '新名' },
      }),
    ).not.toThrow()
  })

  it('enabled トグルのみ patch で accept', () => {
    expect(() =>
      UpdateSourceInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 1,
        patch: { enabled: false },
      }),
    ).not.toThrow()
  })

  it('scheduleCron null 明示で accept (停止 意図)', () => {
    expect(() =>
      UpdateSourceInputSchema.parse({
        id: VALID_UUID,
        expectedVersion: 0,
        patch: { scheduleCron: null },
      }),
    ).not.toThrow()
  })
})
