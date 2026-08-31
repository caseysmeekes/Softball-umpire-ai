import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadTournamentFromSupabase } from './data'

const rows = {
  tournaments: [{ id: 'supabase-tournament-1', name: 'UAT Tournament', created_at: '', updated_at: '' }],
  tournament_days: [
    { id: 'db-day-1', tournament_id: 'supabase-tournament-1', legacy_id: 'day-1', day_index: 0, name: 'Day 1', date: '2026-09-01', created_at: '' },
    { id: 'db-day-2', tournament_id: 'supabase-tournament-1', legacy_id: 'day-2', day_index: 1, name: 'Day 2', date: '2026-09-02', created_at: '' },
  ],
  umpires: [
    { id: 'u1', tournament_id: 'supabase-tournament-1', name: 'Smith', experience: 'International' as const, max_games: 3, legacy_availability: 'All day', created_at: '', updated_at: '' },
  ],
  tournament_rules: [{ tournament_id: 'supabase-tournament-1', rule_id: 'MAX_GAMES', enabled: true, updated_at: '' }],
  games: [
    { id: 'g1', tournament_day_id: 'db-day-1', number: 1, date: '2026-09-01', start_time: '10:00:00', end_time: '11:00:00', field: 'Diamond 1', teams: 'A vs B', division: 'Senior', positions: ['Plate', 'Base 1'], created_at: '', updated_at: '' },
    { id: 'g2', tournament_day_id: 'db-day-2', number: 1, date: '2026-09-02', start_time: '09:30:00', end_time: '10:30:00', field: 'Diamond 2', teams: 'C vs D', division: 'Senior', positions: ['Plate'], created_at: '', updated_at: '' },
  ],
  umpire_availability: [
    { id: 'a1', umpire_id: 'u1', tournament_day_id: 'db-day-1', enabled: true, from_time: '08:00:00', until_time: '17:00:00', created_at: '', updated_at: '' },
    { id: 'a2', umpire_id: 'u1', tournament_day_id: 'db-day-2', enabled: false, from_time: null, until_time: null, created_at: '', updated_at: '' },
  ],
  allocations: [
    { game_id: 'g1', umpire_id: 'u1', position: 'Plate' as const, created_at: '', updated_at: '' },
  ],
  manual_locks: [
    { game_id: 'g1', position: 'Plate' as const, umpire_id: 'u1', created_at: '' },
  ],
  allocation_change_history: [
    { id: 'h1', tournament_day_id: 'db-day-1', game_id: 'g1', game_number: 1, time: '10:00 AM', diamond: 'Diamond 1', position: 'Plate' as const, from_umpire: 'Unallocated', to_umpire: 'Smith', status: 'Committed' as const, created_at: '2026-09-01T08:00:00Z' },
  ],
}

function query(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> & { then?: unknown } = {}
  for (const method of ['select', 'eq', 'order', 'in']) chain[method] = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data, error }))
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve, reject)
  return chain
}

vi.mock('./client', () => ({
  getSupabaseClient: () => ({
    from: (table: keyof typeof rows) => query(rows[table]),
  }),
}))

describe('loadTournamentFromSupabase', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps Supabase records into the existing application tournament model', async () => {
    const loaded = await loadTournamentFromSupabase('supabase-tournament-1')

    expect(loaded.tournamentId).toBe('supabase-tournament-1')
    expect(loaded.tournament.name).toBe('UAT Tournament')
    expect(loaded.tournament.days).toHaveLength(2)
    expect(loaded.tournament.days[0].id).toBe('day-1')
    expect(loaded.tournament.days[1].id).toBe('day-2')
    expect(loaded.tournament.days[0].games[0].id).toBe('g1')
    expect(loaded.tournament.days[1].games[0].id).toBe('g2')
    expect(loaded.tournament.days[0].assignments).toEqual([{ gameId: 'g1', umpireId: 'u1', position: 'Plate' }])
    expect(loaded.tournament.days[0].manualLocks).toEqual(['g1::Plate'])
    expect(loaded.umpires[0]).toMatchObject({ id: 'u1', name: 'Smith', maxGames: 3, experience: 'International' })
    expect(loaded.umpires[0].availabilityByDay).toEqual({
      0: { enabled: true, from: '08:00', until: '17:00' },
      1: { enabled: false, from: '', until: '' },
    })
    expect(loaded.enabledRuleIds).toEqual(['MAX_GAMES'])
    expect(loaded.history).toEqual([expect.objectContaining({ id: 'h1', day: 0, gameId: 'g1', position: 'Plate', to: 'Smith' })])
  })

  it('fails safely when the requested tournament does not exist', async () => {
    const client = await import('./client')
    vi.spyOn(client, 'getSupabaseClient').mockReturnValueOnce({
      from: () => query([]),
    } as ReturnType<typeof client.getSupabaseClient>)

    await expect(loadTournamentFromSupabase('missing')).rejects.toThrow(/was not found/i)
  })
})
