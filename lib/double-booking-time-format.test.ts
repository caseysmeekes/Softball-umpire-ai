import { describe, expect, it } from 'vitest'
import { validateUmpire } from './rules'
import type { Assignment, Game, Umpire } from './types'

const umpire: Umpire = {
  id: 'u1',
  name: 'Alex Black',
  availability: 'All day',
  maxGames: 5,
  experience: 'National',
}

const assignment = (gameId: string, position: Assignment['position']): Assignment => ({
  gameId,
  umpireId: umpire.id,
  position,
})

describe('double booking time formats', () => {
  it('flags both games when imported schedule times use 12-hour AM format', () => {
    const games: Game[] = [
      { id: 'g31', number: 31, date: '2026-08-30', start: '10:00 AM', end: '11:00 AM', field: 'Diamond 1', teams: 'PCU vs Rolleston', division: 'Test', positions: ['Plate', 'Base 1', 'Base 2', 'Base 3'] },
      { id: 'g32', number: 32, date: '2026-08-30', start: '10:00 AM', end: '11:00 AM', field: 'Diamond 2', teams: 'Papanui vs PCU', division: 'Test', positions: ['Plate', 'Base 1', 'Base 2', 'Base 3'] },
    ]

    const issues = validateUmpire(
      umpire,
      games,
      [assignment('g31', 'Base 1'), assignment('g32', 'Base 1')],
      ['no-double-booking'],
    )

    const doubleBookings = issues.filter(v => v.rule === 'NO_DOUBLE_BOOKING')
    expect(doubleBookings).toHaveLength(2)
    expect(doubleBookings.map(v => v.gameId).sort()).toEqual(['g31', 'g32'])
  })

  it('does not flag non-overlapping 12-hour schedule times', () => {
    const games: Game[] = [
      { id: 'g1', number: 1, date: '2026-08-30', start: '10:00 AM', end: '11:00 AM', field: 'Diamond 1', teams: 'A vs B', division: 'Test', positions: ['Plate', 'Base 1'] },
      { id: 'g2', number: 2, date: '2026-08-30', start: '12:00 PM', end: '1:00 PM', field: 'Diamond 2', teams: 'C vs D', division: 'Test', positions: ['Plate', 'Base 1'] },
    ]

    const issues = validateUmpire(
      umpire,
      games,
      [assignment('g1', 'Base 1'), assignment('g2', 'Base 1')],
      ['no-double-booking'],
    )

    expect(issues.some(v => v.rule === 'NO_DOUBLE_BOOKING')).toBe(false)
  })
})
