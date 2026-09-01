import { getSupabaseClient } from './client'
import type { Database } from './database.types'

export const CURRENT_USER_ID_KEY = 'softball-current-user-id'

export type AppUser = Database['public']['Tables']['app_users']['Row']

export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CURRENT_USER_ID_KEY)
  } catch {
    return null
  }
}

export function clearStoredUserId() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CURRENT_USER_ID_KEY)
  } catch {
    // Ignore browser storage failures. Supabase remains authoritative.
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const storedId = getStoredUserId()
  if (!storedId) return null

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', storedId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    clearStoredUserId()
    return null
  }

  return data
}

export async function identifyUser(username: string): Promise<AppUser> {
  const trimmed = username.trim()
  if (!trimmed) throw new Error('Username is required.')
  if (trimmed.length > 50) throw new Error('Username must be 50 characters or fewer.')

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('app_users')
    .upsert({ username: trimmed }, { onConflict: 'username' })
    .select('*')
    .single()

  if (error) throw error
  if (!data) throw new Error('Unable to establish user identity.')

  try {
    window.localStorage.setItem(CURRENT_USER_ID_KEY, data.id)
  } catch {
    // The Supabase record is still authoritative if browser storage is unavailable.
  }

  return data
}
