'use client'

import { useEffect, useState } from 'react'
import { completeTournament } from '../../lib/supabase/tournamentLifecycle'

const TOURNAMENT_ID_KEY = 'softball-supabase-migration-id'

export default function TournamentCompletionBar() {
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('tournamentId') || localStorage.getItem(TOURNAMENT_ID_KEY)
    setTournamentId(id)
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
    <div className="tournament-completion-bar">
      <div>
        <strong>Tournament</strong>
        <span>{message || 'Current tournament is active'}</span>
      </div>
      <button type="button" onClick={handleComplete} disabled={busy}>
        {busy ? 'Completing…' : 'Complete Tournament'}
      </button>
    </div>
  )
}
