import { getSupabaseClient } from './client'
import type { Database } from './database.types'
import type { Assignment, Umpire, UmpireAvailability } from '../types'
import type { Tournament } from '../tournament'

type Tables = Database['public']['Tables']
type TournamentRow = Tables['tournaments']['Row']
type TournamentDayRow = Tables['tournament_days']['Row']
type UmpireRow = Tables['umpires']['Row']
type GameRow = Tables['games']['Row']
type AllocationRow = Tables['allocations']['Row']
type AvailabilityRow = Tables['umpire_availability']['Row']
type LockRow = Tables['manual_locks']['Row']
type TournamentRuleRow = Tables['tournament_rules']['Row']
type HistoryRow = Tables['allocation_change_history']['Row']

export type SupabaseTournamentSnapshot = {
  tournamentId: string
  tournament: Tournament
  umpires: Umpire[]
  enabledRuleIds: string[]
  history: Array<{
    id: string
    day: number
    gameId: string
    gameNumber: number
    time?: string
    diamond?: string
    position: string
    from: string
    to: string
    status: 'Pending' | 'Committed'
  }>
}

function timeForApp(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 5)
}

function toAppUmpire(row: UmpireRow, availabilityRows: AvailabilityRow[]): Umpire {
  const availabilityByDay: Record<number, UmpireAvailability> = {}
  for (const availability of availabilityRows) {
    const dayIndex = availability.day_index
    if (dayIndex == null) continue
    availabilityByDay[dayIndex] = {
      enabled: availability.enabled,
      from: timeForApp(availability.from_time),
      until: timeForApp(availability.until_time),
    }
  }

  return {
    id: row.id,
    name: row.name,
    availability: row.legacy_availability || 'All day',
    availabilityByDay,
    maxGames: row.max_games,
    experience: row.experience,
  }
}

function toAppGame(row: GameRow) {
  return {
    id: row.id,
    number: row.number,
    date: row.date,
    start: timeForApp(row.start_time),
    end: row.end_time ? timeForApp(row.end_time) : undefined,
    field: row.field,
    teams: row.teams,
    division: row.division,
    positions: row.positions as GameRow['positions'],
  }
}

export async function loadTournamentFromSupabase(tournamentId: string): Promise<SupabaseTournamentSnapshot> {
  if (!tournamentId) throw new Error('A Supabase tournament ID is required.')

  const supabase = getSupabaseClient()
  const tournamentResult = await supabase.from('tournaments').select('*').eq('id', tournamentId).maybeSingle()
  if (tournamentResult.error) throw tournamentResult.error
  if (!tournamentResult.data) throw new Error(`Supabase tournament ${tournamentId} was not found.`)

  const [daysResult, umpiresResult, rulesResult] = await Promise.all([
    supabase.from('tournament_days').select('*').eq('tournament_id', tournamentId).order('day_index'),
    supabase.from('umpires').select('*').eq('tournament_id', tournamentId).order('name'),
    supabase.from('tournament_rules').select('*').eq('tournament_id', tournamentId).order('rule_id'),
  ])
  if (daysResult.error) throw daysResult.error
  if (umpiresResult.error) throw umpiresResult.error
  if (rulesResult.error) throw rulesResult.error

  const days = daysResult.data || []
  const umpires = umpiresResult.data || []
  const dayIds = days.map(day => day.id)
  const umpireIds = umpires.map(umpire => umpire.id)

  const [gamesResult, availabilityResult] = await Promise.all([
    dayIds.length
      ? supabase.from('games').select('*').in('tournament_day_id', dayIds).order('number')
      : Promise.resolve({ data: [], error: null } as { data: GameRow[]; error: null }),
    dayIds.length && umpireIds.length
      ? supabase.from('umpire_availability').select('*').in('tournament_day_id', dayIds).in('umpire_id', umpireIds)
      : Promise.resolve({ data: [], error: null } as { data: AvailabilityRow[]; error: null }),
  ])
  if (gamesResult.error) throw gamesResult.error
  if (availabilityResult.error) throw availabilityResult.error

  const games = gamesResult.data || []
  const gameIds = games.map(game => game.id)
  const [allocationsResult, locksResult, historyResult] = await Promise.all([
    gameIds.length
      ? supabase.from('allocations').select('*').in('game_id', gameIds)
      : Promise.resolve({ data: [], error: null } as { data: AllocationRow[]; error: null }),
    gameIds.length
      ? supabase.from('manual_locks').select('*').in('game_id', gameIds)
      : Promise.resolve({ data: [], error: null } as { data: LockRow[]; error: null }),
    dayIds.length
      ? supabase.from('allocation_change_history').select('*').in('tournament_day_id', dayIds).order('created_at')
      : Promise.resolve({ data: [], error: null } as { data: HistoryRow[]; error: null }),
  ])
  if (allocationsResult.error) throw allocationsResult.error
  if (locksResult.error) throw locksResult.error
  if (historyResult.error) throw historyResult.error

  const dayIndexById = new Map(days.map(day => [day.id, day.day_index]))
  const dayByGameId = new Map(games.map(game => [game.id, game.tournament_day_id]))
  const assignmentsByDay = new Map<number, Assignment[]>()
  const locksByDay = new Map<number, string[]>()

  for (const day of days) {
    assignmentsByDay.set(day.day_index, [])
    locksByDay.set(day.day_index, [])
  }

  for (const allocation of allocationsResult.data || []) {
    const dayId = dayByGameId.get(allocation.game_id)
    const dayIndex = dayId == null ? undefined : dayIndexById.get(dayId)
    if (dayIndex == null) throw new Error(`Allocation ${allocation.game_id} references a game on an unknown tournament day.`)
    assignmentsByDay.get(dayIndex)!.push({
      gameId: allocation.game_id,
      umpireId: allocation.umpire_id,
      position: allocation.position,
    })
  }

  for (const lock of locksResult.data || []) {
    const dayId = dayByGameId.get(lock.game_id)
    const dayIndex = dayId == null ? undefined : dayIndexById.get(dayId)
    if (dayIndex == null) throw new Error(`Manual lock ${lock.game_id} references a game on an unknown tournament day.`)
    locksByDay.get(dayIndex)!.push(`${lock.game_id}::${lock.position}`)
  }

  const tournament: Tournament = {
    name: tournamentResult.data.name,
    days: days.map(day => ({
      id: day.legacy_id,
      name: day.name,
      date: day.date || undefined,
      games: games.filter(game => game.tournament_day_id === day.id).map(toAppGame),
      assignments: assignmentsByDay.get(day.day_index) || [],
      manualLocks: locksByDay.get(day.day_index) || [],
    })),
  }

  const availabilityByUmpire = new Map<string, AvailabilityRow[]>()
  for (const availability of availabilityResult.data || []) {
    const list = availabilityByUmpire.get(availability.umpire_id) || []
    const dayIndex = dayIndexById.get(availability.tournament_day_id)
    if (dayIndex != null) list.push({ ...availability, day_index: dayIndex } as AvailabilityRow & { day_index: number })
    availabilityByUmpire.set(availability.umpire_id, list)
  }

  const loadedUmpires = umpires.map(row => toAppUmpire(row, availabilityByUmpire.get(row.id) || []))
  const enabledRuleIds = (rulesResult.data || []).filter((rule: TournamentRuleRow) => rule.enabled).map(rule => rule.rule_id)

  const history = (historyResult.data || []).map(item => {
    const dayIndex = dayIndexById.get(item.tournament_day_id)
    if (dayIndex == null) throw new Error(`History item ${item.id} references an unknown tournament day.`)
    return {
      id: item.id,
      day: dayIndex,
      gameId: item.game_id,
      gameNumber: item.game_number,
      time: item.time || undefined,
      diamond: item.diamond || undefined,
      position: item.position,
      from: item.from_umpire,
      to: item.to_umpire,
      status: item.status,
    }
  })

  return {
    tournamentId: tournamentResult.data.id,
    tournament,
    umpires: loadedUmpires,
    enabledRuleIds,
    history,
  }
}

export async function createTournament(name: string): Promise<TournamentRow> {
  const { data, error } = await getSupabaseClient().from('tournaments').insert({ name }).select().single()
  if (error) throw error
  return data
}

export async function getTournament(tournamentId: string): Promise<TournamentRow | null> {
  const { data, error } = await getSupabaseClient().from('tournaments').select('*').eq('id', tournamentId).maybeSingle()
  if (error) throw error
  return data
}

export async function getTournamentDays(tournamentId: string): Promise<TournamentDayRow[]> {
  const { data, error } = await getSupabaseClient().from('tournament_days').select('*').eq('tournament_id', tournamentId).order('day_index')
  if (error) throw error
  return data
}

export async function getUmpires(tournamentId: string): Promise<UmpireRow[]> {
  const { data, error } = await getSupabaseClient().from('umpires').select('*').eq('tournament_id', tournamentId).order('name')
  if (error) throw error
  return data
}

export async function createUmpire(input: Tables['umpires']['Insert']): Promise<UmpireRow> {
  const { data, error } = await getSupabaseClient().from('umpires').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateUmpire(id: string, input: Tables['umpires']['Update']): Promise<UmpireRow> {
  const { data, error } = await getSupabaseClient().from('umpires').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getGames(tournamentDayId: string): Promise<GameRow[]> {
  const { data, error } = await getSupabaseClient().from('games').select('*').eq('tournament_day_id', tournamentDayId).order('number')
  if (error) throw error
  return data
}

export async function createGame(input: Tables['games']['Insert']): Promise<GameRow> {
  const { data, error } = await getSupabaseClient().from('games').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateGame(id: string, input: Tables['games']['Update']): Promise<GameRow> {
  const { data, error } = await getSupabaseClient().from('games').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getAllocations(gameIds: string[]): Promise<AllocationRow[]> {
  if (gameIds.length === 0) return []
  const { data, error } = await getSupabaseClient().from('allocations').select('*').in('game_id', gameIds)
  if (error) throw error
  return data
}

export async function upsertAllocation(input: Tables['allocations']['Insert']): Promise<AllocationRow> {
  const { data, error } = await getSupabaseClient().from('allocations').upsert(input).select().single()
  if (error) throw error
  return data
}

export async function upsertAvailability(input: Tables['umpire_availability']['Insert']): Promise<AvailabilityRow> {
  const { data, error } = await getSupabaseClient().from('umpire_availability').upsert(input, { onConflict: 'umpire_id,tournament_day_id' }).select().single()
  if (error) throw error
  return data
}

export async function getAvailability(tournamentDayId: string): Promise<AvailabilityRow[]> {
  const { data, error } = await getSupabaseClient().from('umpire_availability').select('*').eq('tournament_day_id', tournamentDayId)
  if (error) throw error
  return data
}

export async function upsertTournamentRule(input: Tables['tournament_rules']['Insert']): Promise<Tables['tournament_rules']['Row']> {
  const { data, error } = await getSupabaseClient().from('tournament_rules').upsert(input).select().single()
  if (error) throw error
  return data
}

export async function addAllocationChangeHistory(input: Tables['allocation_change_history']['Insert']): Promise<HistoryRow> {
  const { data, error } = await getSupabaseClient().from('allocation_change_history').insert(input).select().single()
  if (error) throw error
  return data
}
