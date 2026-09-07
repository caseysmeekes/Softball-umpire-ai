'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Assignment, Game, Umpire } from '../../lib/types'
import { buildUmpirePairingMatrix, buildUmpireTeamMatrix } from '../../lib/analysis'
import { getPersistedTournamentId } from '../../lib/supabase/persistence'
import { loadTournamentFromSupabase } from '../../lib/supabase/data'
import { getTournamentSummaries, type TournamentSummary } from '../../lib/supabase/tournaments'
import { migrateLegacyDayStorage, readTournament, type Tournament } from '../../lib/tournament'

type Report = 'pairings' | 'teams'

const read = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback
  } catch {
    return fallback
  }
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty">{message}</div>
}

export default function AnalysisPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report>('pairings')
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [umpires, setUmpires] = useState<Umpire[]>([])

  useEffect(() => {
    let active = true

    void (async () => {
      migrateLegacyDayStorage()
      const fallback = readTournament(
        read<Game[]>('softball-games', []),
        read<Assignment[]>('softball-assignments', []),
        read<string[]>('softball-manual-locks', []),
      )

      try {
        const summaries = await getTournamentSummaries()
        if (!active) return
        setTournaments(summaries)

        const persistedId = getPersistedTournamentId()
        const initialId = summaries.some(t => t.id === persistedId) ? persistedId || '' : summaries[0]?.id || ''
        setSelectedTournamentId(initialId)

        if (initialId) {
          const snapshot = await loadTournamentFromSupabase(initialId)
          if (!active) return
          setTournament(snapshot.tournament)
          setUmpires(snapshot.umpires)
        } else {
          setTournament(fallback)
          setUmpires(read<Umpire[]>('softball-umpires', []))
        }
      } catch {
        if (!active) return
        setTournament(fallback)
        setUmpires(read<Umpire[]>('softball-umpires', []))
        setError('Supabase could not be loaded. Showing the existing local safety copy.')
      } finally {
        if (active) {
          setMounted(true)
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const selectTournament = async (id: string) => {
    if (!id || id === selectedTournamentId) return
    setSelectedTournamentId(id)
    setLoading(true)
    setError('')
    try {
      const snapshot = await loadTournamentFromSupabase(id)
      setTournament(snapshot.tournament)
      setUmpires(snapshot.umpires)
    } catch {
      setError('Could not load the selected tournament.')
    } finally {
      setLoading(false)
    }
  }

  const games = useMemo(() => tournament?.days.flatMap(day => day.games) ?? [], [tournament])
  const assignments = useMemo(() => tournament?.days.flatMap(day => day.assignments) ?? [], [tournament])
  const allocatedGameIds = useMemo(() => new Set(assignments.map(assignment => assignment.gameId)), [assignments])
  const allocatedGames = allocatedGameIds.size

  const pairingMatrix = useMemo(
    () => buildUmpirePairingMatrix(umpires, games, assignments),
    [umpires, games, assignments],
  )
  const teamMatrix = useMemo(
    () => buildUmpireTeamMatrix(umpires, games, assignments),
    [umpires, games, assignments],
  )

  if (!mounted || loading) {
    return <main className="analysis-page"><div className="loading">Loading analysis…</div></main>
  }

  return (
    <main className="analysis-page">
      <header>
        <div>
          <div className="brand">DIAMOND • OFFICIATING</div>
          <h1>Analysis</h1>
          <p>Read-only analysis of saved umpire allocations.</p>
        </div>
        <a href="/dashboard">← Dashboard</a>
      </header>

      <section className="selector-card">
        <label htmlFor="analysis-tournament">Tournament</label>
        <select
          id="analysis-tournament"
          value={selectedTournamentId}
          onChange={event => void selectTournament(event.target.value)}
          disabled={!tournaments.length}
        >
          {!tournaments.length && <option value="">No tournaments available</option>}
          {tournaments.map(item => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        {selectedTournamentId && <span>{tournaments.find(t => t.id === selectedTournamentId)?.status === 'completed' ? 'Completed' : 'Active'}</span>}
      </section>

      <nav className="tabs" aria-label="Analysis reports">
        <button className={report === 'pairings' ? 'active' : ''} onClick={() => setReport('pairings')}>
          Umpire Pairings
        </button>
        <button className={report === 'teams' ? 'active' : ''} onClick={() => setReport('teams')}>
          Umpire × Team
        </button>
      </nav>

      {error && <div className="notice">{error}</div>}

      <section className="summary">
        <div><strong>{umpires.length}</strong><span>Umpires</span></div>
        <div><strong>{games.length}</strong><span>Games</span></div>
        <div><strong>{allocatedGames}</strong><span>Games with allocations</span></div>
      </section>

      <section className="card">
        {report === 'pairings' ? (
          <>
            <div className="card-head">
              <div>
                <h2>Who has worked together?</h2>
                <p>Each number is the number of games that pair of umpires has worked together.</p>
              </div>
            </div>
            {!umpires.length || !allocatedGames ? (
              <EmptyState message="No allocation data yet." />
            ) : (
              <div className="matrix-wrap">
                <table className="matrix">
                  <thead>
                    <tr>
                      <th>UMPIRE</th>
                      {pairingMatrix.columnLabels.map(label => <th key={label}>{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {pairingMatrix.rowLabels.map((label, row) => (
                      <tr key={label}>
                        <th>{label}</th>
                        {pairingMatrix.values[row].map((value, column) => (
                          <td key={`${label}-${pairingMatrix.columnLabels[column]}`} className={row === column ? 'diagonal' : ''}>
                            {row === column ? '—' : value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card-head">
              <div>
                <h2>Who has worked which teams?</h2>
                <p>Each number is the number of games an umpire has worked involving that team.</p>
              </div>
            </div>
            {!umpires.length || !allocatedGames || !teamMatrix.columnLabels.length ? (
              <EmptyState message="No team allocation data yet." />
            ) : (
              <div className="matrix-wrap">
                <table className="matrix">
                  <thead>
                    <tr>
                      <th>UMPIRE</th>
                      {teamMatrix.columnLabels.map(team => <th key={team}>{team}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {teamMatrix.rowLabels.map((label, row) => (
                      <tr key={label}>
                        <th>{label}</th>
                        {teamMatrix.values[row].map((value, column) => (
                          <td key={`${label}-${teamMatrix.columnLabels[column]}`}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <p className="read-only">Analysis is read-only. It does not create or modify allocations, rules, locks, tournament data or history.</p>

      <style jsx>{`
        .analysis-page{min-height:100vh;background:#f5f7f8;color:#1c2b33;font-family:Arial,sans-serif;padding-bottom:60px}
        .loading{min-height:100vh;display:grid;place-items:center;color:#667983}
        header{background:#fff;border-bottom:1px solid #dde5e9;padding:24px 5%;display:flex;justify-content:space-between;align-items:center;gap:20px}
        .brand{font-size:11px;letter-spacing:2px;color:#5d7380}
        h1{margin:5px 0;font-size:30px}
        header p{color:#6d7e86;font-size:13px;margin:6px 0 0}
        header a{color:#1587b2;text-decoration:none;font-weight:600;font-size:13px;white-space:nowrap}
        .selector-card{margin:16px 5% 0;background:#fff;border:1px solid #dce4e8;border-radius:8px;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .selector-card label{font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:#536771;font-weight:800}
        .selector-card select{min-width:280px;border:1px solid #cbd6dc;border-radius:6px;background:#fff;padding:9px 12px;color:#1c2b33;font-size:13px}
        .selector-card span{font-size:11px;color:#71828a}
        .tabs{margin:16px 5% 0;display:flex;gap:6px}
        .tabs button{border:1px solid #cbd6dc;background:#fff;border-radius:7px;padding:10px 14px;color:#536771;font-weight:700;cursor:pointer}
        .tabs button.active{background:#1587b2;color:#fff;border-color:#1587b2}
        .notice{margin:14px 5% 0;padding:11px 13px;border:1px solid #c7e2ea;background:#eef7fa;border-radius:7px;color:#356673;font-size:13px}
        .summary{margin:16px 5%;display:flex;gap:10px;flex-wrap:wrap}
        .summary div{background:#fff;border:1px solid #dce4e8;border-radius:8px;padding:13px 18px;min-width:130px}
        .summary strong{display:block;font-size:22px}
        .summary span{display:block;margin-top:4px;color:#71828a;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
        .card{margin:16px 5%;background:#fff;border:1px solid #dce4e8;border-radius:8px;padding:22px}
        .card-head h2{margin:0;font-size:19px}
        .card-head p{color:#6d7e86;font-size:13px;margin:6px 0 18px}
        .matrix-wrap{overflow:auto;border:1px solid #e0e7ea;border-radius:6px}
        .matrix{border-collapse:collapse;min-width:100%;font-size:13px}
        .matrix th,.matrix td{padding:11px 14px;border-bottom:1px solid #e5eaed;border-right:1px solid #e5eaed;text-align:center;white-space:nowrap}
        .matrix thead th{background:#f5f7f8;color:#536771;font-size:10px;letter-spacing:.7px;position:sticky;top:0}
        .matrix tbody th{background:#f9fafb;text-align:left;font-weight:700;position:sticky;left:0}
        .matrix td{font-weight:700;font-size:14px}
        .matrix td.diagonal{color:#9aa7ad;font-weight:400;background:#f9fafb}
        .empty{padding:35px 15px;text-align:center;color:#71828a;background:#f8fafb;border:1px dashed #cbd6dc;border-radius:7px}
        .read-only{text-align:center;color:#829097;font-size:11px;margin:18px 5%}
        @media(max-width:700px){header{padding:20px 4%}.selector-card,.tabs,.summary,.card{margin-left:4%;margin-right:4%}.selector-card select{min-width:0;flex:1}.card{padding:16px}.summary div{flex:1;min-width:100px}}
      `}</style>
    </main>
  )
}
