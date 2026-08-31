import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  if (!client) {
    client = createClient<Database>(url, key)
  }

  return client
}
