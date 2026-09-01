'use client'

import { useState } from 'react'
import { createNewTournament } from '../../lib/supabase/tournamentCreation'

const ACTIVE_ID_KEY = 'softball-supabase-migration-id'
const LOCAL_KEYS = [
  'softball-tournament',
  'softball-games',
  'softball-assignments',
  'softball-manual-locks',
  'softball-umpires',
  'softball-enabled-rules',
  'softball-allocation-change-history',
  'softball-selected-day',
]

function archiveLocalSafetyCopy(previousId: string | null) {
  if (!previousId || typeof window === 'undefined') return
  const copy: Record<string, string> = {}
  for (const key of LOCAL_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null) copy[key] = value
  }
  if (Object.keys(copy).length) {
    localStorage.setItem(`softball-local-safety-${previousId}`, JSON.stringify(copy))
  }
}

export default function StartNewTournament() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [venue, setVenue] = useState('')
  const [numberOfFields, setNumberOfFields] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const previousId = localStorage.getItem(ACTIVE_ID_KEY)
      archiveLocalSafetyCopy(previousId)
      const tournament = await createNewTournament({
        name,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        location,
        venue,
        numberOfFields: numberOfFields ? Math.max(1, Number(numberOfFields)) : undefined,
      })

      // Reset only the legacy global working keys. The previous values have been
      // archived by tournament ID and Supabase remains the authoritative source.
      for (const key of LOCAL_KEYS) localStorage.removeItem(key)
      localStorage.setItem(ACTIVE_ID_KEY, tournament.id)
      localStorage.setItem('softball-selected-day', '0')
      window.location.href = `/dashboard?tournamentId=${encodeURIComponent(tournament.id)}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create tournament.')
      setBusy(false)
    }
  }

  if (!open) {
    return <button className="secondary start-new-button" type="button" onClick={() => setOpen(true)}>＋ Start New Tournament</button>
  }

  return (
    <section className="start-new-card">
      <div className="start-new-head">
        <div>
          <h3>Start New Tournament</h3>
          <p>This creates a completely separate tournament. Your current tournament will not be changed.</p>
        </div>
        <button className="secondary" type="button" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
      </div>
      <form onSubmit={submit}>
        <div className="start-new-grid">
          <label>Tournament name *<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 2026 Canterbury Champs" required disabled={busy} /></label>
          <label>Start date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={busy} /></label>
          <label>End date<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || undefined} disabled={busy} /></label>
          <label>Location<input value={location} onChange={e => setLocation(e.target.value)} placeholder="Christchurch" disabled={busy} /></label>
          <label>Venue<input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue name" disabled={busy} /></label>
          <label>Number of fields<input type="number" min="1" max="100" value={numberOfFields} onChange={e => setNumberOfFields(e.target.value)} placeholder="e.g. 4" disabled={busy} /></label>
        </div>
        {error && <p className="start-new-error">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Tournament'}</button>
      </form>
    </section>
  )
}
