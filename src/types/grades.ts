export type GradeMetadata = {
  generated_at: string
  total_students: number
  source_file: string
}

export type ComponentScores = {
  assignment?: number
  quiz?: number
  midsem?: number
}

export type Scores = {
  raw?: ComponentScores
  weighted?: ComponentScores
} & ComponentScores

export type StudentGrades = {
  indexNumber: string
  name: string
  scores?: Scores
  finalScore?: number
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
