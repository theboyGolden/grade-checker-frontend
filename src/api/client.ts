import type {
  ApiErrorBody,
  ApiGradesSuccess,
  ApiMetadataResponse,
  StudentGrades,
} from '../types/grades'

/** Production API. Set `VITE_API_BASE=` (empty) in `.env.local` to use the Vite `/api` proxy to localhost. */
const DEFAULT_API_BASE = 'https://grade-checker-backend.onrender.com'

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined
  if (raw === '') return ''
  const chosen =
    raw !== undefined && raw.trim() !== '' ? raw.trim() : DEFAULT_API_BASE
  return chosen.replace(/\/+$/, '')
}

const base = resolveApiBase()

export class ApiError extends Error {
  status: number
  details?: string[]

  constructor(message: string, status: number, details?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function messageFromBody(body: ApiErrorBody, fallback: string): string {
  if (body.message) return body.message
  if (body.error) return body.error
  return fallback
}

export async function getMetadata(): Promise<ApiMetadataResponse['data'] | null> {
  const res = await fetch(`${base}/api/metadata`)
  const body = (await parseJson(res)) as ApiMetadataResponse | ApiErrorBody
  if (!res.ok) return null
  if ('data' in body && body.data) return body.data
  return null
}

export async function lookupGrades(indexNumber: string): Promise<StudentGrades> {
  let res: Response
  try {
    res = await fetch(`${base}/api/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indexNumber }),
    })
  } catch {
    throw new ApiError(
      'Cannot reach the grading server. Check that the API is running and your connection is stable.',
      0,
    )
  }

  const body = (await parseJson(res)) as ApiGradesSuccess | ApiErrorBody

  if (res.status === 429) {
    throw new ApiError(
      messageFromBody(
        body as ApiErrorBody,
        'Too many attempts from this device. Please wait before trying again.',
      ),
      429,
    )
  }

  if (res.status === 404) {
    throw new ApiError(
      messageFromBody(
        body as ApiErrorBody,
        'The index number you entered does not match any records.',
      ),
      404,
    )
  }

  if (res.status === 400) {
    const errBody = body as ApiErrorBody
    const details = errBody.details
    const msg = details?.length
      ? details.join(' ')
      : messageFromBody(errBody, 'Please enter a valid 10-digit index number.')
    throw new ApiError(msg, 400, details)
  }

  if (!res.ok) {
    throw new ApiError(
      messageFromBody(body as ApiErrorBody, res.statusText || 'Something went wrong.'),
      res.status,
    )
  }

  if ('success' in body && body.success && 'data' in body && body.data) {
    return body.data
  }

  throw new ApiError('Unexpected response from server.', res.status)
}
