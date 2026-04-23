/**
 * アプリ統一エラー型階層。Service / Repository / Action 全層でこれだけを throw する。
 * 例外を投げないパスは `Result<T, AppError>` を返す。
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = this.constructor.name
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

export const isAppError = (e: unknown): e is AppError => e instanceof AppError
