'use client'

import { useState } from 'react'

export default function CleanAllocationButton() {
  const [open, setOpen] = useState(false)

  const clean = () => {
    localStorage.removeItem('softball-assignments')
    window.location.reload()
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
            <p>This removes all current draft and committed umpire assignments and unlocks everything. Your games, schedule and umpire roster will remain unchanged.</p>
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
