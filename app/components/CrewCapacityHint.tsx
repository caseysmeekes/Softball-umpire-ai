'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type Game = { date?: string }
type Umpire = { maxGames?: number }

export default function CrewCapacityHint() {
  const pathname = usePathname()
  const [data, setData] = useState<{ games: number; umpires: number; capacity: number; required: number } | null>(null)

  useEffect(() => {
    if (pathname !== '/dashboard') return
    try {
      const games = JSON.parse(localStorage.getItem('softball-games') || '[]') as Game[]
      const umpires = JSON.parse(localStorage.getItem('softball-umpires') || '[]') as Umpire[]
      if (!Array.isArray(games) || !Array.isArray(umpires) || !games.length || !umpires.length) return

      const required = games.length * 2
      const capacity = umpires.reduce((total, umpire) => total + Math.min(3, Math.max(1, Number(umpire.maxGames) || 3)), 0)
      setData({ games: games.length, umpires: umpires.length, capacity, required })
    } catch {
      // Advisory only. Never let it affect the allocator.
    }
  }, [pathname])

  if (pathname !== '/dashboard' || !data) return null

  const enough = data.capacity >= data.required

  return (
    <div style={{ margin: '18px 5% 0', padding: '9px 13px', border: '1px solid #dce4e8', borderRadius: 8, background: '#fff', fontSize: 11, color: '#60727b', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <span><strong style={{ color: '#29404a' }}>Crew guidance:</strong> 2 umpires is the minimum crew size.</span>
      <span style={{ fontWeight: 600 }}>{enough ? '✓ 2-umpire coverage looks achievable' : '⚠ Umpire capacity may be too low for 2-umpire crews'}</span>
      <span>{data.games} games · {data.umpires} umpires · {data.capacity}/{data.required} assignment capacity</span>
    </div>
  )
}
