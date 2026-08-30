'use client'

import { useEffect, useState } from 'react'

type Game = { date?: string; positions?: string[] }
type Umpire = { maxGames?: number }

export default function CrewCapacityHint() {
  const [data, setData] = useState<{ games: number; umpires: number; capacity: number; minUmpires: number } | null>(null)

  useEffect(() => {
    try {
      const games = JSON.parse(localStorage.getItem('softball-games') || '[]') as Game[]
      const umpires = JSON.parse(localStorage.getItem('softball-umpires') || '[]') as Umpire[]
      if (!Array.isArray(games) || !Array.isArray(umpires) || !games.length || !umpires.length) return

      const dates = [...new Set(games.map(g => g.date || ''))]
      const maxPerUmpire = Math.max(1, ...umpires.map(u => Number(u.maxGames) || 3))
      const maxGamesPerDay = Math.min(3, maxPerUmpire)
      const maxDailyGames = Math.max(...dates.map(date => games.filter(g => (g.date || '') === date).length), 0)
      const minUmpires = Math.ceil((maxDailyGames * 2) / maxDailyGamesPerUmpire(maxDailyGames, maxGamesPerDay))
      const capacity = umpires.length * maxGamesPerDay

      setData({ games: games.length, umpires: umpires.length, capacity, minUmpires })
    } catch {
      // Keep this advisory unobtrusive if stored data is unavailable.
    }
  }, [])

  if (!data) return null

  const requiredSlots = data.games * 2
  const enough = data.capacity >= requiredSlots
  const colour = enough ? '#2e8b57' : '#c56a1a'

  return (
    <div style={{ margin: '18px 5% 0', padding: '10px 14px', border: '1px solid #dce4e8', borderRadius: 8, background: '#fff', fontSize: 11, color: '#60727b', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <span><strong style={{ color: '#29404a' }}>Crew guidance:</strong> 2 umpires is the minimum crew size.</span>
      <span style={{ color }}><strong>{enough ? 'Capacity OK' : 'Capacity short'}</strong> · {data.umpires} umpires × up to 3 games = {data.capacity} game assignments · {requiredSlots} needed for 2-umpire crews.</span>
      <span>Adding more crew members increases assignments, so a larger crew is not a fix for an umpire-capacity shortage.</span>
    </div>
  )
}

function maxGamesPerDayPerUmpire(_games: number, maxGames: number) {
  return Math.max(1, maxGames)
}
