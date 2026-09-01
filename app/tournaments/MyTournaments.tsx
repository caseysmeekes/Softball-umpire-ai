'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import StartNewTournament from '../dashboard/StartNewTournament'

type Tournament = {
  id: string
  name: string
  status: 'active' | 'completed'
  created_at: string
  updated_at: string
  start_date: string | null
  end_date: string | null
  location: string | null
  venue: string | null
  number_of_fields: number | null
}

type TournamentCard = Tournament & {
  days: number
  games: number
  umpires: number
  allocatedPositions: number
  totalPositions: number
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatUpdated(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MyTournaments() {
  const [cards, setCards] = useState<TournamentCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      const [tournamentsResult, daysResult, gamesResult, umpiresResult, allocationsResult] = await Promise.all([
        supabase.from('tournaments').select('id,name,status,created_at,updated_at,start_date,end_date,location,venue,number_of_fields').order('updated_at', { ascending: false }),
        supabase.from('tournament_days').select('id,tournament_id'),
        supabase.from('games').select('id,tournament_day_id,positions'),
        supabase.from('umpires').select('id,tournament_id'),
        supabase.from('allocations').select('game_id,position'),
      ])

      const firstError = tournamentsResult.error || daysResult.error || gamesResult.error || umpiresResult.error || allocationsResult.error
      if (firstError) throw firstError

      const tournaments = (tournamentsResult.data || []) as Tournament[]
      const days = daysResult.data || []
      const games = gamesResult.data || []
      const umpires = umpiresResult.data || []
      const allocations = allocationsResult.data || []

      const dayToTournament = new Map<string, string>()
      for (const day of days) dayToTournament.set(day.id, day.tournament_id)

      const gameToTournament = new Map<string, string>()
      const totalPositions = new Map<string, number>()
      for (const game of games) {
        const tournamentId = dayToTournament.get(game.tournament_day_id)
        if (!tournamentId) continue
        gameToTournament.set(game.id, tournamentId)
        totalPositions.set(tournamentId, (totalPositions.get(tournamentId) || 0) + ((game.positions || []).length || 0))
      }

      const allocatedPositions = new Map<string, number>()
      for (const allocation of allocations) {
        const tournamentId = gameToTournament.get(allocation.game_id)
        if (!tournamentId) continue
        allocatedPositions.set(tournamentId, (allocatedPositions.get(tournamentId) || 0) + 1)
      }

      const gameCounts = new Map<string, number>()
      for (const game of games) {
        const tournamentId = gameToTournament.get(game.id)
        if (tournamentId) gameCounts.set(tournamentId, (gameCounts.get(tournamentId) || 0) + 1)
      }

      const dayCounts = new Map<string, number>()
      for (const day of days) dayCounts.set(day.tournament_id, (dayCounts.get(day.tournament_id) || 0) + 1)

      const umpireCounts = new Map<string, number>()
      for (const umpire of umpires) umpireCounts.set(umpire.tournament_id, (umpireCounts.get(umpire.tournament_id) || 0) + 1)

      setCards(tournaments.map(tournament => ({
        ...tournament,
        days: dayCounts.get(tournament.id) || 0,
        games: gameCounts.get(tournament.id) || 0,
        umpires: umpireCounts.get(tournament.id) || 0,
        allocatedPositions: allocatedPositions.get(tournament.id) || 0,
        totalPositions: totalPositions.get(tournament.id) || 0,
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tournaments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const active = useMemo(() => cards.filter(t => t.status === 'active'), [cards])
  const completed = useMemo(() => cards.filter(t => t.status === 'completed'), [cards])

  if (loading) return <main style={styles.page}><p>Loading tournaments…</p></main>

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>My Tournaments</h1>
          <p style={styles.subtitle}>Manage and revisit your softball tournaments.</p>
        </div>
        <StartNewTournament />
      </header>

      {error && (
        <div style={styles.error} role="alert">
          <strong>Unable to load tournaments</strong>
          <span>{error}</span>
          <button className="secondary" type="button" onClick={() => void load()}>Retry</button>
        </div>
      )}

      {!error && cards.length === 0 && (
        <section style={styles.empty}>
          <h2>No tournaments yet</h2>
          <p>Start your first tournament to get started.</p>
          <StartNewTournament />
        </section>
      )}

      {!error && active.length > 0 && (
        <section>
          <h2 style={styles.sectionTitle}>Active</h2>
          <div style={styles.grid}>{active.map(tournament => <TournamentCard key={tournament.id} tournament={tournament} />)}</div>
        </section>
      )}

      {!error && completed.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2 style={styles.sectionTitle}>Completed</h2>
          <div style={styles.grid}>{completed.map(tournament => <TournamentCard key={tournament.id} tournament={tournament} />)}</div>
        </section>
      )}
    </main>
  )
}

function TournamentCard({ tournament }: { tournament: TournamentCard }) {
  const start = formatDate(tournament.start_date)
  const end = formatDate(tournament.end_date)
  const dateText = start && end ? `${start} – ${end}` : start || end || 'Dates not set'
  const progress = tournament.totalPositions > 0 ? Math.min(100, Math.round((tournament.allocatedPositions / tournament.totalPositions) * 100)) : null

  return (
    <article style={styles.card}>
      <div style={styles.cardTop}>
        <div>
          <span style={{ ...styles.badge, ...(tournament.status === 'completed' ? styles.completedBadge : {}) }}>{tournament.status === 'completed' ? 'Completed' : 'Active'}</span>
          <h3 style={styles.cardTitle}>{tournament.name}</h3>
        </div>
        <a className="primary" href={`/dashboard?tournamentId=${encodeURIComponent(tournament.id)}`} style={styles.action}>{tournament.status === 'completed' ? 'View Tournament' : 'Open Tournament'}</a>
      </div>
      <p style={styles.meta}>{dateText}{tournament.location ? ` · ${tournament.location}` : ''}</p>
      {tournament.venue && <p style={styles.muted}>{tournament.venue}</p>}
      <div style={styles.stats}>
        <span><strong>{tournament.days}</strong> days</span>
        <span><strong>{tournament.games}</strong> games</span>
        <span><strong>{tournament.umpires}</strong> umpires</span>
        {progress !== null && <span><strong>{tournament.allocatedPositions}/{tournament.totalPositions}</strong> positions allocated</span>}
      </div>
      <p style={styles.updated}>Last updated: {formatUpdated(tournament.updated_at)}</p>
    </article>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1440, margin: '0 auto', padding: '48px 5% 80px', color: '#193044' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, marginBottom: 42, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 36, letterSpacing: '-0.02em' },
  subtitle: { margin: '8px 0 0', color: '#71818d' },
  sectionTitle: { fontSize: 22, margin: '0 0 16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18 },
  card: { background: '#fff', border: '1px solid #dce3e8', borderRadius: 12, padding: 22, boxShadow: '0 4px 14px rgba(25,48,68,0.05)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 },
  cardTitle: { fontSize: 22, margin: '10px 0 0' },
  badge: { display: 'inline-block', padding: '4px 9px', borderRadius: 999, background: '#e8f4ed', color: '#27603d', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' },
  completedBadge: { background: '#edf2f5', color: '#5e6e79' },
  action: { whiteSpace: 'nowrap', textDecoration: 'none' },
  meta: { margin: '16px 0 4px', fontWeight: 600 },
  muted: { margin: '0 0 14px', color: '#71818d', fontSize: 13 },
  stats: { display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 18, paddingTop: 16, borderTop: '1px solid #edf1f3', color: '#52636e', fontSize: 13 },
  updated: { margin: '18px 0 0', color: '#87949d', fontSize: 12 },
  empty: { textAlign: 'center', padding: '72px 20px', border: '1px dashed #cfd8de', borderRadius: 12, background: '#fff' },
  error: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 16, marginBottom: 28, border: '1px solid #e2caca', borderRadius: 10, background: '#fff7f7' },
}
