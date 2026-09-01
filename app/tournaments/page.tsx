'use client'

import { useCallback, useEffect, useState } from 'react'
import StartNewTournament from '../dashboard/StartNewTournament'
import { getTournamentSummaries, type TournamentSummary } from '../../lib/supabase/tournaments'

const fmtDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : null
const fmtUpdated = (value: string) => new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))

export default function TournamentsPage() {
  const [items, setItems] = useState<TournamentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getTournamentSummaries())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tournaments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const active = items.filter(t => t.status === 'active')
  const completed = items.filter(t => t.status === 'completed')

  return (
    <main className="tournaments-page">
      <header className="tournaments-header">
        <div>
          <div className="brand">DIAMOND • OFFICIATING</div>
          <h1>My Tournaments</h1>
          <p>Your tournaments and scheduling workspaces.</p>
        </div>
        <StartNewTournament />
      </header>

      {error && <div className="error"><strong>Unable to load tournaments</strong><span>{error}</span><button onClick={() => void load()}>Retry</button></div>}
      {loading && <div className="loading">Loading tournaments…</div>}

      {!loading && !error && !items.length && (
        <section className="empty"><h2>No tournaments yet</h2><p>Start your first tournament to get started.</p><StartNewTournament /></section>
      )}

      {!loading && !error && active.length > 0 && <TournamentSection title="Active" items={active} />}
      {!loading && !error && completed.length > 0 && <TournamentSection title="Completed" items={completed} completed />}

      <style jsx>{`main{min-height:100vh;background:#f5f7f8;color:#1c2b33;font-family:Arial,sans-serif;padding-bottom:60px}.tournaments-header{background:#fff;border-bottom:1px solid #dde5e9;padding:30px 6%;display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap}.brand{font-size:11px;letter-spacing:2px;color:#5d7380}h1{margin:6px 0;font-size:32px}header p{color:#6d7e86;font-size:13px}.section{padding:28px 6% 0}.section h2{font-size:20px;margin:0 0 14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.card{background:#fff;border:1px solid #dce4e8;border-radius:10px;padding:22px;box-shadow:0 2px 8px rgba(25,48,68,.04)}.card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.card h3{margin:8px 0 0;font-size:21px}.badge{display:inline-block;padding:4px 8px;border-radius:999px;background:#e8f4ed;color:#27603d;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.badge.completed{background:#edf2f5;color:#5e6e79}.details{margin:15px 0 0;color:#52636e;font-size:13px}.stats{display:flex;flex-wrap:wrap;gap:8px 14px;margin:17px 0 0;padding-top:15px;border-top:1px solid #edf1f3;color:#52636e;font-size:13px}.stats b{color:#1c2b33}.progress{margin-top:12px;font-size:12px;color:#71818d}.progress-track{height:6px;background:#e7ecef;border-radius:5px;overflow:hidden;margin-top:6px}.progress-fill{height:100%;background:#1587b2}.updated{margin:16px 0 0;color:#87949d;font-size:12px}.open{display:inline-block;margin-top:18px;background:#1587b2;color:#fff;text-decoration:none;border-radius:6px;padding:10px 14px;font-weight:700;font-size:13px}.empty{margin:28px 6%;text-align:center;padding:70px 20px;background:#fff;border:1px dashed #cbd6dc;border-radius:10px}.loading{text-align:center;padding:70px;color:#6d7e86}.error{margin:24px 6%;padding:15px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff1ef;border:1px solid #e4b9b3;border-radius:8px}.error span{color:#6d4540}.error button{border:1px solid #cbd6dc;background:#fff;border-radius:6px;padding:8px 12px;cursor:pointer}@media(max-width:600px){.card-top{display:block}.open{width:100%;text-align:center}}`}</style>
    </main>
  )
}

function TournamentSection({ title, items, completed = false }: { title: string; items: TournamentSummary[]; completed?: boolean }) {
  return <section className="section"><h2>{title}</h2><div className="grid">{items.map(t => {
    const progress = t.totalPositions > 0 ? Math.min(100, Math.round((t.allocatedPositions / t.totalPositions) * 100)) : null
    const start = fmtDate(t.start_date)
    const end = fmtDate(t.end_date)
    return <article className="card" key={t.id}>
      <div className="card-top"><div><span className={`badge${completed ? ' completed' : ''}`}>{completed ? 'Completed' : 'Active'}</span><h3>{t.name}</h3></div></div>
      <p className="details">{start && end ? `${start} – ${end}` : start || end || 'Dates not set'}{t.location ? ` · ${t.location}` : ''}</p>
      {t.venue && <p className="details">{t.venue}</p>}
      <div className="stats"><span><b>{t.dayCount}</b> days</span><span><b>{t.gameCount}</b> games</span><span><b>{t.umpireCount}</b> umpires</span></div>
      {progress !== null && <div className="progress"><b>{t.allocatedPositions}/{t.totalPositions}</b> positions allocated<div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}} /></div></div>}
      <p className="updated">Last updated: {fmtUpdated(t.updated_at)}</p>
      <a className="open" href={`/dashboard?tournamentId=${encodeURIComponent(t.id)}`}>{completed ? 'View Tournament' : 'Open Tournament'}</a>
    </article>
  })}</div></section>
}
