import { describe, expect, it } from 'vitest'
import { buildUmpirePairingMatrix, buildUmpireTeamMatrix, splitTeams } from './analysis'
import type { Assignment, Game, Umpire } from './types'

const umpires: Umpire[] = [
  { id: 'u1', name: 'Alice', availability: 'All day', maxGames: 3, experience: 'National' },
  { id: 'u2', name: 'Bob', availability: 'All day', maxGames: 3, experience: 'National' },
  { id: 'u3', name: 'Cara', availability: 'All day', maxGames: 3, experience: 'Regional' },
]

const games: Game[] = [
  { id: 'g1', number: 1, date: '2026-09-01', start: '09:00', field: 'D1', teams: 'Tigers vs Bears', division: 'A', positions: ['Plate', 'Base 1', 'Base 3'] },
  { id: 'g2', number: 2, date: '2026-09-01', start: '10:00', field: 'D1', teams: 'Tigers vs Lions', division: 'A', positions: ['Plate', 'Base 1'] },
]

const assignments: Assignment[] = [
  { gameId: 'g1', umpireId: 'u1', position: 'Plate' },
  { gameId: 'g1', umpireId: 'u2', position: 'Base 1' },
  { gameId: 'g1', umpireId: 'u3', position: 'Base 3' },
  { gameId: 'g2', umpireId: 'u1', position: 'Plate' },
  { gameId: 'g2', umpireId: 'u2', position: 'Base 1' },
]

describe('analysis calculations', () => {
  it('splits standard team notation', () => {
    expect(splitTeams('Tigers vs Bears')).toEqual(['Tigers', 'Bears'])
  })

  it('counts each umpire pair once per game and remains symmetrical', () => {
    const matrix = buildUmpirePairingMatrix(umpires, games, assignments)
    expect(matrix.values).toEqual([
      [0, 2, 1],
      [2, 0, 1],
      [1, 1, 0],
    ])
  })

  it('counts each umpire against both teams on games they worked', () => {
    const matrix = buildUmpireTeamMatrix(umpires, games, assignments)
    expect(matrix.labels).toEqual(['Alice', 'Bob', 'Cara'])
    expect(matrix.teamLabels).toBeUndefined()
    expect(matrix.values).toEqual([
      [2, 2, 1],
      [2, 2, 1],
      [1, 1, 0],
    ])
  })
})
