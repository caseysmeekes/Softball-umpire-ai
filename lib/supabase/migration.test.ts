import { describe, expect, it } from 'vitest'
import { emptyTournament } from './tournament'
import { validateLocalSnapshot, type LocalStorageSnapshot } from './supabase/migration'

describe('Supabase local-storage migration validation', () => {
  const baseSnapshot = (): LocalStorageSnapshot => {
    const tournament = emptyTournament()
    tournament.days[0].games = [{
      id: 'game-1', number: 1, date: '2026-09-01', start: '10:00 AM', end: '11:00 AM',
      field: 'Diamond 1', teams: 'Team A vs Team B', division: 'Senior', positions: ['Plate', 'Base 1', 'Base 2', 'Base 3'],
    }]
    tournament.days[0].assignments = [{ gameId: 'game-1', umpireId: 'u1', position: 'Plate' }]
    tournament.days[0].manualLocks = ['game-1::Plate']
    return {
      tournament,
      umpires: [{ id: 'u1', name: 'Smith', availability: 'All day', maxGames: 3, experience: 'International' }],
      enabledRuleIds: [],
      history: [{ id: 'history-1', day: 0, gameId: 'game-1', gameNumber: 1, time: '10:00 AM', diamond: 'Diamond 1', position: 'Plate', from: 'Unallocated', to: 'Smith', status: 'Committed' }],
      selectedDay: 0,
      source: 'tournament',
    }
  }

  it('accepts a valid multi-day-compatible snapshot and 12-hour game times', () => {
    expect(() => validateLocalSnapshot(baseSnapshot())).not.toThrow()
  })

  it('rejects allocations that reference an unknown umpire', () => {
    const snapshot = baseSnapshot()
    snapshot.tournament.days[0].assignments[0].umpireId = 'missing'
    expect(() => validateLocalSnapshot(snapshot)).toThrow(/unknown umpire/i)
  })

  it('rejects a manual lock without a matching allocation', () => {
    const snapshot = baseSnapshot()
    snapshot.tournament.days[0].manualLocks = ['game-1::Base 1']
    expect(() => validateLocalSnapshot(snapshot)).toThrow(/no matching allocation/i)
  })

  it('rejects invalid time formats before any Supabase write', () => {
    const snapshot = baseSnapshot()
    snapshot.tournament.days[0].games[0].start = 'not-a-time'
    expect(() => validateLocalSnapshot(snapshot)).toThrow(/Invalid time/i)
  })

  it('rejects duplicate game IDs across days', () => {
    const snapshot = baseSnapshot()
    snapshot.tournament.days[1].games = [{ ...snapshot.tournament.days[0].games[0], number: 2 }]
    expect(() => validateLocalSnapshot(snapshot)).toThrow(/Duplicate game ID/i)
  })
})
