import { getSupabaseClient } from './client'
import type { Database } from './database.types'

type Tables = Database['public']['Tables']
type Tournament = Tables['tournaments']['Row']
type TournamentDay = Tables['tournament_days']['Row']
type Umpire = Tables['umpires']['Row']
type Game = Tables['games']['Row']
type Allocation = Tables['allocations']['Row']

export async function createTournament(name: string): Promise<Tournament> {
  const { data, error } = await getSupabaseClient().from('tournaments').insert({ name }).select().single()
  if (error) throw error
  return data
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  const { data, error } = await getSupabaseClient().from('tournaments').select('*').eq('id', tournamentId).maybeSingle()
  if (error) throw error
  return data
}

export async function getTournamentDays(tournamentId: string): Promise<TournamentDay[]> {
  const { data, error } = await getSupabaseClient().from('tournament_days').select('*').eq('tournament_id', tournamentId).order('day_index')
  if (error) throw error
  return data
}

export async function getUmpires(tournamentId: string): Promise<Umpire[]> {
  const { data, error } = await getSupabaseClient().from('umpires').select('*').eq('tournament_id', tournamentId).order('name')
  if (error) throw error
  return data
}

export async function createUmpire(input: Tables['umpires']['Insert']): Promise<Umpire> {
  const { data, error } = await getSupabaseClient().from('umpires').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateUmpire(id: string, input: Tables['umpires']['Update']): Promise<Umpire> {
  const { data, error } = await getSupabaseClient().from('umpires').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getGames(tournamentDayId: string): Promise<Game[]> {
  const { data, error } = await getSupabaseClient().from('games').select('*').eq('tournament_day_id', tournamentDayId).order('number')
  if (error) throw error
  return data
}

export async function createGame(input: Tables['games']['Insert']): Promise<Game> {
  const { data, error } = await getSupabaseClient().from('games').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateGame(id: string, input: Tables['games']['Update']): Promise<Game> {
  const { data, error } = await getSupabaseClient().from('games').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getAllocations(gameIds: string[]): Promise<Allocation[]> {
  if (gameIds.length === 0) return []
  const { data, error } = await getSupabaseClient().from('allocations').select('*').in('game_id', gameIds)
  if (error) throw error
  return data
}

export async function upsertAllocation(input: Tables['allocations']['Insert']): Promise<Allocation> {
  const { data, error } = await getSupabaseClient().from('allocations').upsert(input).select().single()
  if (error) throw error
  return data
}

export async function upsertAvailability(input: Tables['umpire_availability']['Insert']): Promise<Tables['umpire_availability']['Row']> {
  const { data, error } = await getSupabaseClient().from('umpire_availability').upsert(input, { onConflict: 'umpire_id,tournament_day_id' }).select().single()
  if (error) throw error
  return data
}

export async function getAvailability(tournamentDayId: string) {
  const { data, error } = await getSupabaseClient().from('umpire_availability').select('*').eq('tournament_day_id', tournamentDayId)
  if (error) throw error
  return data
}

export async function upsertTournamentRule(input: Tables['tournament_rules']['Insert']) {
  const { data, error } = await getSupabaseClient().from('tournament_rules').upsert(input).select().single()
  if (error) throw error
  return data
}

export async function addAllocationChangeHistory(input: Tables['allocation_change_history']['Insert']) {
  const { data, error } = await getSupabaseClient().from('allocation_change_history').insert(input).select().single()
  if (error) throw error
  return data
}
