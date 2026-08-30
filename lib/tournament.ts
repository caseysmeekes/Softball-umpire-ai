import type { Assignment, Game } from './types'

export type TournamentDay = {
  id: string
  name: string
  date?: string
  games: Game[]
  assignments: Assignment[]
  manualLocks: string[]
}

export type Tournament = {
  name: string
  days: TournamentDay[]
}

export const DAY_COUNT = 5
export const DAY_NAMES = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5']

export function emptyTournament(): Tournament {
  return { name: 'Tournament', days: DAY_NAMES.map((name, index) => ({ id: `day-${index + 1}`, name, games: [], assignments: [], manualLocks: [] })) }
}

export function readTournament(defaultGames: Game[] = [], defaultAssignments: Assignment[] = [], defaultLocks: string[] = []): Tournament {
  try {
    const raw = localStorage.getItem('softball-tournament')
    if (raw) {
      const parsed = JSON.parse(raw) as Tournament
      if (parsed?.days?.length) return parsed
    }
  } catch {}
  const tournament = emptyTournament()
  tournament.days[0].games = defaultGames
  tournament.days[0].assignments = defaultAssignments
  tournament.days[0].manualLocks = defaultLocks
  tournament.days[0].date = defaultGames[0]?.date
  return tournament
}

export function saveTournament(tournament: Tournament) {
  localStorage.setItem('softball-tournament', JSON.stringify(tournament))
}

export function migrateLegacyDayStorage() {
  try {
    if (localStorage.getItem('softball-tournament')) return
    const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback } }
    const games = read<Game[]>('softball-games', [])
    const assignments = read<Assignment[]>('softball-assignments', [])
    const locks = read<string[]>('softball-manual-locks', [])
    saveTournament(readTournament(games, assignments, locks))
  } catch {}
}
