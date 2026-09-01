import { getSupabaseClient } from './client'
import type { Database } from './database.types'

type TournamentRow = Database['public']['Tables']['tournaments']['Row']
type TournamentSummary = TournamentRow & {
  start_date: string | null
  end_date: string | null
  location: string | null
  venue: string | null
  number_of_fields: number | null
  dayCount: number
  gameCount: number
  umpireCount: number
  allocatedPositions: number
  totalPositions: number
}
export type { TournamentSummary }

export async function getTournamentSummaries(): Promise<TournamentSummary[]> {
  const s = getSupabaseClient()
  const sb = s as any
  const { data: ts, error: te } = await sb.from('tournaments')
    .select('id,name,status,created_at,updated_at,start_date,end_date,location,venue,number_of_fields')
    .order('updated_at', { ascending: false })
  if (te) throw te

  const rows = (ts || []) as TournamentSummary[]
  if (!rows.length) return []
  const ids = rows.map(t => t.id)

  const [daysResult, umpiresResult] = await Promise.all([
    s.from('tournament_days').select('id,tournament_id').in('tournament_id', ids),
    s.from('umpires').select('id,tournament_id').in('tournament_id', ids),
  ])
  if (daysResult.error) throw daysResult.error
  if (umpiresResult.error) throw umpiresResult.error

  const days = daysResult.data || []
  const dayIds = days.map(d => d.id)
  const dayToTournament = new Map(days.map(d => [d.id, d.tournament_id]))
  const { data: games, error: gamesError } = dayIds.length
    ? await s.from('games').select('id,tournament_day_id,positions').in('tournament_day_id', dayIds)
    : { data: [], error: null }
  if (gamesError) throw gamesError

  const gameIds = (games || []).map(g => g.id)
  const { data: allocations, error: allocationError } = gameIds.length
    ? await s.from('allocations').select('game_id,position').in('game_id', gameIds)
    : { data: [], error: null }
  if (allocationError) throw allocationError

  const dayCount = new Map<string, number>()
  const gameCount = new Map<string, number>()
  const umpireCount = new Map<string, number>()
  const totalPositions = new Map<string, number>()
  const allocatedPositions = new Map<string, number>()

  for (const day of days) dayCount.set(day.tournament_id, (dayCount.get(day.tournament_id) || 0) + 1)
  for (const game of games || []) {
    const tournamentId = dayToTournament.get(game.tournament_day_id)
    if (!tournamentId) continue
    gameCount.set(tournamentId, (gameCount.get(tournamentId) || 0) + 1)
    totalPositions.set(tournamentId, (totalPositions.get(tournamentId) || 0) + ((game.positions || []).length || 0))
  }
  for (const umpire of umpiresResult.data || []) umpireCount.set(umpire.tournament_id, (umpireCount.get(umpire.tournament_id) || 0) + 1)
  for (const allocation of allocations || []) {
    const tournamentId = dayToTournament.get((games || []).find(g => g.id === allocation.game_id)?.tournament_day_id || '')
    if (tournamentId) allocatedPositions.set(tournamentId, (allocatedPositions.get(tournamentId) || 0) + 1)
  }

  return rows.map(t => ({
    ...t,
    dayCount: dayCount.get(t.id) || 0,
    gameCount: gameCount.get(t.id) || 0,
    umpireCount: umpireCount.get(t.id) || 0,
    allocatedPositions: allocatedPositions.get(t.id) || 0,
    totalPositions: totalPositions.get(t.id) || 0,
  }))
}

export async function createTournamentWithDays(name: string): Promise<TournamentRow> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Tournament name is required.')
  const s = getSupabaseClient()
  const { data: t, error } = await s.from('tournaments').insert({ name: trimmed }).select('*').single()
  if (error) throw error
  const days = [1, 2, 3, 4, 5].map(i => ({ tournament_id: t.id, legacy_id: `day-${i}`, day_index: i - 1, name: `Day ${i}` }))
  const { error: de } = await s.from('tournament_days').insert(days)
  if (de) {
    await s.from('tournaments').delete().eq('id', t.id)
    throw de
  }
  return t
}

export async function getTournamentOverview(tournamentId: string) {
  const s = getSupabaseClient()
  const { data: t, error: te } = await s.from('tournaments').select('*').eq('id', tournamentId).maybeSingle()
  if (te) throw te
  if (!t) throw new Error('Tournament not found.')
  const { data: days, error: de } = await s.from('tournament_days').select('*').eq('tournament_id', tournamentId).order('day_index')
  if (de) throw de
  const ids = (days || []).map(d => d.id)
  const [{ data: games, error: ge }, { data: umpires, error: ue }] = await Promise.all([
    ids.length ? s.from('games').select('id,date').in('tournament_day_id', ids) : Promise.resolve({ data: [], error: null }),
    s.from('umpires').select('id').eq('tournament_id', tournamentId),
  ])
  if (ge) throw ge
  if (ue) throw ue
  return { tournament: t, days: days || [], gameCount: (games || []).length, umpireCount: (umpires || []).length, dates: (games || []).map(g => g.date).filter(Boolean).sort() }
}
