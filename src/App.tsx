import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { ApiError, getMetadata, lookupGrades } from './api/client'
import type { GradeMetadata, StudentGrades } from './types/grades'
import './App.css'

const INDEX_LEN = 10
const COMPONENTS = [
  { key: 'assignment', label: 'Assignment' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'midsem', label: 'Mid-semester' },
] as const

function readScore(
  result: StudentGrades,
  key: (typeof COMPONENTS)[number]['key'],
): number | undefined {
  const scores = result.scores
  if (!scores) return undefined
  const nested = scores.raw?.[key]
  if (typeof nested === 'number') return nested
  const flat = scores[key]
  if (typeof flat === 'number') return flat
  return undefined
}

function formatScore(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatFinalScore(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return String(Math.round(value))
}

function formatIndexDisplay(digits: string): string {
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)} ${digits.slice(4)}`
}

function validateClientIndex(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  if (d.length !== INDEX_LEN) {
    return `Index number must be exactly ${INDEX_LEN} digits.`
  }
 return null
}

export default function App() {
  const formId = useId()
  const [indexInput, setIndexInput] = useState('')
  const [metadata, setMetadata] = useState<GradeMetadata | null>(null)
  const [metaLoaded, setMetaLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<{
    message: string
    kind: 'notfound' | 'rate' | 'other'
  } | null>(null)
  const [result, setResult] = useState<StudentGrades | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await getMetadata()
      if (!cancelled) {
        setMetadata(data)
        setMetaLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const digitsOnly = indexInput.replace(/\D/g, '').slice(0, INDEX_LEN)

  const onChangeIndex = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value.replace(/\D/g, '').slice(0, INDEX_LEN)
      setIndexInput(next)
      setClientError(null)
      setServerError(null)
      setResult(null)
    },
    [],
  )

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setResult(null)
      setServerError(null)
      const local = validateClientIndex(digitsOnly)
      if (local) {
        setClientError(local)
        return
      }
      setClientError(null)
      setLoading(true)
      try {
        const data = await lookupGrades(digitsOnly)
        setResult(data)
      } catch (err) {
        if (err instanceof ApiError) {
          const kind =
            err.status === 429
              ? 'rate'
              : err.status === 404
                ? 'notfound'
                : 'other'
          setServerError({ message: err.message, kind })
        } else if (err instanceof Error) {
          setServerError({ message: err.message, kind: 'other' })
        } else {
          setServerError({
            message: 'Something went wrong. Please try again.',
            kind: 'other',
          })
        }
      } finally {
        setLoading(false)
      }
    },
    [digitsOnly],
  )

  const rows = result
    ? COMPONENTS.map(({ key, label }) => ({
        label,
        score: readScore(result, key),
      }))
    : []

  return (
    <div className="app">
      <div className="shell">
        <header className="header">
          <div className="badge">
            <span
              className={`badge-dot ${metaLoaded && metadata ? '' : 'offline'}`}
              aria-hidden
            />
            {metaLoaded && metadata ? 'Records loaded' : 'Connecting…'}
          </div>
          <h1 className="title">Reading & Writing Grade checker</h1>
          <p className="subtitle">
            Enter your index number to view your scores and final result.
      
          </p>
          {/* {metadata && (
            <div className="meta-bar" aria-live="polite">
              <span>
                <strong>{metadata.total_students}</strong> students on file
              </span>
              <span>
                Updated <strong>{formatDateHint(metadata.generated_at)}</strong>
              </span>
              <span>
                Source <strong>{metadata.source_file}</strong>
              </span>
            </div>
          )} */}
        </header>

        <div className="glass card">
          <form className="form" onSubmit={onSubmit} noValidate>
            <div>
              <label className="label" htmlFor={formId}>
                Index number
              </label>
              <div className="input-wrap">
                <input
                  id={formId}
                  className="input"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0000000000"
                  value={formatIndexDisplay(digitsOnly)}
                  onChange={onChangeIndex}
                  aria-invalid={!!clientError}
                  aria-describedby={`${formId}-hint`}
                />
              </div>
              <p id={`${formId}-hint`} className="hint">
                Exactly {INDEX_LEN} digits, no spaces or letters.
              </p>
            </div>

            {clientError && (
              <div
                className="alert alert-error"
                role="alert"
                aria-live="assertive"
              >
                <span className="alert-icon" aria-hidden>
                  !
                </span>
                <div>{clientError}</div>
              </div>
            )}

            {serverError && (
              <div
                className={`alert ${serverError.kind === 'rate' ? 'alert-warn' : 'alert-error'}`}
                role="alert"
                aria-live="assertive"
              >
                <span className="alert-icon" aria-hidden>
                  {serverError.kind === 'rate' ? '⏱' : '!'}
                </span>
                <div>{serverError.message}</div>
              </div>
            )}

            <button
              type="submit"
              className="submit"
              disabled={loading || digitsOnly.length !== INDEX_LEN}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden />
                  Looking up…
                </>
              ) : (
                'View my grades'
              )}
            </button>
          </form>

          {result && (
            <section className="result" aria-labelledby="result-heading">
              <h2 id="result-heading" className="sr-only">
                Your results
              </h2>
              <div className="result-header">
                <div>
                  <p className="result-name">{result.name}</p>
                  <p className="result-index">Index {result.indexNumber}</p>
                </div>
                <div className="score-pill">
                  <span className="score-pill-label">Final score</span>
                  <span className="score-pill-value">
                    {formatFinalScore(result.finalScore)}
                  </span>
                </div>
              </div>

              <div className="table-wrap">
                <table className="breakdown">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td className="num">{formatScore(row.score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <p className="footer-note">
        Copyright 2026 MPT libraries. All rights reserved.
        {/* This grade portal shows your raw scores for each assessment component: 
        Assignment (graded out of 20 marks), Quiz (graded out of 10 marks), 
        and Mid Semester Exam (graded out of 40 marks). Each component contributes 
        20% toward your final total score, calculated as (your raw score ÷ maximum 
        possible marks) × 20. For example, a quiz score of 7 out of 10 becomes (7 ÷ 10) 
        × 20 = 14 weighted points. The three weighted scores are then added together to 
        give your final total out of 60. Bonus marks have been added. If you see a zero 
        for any component, it means you did not participate in that assessment or no score 
        was recorded. */}


          {/* Having trouble? Confirm the API is running and that this app uses a dev
          proxy or matches your server&apos;s allowed origin. Rate limits apply
          per device. */}
        </p>
      </div>
    </div>
  )
}
