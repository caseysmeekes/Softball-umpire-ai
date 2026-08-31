import { describe, expect, it } from 'vitest'
import { validateUmpire } from './rules'
import { Assignment, Game, Umpire } from './types'

const umpire: Umpire = { id: 'u1', name: 'Test', availability: 'All day', maxGames: 3, experience: 'National' }
const games: Game[] = [
  { id: 'g1', number: 1, date: '2026-08-30', start: '09:00', end: '10:20', field: '1', teams: 'A v B', division: 'X', positions: ['Plate', 'Base 1', 'Base 2', 'Base 3'] },
  { id: 'g2', number: 2, date: '2026-08-30', start: '10:30', end: '11:50', field: '1', teams: 'C v D', division: 'X', positions: ['Plate', 'Base 1', 'Base 2', 'Base 3'] },
  { id: 'g3', number: 3, date: '2026-08-30', start: '12:00', end: '13:20', field: '1', teams: 'E v F', division: 'X', positions: ['Plate', 'Base 1', 'Base 2', 'Base 3'] },
  { id: 'g4', number: 4, date: '2026-08-30', start: '13:30', end: '14:50', field: '1', teams: 'G v H', division: 'X', positions: ['Plate', 'Base 1', 'Base 2', 'Base 3'] },
]
const a = (gameId: string, position: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'): Assignment => ({ gameId, position, umpireId: 'u1' })

describe('allocation rules', () => {
  it('flags the same umpire in Plate and 1st Base in one game', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Plate'), a('g1', 'Base 1')])
    expect(issues.some(v => v.rule === 'SAME_GAME_MULTIPLE_POSITIONS' && v.severity === 'hard' && v.gameId === 'g1')).toBe(true)
  })
  it('flags the same umpire in Plate and 2nd Base in one game', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Plate'), a('g1', 'Base 2')])
    expect(issues.some(v => v.rule === 'SAME_GAME_MULTIPLE_POSITIONS' && v.severity === 'hard' && v.gameId === 'g1')).toBe(true)
  })
  it('flags the same umpire in Plate and 3rd Base in one game', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Plate'), a('g1', 'Base 3')])
    expect(issues.some(v => v.rule === 'SAME_GAME_MULTIPLE_POSITIONS' && v.severity === 'hard' && v.gameId === 'g1')).toBe(true)
  })
  it('flags the same umpire in 1st and 2nd Base in one game', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Base 1'), a('g1', 'Base 2')])
    expect(issues.some(v => v.rule === 'SAME_GAME_MULTIPLE_POSITIONS' && v.severity === 'hard' && v.gameId === 'g1')).toBe(true)
  })
  it('flags the same umpire in 1st and 3rd Base in one game', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Base 1'), a('g1', 'Base 3')])
    expect(issues.some(v => v.rule === 'SAME_GAME_MULTIPLE_POSITIONS' && v.severity === 'hard' && v.gameId === 'g1')).toBe(true)
  })
  it('flags the same umpire in 2nd and 3rd Base in one game', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Base 2'), a('g1', 'Base 3')])
    expect(issues.some(v => v.rule === 'SAME_GAME_MULTIPLE_POSITIONS' && v.severity === 'hard' && v.gameId === 'g1')).toBe(true)
  })
  it('flags Plate plus any Base position as a hard core violation', () => {
    for (const position of ['Base 1', 'Base 2', 'Base 3'] as const) {
      const issues = validateUmpire(umpire, games, [a('g1', 'Plate'), a('g1', position)])
      expect(issues.some(v => v.rule === 'SAME_GAME_MULTIPLE_POSITIONS' && v.severity === 'hard')).toBe(true)
    }
  })
  it('flags both games for a simultaneous double booking', () => {
    const simultaneous = [games[0], { ...games[1], start: '10:00', end: '11:20' }]
    const issues = validateUmpire(umpire, simultaneous, [a('g1', 'Plate'), a('g2', 'Base 1')], ['no-double-booking'])
    expect(issues.filter(v => v.rule === 'NO_DOUBLE_BOOKING')).toHaveLength(2)
    expect(issues.some(v => v.gameId === 'g1')).toBe(true)
    expect(issues.some(v => v.gameId === 'g2')).toBe(true)
  })
  it('flags overlapping games regardless of position', () => {
    const overlapping: Game[] = [games[0], { ...games[1], start: '10:10', end: '11:30' }]
    const issues = validateUmpire(umpire, overlapping, [a('g1', 'Base 1'), a('g2', 'Base 3')], ['no-double-booking'])
    expect(issues.filter(v => v.rule === 'NO_DOUBLE_BOOKING')).toHaveLength(2)
  })
  it('allows 1st Base -> Plate back-to-back', () => {
    expect(validateUmpire(umpire, games, [a('g1', 'Base 1'), a('g2', 'Plate')], ['back-to-back'])).not.toContainEqual(expect.objectContaining({ rule: 'BACK_TO_BACK' }))
  })
  it('allows 2nd Base -> Plate back-to-back', () => {
    expect(validateUmpire(umpire, games, [a('g1', 'Base 2'), a('g2', 'Plate')], ['back-to-back'])).not.toContainEqual(expect.objectContaining({ rule: 'BACK_TO_BACK' }))
  })
  it('allows 3rd Base -> Plate back-to-back', () => {
    expect(validateUmpire(umpire, games, [a('g1', 'Base 3'), a('g2', 'Plate')], ['back-to-back'])).not.toContainEqual(expect.objectContaining({ rule: 'BACK_TO_BACK' }))
  })
  it('allows Base -> Base back-to-back', () => {
    expect(validateUmpire(umpire, games, [a('g1', 'Base 1'), a('g2', 'Base 3')], ['back-to-back'])).not.toContainEqual(expect.objectContaining({ rule: 'BACK_TO_BACK' }))
  })
  it('rejects Plate -> 1st Base back-to-back', () => {
    expect(validateUmpire(umpire, games, [a('g1', 'Plate'), a('g2', 'Base 1')], ['back-to-back']).some(v => v.rule === 'BACK_TO_BACK' && v.severity === 'hard')).toBe(true)
  })
  it('rejects Plate -> 2nd Base back-to-back', () => {
    expect(validateUmpire(umpire, games, [a('g1', 'Plate'), a('g2', 'Base 2')], ['back-to-back']).some(v => v.rule === 'BACK_TO_BACK' && v.severity === 'hard')).toBe(true)
  })
  it('rejects Plate -> 3rd Base back-to-back', () => {
    expect(validateUmpire(umpire, games, [a('g1', 'Plate'), a('g2', 'Base 3')], ['back-to-back']).some(v => v.rule === 'BACK_TO_BACK' && v.severity === 'hard')).toBe(true)
  })
  it('does not treat assignments separated by another scheduled game as back-to-back', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Plate'), a('g3', 'Base 1')], ['back-to-back'])
    expect(issues.some(v => v.rule === 'BACK_TO_BACK')).toBe(false)
  })
  it('still enforces the separate Plate break rule', () => {
    expect(validateUmpire(umpire, games, [a('g1', 'Plate'), a('g2', 'Plate')], ['plate-break']).some(v => v.rule === 'PLATE_BREAK' && v.severity === 'hard')).toBe(true)
  })
  it('rejects a fourth game when maximum games is enabled', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Base 1'), a('g2', 'Plate'), a('g3', 'Base 1'), a('g4', 'Base 3')], ['max-games'])
    expect(issues.some(v => v.rule === 'MAX_GAMES' && v.severity === 'hard')).toBe(true)
  })
  it('revalidates when the enabled rule set changes', () => {
    const assignments = [a('g1', 'Base 1'), a('g2', 'Base 1'), a('g3', 'Base 1'), a('g4', 'Base 3')]
    expect(validateUmpire(umpire, games, assignments, ['one-plate'])).not.toContainEqual(expect.objectContaining({ rule: 'MAX_GAMES' }))
    expect(validateUmpire(umpire, games, assignments, ['max-games']).some(v => v.rule === 'MAX_GAMES' && v.severity === 'hard')).toBe(true)
  })
  it('flags a second Plate as a soft warning, not a hard violation', () => {
    const issues = validateUmpire(umpire, games, [a('g1', 'Plate'), a('g3', 'Plate')], ['one-plate'])
    expect(issues.some(v => v.rule === 'ONE_PLATE' && v.severity === 'soft')).toBe(true)
    expect(issues.some(v => v.rule === 'ONE_PLATE' && v.severity === 'hard')).toBe(false)
  })
  it('does not count another day towards the daily maximum', () => {
    const nextDay: Game = { ...games[3], id: 'g5', number: 5, date: '2026-08-31' }
    const assignments = [a('g1', 'Base 1'), a('g2', 'Base 1'), a('g3', 'Base 1'), { ...a('g4', 'Base 3'), gameId: 'g5' }]
    expect(validateUmpire(umpire, [...games, nextDay], assignments, ['max-games']).some(v => v.rule === 'MAX_GAMES')).toBe(false)
  })
  it('does not mix rules across tournament days', () => {
    const nextDay: Game = { ...games[1], id: 'g6', number: 6, date: '2026-08-31', start: '09:00', end: '10:20' }
    const issues = validateUmpire(umpire, [...games, nextDay], [a('g1', 'Plate'), { ...a('g6', 'Base 1'), gameId: 'g6' }], ['back-to-back'])
    expect(issues.some(v => v.rule === 'BACK_TO_BACK')).toBe(false)
  })

  it('allows a game fully inside the configured availability window', () => {
    const u: Umpire = { ...umpire, availabilityByDay: { 0: { enabled: true, from: '08:00', until: '17:00' } } }
    const issues = validateUmpire(u, games, [a('g1', 'Base 1')], ['availability'], 0)
    expect(issues.some(v => v.rule === 'AVAILABILITY')).toBe(false)
  })

  it('flags an appointment outside configured availability', () => {
    const u: Umpire = { ...umpire, availabilityByDay: { 0: { enabled: true, from: '10:00', until: '17:00' } } }
    const issues = validateUmpire(u, games, [a('g1', 'Base 1')], ['availability'], 0)
    expect(issues.some(v => v.rule === 'AVAILABILITY' && v.severity === 'hard' && v.gameId === 'g1')).toBe(true)
  })

  it('allows a game starting exactly at availability start', () => {
    const u: Umpire = { ...umpire, availabilityByDay: { 0: { enabled: true, from: '09:00', until: '17:00' } } }
    const issues = validateUmpire(u, games, [a('g1', 'Base 1')], ['availability'], 0)
    expect(issues.some(v => v.rule === 'AVAILABILITY')).toBe(false)
  })

  it('allows a game ending exactly at availability end', () => {
    const u: Umpire = { ...umpire, availabilityByDay: { 0: { enabled: true, from: '08:00', until: '10:20' } } }
    const issues = validateUmpire(u, games, [a('g1', 'Base 1')], ['availability'], 0)
    expect(issues.some(v => v.rule === 'AVAILABILITY')).toBe(false)
  })

  it('flags an umpire configured as unavailable', () => {
    const u: Umpire = { ...umpire, availabilityByDay: { 0: { enabled: false, from: '08:00', until: '17:00' } } }
    const issues = validateUmpire(u, games, [a('g1', 'Base 1')], ['availability'], 0)
    expect(issues.some(v => v.rule === 'AVAILABILITY' && v.severity === 'hard')).toBe(true)
  })

  it('isolates availability by tournament day', () => {
    const nextDay: Game = { ...games[0], id: 'g5', number: 5, date: '2026-08-31' }
    const u: Umpire = { ...umpire, availabilityByDay: { 0: { enabled: false, from: '00:00', until: '23:59' }, 1: { enabled: true, from: '08:00', until: '17:00' } } }
    const day1Issues = validateUmpire(u, games, [a('g1', 'Base 1')], ['availability'], 0)
    const day2Issues = validateUmpire(u, [nextDay], [{ ...a('g5', 'Base 1'), gameId: 'g5' }], ['availability'], 1)
    expect(day1Issues.some(v => v.rule === 'AVAILABILITY')).toBe(true)
    expect(day2Issues.some(v => v.rule === 'AVAILABILITY')).toBe(false)
  })
})
