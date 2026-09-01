'use client'

import { useEffect, useState } from 'react'
import { completeTournament } from '../../lib/supabase/tournamentLifecycle'
import { getSupabaseClient } from '../../lib/supabase/client'
import StartNewTournament from './StartNewTournament'

const TOURNAMENT_ID_KEY = 'softball-supabase-migration-id'

export default function TournamentCompletionBar() {
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [tournamentName, setTournamentName] = useState('Current Tournament')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('tournamentId') || localStorage.getItem(TOURNAMENT_ID_KEY)
    setTournamentId(id)

    if (!id) return

    let cancelled = false
    getSupabaseClient()
      .from('tournaments')
      .select('name,status')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data?.name) setTournamentName(data.name)
      })

    return () => { cancelled = true }
  }, [])

  if (!tournamentId) return null

  const handleComplete = async () => {
    if (!window.confirm('Complete Tournament?\n\nThis will mark the current tournament as completed. Your tournament data will remain saved and can be viewed later.\n\nNothing will be deleted.')) return

    setBusy(true)
    setMessage('')
    try {
      await completeTournament(tournamentId)
      setMessage('Tournament completed. All tournament data remains saved.')
    } catch (error) {
      setMessage(error instanceof Error ? `Could not complete tournament: ${error.message}` : 'Could not complete tournament.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #dce3e8' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/tournaments" style={{ color: '#1587b2', fontWeight: 700, textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap' }}>
          ← My Tournaments
        </a>

        <div style={{ width: 1, height: 34, background: '#dce3e8' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <strong style={{ fontSize: 16, color: '#193044', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tournamentName}</strong>
          <span style={{ color: '#71818d', fontSize: 12 }}>{message || 'Active'}</span>
        </div>

        <StartNewTournament />

        <div style={{ marginLeft: 'auto' }}>
          <button type="button" onClick={handleComplete} disabled={busy} style={{ border: 0, borderRadius: 5, padding: '10px 15px', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', background: '#edf2f5', color: '#193044', whiteSpace: 'nowrap' }}>
            {busy ? 'Completing…' : 'Complete Tournament'}
          </button>
        </div>
      </div>
    </div>
  )
}
