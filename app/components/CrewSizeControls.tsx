'use client'

import type { Position } from '../../lib/types'

export const CREW_POSITIONS: Record<2 | 3 | 4, Position[]> = {
  2: ['Plate', 'Base 1'],
  3: ['Plate', 'Base 1', 'Base 3'],
  4: ['Plate', 'Base 1', 'Base 2', 'Base 3'],
}

export function positionsForCrew(size: number): Position[] {
  return CREW_POSITIONS[Math.min(4, Math.max(2, size)) as 2 | 3 | 4]
}

export function crewSizeForPositions(positions: Position[] | undefined): 2 | 3 | 4 {
  return Math.min(4, Math.max(2, positions?.length ?? 2)) as 2 | 3 | 4
}

export function CrewSizeControls({ value, onChange }: { value: 2 | 3 | 4; onChange: (size: 2 | 3 | 4) => void }) {
  return <div className="crew-controls" role="group" aria-label="Crew size">
    {[2, 3, 4].map(size => <button key={size} type="button" className={value === size ? 'active' : ''} aria-pressed={value === size} onClick={() => onChange(size as 2 | 3 | 4)}>{size}</button>)}
  </div>
}
