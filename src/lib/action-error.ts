export type ActionErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'UNKNOWN'

export class ActionError extends Error {
  readonly code: ActionErrorCode

  constructor(message: string, code: ActionErrorCode = 'UNKNOWN') {
    super(message)
    this.name = 'ActionError'
    this.code = code
  }
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'

const INTERNAL_MESSAGE_PATTERNS = [
  /prisma/i,
  /invalid `prisma/i,
  /unique constraint/i,
  /foreign key constraint/i,
  /connect ECONNREFUSED/i,
  /connection pool/i,
]

function looksLikeInternalMessage(message: string): boolean {
  return INTERNAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))
}

/** Duck-type Prisma known request errors — avoids `instanceof` (breaks when Prisma is client-bundled). */
export function isPrismaKnownRequestError(
  error: unknown,
): error is Error & { code: string } {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: unknown; code?: unknown }
  return (
    typeof candidate.code === 'string' &&
    /^P\d{4}$/.test(candidate.code) &&
    (candidate.name === 'PrismaClientKnownRequestError' ||
      // Some bundlers strip/alter `.name`; accept P-code + Error shape.
      error instanceof Error)
  )
}

export function mapPrismaError(error: unknown): ActionError | null {
  if (!isPrismaKnownRequestError(error)) return null

  switch (error.code) {
    case 'P2002':
      return new ActionError('That record already exists.', 'CONFLICT')
    case 'P2025':
      return new ActionError('Record not found.', 'NOT_FOUND')
    case 'P2003':
      return new ActionError('Related record not found.', 'NOT_FOUND')
    case 'P2014':
      return new ActionError('This change would break a required link.', 'VALIDATION')
    default:
      return null
  }
}

export function toUserMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  const mapped = mapPrismaError(error)
  if (mapped) return mapped.message

  if (error instanceof ActionError) return error.message

  if (error instanceof Error) {
    const message = error.message.trim()
    if (!message) return fallback
    if (
      process.env.NODE_ENV === 'production' &&
      looksLikeInternalMessage(message)
    ) {
      return fallback
    }
    return message
  }

  return fallback
}

export function logActionError(actionName: string, error: unknown) {
  console.error(`[${actionName}]`, error)
}

export function rethrowActionError(
  actionName: string,
  error: unknown,
  fallback = 'Could not complete that action',
): never {
  logActionError(actionName, error)
  const mapped = mapPrismaError(error)
  if (mapped) throw mapped
  if (error instanceof ActionError) throw error
  if (error instanceof Error && error.message.trim()) {
    throw new ActionError(toUserMessage(error, fallback))
  }
  throw new ActionError(fallback)
}
