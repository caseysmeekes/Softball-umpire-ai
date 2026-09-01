import { getSupabaseClient } from './client'

export type TournamentStatus = 'active' | 'completed'

export async function completeTournament(tournamentId: string) {
  if (!tournamentId) throw new Error('A Supabase tournament ID is required.')

  const { data, error } = await getSupabaseClient()
    .from('tournaments')
    .update({ status: 'completed' } as never)
    .eq('id', tournamentId)
    .select('id, status')
    .single()

  if (error) throw error
  return data as { id: string; status: TournamentStatus }
}
