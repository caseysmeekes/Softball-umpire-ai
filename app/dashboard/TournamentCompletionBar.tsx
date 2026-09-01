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
    <div style={{maxWidth:1440,margin:'0 auto',padding:'12px 5%',display:'flex',justifyContent:'space-between',alignItems:'center',gap:15,background:'#fff',borderBottom:'1px solid #dce3e8'}}>
      <div style={{display:'flex',flexDirection:'column',gap:3,fontSize:12}}>
        <strong>Current Tournament</strong>
        <span style={{color:'#71818d'}}>{message || 'Active'}</span>
      </div>
      <button type="button" onClick={handleComplete} disabled={busy} style={{border:0,borderRadius:5,padding:'10px 15px',fontWeight:700,cursor:busy?'wait':'pointer',background:'#edf2f5',color:'#193044'}}>
        {busy ? 'Completing…' : 'Complete Tournament'}
      </button>
    </div>
  )
}
