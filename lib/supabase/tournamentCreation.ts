import { getSupabaseClient } from './client'
import { getCurrentUser } from './userIdentity'

type NewTournamentInput = {
  name: string
  startDate?: string
  endDate?: string
  location?: string
  venue?: string
  numberOfFields?: number
}

export async function createNewTournament(input: NewTournamentInput) {
  const name = input.name.trim()
  if (!name) throw new Error('Tournament name is required.')
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new Error('End date cannot be before start date.')
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('Please enter your username before creating a tournament.')

  const supabase = getSupabaseClient()
  const insertPayload = {
    name,
    status: 'active' as const,
    owner_id: currentUser.id,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    location: input.location?.trim() || null,
    venue: input.venue?.trim() || null,
    number_of_fields: input.numberOfFields || null,
  }

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert(insertPayload as never)
    .select('id, name, status, owner_id')
    .single()

  if (error) throw error

  const days = Array.from({ length: 5 }, (_, index) => {
    let date: string | null = null
    if (input.startDate) {
      const start = new Date(`${input.startDate}T00:00:00`)
      if (!Number.isNaN(start.getTime())) {
        start.setDate(start.getDate() + index)
        const generated = start.toISOString().slice(0, 10)
        date = !input.endDate || generated <= input.endDate ? generated : null
      }
    }
    return {
      tournament_id: tournament.id,
      legacy_id: `day-${index + 1}`,
      day_index: index,
      name: `Day ${index + 1}`,
      date,
    }
  })

  const { error: dayError } = await supabase.from('tournament_days').insert(days)
  if (dayError) {
    await supabase.from('tournaments').delete().eq('id', tournament.id)
    throw dayError
  }

  return tournament
}
