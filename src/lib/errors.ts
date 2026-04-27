/**
 * アプリ統一エラー型階層。Service / Repository / Action 全層でこれだけを throw する。
 * 例外を投げないパスは `Result<T, AppError>` を返す。
 */

/**
 * Server Action 越しに Result<T, AppError> を返すとき、`cause` には ZodError や
 * 一般の Error / Symbol / 関数を含む値が紛れ込む可能性がある。これを未加工で
 * クライアント送信すると Next.js の RSC serializer が落ちて UI が crash するため、
 * AppError 構築時に **serializable な形** (string or plain object) に正規化する。
 */
function normalizeCause(cause: unknown): unknown {
  if (cause === undefined || cause === null) return undefined
  // ZodError を含む Error 派生は string 化 (stack は落とす — 既に message に詰まっている)
  if (cause instanceof Error) {
    // ZodError は .issues を持つ — 構造化情報を残しておく
    const issues = (cause as Error & { issues?: unknown }).issues
    if (Array.isArray(issues)) {
      return { name: cause.name, message: cause.message, issues }
    }
    return { name: cause.name, message: cause.message }
  }
  // primitive / plain object はそのまま (JSON.stringify が handle してくれる)
  const t = typeof cause
  if (t === 'string' || t === 'number' || t === 'boolean') return cause
  if (t === 'object') {
    try {
      // 構造化複製で循環参照やクラスインスタンス由来の関数を検出 → 落ちたら string 化
      JSON.stringify(cause)
      return cause
    } catch {
      return String(cause)
    }
  }
  return undefined
}

export class AppError extends Error {
  public readonly cause?: unknown
  constructor(
    public readonly code: string,
    message: string,
    cause?: unknown,
  ) {
    super(message)
    this.name = this.constructor.name
    this.cause = normalizeCause(cause)
    // Phase 6.15 iter145: Server Action 越しに JSON.stringify される時、
    // Error.prototype.message は non-enumerable なので落ちる
    // (`{}` になり、client 側 unwrap で message=undefined → toast が
    // fallback に倒れる)。enumerable 化して wire 経由で確実に届ける。
    Object.defineProperty(this, 'message', {
      value: message,
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }

  /**
   * Phase 6.15 iter145: Server Action 越しの直列化を保証する toJSON。
   * Next.js RSC / `react-server-dom-webpack` が enumerable 自前 prop しか
   * 拾わない仕様なので、明示的に code / message / name / cause を返す。
   */
  toJSON(): { code: string; message: string; name: string; cause?: unknown } {
    return {
      code: this.code,
      message: this.message,
      name: this.name,
      ...(this.cause !== undefined ? { cause: this.cause } : {}),
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('VALIDATION', message, cause)
  }
}

export class AuthError extends AppError {
  constructor(message = '未ログインです') {
    super('AUTH', message)
  }
}

export class PermissionError extends AppError {
  constructor(message = '権限がありません') {
    super('PERMISSION', message)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message)
  }
}

export class ConflictError extends AppError {
  constructor(message = '同時更新を検出しました。再読み込みしてください。') {
    super('CONFLICT', message)
  }
}

export class RateLimitError extends AppError {
  constructor(message = '上限に到達しました。しばらく待って再試行してください。') {
    super('RATE_LIMIT', message)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: unknown) {
    super('EXTERNAL', `${service} の呼び出しに失敗しました`, cause)
  }
}

/**
 * Agent / 長時間処理がユーザーから中止された時の signal。
 * tool-loop / researcher-service / pm-service が catch して invocation を
 * status='cancelled' に遷移させる。Server Action へは Result<T> の err として
 * 返り、UI は toast で "中止しました" を出す。
 */
export class CancelledError extends AppError {
  constructor(message = '実行を中止しました') {
    super('CANCELLED', message)
  }
}

/**
 * AI コスト月次上限を超過したときに Agent 起動を弾くエラー。
 * researcher / pm の pre-flight で `workspace_settings.monthly_cost_limit_usd` を
 * 当月集計と比較し、超過していたらこれを返す。
 */
export class BudgetExceededError extends AppError {
  constructor(message = 'AI コスト上限に達しています') {
    super('BUDGET_EXCEEDED', message)
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError
