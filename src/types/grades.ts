export type GradeMetadata = {
  generated_at: string
  total_students: number
  source_file: string
}

export type Scores = {
  raw: { assignment: number; quiz: number; midsem: number }
  weighted: { assignment: number; quiz: number; midsem: number }
}

export type StudentGrades = {
  indexNumber: string
  name: string
  scores: Scores
  finalScore: number
}

export type ApiMetadataResponse = {
  success: boolean
  data: GradeMetadata
}

export type ApiGradesSuccess = {
  success: true
  data: StudentGrades
}

export type ApiErrorBody = {
  error?: string
  message?: string
  details?: string[]
}
