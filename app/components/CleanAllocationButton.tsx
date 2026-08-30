'use client'

import { useState } from 'react'
import './clean-allocation.css'

export default function CleanAllocationButton() {
  const [open, setOpen] = useState(false)

  const clean = () => {
    try {
      localStorage.removeItem('softball-assignments')
      localStorage.removeItem('softball-manual-locks')
      localStorage.removeItem('softball-locked')
      localStorage.removeItem('softball-allocation-change-history')

      const raw = localStorage.getItem('softball-tournament')
      if (raw) {
        const tournament = JSON.parse(raw)
        if (Array.isArray(tournament?.days)) {
          tournament.days = tournament.days.map((day: any) => ({
            ...day,
            assignments: [],
            manualLocks: []
          }))
          localStorage.setItem('softball-tournament', JSON.stringify(tournament))
        }
      }

      localStorage.removeItem('softball-selected-day')
      localStorage.removeItem('softball-print-day')
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
            <p>This removes all current draft and committed umpire assignments and unlocks everything. Your games, schedule, umpire roster, rules and tournament days will remain unchanged.</p>
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
