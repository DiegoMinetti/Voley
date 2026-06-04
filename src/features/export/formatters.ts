import { projectMatch } from '../scoring/projector'
import type { MatchRecord } from '../../types/models'

const formatDateTime = (timestamp: number): string =>
  new Date(timestamp).toISOString()

const getFinalScore = (match: MatchRecord): string => {
  const projected = projectMatch(match, match.updatedAt)
  return `${projected.setsWon.A}-${projected.setsWon.B}`
}

export const exportMatchAsJson = (match: MatchRecord): string =>
  JSON.stringify({ match }, null, 2)

export const exportMatchesAsJson = (matches: MatchRecord[]): string =>
  JSON.stringify({ matches }, null, 2)

export const exportMatchesAsCsv = (matches: MatchRecord[]): string => {
  const headers = [
    'id',
    'createdAt',
    'updatedAt',
    'teamA',
    'teamB',
    'status',
    'setsResult',
    'events',
  ]

  const rows = matches.map((match) => {
    const values = [
      match.id,
      formatDateTime(match.createdAt),
      formatDateTime(match.updatedAt),
      match.teams.A.name,
      match.teams.B.name,
      match.status,
      getFinalScore(match),
      String(match.cursor),
    ]

    return values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

export const parseImportedMatches = (content: string): MatchRecord[] => {
  const parsed = JSON.parse(content) as { match?: MatchRecord; matches?: MatchRecord[] }

  if (parsed.match) {
    return [parsed.match]
  }

  if (parsed.matches) {
    return parsed.matches
  }

  throw new Error('Archivo de importacion invalido')
}

export const triggerDownload = (
  filename: string,
  content: string,
  mimeType: string,
): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
