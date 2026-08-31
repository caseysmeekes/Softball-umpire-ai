'use client'

import { useState } from 'react'
import './clean-allocation.css'

type TournamentDay = {
  assignments?: unknown[]
  manualLocks?: string[]
}

type Tournament = {
  days?: TournamentDay[]
}

export default function CleanAllocationButton() {
  const [open, setOpen] = useState(false)

  const clean = () => {
    try {
      const selectedDay = Math.max(0, Math.min(4, Number(localStorage.getItem('softball-selected-day') || 0)))

      // Clear only the selected day's allocation state from the tournament store.
      const rawTournament = localStorage.getItem('softball-tournament')
      if (rawTournament) {
        const tournament = JSON.parse(rawTournament) as Tournament
        if (Array.isArray(tournament?.days) && tournament.days[selectedDay]) {
          tournament.days = tournament.days.map((day, index) => index === selectedDay
            ? { ...day, assignments: [], manualLocks: [] }
            : day
          )
          localStorage.setItem('softball-tournament', JSON.stringify(tournament))
        }
      }

      // These legacy keys represent the currently selected day's allocation state.
      localStorage.removeItem('softball-assignments')
      localStorage.removeItem('softball-manual-locks')
      localStorage.removeItem('softball-locked')

      // Allocation Change History is shared, so remove only this day's entries.
      const rawHistory = localStorage.getItem('softball-allocation-change-history')
      if (rawHistory) {
        try {
          const history = JSON.parse(rawHistory)
          if (Array.isArray(history)) {
            localStorage.setItem(
              'softball-allocation-change-history',
              JSON.stringify(history.filter((item: { day?: number }) => item?.day !== selectedDay))
            )
          }
        } catch {
          localStorage.removeItem('softball-allocation-change-history')
        }
      }

      // Keep the allocator on the selected tournament day after Start Fresh.
      localStorage.setItem('softball-selected-day', String(selectedDay))
      localStorage.setItem('softball-print-day', String(selectedDay))
      setOpen(false)
      window.location.reload()
    } catch (error) {
      console.error('Unable to start fresh', error)
      setOpen(false)
    }
  }

  return (
    <>
      <button className="clean-allocation" onClick={() => setOpen(true)}>
        🧹 Start Fresh
      </button>
      {open && (
        <div className="clean-overlay" role="dialog" aria-modal="true" aria-labelledby="clean-title">
          <div className="clean-dialog">
            <p className="eyebrow">START FRESH</p>
            <h2 id="clean-title">Clear current allocation?</h2>
            <p>This removes the current day's draft and committed umpire assignments and unlocks everything. Your games, schedule, umpire roster, rules and tournament days will remain unchanged.</p>
            <div className="clean-actions">
              <button className="secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="primary" onClick={clean}>Clear Allocations</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
